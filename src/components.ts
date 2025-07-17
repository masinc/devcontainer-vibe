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
  readonly isSingleUse: boolean;
}

// 基本的なコンポーネントハンドラー
export abstract class BaseComponentHandler implements ComponentHandler {
  abstract handle(component: Component | SimpleComponent): ComponentResult;
  abstract readonly isSingleUse: boolean;

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
  readonly isSingleUse = false;
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

// Nix セットアップ（Home-Manager対応）
export class NixSetupHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "# Create nix directory and set ownership",
      "USER root",
      "RUN mkdir -p /nix && chown -R vscode:vscode /nix",
      "",
      "# Install Nix as vscode user in single-user mode",
      "USER vscode",
      "RUN <<-EOS",
      "    set -eux;",
      "    # Install Nix as vscode user in single-user mode",
      "    curl -L https://nixos.org/nix/install | sh -s -- --no-daemon;",
      "    # Source the Nix environment",
      "    . ~/.nix-profile/etc/profile.d/nix.sh;",
      "    # Create necessary directories",
      "    mkdir -p ~/.config/home-manager ~/.config/fish/conf.d;",
      "EOS",
      "",
      "# Set environment variables for Nix (vscode user paths)",
      'ENV PATH="/home/vscode/.nix-profile/bin:${PATH}"',
      "",
      "# Initialize Home Manager as vscode user with cache for package downloads",
      "RUN --mount=target=/tmp/nix-download-cache,type=cache,sharing=locked \\",
      "    <<-EOS",
      "    set -uex;",
      "    export USER=vscode;",
      "    # Source Nix environment for vscode user",
      "    . ~/.nix-profile/etc/profile.d/nix.sh;",
      "    # Verify nix is available",
      "    nix --version;",
      "    # Set up Home Manager channel",
      "    nix-channel --add https://github.com/nix-community/home-manager/archive/master.tar.gz home-manager;",
      "    nix-channel --update;",
      "    # Install Home Manager",
      "    nix-shell '<home-manager>' -A install;",
      "EOS",
      "",
      "USER root",
    ];

    const devcontainerConfig = {
      mounts: [
        "source=nix-store-${devcontainerId},target=/nix/store,type=volume",
        "source=nix-profile-${devcontainerId},target=/home/vscode/.nix-profile,type=volume",
        "source=home-manager-config-${devcontainerId},target=/home/vscode/.config/home-manager,type=volume",
      ],
      remoteEnv: {
        "PATH": "/home/vscode/.nix-profile/bin:${containerEnv:PATH}",
      },
    };

    return this.createResult(dockerfileLines, devcontainerConfig);
  }
}

// Nix パッケージインストール（Home-Manager対応）
export class NixInstallHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("nix.install requires parameters");
    }

    if (component.name !== "nix.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages;
    const packageList = packages.map((pkg) => `    pkgs.${pkg}`).join("\n");

    // Home-Manager設定ファイルを生成
    const homeManagerConfig = `{ config, pkgs, ... }:

{
  # Home Manager configuration
  home.username = "vscode";
  home.homeDirectory = "/home/vscode";
  
  # Package installation
  home.packages = with pkgs; [
${packageList}
  ];
  
  # Let Home Manager install and manage itself
  programs.home-manager.enable = true;
  
  # Home Manager state version
  home.stateVersion = "24.11";
}
`;

    const dockerfileLines = [
      "# Copy Home Manager configuration",
      "USER vscode",
      "RUN cp /usr/local/scripts/home-manager-config.nix ~/.config/home-manager/home.nix",
      "# Apply Home Manager configuration",
      "RUN --mount=target=/tmp/nix-download-cache,type=cache,sharing=locked \\",
      "    <<-EOS",
      "    set -uex;",
      "    export USER=vscode;",
      "    # Source Nix environment for vscode user",
      "    . ~/.nix-profile/etc/profile.d/nix.sh;",
      "    # Apply Home Manager configuration",
      "    home-manager switch;",
      "EOS",
      "USER root",
    ];

    const devcontainerConfig = {
      mounts: [
        "source=nix-store-${devcontainerId},target=/nix/store,type=volume",
        "source=nix-profile-${devcontainerId},target=/home/vscode/.nix-profile,type=volume",
        "source=home-manager-config-${devcontainerId},target=/home/vscode/.config/home-manager,type=volume",
      ],
      remoteEnv: {
        "PATH": "/home/vscode/.nix-profile/bin:${containerEnv:PATH}",
      },
    };

    const scripts = {
      "home-manager-config.nix": homeManagerConfig,
    };

    return this.createResult(dockerfileLines, devcontainerConfig, scripts);
  }
}

