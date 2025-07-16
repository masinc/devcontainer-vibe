import type { Component, SimpleComponent } from "./types.ts";
import { FIREWALL_PRESETS } from "./types.ts";

// コンポーネントの処理結果
export interface ComponentResult {
  dockerfileLines: string[];
  devcontainerConfig: Record<string, unknown>;
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
    devcontainerConfig: Record<string, unknown> = {},
    scripts: Record<string, string> = {},
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

    if (component.name !== "apt.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages.join(" ");
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y \\",
      `    ${packages} \\`,
      "    && rm -rf /var/lib/apt/lists/*",
    ];

    return this.createResult(dockerfileLines);
  }
}

// mise セットアップ
export class MiseSetupHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    <<-EOS",
      "    set -eux;",
      "    install -dm 755 /etc/apt/keyrings &&",
      "    wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null &&",
      "    echo \"deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main\" | tee /etc/apt/sources.list.d/mise.list &&",
      "    apt update &&",
      "    apt install -y mise",
      "EOS",
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

    if (component.name !== "mise.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages;
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/home/vscode/.cache/mise,type=cache,sharing=locked,uid=1000,gid=1000 \\",
      "    <<-EOS",
      "    set -ex;",
      ...packages.map((pkg) => `    mise use -g ${pkg};`),
      "    mise install;",
      "EOS",
    ];

    return this.createResult(dockerfileLines);
  }
}

// Nix セットアップ
export class NixSetupHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "# Create nix directory and set ownership",
      "USER root",
      "RUN mkdir -p /nix && chown -R vscode:vscode /nix",
      "",
      "# Install Nix as vscode user in single-user mode",
      "USER vscode",
      "RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon",
      "",
      "# Set environment variables for Nix (vscode user paths)",
      'ENV PATH="/home/vscode/.nix-profile/bin:$PATH"',
      "",
      "# Source Nix environment and verify installation",
      "RUN . ~/.nix-profile/etc/profile.d/nix.sh && nix --version",
      "",
      "# Switch back to root for subsequent operations",
      "USER root",
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

    if (component.name !== "nix.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages;
    const nixPackages = packages.map(pkg => `nixpkgs.${pkg}`).join(" ");
    const dockerfileLines = [
      "# Install Nix packages as vscode user",
      "USER vscode",
      "RUN --mount=target=/tmp/nix-download-cache,type=cache,sharing=locked \\",
      "    <<-EOS",
      "    set -ex;",
      "    . ~/.nix-profile/etc/profile.d/nix.sh;",
      `    nix-env -iA ${nixPackages};`,
      "EOS",
      "USER root",
    ];

    return this.createResult(dockerfileLines);
  }
}

// ファイアウォール セットアップ
export class FirewallSetupHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y iptables",
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

// ファイアウォール ドメイン設定（統合版）
export class FirewallDomainHandler extends BaseComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("firewall.domain requires parameters");
    }

    if (component.name !== "firewall.domain") {
      throw new Error("Invalid component type");
    }

    const allDomains: string[] = [];

    // プリセットからドメインを取得
    if (component.params.presets) {
      for (const preset of component.params.presets) {
        if (preset in FIREWALL_PRESETS) {
          allDomains.push(
            ...FIREWALL_PRESETS[preset as keyof typeof FIREWALL_PRESETS],
          );
        } else {
          throw new Error(`Unknown firewall preset: ${preset}`);
        }
      }
    }

    // 個別ドメインを追加
    if (component.params.allows) {
      allDomains.push(...component.params.allows);
    }

    // 重複を削除
    const uniqueDomains = [...new Set(allDomains)];

    // ドメインを解決してIPアドレスを取得するスクリプトを生成
    const domainResolutionScript = uniqueDomains.map((domain) => `
echo "🔍 Resolving ${domain}..."
IPS=$(dig +short A ${domain} 2>/dev/null)
if [ -n "$IPS" ]; then
  for IP in $IPS; do
    if [[ $IP =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
      echo "📍 Adding IP $IP for ${domain}"
      iptables -A OUTPUT -d $IP -j ACCEPT
    fi
  done
else
  echo "⚠️  Failed to resolve ${domain}"
fi`).join("\n");

    const scripts = {
      "firewall-domain.sh": `#!/bin/bash
# Allow specific domains by resolving their IP addresses
set -e

# Install dig if not available
if ! command -v dig &> /dev/null; then
  echo "📦 Installing dnsutils for domain resolution..."
  apt-get update && apt-get install -y dnsutils
fi

echo "🌐 Resolving and allowing domains..."
${domainResolutionScript}

echo "✅ Domain firewall rules applied"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// GitHub動的IP範囲取得ファイアウォール設定
export class FirewallGithubHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const scripts = {
      "firewall-github-dynamic.sh": `#!/bin/bash
# GitHub dynamic IP ranges from API
set -e

echo "🐙 Fetching GitHub IP ranges from API..."

# Install required tools if not available
if ! command -v curl &> /dev/null; then
  echo "📦 Installing curl..."
  apt-get update && apt-get install -y curl
fi

if ! command -v jq &> /dev/null; then
  echo "📦 Installing jq for JSON parsing..."
  apt-get update && apt-get install -y jq
fi

# Fetch GitHub meta information
GITHUB_META=$(curl -s https://api.github.com/meta)
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch GitHub IP ranges"
  exit 1
fi

echo "📋 Processing GitHub IP ranges..."

# Extract and add web, API, and git IP ranges
for RANGE_TYPE in web api git; do
  echo "🔍 Processing $RANGE_TYPE ranges..."
  echo "$GITHUB_META" | jq -r ".\\$RANGE_TYPE[]" | while read -r CIDR; do
    if [[ $CIDR =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+$ ]]; then
      echo "📍 Adding GitHub $RANGE_TYPE range: $CIDR"
      iptables -A OUTPUT -d $CIDR -j ACCEPT
    else
      echo "⚠️  Invalid CIDR range: $CIDR"
    fi
  done
done

echo "✅ GitHub dynamic IP ranges configured"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// sudo無効化コンポーネント
export class SudoDisableHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const scripts = {
      "disable-sudo.sh": `#!/bin/bash
# Disable sudo access for security
set -e

echo "🔒 Disabling sudo access to prevent privilege escalation..."

# Remove sudo access by clearing sudoers entries for vscode user
sed -i '/vscode/d' /etc/sudoers 2>/dev/null || true
rm -f /etc/sudoers.d/vscode 2>/dev/null || true

# Make sudo binary unusable for non-root users
chmod 700 /usr/bin/sudo 2>/dev/null || true

echo "🔐 sudo access disabled - system is now locked down"
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

    if (component.name !== "vscode.install") {
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

    if (component.name !== "shell.setup") {
      throw new Error("Invalid component type");
    }

    const shell = component.params.shell;
    const dockerfileLines = [
      "# Set default shell for vscode user",
      "USER root",
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
    ["firewall.domain", new FirewallDomainHandler()],
    ["firewall.github", new FirewallGithubHandler()],
    ["sudo.disable", new SudoDisableHandler()],
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
