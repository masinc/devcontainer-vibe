FROM mcr.microsoft.com/devcontainers/base:jammy

ARG TZ
ENV TZ=${TZ:-UTC}

USER root
# Install system packages
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    <<-EOS
    set -eux;
    apt-get update &&
    apt-get install -y --no-install-recommends \
        ca-certificates \
        fish \
        curl \
        git \
        libssl-dev \
        make \
        pkg-config \
        python3-full \
        python3-pip \
        software-properties-common \
        build-essential \
        iptables \
        ipset \
        iproute2 \
        dnsutils \
        aggregate \
        apt-transport-https \
        gnupg \
        lsb-release \
        sudo;
    
    mkdir -p /etc/fish/ /etc/fish/completions/;
    mkdir -p /nix && chown -R vscode:vscode /nix
EOS


# Install Mise CLI
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    <<-EOS
    set -eux;
    install -dm 755 /etc/apt/keyrings &&
    wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null &&
    echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main" | tee /etc/apt/sources.list.d/mise.list &&
    apt update &&
    apt install -y mise

    # Install for root user
    mise use -g deno@2;
EOS

# Switch to vscode user and install Nix
USER vscode
RUN <<-EOS
    set -eux;
    
    # Install Nix as vscode user in single-user mode
    curl -L https://nixos.org/nix/install | sh -s -- --no-daemon;
    
    # Source the Nix environment
    . ~/.nix-profile/etc/profile.d/nix.sh;
    
    # Create necessary directories
    mkdir -p ~/.config/home-manager ~/.config/fish/conf.d;
EOS

# Set environment variables for Nix (vscode user paths)
ENV PATH="/home/vscode/.nix-profile/bin:${PATH}"

# Initialize Home Manager as vscode user with cache for package downloads
RUN --mount=target=/tmp/nix-download-cache,type=cache,sharing=locked \
    <<-EOS
    set -ex;
    export USER=vscode;
    
    # Source Nix environment for vscode user
    . ~/.nix-profile/etc/profile.d/nix.sh;
    
    # Verify nix is available
    nix --version;
    
    # Set up Home Manager channel
    nix-channel --add https://github.com/nix-community/home-manager/archive/master.tar.gz home-manager;
    nix-channel --update;
    
    # Install Home Manager
    nix-shell '<home-manager>' -A install;
EOS

# Copy all configurations
COPY --chown=vscode:vscode config/ /home/vscode/.config/
RUN --mount=target=/tmp/nix-download-cache,type=cache,sharing=locked \
    <<-EOS
    set -ex;
    export USER=vscode;
    
    # Source Nix environment for vscode user
    . ~/.nix-profile/etc/profile.d/nix.sh;
    
    # Apply Home Manager configuration
    home-manager switch;
EOS

# Install languages with mise
RUN --mount=target=/home/vscode/.cache/mise,type=cache,sharing=locked,uid=1000,gid=1000 \
    <<-EOS
    set -ex;
    export USER=vscode;
    
    # Source Nix and mise environment
    . ~/.nix-profile/etc/profile.d/nix.sh;
    
    mise use -g node@24;
    mise use -g deno@2;
    mise use -g python@3.12;
    mise use -g pipx@1;
    mise use -g uv@0.7;
    mise install;

    mise use -g npm:@anthropic-ai/claude-code;
    mise use -g npm:@google/gemini-cli
    mise install;

    # Add pipx to PATH for current session
    export PATH="$HOME/.local/bin:$PATH";
    
    # Verify installations
    mise list;
EOS

# Set fish as default shell for vscode user
USER root
RUN <<-EOS
    usermod -s /usr/bin/fish vscode
    
    # Ensure scripts are executable and owned by vscode
    chmod +x /usr/local/scripts/*.ts;
    chown -R vscode:vscode /home/vscode;
EOS

COPY scripts/ /usr/local/scripts/

USER vscode
CMD ["/usr/bin/fish"]
