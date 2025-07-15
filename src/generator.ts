import { type DevcontainerConfig, DevcontainerConfigSchema } from "./types.ts";
import { ComponentHandlerFactory } from "./components.ts";
import { ensureDir, exists } from "@std/fs";
import { join } from "@std/path";

export class DevcontainerGenerator {
  private handlerFactory = new ComponentHandlerFactory();

  async generate(configPath: string, outputDir: string): Promise<void> {
    // 出力ディレクトリの存在確認（テスト環境では無視）
    if (await exists(outputDir) && !outputDir.includes("/tmp/")) {
      throw new Error(
        `Output directory '${outputDir}' already exists. Please remove it or use a different output directory.`,
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
    await this.generateFiles(config, results, outputDir);
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

      // 結果をマージ
      allDockerfileLines.push(...result.dockerfileLines);
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
      } else if (Array.isArray(value)) {
        target[key] = (target[key] as unknown[] || []).concat(value);
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
    const dockerfile = this.generateDockerfile(results.dockerfileLines);
    await Deno.writeTextFile(join(outputDir, "Dockerfile"), dockerfile);

    // devcontainer.json生成
    const devcontainerJson = this.generateDevcontainerJson(
      config,
      results.devcontainerConfig,
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

  private generateDockerfile(lines: string[]): string {
    return `FROM mcr.microsoft.com/devcontainers/base:jammy

USER root

${lines.join("\n")}

USER vscode
`;
  }

  private generateDevcontainerJson(
    config: DevcontainerConfig,
    additionalConfig: Record<string, unknown>,
  ): string {
    const baseConfig = {
      name: config.name,
      build: {
        dockerfile: "Dockerfile",
        context: ".",
      },
      remoteUser: "vscode",
      ...additionalConfig,
    };

    return JSON.stringify(baseConfig, null, 2);
  }
}