// ファイアウォール セットアップ
export class FirewallSetupHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y iptables ipset dnsutils curl jq",
    ];

    const devcontainerConfig = {
      runArgs: ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"],
    };

    const scripts = {
      "firewall-setup.sh": `#!/usr/bin/sudo /bin/bash
set -euo pipefail
IFS=$'\\n\\t'

# Basic firewall setup with ipset support (run as root via sudo shebang)

# Flush existing rules and clean up
echo "🧹 Cleaning up existing firewall rules..."
iptables -F || true
iptables -X || true
iptables -t nat -F || true
iptables -t nat -X || true
iptables -t mangle -F || true
iptables -t mangle -X || true

# Destroy existing ipsets
ipset destroy firewall-allowed-domains 2>/dev/null || true

# Create ipset for allowed domains (using hash:net for CIDR support)
echo "📋 Creating ipset for allowed domains..."
ipset create firewall-allowed-domains hash:net

# Allow DNS and SSH before setting restrictive policies
echo "🌐 Setting up DNS and SSH access..."
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m conntrack --ctstate ESTABLISHED -j ACCEPT

# Allow loopback interface (localhost communication)
echo "🔄 Setting up loopback interface..."
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Detect and allow host network
echo "🏠 Detecting host network..."
HOST_IP=\$(ip route | grep default | awk '{print \$3}')
if [ -n "\$HOST_IP" ]; then
    HOST_NETWORK=\$(echo "\$HOST_IP" | sed 's/\\.[0-9]*\$/\\.0\\/24/')
    echo "Host network detected: \$HOST_NETWORK"
    iptables -A INPUT -s "\$HOST_NETWORK" -j ACCEPT
    iptables -A OUTPUT -d "\$HOST_NETWORK" -j ACCEPT
else
    echo "⚠️  Warning: Could not detect host network"
fi

# Set default policies to DROP
echo "🛡️  Setting restrictive default policies..."
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow established and related connections (both directions)
echo "🔗 Setting up established connection rules..."
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Set up output rule for allowed domains ipset
echo "✅ Setting up allowed domains rule..."
iptables -A OUTPUT -m set --match-set firewall-allowed-domains dst -j ACCEPT

echo "🎉 Basic firewall setup complete!"
echo "📝 Use firewall.domain and firewall.github-api components to add allowed domains"

# Test firewall is working by verifying example.com is blocked
echo "🧪 Testing firewall configuration..."
if timeout 5 curl -s https://example.com >/dev/null 2>&1; then
    echo "❌ ERROR: Firewall test failed - example.com should be blocked but is accessible"
    exit 1
else
    echo "✅ SUCCESS: Firewall test passed - example.com is properly blocked"
fi
`,
    };

    return this.createResult(dockerfileLines, devcontainerConfig, scripts);
  }
}

// ファイアウォール ドメイン設定（統合版）
export class FirewallDomainHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
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

    // ドメインを解決してipsetに追加するスクリプトを生成
    const domainResolutionScript = uniqueDomains.map((domain) => `
echo "🔍 Resolving ${domain}..."
IPS=$(dig +short A ${domain})
if [ -n "$IPS" ]; then
  for IP in $IPS; do
    if [[ $IP =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
      echo "📍 Adding IP $IP for ${domain} to ipset"
      ipset add firewall-allowed-domains "$IP" 2>/dev/null || echo "⚠️  IP $IP already exists in ipset"
    fi
  done
else
  echo "⚠️  Failed to resolve ${domain}"
fi`).join("\n");

    const scripts = {
      "firewall-domain.sh": `#!/usr/bin/sudo /bin/bash
# Allow specific domains by adding their IPs to ipset (run as root via sudo shebang)
set -euo pipefail
IFS=$'\\n\\t'

echo "🌐 Resolving and adding domains to ipset..."
${domainResolutionScript}

echo "✅ Domain IPs added to firewall-allowed-domains ipset"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// GitHub動的IP範囲取得ファイアウォール設定
export class FirewallGithubApiHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const scripts = {
      "firewall-github-dynamic.sh": `#!/usr/bin/sudo /bin/bash
# GitHub dynamic IP ranges from API (run as root via sudo shebang)
set -euo pipefail
IFS=$'\\n\\t'

echo "🐙 Fetching GitHub IP ranges from API..."

# Fetch GitHub meta information
GITHUB_META=$(curl -s https://api.github.com/meta)
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch GitHub IP ranges"
  exit 1
fi

# Validate JSON response
if ! echo "$GITHUB_META" | jq -e '.web and .api and .git' >/dev/null 2>&1; then
  echo "❌ Invalid GitHub API response format"
  exit 1
fi

echo "📋 Processing GitHub IP ranges and adding to ipset..."

# Extract and add web, API, and git IP ranges to ipset
for RANGE_TYPE in web api git; do
  echo "🔍 Processing $RANGE_TYPE ranges..."
  echo "$GITHUB_META" | jq -r --arg range "$RANGE_TYPE" '.[$range][]' | while read -r CIDR; do
    if [[ $CIDR =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+$ ]]; then
      echo "📍 Adding GitHub $RANGE_TYPE range: $CIDR to ipset"
      ipset add firewall-allowed-domains "$CIDR" 2>/dev/null || echo "⚠️  Range $CIDR already exists in ipset"
    else
      echo "⚠️  Invalid CIDR range: $CIDR"
    fi
  done
done

echo "✅ GitHub dynamic IP ranges added to firewall-allowed-domains ipset"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// sudo無効化コンポーネント
export class SudoDisableHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const scripts = {
      "disable-sudo.sh": `#!/usr/bin/sudo /bin/bash
# Disable sudo access for security
set -eux

echo "🔒 Disabling sudo access to prevent privilege escalation..."

# Remove sudo access by clearing sudoers entries for vscode user
sed -i '/vscode/d' /etc/sudoers || true
rm -f /etc/sudoers.d/vscode || true

# Make sudo binary unusable for non-root users
chmod 700 /usr/bin/sudo || true

echo "🔐 sudo access disabled - system is now locked down"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// VS Code 拡張機能インストール
export class VscodeInstallHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
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
      "    export PATH=\"/home/vscode/.local/share/mise/shims:$PATH\";",
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
    ["firewall.github-api", new FirewallGithubApiHandler()],
    ["sudo.disable", new SudoDisableHandler()],
    ["vscode.install", new VscodeInstallHandler()],
    ["shell.setup", new ShellSetupHandler()],
    ["shell.dockerfile", new ShellDockerfileHandler()],
    ["shell.post-create", new ShellPostCreateHandler()],
  ]);

  getHandler(componentType: string): ComponentHandler {
    const handler = this.handlers.get(componentType);
    if (!handler) {
      throw new Error(`Unknown component type: ${componentType}`);
    }
    return handler;
  }
}
