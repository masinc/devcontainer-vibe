# Devcontainer Generator

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

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd devcontainer-generator

# Generate devcontainer from example configuration
deno task generate --config examples/minimal.json

# Generate to specific output directory
deno task generate --config examples/deno-project.json --output my-devcontainer

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
    }
  ]
}
```

## Available Components

- `apt.install` - System packages
- `mise.setup` / `mise.install` - Runtime management
- `nix.setup` / `nix.install` - Nix packages
- `firewall.setup` / `firewall.domain` - Security
- `vscode.install` - VS Code extensions
- `shell.setup` - Shell configuration

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
