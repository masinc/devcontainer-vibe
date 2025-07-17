import type { Component, SimpleComponent } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

// mise セットアップ
export class MiseSetupHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    <<-EOS",
      "    set -eux;",
      "    install -dm 755 /etc/apt/keyrings &&",
      "    wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null &&",
      '    echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main" | tee /etc/apt/sources.list.d/mise.list &&',
      "    apt update &&",
      "    apt install -y mise",
      "EOS",
    ];

    const devcontainerConfig = {
      mounts: [
        "source=mise-data-${devcontainerId},target=/home/vscode/.local/share/mise,type=volume",
      ],
      remoteEnv: {
        "MISE_DATA_DIR": "/home/vscode/.local/share/mise",
        "PATH": "/home/vscode/.local/share/mise/shims:${containerEnv:PATH}",
      },
    };

    return this.createResult(dockerfileLines, devcontainerConfig);
  }
}

// mise パッケージインストール
export class MiseInstallHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("mise.install requires parameters");
    }

    if (component.name !== "mise.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages;
    const dockerfileLines = [
      "USER vscode",
      "RUN --mount=target=/home/vscode/.cache/mise,type=cache,sharing=locked,uid=1000,gid=1000 \\",
      "    <<-EOS",
      "    set -ex;",
      ...packages.map((pkg) => `    mise use -g ${pkg};`),
      "    mise install;",
      "EOS",
    ];

    const devcontainerConfig = {
      mounts: [
        "source=mise-data-${devcontainerId},target=/home/vscode/.local/share/mise,type=volume",
      ],
      remoteEnv: {
        "MISE_DATA_DIR": "/home/vscode/.local/share/mise",
        "PATH": "/home/vscode/.local/share/mise/shims:${containerEnv:PATH}",
      },
    };

    return this.createResult(dockerfileLines, devcontainerConfig);
  }
}
