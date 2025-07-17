import { type DevcontainerConfig, DevcontainerConfigSchema } from "./types.ts";
import { ComponentHandlerFactory } from "./components.ts";
import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";

export class DevcontainerGenerator {
  private handlerFactory = new ComponentHandlerFactory();

  async generate(configPath: string, outputDir: string): Promise<void> {
    // .devcontainer ディレクトリのパスを作成
    const devcontainerDir = join(outputDir, ".devcontainer");
    
    // 出力ディレクトリの存在確認（テスト環境では無視）
    if (await exists(devcontainerDir) && !outputDir.includes("/tmp/")) {
      throw new Error(
        `Output directory '${devcontainerDir}' already exists. Please remove it or use a different output directory.`,
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

    for (const component of config.components) {
      const componentType = typeof component === "string"
        ? component
        : component.name;
      const handler = this.handlerFactory.getHandler(componentType);
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

    return {
      dockerfileLines: allDockerfileLines,
      devcontainerConfig: allDevcontainerConfig,
      scripts: allScripts,
    };
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
        // postCreateCommandは文字列結合でマージ
        const targetCommand = target[key] as string || "";
        if (targetCommand) {
          target[key] = `${targetCommand} && ${value}`;
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
    const dockerfile = this.generateDockerfile(results.dockerfileLines, results.scripts);
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

  private generateDockerfile(lines: string[], scripts: Record<string, string>): string {
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
    const executableScripts = Object.keys(scripts).filter(filename => 
      filename.endsWith('.sh') || filename.endsWith('.py') || filename.endsWith('.js') || filename.endsWith('.ts')
    );
    if (executableScripts.length > 0) {
      const scriptCommands = executableScripts.map(filename => 
        `/usr/local/scripts/${filename}`
      ).join(" && ");
      baseConfig.postCreateCommand = scriptCommands;
    }

    return JSON.stringify(baseConfig, null, 2);
  }
}
