import type { Component, SimpleComponent } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

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
