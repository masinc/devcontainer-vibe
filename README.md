# Devcontainer Vibe

A Deno-based tool for generating customized devcontainer environments from
declarative configuration files.

## Features

- 🛠️ **Component-based architecture** - Modular components for different tools
  and services
- 📦 **Multiple package managers** - Support for apt, mise, and Nix
- 🔥 **Firewall configuration** - Built-in firewall setup with domain
  allowlisting
- 🎨 **VS Code integration** - Automatic extension installation and
  configuration
- 🐚 **Shell customization** - Support for bash, fish, and zsh
- ✅ **Type-safe configuration** - Zod v4 schema validation
- 🧪 **Comprehensive testing** - Full test coverage with examples

## Installation

### From JSR (Recommended)

```bash
# Generate sample configuration first
deno run jsr:@masinc/devcontainer-vibe --init minimal
# or
deno run jsr:@masinc/devcontainer-vibe --init deno

# Overwrite existing configuration file
deno run jsr:@masinc/devcontainer-vibe --init deno --overwrite

# Then generate devcontainer
deno run jsr:@masinc/devcontainer-vibe --config devcontainer-config.json
```

### From Source

```bash
# Clone the repository
git clone https://github.com/masinc/devcontainer-vibe.git
cd devcontainer-vibe

# Generate devcontainer from example configuration
deno task generate --config examples/minimal.json

# Generate to specific output directory
deno task generate --config examples/deno.json --output my-devcontainer

# Run tests
deno task test
```

## Basic Configuration

```json
{
  "name": "my-project",
  "description": "My development environment",
  "components": [
    {
      "name": "apt.install",
      "params": {
        "packages": ["git", "curl", "ripgrep"]
      }
    },
    "mise.setup",
    {
      "name": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts"]
      }
    },
    {
      "name": "shell.post-create",
      "params": {
        "user": "vscode",
        "commands": ["echo 'Setup complete!'", "npm install -g typescript"]
      }
    }
  ]
}
```

### Advanced Shell Post-Create Usage

The `shell.post-create` component supports multiple instances and user-specific
script generation:

```json
{
  "components": [
    {
      "name": "shell.post-create",
      "params": {
        "user": "vscode",
        "commands": ["npm install", "git config --global user.name 'Dev User'"]
      }
    },
    {
      "name": "shell.post-create",
      "params": {
        "user": "root",
        "commands": ["systemctl enable docker", "service nginx start"]
      }
    },
    {
      "name": "shell.post-create",
      "params": {
        "user": "vscode",
        "commands": ["code --install-extension ms-python.python"]
      }
    }
  ]
}
```

This generates separate script files:

- `shell-post-create-vscode.sh` - Combined vscode user commands
- `shell-post-create-root.sh` - Root user commands
- Execution: `vscode script && sudo root script`

## Available Components

### Package Management

- `apt.install` - System packages (multiple use allowed)
- `mise.setup` - Runtime management setup (single use only)
- `mise.install` - Runtime packages (multiple use allowed)
- `nix.setup` - Nix with Home Manager setup (single use only)
- `nix.install` - Nix packages (multiple use allowed)

### Security & Firewall

- `firewall.setup` - Basic firewall setup with ipset (single use only)
- `firewall.domain` - Domain-based firewall rules with auto-execution (multiple use allowed)
- `firewall.github-api` - GitHub API IP ranges with auto-execution (single use only)
- `sudo.disable` - Security hardening (single use only)

### Development Environment

- `vscode.install` - VS Code extensions (multiple use allowed)
- `shell.setup` - Shell configuration (single use only)
- `shell.dockerfile` - Custom shell commands in Dockerfile (multiple use
  allowed)
- `shell.post-create` - Custom shell commands after container creation (multiple
  use allowed)

### Component Usage Rules

- **Single use only**: Setup components can only be used once per configuration
- **Multiple use allowed**: Install and command components can be used multiple
  times
- **Automatic merging**: Multiple uses of the same component are automatically
  merged

## CLI Usage

```bash
# Basic usage
devcontainer-vibe --config config.json

# Specify output directory
devcontainer-vibe --config config.json --output my-project

# Force overwrite existing directory
devcontainer-vibe --config config.json --output existing-dir --overwrite

# Show help
devcontainer-vibe --help
```

## Documentation

- **[Configuration Format](docs/config-format.md)** - Complete guide to
  configuration file format
- **[CLI Options](docs/cli-options.md)** - Detailed command-line options
  documentation
- **[日本語ドキュメント](README.ja.md)** - Japanese documentation

## Development

```bash
# Development with hot reload
deno task dev

# Generate devcontainer (safe - outputs to generated-devcontainer)
deno task generate

# Generate to production .devcontainer directory
deno task generate:prod

# Run tests
deno task test
```

## Requirements

- Deno 2.0+
- Write permissions for output directory

## License

MIT License - see LICENSE file for details
