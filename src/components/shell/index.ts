import type { Component, SimpleComponent } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

// シェル設定
export class ShellSetupHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("shell.setup requires parameters");
    }

    if (component.name !== "shell.setup") {
      throw new Error("Invalid component type");
    }

    const shell = component.params.shell;
    const dockerfileLines = [
      "# Set default shell for vscode user",
      "USER root",
      `RUN chsh -s /bin/${shell} vscode`,
    ];

    const devcontainerConfig = {
      remoteEnv: {
        "SHELL": `/bin/${shell}`,
      },
    };

    return this.createResult(dockerfileLines, devcontainerConfig);
  }
}

// シェル実行（Dockerfile内）
export class ShellDockerfileHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("shell.dockerfile requires parameters");
    }

    if (component.name !== "shell.dockerfile") {
      throw new Error("Invalid component type");
    }

    const { user, commands } = component.params;
    const dockerfileLines = [
      `USER ${user}`,
      "RUN <<-EOS",
      "    set -uex;",
      "    # Source mise environment if available",
      "    [ -f ~/.bashrc ] && source ~/.bashrc;",
      '    export PATH="/home/vscode/.local/share/mise/shims:$PATH";',
      ...commands.map((cmd) => `    ${cmd};`),
      "EOS",
    ];

    return this.createResult(dockerfileLines);
  }
}

// シェル実行（postCreateCommand）
export class ShellPostCreateHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("shell.post-create requires parameters");
    }

    if (component.name !== "shell.post-create") {
      throw new Error("Invalid component type");
    }

    const { user, commands } = component.params;

    // スクリプトファイルを生成
    const scriptContent = `#!/bin/bash
set -ex

# Switch to specified user if needed
${user === "root" ? "# Running as root" : "# Running as vscode user"}

${commands.map((cmd) => cmd).join("\n")}
`;

    const scripts = {
      "shell-post-create.sh": scriptContent,
    };

    // postCreateCommandの設定
    const devcontainerConfig = {
      postCreateCommand: user === "root"
        ? "sudo /usr/local/scripts/shell-post-create.sh"
        : "/usr/local/scripts/shell-post-create.sh",
    };

    return this.createResult([], devcontainerConfig, scripts);
  }
}
