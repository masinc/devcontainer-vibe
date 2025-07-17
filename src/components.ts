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
      "    set -ex;",
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
      "    set -ex;",
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
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y iptables",
      "RUN echo 'vscode ALL=(root) NOPASSWD:ALL' > /etc/sudoers.d/vscode && \\",
      "    chmod 0440 /etc/sudoers.d/vscode",
    ];

    const devcontainerConfig = {
      runArgs: ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"],
    };

    const scripts = {
      "firewall-setup.sh": `#!/usr/bin/sudo /bin/bash
set -eux
# Basic firewall setup (run as root via sudo shebang)
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
`,
    };

    return this.createResult(dockerfileLines, devcontainerConfig, scripts);
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
IPS=$(dig +short A ${domain})
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

    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y dnsutils",
      "RUN echo 'vscode ALL=(root) NOPASSWD:ALL' > /etc/sudoers.d/vscode && \\",
      "    chmod 0440 /etc/sudoers.d/vscode",
    ];

    const scripts = {
      "firewall-domain.sh": `#!/usr/bin/sudo /bin/bash
# Allow specific domains by resolving their IP addresses (run as root via sudo shebang)
set -eux

echo "🌐 Resolving and allowing domains..."
${domainResolutionScript}

echo "✅ Domain firewall rules applied"
`,
    };

    return this.createResult(dockerfileLines, {}, scripts);
  }
}

// GitHub動的IP範囲取得ファイアウォール設定
export class FirewallGithubApiHandler extends BaseComponentHandler {
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y curl jq",
      "RUN echo 'vscode ALL=(root) NOPASSWD:ALL' > /etc/sudoers.d/vscode && \\",
      "    chmod 0440 /etc/sudoers.d/vscode",
    ];

    const scripts = {
      "firewall-github-dynamic.sh": `#!/usr/bin/sudo /bin/bash
# GitHub dynamic IP ranges from API (run as root via sudo shebang)
set -eux

echo "🐙 Fetching GitHub IP ranges from API..."

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

    return this.createResult(dockerfileLines, {}, scripts);
  }
}

// sudo無効化コンポーネント
export class SudoDisableHandler extends BaseComponentHandler {
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

    const devcontainerConfig = {
      remoteEnv: {
        "SHELL": `/bin/${shell}`,
      },
    };

    return this.createResult(dockerfileLines, devcontainerConfig);
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
  ]);

  getHandler(componentType: string): ComponentHandler {
    const handler = this.handlers.get(componentType);
    if (!handler) {
      throw new Error(`Unknown component type: ${componentType}`);
    }
    return handler;
  }
}
