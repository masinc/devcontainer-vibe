# CLI Options Documentation

This document provides detailed information about all command-line options
available in the Devcontainer Generator.

## Table of Contents

- [Overview](#overview)
- [Global Options](#global-options)
- [Usage Examples](#usage-examples)
- [Configuration File Discovery](#configuration-file-discovery)
- [Output Directory Behavior](#output-directory-behavior)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)

## Overview

The Devcontainer Generator provides a simple command-line interface with three
main options:

```bash
deno run --allow-read --allow-write src/main.ts [options]
```

## Global Options

### `--config` / `-c`

**Type:** `string`\
**Default:** `devcontainer-config.json`\
**Required:** No

Specifies the path to the configuration file that defines the devcontainer
environment.

#### Behavior

- **Relative paths**: Resolved relative to the current working directory
- **Absolute paths**: Used as-is
- **Default behavior**: If not specified, looks for `devcontainer-config.json`
  in the current directory
- **File validation**: The file must exist and be readable, or the command will
  fail

#### Examples

```bash
# Use default configuration file
deno task generate

# Use relative path
deno task generate --config my-config.json
deno task generate --config configs/development.json
deno task generate --config ../shared-configs/deno.json

# Use absolute path
deno task generate --config /home/user/configs/production.json

# Use short flag
deno task generate -c examples/minimal.json
```

#### Error Conditions

The command will fail if:

- The specified file doesn't exist
- The file is not readable (permission issues)
- The file is not valid JSON
- The JSON doesn't match the expected schema

```bash
# File not found
$ deno task generate --config nonexistent.json
❌ Error: No such file or directory (os error 2)

# Invalid JSON
$ deno task generate --config invalid.json
❌ Error: Unexpected token '}' in JSON at position 45

# Schema validation error
$ deno task generate --config invalid-schema.json
❌ Error: Invalid input: Expected object, received string at "components[0]"
```

### `--output` / `-o`

**Type:** `string`\
**Default:** `.devcontainer`\
**Required:** No

Specifies the output directory where the generated devcontainer files will be
created.

#### Behavior

- **Directory creation**: Creates the directory if it doesn't exist
- **Existence check**: Throws an error if the directory already exists (safety
  feature)
- **Relative paths**: Resolved relative to the current working directory
- **Absolute paths**: Used as-is
- **Permissions**: Requires write permissions in the parent directory

#### Examples

```bash
# Use default output directory
deno task generate --config my-config.json
# Output: .devcontainer/

# Use custom output directory
deno task generate --config my-config.json --output my-devcontainer
# Output: my-devcontainer/

# Use relative path
deno task generate --config my-config.json --output containers/development
# Output: containers/development/

# Use absolute path
deno task generate --config my-config.json --output /tmp/test-container
# Output: /tmp/test-container/

# Use short flag
deno task generate -c my-config.json -o test-output
# Output: test-output/
```

#### Safety Features

The generator includes safety features to prevent accidental overwrites:

```bash
# First run - creates directory
$ deno task generate --config my-config.json --output test-container
✅ Devcontainer generated successfully!

# Second run - fails with error
$ deno task generate --config my-config.json --output test-container
❌ Error: Output directory 'test-container' already exists. Please remove it or use a different output directory.
```

#### Generated Structure

The output directory will contain:

```
output-directory/
├── Dockerfile              # Generated Dockerfile
├── devcontainer.json       # VS Code devcontainer configuration
└── scripts/               # Initialization scripts (if any)
    ├── firewall-setup.sh   # Firewall configuration
    └── firewall-domains.sh # Domain allowlist
```

### `--help` / `-h`

**Type:** `boolean`\
**Default:** `false`\
**Required:** No

Shows help information and exits.

#### Behavior

- **Precedence**: Takes precedence over all other options
- **Exit code**: Exits with code 0 (success)
- **Output**: Prints usage information to stdout

#### Example

```bash
$ deno task generate --help
Devcontainer Generator - Generate devcontainer from configuration

Usage:
  deno run src/main.ts [options]

Options:
  --config <path>    Configuration file path (default: devcontainer-config.json)
  --output <path>    Output directory (default: .devcontainer)
  --help             Show this help message

Examples:
  deno run src/main.ts --config my-config.json --output my-devcontainer
  deno run src/main.ts --config examples/deno-project.json
```

## Usage Examples

### Basic Usage

```bash
# Generate with default settings
deno task generate

# Equivalent to:
deno run --allow-read --allow-write src/main.ts --config devcontainer-config.json --output .devcontainer
```

### Development Workflow

```bash
# Development (safe output to avoid overwriting actual .devcontainer)
deno task generate --config examples/deno-project.json --output dev-container

# Testing different configurations
deno task generate --config configs/minimal.json --output test-minimal
deno task generate --config configs/full.json --output test-full
deno task generate --config configs/secure.json --output test-secure

# Production deployment
deno task generate:prod --config production.json
```

### Project-Specific Configurations

```bash
# Frontend project
deno task generate --config frontend.json --output .devcontainer-frontend

# Backend project
deno task generate --config backend.json --output .devcontainer-backend

# Full-stack project
deno task generate --config fullstack.json --output .devcontainer-fullstack
```

### Team Collaboration

```bash
# Shared team configuration
deno task generate --config team-configs/shared.json --output .devcontainer

# Individual developer preferences
deno task generate --config team-configs/shared.json --output .devcontainer-$(whoami)
```

## Configuration File Discovery

The generator follows this priority order for configuration files:

1. **Command-line argument**: `--config` option takes highest priority
2. **Current directory**: `devcontainer-config.json` in the current working
   directory
3. **Error**: If no configuration is found, the command fails

### Search Paths

```bash
# These are searched in order:
1. ./devcontainer-config.json  (if no --config specified)
2. [ERROR] No configuration found
```

### Configuration File Naming

Supported configuration file extensions:

- `.json` (preferred)
- Any extension is supported as long as the content is valid JSON

## Output Directory Behavior

### Creation Process

1. **Check existence**: Verify the output directory doesn't exist
2. **Create directory**: Create the output directory and any necessary parent
   directories
3. **Generate files**: Create Dockerfile, devcontainer.json, and scripts
4. **Set permissions**: Ensure script files are executable (chmod +x)

### Directory Structure

```
output-directory/
├── Dockerfile              # Always generated
├── devcontainer.json       # Always generated
└── scripts/               # Only if components generate scripts
    ├── firewall-setup.sh   # From firewall.setup component
    └── firewall-domains.sh # From firewall.domains component
```

### Overwrite Protection

The generator protects against accidental overwrites:

```bash
# Safe - directory doesn't exist
$ deno task generate --output new-container
✅ Devcontainer generated successfully!

# Unsafe - directory exists
$ deno task generate --output new-container
❌ Error: Output directory 'new-container' already exists. Please remove it or use a different output directory.

# Manual cleanup required
$ rm -rf new-container
$ deno task generate --output new-container
✅ Devcontainer generated successfully!
```

## Error Handling

### Common Errors

#### Configuration File Errors

```bash
# File not found
❌ Error: No such file or directory (os error 2)

# Permission denied
❌ Error: Permission denied (os error 13)

# Invalid JSON syntax
❌ Error: Unexpected token '}' in JSON at position 45

# Schema validation failure
❌ Error: Invalid input: Expected object, received string at "components[0]"
```

#### Output Directory Errors

```bash
# Directory already exists
❌ Error: Output directory 'existing-dir' already exists. Please remove it or use a different output directory.

# Permission denied
❌ Error: Permission denied (os error 13)

# Path is a file, not a directory
❌ Error: File exists (os error 17)
```

#### Component Errors

```bash
# Unknown component type
❌ Error: Unknown component type: invalid.component

# Missing required parameters
❌ Error: apt.install requires parameters

# Invalid parameter type
❌ Error: Invalid input: Expected array, received string at "params.packages"
```

### Error Exit Codes

- `0`: Success
- `1`: General error (configuration, validation, file system)

## Environment Variables

The generator doesn't currently use environment variables, but respects standard
system environment variables:

### System Variables

- `PATH`: Used for finding system commands
- `HOME`: Used for resolving `~` in paths
- `PWD`: Current working directory for relative paths

## Best Practices

### Configuration Management

```bash
# Good - organized configuration files
configs/
├── base.json           # Base configuration
├── development.json    # Development overrides
├── production.json     # Production settings
└── testing.json        # Testing environment

# Generate different environments
deno task generate --config configs/development.json --output .devcontainer-dev
deno task generate --config configs/production.json --output .devcontainer-prod
```

### Output Directory Management

```bash
# Good - descriptive output names
deno task generate --config frontend.json --output .devcontainer-frontend
deno task generate --config backend.json --output .devcontainer-backend

# Good - temporary testing
deno task generate --config test.json --output /tmp/test-container

# Avoid - confusing names
deno task generate --config config.json --output container
```

### Error Handling in Scripts

```bash
#!/bin/bash
set -e  # Exit on error

# Generate devcontainer with error handling
if ! deno task generate --config production.json --output .devcontainer-prod; then
    echo "Failed to generate devcontainer"
    exit 1
fi

echo "Devcontainer generated successfully"
```

For more information, see the main README.md and the configuration format
documentation.
