FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

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
        jq \
        fzf \
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

    mkdir -p /etc/fish/ /etc/fish/completions/
EOS

# Install Mise CLI
RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \
    --mount=target=/var/cache/apt,type=cache,sharing=locked \
    <<-EOS

    set -eux;
    install -dm 755 /etc/apt/keyrings &&
    wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null &&
    echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main" | tee /etc/apt/sources.list.d/mise.list

    apt update &&
    apt install -y \
        mise;

    # Install Deno with mise (for root user)
    mise use -g deno@2
EOS

USER vscode
WORKDIR /home/vscode

# Ensure proper ownership of home directory
USER vscode

# Create user directories
RUN <<-EOS
    set -eux;
    mkdir -p \
        ~/.config/fish/ \
        ~/.config/fish/completions/

    # Setup mise activation
    echo 'eval "$(mise activate fish)"' >> ~/.config/fish/config.fish
EOS

# Install all user tools with single mount
RUN --mount=target=/home/vscode/.cache/mise,type=cache,sharing=locked,uid=1000,gid=1000 <<-EOS
    set -eux;
    export MISE_VERBOSE=1;

    # Install basic tools
    mise use -g usage@2;

    # Setup mise completion
    mise completion fish > ~/.config/fish/completions/mise.fish;

    # Install development tools
    mise use -g task@3;
    mise use -g gh@2;

    # Setup gh completion
    $(mise which gh) completion -s fish > ~/.config/fish/completions/gh.fish;

    # Install file tools
    mise use -g ghq@1;
    mise use -g fd;
    mise use -g ripgrep;
    mise use -g ripgrep-all;
    mise use -g yq;
    mise use -g yazi;
    mise use -g bat;        

    mise use -g eza;
    echo 'abbr -a ls "eza"' >> ~/.config/fish/config.fish;
    echo 'abbr -a ll "eza --long --group-directories-first"' >> ~/.config/fish/config.fish;
    echo 'abbr -a la "eza --long --group-directories-first --all"' >> ~/.config/fish/config.fish;

    # Install neovim
    mise use -g neovim@stable;
    echo 'abbr -a vim "nvim"' >> ~/.config/fish/config.fish;
    echo 'abbr -a vi "nvim"' >> ~/.config/fish/config.fish;

    # Install starship
    mise use -g starship@1;

    echo 'eval "$(starship init fish)"' >> ~/.config/fish/config.fish;

    # TypeScript
    mise use -g node@24;
    mise use -g pnpm@10;
    mise use -g deno@2;

    # Python
    mise use -g python@3.12;
    mise use -g pipx@1;
    mise use -g uv@0.7;

    # VibeCoding
    mise use -g npm:@anthropic-ai/claude-code;
    mise use -g npm:@google/gemini-cli;
    :
EOS

# Copy scripts
USER root
COPY scripts/ /usr/local/scripts/
RUN <<-EOS
    set -eux;
    chmod +x /usr/local/scripts/*.ts;
    chown -R vscode:vscode /home/vscode;
EOS

USER vscode
CMD ["/usr/bin/fish"]
