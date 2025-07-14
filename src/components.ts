import type { Component, SimpleComponent } from "./types.ts";

// コンポーネントの処理結果
export interface ComponentResult {
  dockerfileLines: string[];
  devcontainerConfig: Record<string, any>;
  scripts: Record<string, string>;
}

// コンポーネントハンドラーのインターフェース
export interface ComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult;
}

// 基本的なコンポーネントハンドラー
export abstract class BaseComponentHandler implements ComponentHandler {
  abstract handle(component: Component | SimpleComponent): ComponentResult;

  protected createResult(
    dockerfileLines: string[] = [],
    devcontainerConfig: Record<string, any> = {},
    scripts: Record<string, string> = {}
  ): ComponentResult {
    return {
      dockerfileLines,
      devcontainerConfig,
      scripts,
    };
  }
}

// APT パッケージインストール
export class AptInstallHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("apt.install requires parameters");
    }
    
    if (component.component !== "apt.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages.join(" ");
    const dockerfileLines = [
      "RUN apt-get update && apt-get install -y \\",
      `    ${packages} \\`,
      "    && rm -rf /var/lib/apt/lists/*",
    ];

    return this.createResult(dockerfileLines);
  }
}

// mise セットアップ
export class MiseSetupHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "RUN curl https://mise.run | sh",
      "ENV PATH=\"/root/.local/bin:$PATH\"",
    ];

    return this.createResult(dockerfileLines);
  }
}

// mise パッケージインストール
export class MiseInstallHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("mise.install requires parameters");
    }
    
    if (component.component !== "mise.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages;
    const dockerfileLines = packages.map(pkg => `RUN mise use -g ${pkg}`);

    return this.createResult(dockerfileLines);
  }
}

// Nix セットアップ
export class NixSetupHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "RUN curl -L https://nixos.org/nix/install | sh -s -- --daemon",
      "ENV PATH=\"/nix/var/nix/profiles/default/bin:$PATH\"",
    ];

    return this.createResult(dockerfileLines);
  }
}

// Nix パッケージインストール
export class NixInstallHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("nix.install requires parameters");
    }
    
    if (component.component !== "nix.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages.join(" ");
    const dockerfileLines = [
      `RUN nix-env -iA nixpkgs.${packages.replace(/ /g, " nixpkgs.")}`,
    ];

    return this.createResult(dockerfileLines);
  }
}

// ファイアウォール セットアップ
export class FirewallSetupHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "RUN apt-get update && apt-get install -y iptables",
    ];

    const scripts = {
      "firewall-setup.sh": `#!/bin/bash
# Basic firewall setup
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
`,
    };

    return this.createResult(dockerfileLines, {}, scripts);
  }
}

// ファイアウォール ドメイン設定
export class FirewallDomainsHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("firewall.domains requires parameters");
    }
    
    if (component.component !== "firewall.domains") {
      throw new Error("Invalid component type");
    }

    const domains = component.params.domains;
    const allowRules = domains.map(domain => 
      `iptables -A OUTPUT -d ${domain} -j ACCEPT`
    ).join("\n");

    const scripts = {
      "firewall-domains.sh": `#!/bin/bash
# Allow specific domains
${allowRules}
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// VS Code 拡張機能インストール
export class VscodeInstallHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("vscode.install requires parameters");
    }
    
    if (component.component !== "vscode.install") {
      throw new Error("Invalid component type");
    }

    const extensions = component.params.extensions;
    const devcontainerConfig = {
      customizations: {
        vscode: {
          extensions,
        },
      },
    };

    return this.createResult([], devcontainerConfig);
  }
}

// シェル設定
export class ShellSetupHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("shell.setup requires parameters");
    }
    
    if (component.component !== "shell.setup") {
      throw new Error("Invalid component type");
    }

    const shell = component.params.shell;
    const dockerfileLines = [
      `RUN chsh -s /bin/${shell} vscode`,
    ];

    return this.createResult(dockerfileLines);
  }
}

// コンポーネントハンドラーのファクトリー
export class ComponentHandlerFactory {
  private handlers = new Map<string, ComponentHandler>([
    ["apt.install", new AptInstallHandler()],
    ["mise.setup", new MiseSetupHandler()],
    ["mise.install", new MiseInstallHandler()],
    ["nix.setup", new NixSetupHandler()],
    ["nix.install", new NixInstallHandler()],
    ["firewall.setup", new FirewallSetupHandler()],
    ["firewall.domains", new FirewallDomainsHandler()],
    ["vscode.install", new VscodeInstallHandler()],
    ["shell.setup", new ShellSetupHandler()],
  ]);

  getHandler(componentType: string): ComponentHandler {
    const handler = this.handlers.get(componentType);
    if (!handler) {
      throw new Error(`Unknown component type: ${componentType}`);
    }
    return handler;
  }
}