# Configuration Format Documentation

This document provides a comprehensive guide to the configuration format used by
the Devcontainer Generator.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Configuration Schema](#configuration-schema)
- [Component Types](#component-types)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Validation](#validation)
- [Examples](#examples)

## Basic Structure

The configuration file is a JSON document that defines the structure and
components of your devcontainer environment. Here's the basic structure:

```json
{
  "name": "string",
  "description": "string (optional)",
  "components": [
    // Array of component objects and strings
  ]
}
```

### Root Properties

| Property      | Type     | Required | Description                              |
| ------------- | -------- | -------- | ---------------------------------------- |
| `name`        | `string` | ✅       | The name of the devcontainer environment |
| `description` | `string` | ❌       | Optional description of the environment  |
| `components`  | `array`  | ✅       | Array of components to install/configure |

## Configuration Schema

The configuration is validated using Zod v4 schema validation. The schema
ensures type safety and provides helpful error messages for invalid
configurations.

### Component Schema

Components can be either:

1. **Simple components** (string) - Components with no parameters
2. **Complex components** (object) - Components with parameters

```typescript
// Simple component
"mise.setup"

// Complex component
{
  "component": "apt.install",
  "params": {
    "packages": ["git", "curl"]
  }
}
```

## Component Types

### 1. System Package Installation

#### `apt.install`

Installs system packages using the APT package manager.

```json
{
  "component": "apt.install",
  "params": {
    "packages": ["git", "curl", "ripgrep", "fd-find", "iptables"]
  }
}
```

**Parameters:**

- `packages` (array of strings): List of APT package names to install

**Generated Docker Commands:**

```dockerfile
RUN apt-get update && apt-get install -y \
    git curl ripgrep fd-find iptables \
    && rm -rf /var/lib/apt/lists/*
```

### 2. Runtime Management (mise)

#### `mise.setup`

Installs the mise runtime version manager.

```json
"mise.setup"
```

**Parameters:** None

**Generated Docker Commands:**

```dockerfile
RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:$PATH"
```

#### `mise.install`

Installs language runtimes using mise.

```json
{
  "component": "mise.install",
  "params": {
    "packages": ["deno@latest", "node@lts", "python@3.12"]
  }
}
```

**Parameters:**

- `packages` (array of strings): List of runtime specifications in format
  `tool@version`

**Generated Docker Commands:**

```dockerfile
RUN mise use -g deno@latest
RUN mise use -g node@lts
RUN mise use -g python@3.12
```

### 3. Package Management (Nix)

#### `nix.setup`

Installs the Nix package manager.

```json
"nix.setup"
```

**Parameters:** None

**Generated Docker Commands:**

```dockerfile
RUN curl -L https://nixos.org/nix/install | sh -s -- --daemon
ENV PATH="/nix/var/nix/profiles/default/bin:$PATH"
```

#### `nix.install`

Installs packages using Nix.

```json
{
  "component": "nix.install",
  "params": {
    "packages": ["starship", "fish", "ripgrep"]
  }
}
```

**Parameters:**

- `packages` (array of strings): List of Nix package names

**Generated Docker Commands:**

```dockerfile
RUN nix-env -iA nixpkgs.starship nixpkgs.fish nixpkgs.ripgrep
```

### 4. Firewall Configuration

#### `firewall.setup`

Sets up basic firewall rules.

```json
"firewall.setup"
```

**Parameters:** None

**Generated Files:**

- `scripts/firewall-setup.sh`: Basic iptables configuration script

#### `firewall.domains`

Configures firewall to allow specific domains.

```json
{
  "component": "firewall.domains",
  "params": {
    "domains": ["github.com", "deno.land", "jsr.io", "registry.npmjs.org"]
  }
}
```

**Parameters:**

- `domains` (array of strings): List of domain names to allow

**Generated Files:**

- `scripts/firewall-domains.sh`: Domain-specific firewall rules

### 5. VS Code Extensions

#### `vscode.install`

Installs VS Code extensions in the devcontainer.

```json
{
  "component": "vscode.install",
  "params": {
    "extensions": [
      "denoland.vscode-deno",
      "esbenp.prettier-vscode",
      "eamodio.gitlens"
    ]
  }
}
```

**Parameters:**

- `extensions` (array of strings): List of VS Code extension IDs

**Generated Configuration:**

```json
{
  "customizations": {
    "vscode": {
      "extensions": ["denoland.vscode-deno", "esbenp.prettier-vscode"]
    }
  }
}
```

### 6. Shell Configuration

#### `shell.setup`

Sets the default shell for the vscode user.

```json
{
  "component": "shell.setup",
  "params": {
    "shell": "fish"
  }
}
```

**Parameters:**

- `shell` (enum): One of `"bash"`, `"fish"`, or `"zsh"`

**Generated Docker Commands:**

```dockerfile
RUN chsh -s /bin/fish vscode
```

## Advanced Usage

### Component Order

Components are processed in the order they appear in the configuration. This is
important for dependencies:

```json
{
  "components": [
    "mise.setup", // Install mise first
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    }, // Then install runtimes
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    } // Finally configure shell
  ]
}
```

### Combining Package Managers

You can use multiple package managers in the same configuration:

```json
{
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    },
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship"]
      }
    }
  ]
}
```

### Environment-Specific Configurations

Create different configurations for different environments:

```bash
# Development environment
deno task generate --config configs/development.json

# Production environment
deno task generate --config configs/production.json

# Testing environment
deno task generate --config configs/testing.json
```

## Best Practices

### 1. Logical Grouping

Group related components together:

```json
{
  "components": [
    // System packages first
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "build-essential"]
      }
    },

    // Runtime management
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts"]
      }
    },

    // Development tools
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship", "fish"]
      }
    },

    // Security configuration
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": ["github.com", "deno.land"]
      }
    },

    // IDE configuration
    {
      "component": "vscode.install",
      "params": {
        "extensions": ["denoland.vscode-deno"]
      }
    },

    // Shell configuration last
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    }
  ]
}
```

### 2. Minimal Dependencies

Only include packages and tools you actually need:

```json
// Good - minimal and focused
{
  "name": "deno-api",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    }
  ]
}

// Avoid - too many unnecessary tools
{
  "name": "deno-api",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "vim", "emacs", "nano", "htop", "tree", "jq"]
      }
    }
  ]
}
```

### 3. Version Pinning

Use specific versions for reproducible builds:

```json
{
  "component": "mise.install",
  "params": {
    "packages": [
      "deno@1.45.5", // Specific version
      "node@20.15.0", // Specific version
      "python@3.12.0" // Specific version
    ]
  }
}
```

### 4. Descriptive Names

Use clear, descriptive names for your configurations:

```json
{
  "name": "deno-web-api-development",
  "description": "Development environment for Deno web API with TypeScript, testing, and debugging tools"
}
```

## Validation

The configuration is validated using Zod schemas. Common validation errors:

### Invalid Component Type

```json
{
  "component": "invalid.component", // ❌ Unknown component
  "params": {}
}
```

### Missing Required Parameters

```json
{
  "component": "apt.install" // ❌ Missing required 'params'
}
```

### Invalid Parameter Types

```json
{
  "component": "apt.install",
  "params": {
    "packages": "git" // ❌ Should be array, not string
  }
}
```

### Invalid Shell Option

```json
{
  "component": "shell.setup",
  "params": {
    "shell": "powershell" // ❌ Must be 'bash', 'fish', or 'zsh'
  }
}
```

## Examples

### Minimal Deno Development

```json
{
  "name": "minimal-deno",
  "description": "Minimal Deno development environment",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    },
    {
      "component": "vscode.install",
      "params": {
        "extensions": ["denoland.vscode-deno"]
      }
    }
  ]
}
```

### Full-Stack Development

```json
{
  "name": "fullstack-development",
  "description": "Complete full-stack development environment",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "ripgrep", "fd-find", "iptables"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts", "python@3.12"]
      }
    },
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship", "fish"]
      }
    },
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": [
          "github.com",
          "deno.land",
          "jsr.io",
          "registry.npmjs.org",
          "pypi.org"
        ]
      }
    },
    {
      "component": "vscode.install",
      "params": {
        "extensions": [
          "denoland.vscode-deno",
          "esbenp.prettier-vscode",
          "eamodio.gitlens",
          "ms-python.python"
        ]
      }
    },
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    }
  ]
}
```

### Security-Focused Environment

```json
{
  "name": "secure-development",
  "description": "Security-focused development environment with restricted network access",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "iptables", "fail2ban"]
      }
    },
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": [
          "github.com",
          "api.github.com",
          "deno.land",
          "jsr.io"
        ]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@1.45.5"]
      }
    }
  ]
}
```

For more examples, see the `examples/` directory in the project root.
