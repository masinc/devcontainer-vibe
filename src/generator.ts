import { type DevcontainerConfig, DevcontainerConfigSchema } from "./types.ts";
import { ComponentHandlerFactory } from "./components/factory.ts";
import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";

export class DevcontainerGenerator {
  private handlerFactory = new ComponentHandlerFactory();

  async generate(configPath: string, outputDir: string, overwrite = false): Promise<void> {
    // .devcontainer ディレクトリのパスを作成
    const devcontainerDir = join(outputDir, ".devcontainer");

    // 出力ディレクトリの存在確認
    if (await exists(devcontainerDir) && !overwrite) {
      throw new Error(
        `Output directory '${devcontainerDir}' already exists. Use --overwrite to overwrite it or choose a different output directory.`,
      );
    }

    // 設定ファイルの読み込み
    const configText = await Deno.readTextFile(configPath);
    const configData = JSON.parse(configText);

    // スキーマ検証
    const config = DevcontainerConfigSchema.parse(configData);

    // 各コンポーネントの処理
    const results = this.processComponents(config);

    // ファイル生成
    await this.generateFiles(config, results, devcontainerDir);
  }

  private processComponents(config: DevcontainerConfig) {
    const allDockerfileLines: string[] = [];
    const allDevcontainerConfig: Record<string, unknown> = {};
    const allScripts: Record<string, string> = {};

    // 単一利用のみ許可するコンポーネントの追跡
    const singleUseComponents = new Set<string>();

    // shell.post-create の複数回対応
    const postCreateCommands: Array<{ user: string; commands: string[] }> = [];

    for (const component of config.components) {
      const componentType = typeof component === "string"
        ? component
        : component.name;

      // コンポーネントハンドラーを取得
      const handler = this.handlerFactory.getHandler(componentType);

      // 単一利用チェック
      if (handler.isSingleUse) {
        if (singleUseComponents.has(componentType)) {
          throw new Error(`Component '${componentType}' can only be used once`);
        }
        singleUseComponents.add(componentType);
      }

      // shell.post-create の特別処理
      if (componentType === "shell.post-create") {
        if (
          typeof component !== "string" &&
          component.name === "shell.post-create"
        ) {
          postCreateCommands.push({
            user: component.params.user,
            commands: component.params.commands,
          });
        }
        continue;
      }

      const result = handler.handle(component);

      // Dockerfileにコンポーネントコメントを追加
      if (result.dockerfileLines.length > 0) {
        allDockerfileLines.push(`# Component: ${componentType}`);
        allDockerfileLines.push(...result.dockerfileLines);
        allDockerfileLines.push(""); // 空行を追加して区切り
      }

      this.mergeConfig(allDevcontainerConfig, result.devcontainerConfig);
      Object.assign(allScripts, result.scripts);
    }

    // shell.post-create の統合処理
    if (postCreateCommands.length > 0) {
      this.mergePostCreateCommands(
        postCreateCommands,
        allDevcontainerConfig,
        allScripts,
      );
    }

    return {
      dockerfileLines: allDockerfileLines,
      devcontainerConfig: allDevcontainerConfig,
      scripts: allScripts,
    };
  }

  private mergePostCreateCommands(
    postCreateCommands: Array<{ user: string; commands: string[] }>,
    allDevcontainerConfig: Record<string, unknown>,
    allScripts: Record<string, string>,
  ): void {
    // userごとにコマンドをグループ化
    const userGroups = new Map<string, string[]>();

    for (const { user, commands } of postCreateCommands) {
      if (!userGroups.has(user)) {
        userGroups.set(user, []);
      }
      userGroups.get(user)!.push(...commands);
    }

    // 実行コマンドを格納する配列
    const execCommands: string[] = [];

    // vscodユーザーのスクリプトを作成
    if (userGroups.has("vscode")) {
      const vscodCommands = userGroups.get("vscode")!;
      const vscodScript = `#!/bin/bash
set -ex

# Commands for vscode user
${vscodCommands.join("\n")}
`;
      allScripts["shell-post-create-vscode.sh"] = vscodScript;
      execCommands.push("/usr/local/scripts/shell-post-create-vscode.sh");
    }

    // rootユーザーのスクリプトを作成
    if (userGroups.has("root")) {
      const rootCommands = userGroups.get("root")!;
      const rootScript = `#!/bin/bash
set -ex

# Commands for root user
${rootCommands.join("\n")}
`;
      allScripts["shell-post-create-root.sh"] = rootScript;
      execCommands.push("sudo /usr/local/scripts/shell-post-create-root.sh");
    }

    // 実行コマンドを結合（既存のpostCreateCommandがある場合は結合）
    const existingCommand = allDevcontainerConfig.postCreateCommand as string;
    const newCommands = execCommands.join(" && ");
    
    if (existingCommand) {
      allDevcontainerConfig.postCreateCommand = `${existingCommand} && ${newCommands}`;
    } else {
      allDevcontainerConfig.postCreateCommand = newCommands;
    }
  }

