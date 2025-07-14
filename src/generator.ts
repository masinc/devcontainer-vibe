import { DevcontainerConfigSchema, type DevcontainerConfig } from "./types.ts";
import { ComponentHandlerFactory } from "./components.ts";

export class DevcontainerGenerator {
  private handlerFactory = new ComponentHandlerFactory();

  async generate(configPath: string, outputDir: string): Promise<void> {
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
    const allDevcontainerConfig: Record<string, any> = {};
    const allScripts: Record<string, string> = {};

    for (const component of config.components) {
      const componentType = typeof component === "string" ? component : component.component;
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

  private mergeConfig(target: Record<string, any>, source: Record<string, any>): void {
    for (const [key, value] of Object.entries(source)) {
      if (key === "customizations" && typeof value === "object") {
        target[key] = target[key] || {};
        this.mergeConfig(target[key], value);
      } else if (Array.isArray(value)) {
        target[key] = (target[key] || []).concat(value);
      } else if (typeof value === "object") {
        target[key] = target[key] || {};
        this.mergeConfig(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  private async generateFiles(
    config: DevcontainerConfig,
    results: any,
    outputDir: string
  ): Promise<void> {
    // 出力ディレクトリを作成
    await Deno.mkdir(outputDir, { recursive: true });

    // Dockerfile生成
    const dockerfile = this.generateDockerfile(results.dockerfileLines);
    await Deno.writeTextFile(`${outputDir}/Dockerfile`, dockerfile);

    // devcontainer.json生成
    const devcontainerJson = this.generateDevcontainerJson(config, results.devcontainerConfig);
    await Deno.writeTextFile(`${outputDir}/devcontainer.json`, devcontainerJson);

    // スクリプト生成
    if (Object.keys(results.scripts).length > 0) {
      const scriptsDir = `${outputDir}/scripts`;
      await Deno.mkdir(scriptsDir, { recursive: true });
      
      for (const [filename, content] of Object.entries(results.scripts)) {
        await Deno.writeTextFile(`${scriptsDir}/${filename}`, content as string);
        await Deno.chmod(`${scriptsDir}/${filename}`, 0o755);
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

  private generateDevcontainerJson(config: DevcontainerConfig, additionalConfig: Record<string, any>): string {
    const baseConfig = {
      name: config.name,
      ...(config.description && { description: config.description }),
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