  private mergeConfig(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(source)) {
      if (key === "customizations" && typeof value === "object") {
        target[key] = target[key] || {};
        this.mergeConfig(
          target[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else if (key === "remoteEnv" && typeof value === "object") {
        // remoteEnvは文字列結合でマージ
        const targetEnv = target[key] as Record<string, string> || {};
        const sourceEnv = value as Record<string, string>;

        for (const [envKey, envValue] of Object.entries(sourceEnv)) {
          if (targetEnv[envKey]) {
            // 既存の値がある場合は文字列結合
            // $PATH, ${PATH}, ${containerEnv:PATH} の形式をサポート
            let mergedValue = envValue
              .replace("$" + envKey, targetEnv[envKey])
              .replace("${" + envKey + "}", targetEnv[envKey])
              .replace("${containerEnv:" + envKey + "}", targetEnv[envKey]);

            // PATH の重複を削除
            if (envKey === "PATH") {
              const pathParts = mergedValue.split(":");
              const uniquePaths = [...new Set(pathParts)];
              mergedValue = uniquePaths.join(":");
            }

            targetEnv[envKey] = mergedValue;
          } else {
            // 新規の場合はそのまま設定
            targetEnv[envKey] = envValue;
          }
        }
        target[key] = targetEnv;
      } else if (key === "postCreateCommand" && typeof value === "string") {
        // postCreateCommandは結合する
        const existing = target[key] as string;
        if (existing) {
          target[key] = `${existing} && ${value}`;
        } else {
          target[key] = value;
        }
      } else if (Array.isArray(value)) {
        const targetArray = target[key] as unknown[] || [];
        const newArray = targetArray.concat(value);
        // 配列の重複を削除（mounts, runArgs等）
        target[key] = [...new Set(newArray)];
      } else if (typeof value === "object") {
        target[key] = target[key] || {};
        this.mergeConfig(
          target[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        target[key] = value;
      }
    }
  }

  private async generateFiles(
    config: DevcontainerConfig,
    results: {
      dockerfileLines: string[];
      devcontainerConfig: Record<string, unknown>;
      scripts: Record<string, string>;
    },
    outputDir: string,
  ): Promise<void> {
    // 出力ディレクトリを作成
    await ensureDir(outputDir);

    // Dockerfile生成
    const dockerfile = this.generateDockerfile(
      results.dockerfileLines,
      results.scripts,
    );
    await Deno.writeTextFile(join(outputDir, "Dockerfile"), dockerfile);

    // devcontainer.json生成
    const devcontainerJson = this.generateDevcontainerJson(
      config,
      results.devcontainerConfig,
      results.scripts,
    );
    await Deno.writeTextFile(
      join(outputDir, "devcontainer.json"),
      devcontainerJson,
    );

    // スクリプト生成
    if (Object.keys(results.scripts).length > 0) {
      const scriptsDir = join(outputDir, "scripts");
      await ensureDir(scriptsDir);

      for (const [filename, content] of Object.entries(results.scripts)) {
        const scriptPath = join(scriptsDir, filename);
        await Deno.writeTextFile(scriptPath, content as string);
        await Deno.chmod(scriptPath, 0o755);
      }
    }
  }

  private generateDockerfile(
    lines: string[],
    scripts: Record<string, string>,
  ): string {
    const scriptCopyLines = Object.keys(scripts).length > 0
      ? "COPY scripts/ /usr/local/scripts/\nRUN chmod +x /usr/local/scripts/*\n\n"
      : "";

    return `FROM mcr.microsoft.com/devcontainers/base:jammy

USER root

${scriptCopyLines}${lines.join("\n")}

USER vscode
`;
  }

  private generateDevcontainerJson(
    config: DevcontainerConfig,
    additionalConfig: Record<string, unknown>,
    scripts: Record<string, string>,
  ): string {
    const baseConfig: Record<string, unknown> = {
      name: config.name,
      build: {
        dockerfile: "Dockerfile",
        context: ".",
      },
      remoteUser: "vscode",
      ...additionalConfig,
    };

    // 実行可能なスクリプトがある場合はpostCreateCommandを追加
    // ただし、shell.post-create由来のpostCreateCommandがある場合は上書きしない
    const executableScripts = Object.keys(scripts).filter((filename) =>
      filename.endsWith(".sh") || filename.endsWith(".py") ||
      filename.endsWith(".js") || filename.endsWith(".ts")
    );
    if (executableScripts.length > 0 && !additionalConfig.postCreateCommand) {
      const scriptCommands = executableScripts.map((filename) =>
        `/usr/local/scripts/${filename}`
      ).join(" && ");
      baseConfig.postCreateCommand = scriptCommands;
    }

    return JSON.stringify(baseConfig, null, 2);
  }
}
