# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is a Deno-based devcontainer generator that creates customized development
container configurations from declarative JSON files. It uses a component-based
architecture with Zod v4 schema validation.

## Development Commands

### Building and Running

- `deno task dev` - Run with hot reload for development
- `deno task generate` - Generate devcontainer to `generated-devcontainer/`
  (safe testing)
- `deno task generate:prod` - Generate devcontainer to current directory's
  `.devcontainer/`
- `deno run --allow-read --allow-write src/main.ts --config <file> --output <dir>` -
  Run with custom options

### Testing

- `deno task test` - Run all tests
- `deno test src/components/tests/` - Run component tests
- `deno test --filter "test name"` - Run tests matching a pattern

### Code Quality

- `deno fmt` - Format code
- `deno fmt --check` - Check formatting without modifying
- `deno lint` - Run linter

## Architecture Overview

### Core Structure

The project follows a modular component-based architecture:

1. **src/types.ts** - Zod schemas and TypeScript types
   - `DevcontainerConfig` - Main configuration structure
   - `Component` - Component definitions with discriminated unions
   - `FIREWALL_PRESETS` - Predefined domain allowlists

2. **src/components/** - Component handler system (organized by prefix)
   - `base.ts` - `ComponentHandler` interface and base class with `isSingleUse`
     property
   - `factory.ts` - `ComponentHandlerFactory` that maps component types to
     handlers
   - `apt/` - APT package management components
   - `mise/` - Runtime version management (mise) components
   - `nix/` - Nix package management with Home Manager components
   - `firewall/` - Firewall and security components
   - `shell/` - Shell configuration and execution components
   - `vscode/` - VS Code extension components
   - `sudo/` - Security hardening components
   - `tests/` - Organized test files by component prefix
   - Each handler returns `ComponentResult` with Dockerfile lines, devcontainer
     config, and scripts
   - Each handler defines its own `isSingleUse` property for usage validation

3. **src/generator.ts** - Main generation logic
   - `DevcontainerGenerator` - Orchestrates the entire generation process
   - Validates config, processes components, merges results
   - Handles special merging logic for arrays, environment variables, and
     commands
   - Adds component comments to generated Dockerfile for better traceability
   - Implements component-level duplicate validation using `isSingleUse`
     property
   - Special handling for `shell.post-create` with user-specific script
     generation

4. **src/main.ts** - CLI entry point
   - Command-line argument parsing
   - Error handling and user feedback

### Key Design Patterns

1. **Component System**: Each component type has a dedicated handler that
   generates specific Dockerfile instructions, devcontainer.json configuration,
   and shell scripts.

2. **Result Merging**: The generator intelligently merges configuration from
   multiple components:
   - Arrays are concatenated with deduplication
   - Environment variables handle PATH-like concatenation using
     `${containerEnv:PATH}` format
   - Commands are chained with `&&`

3. **Script Generation**: Components can generate shell scripts placed in
   `.devcontainer/scripts/` with proper permissions.

### Component Types and Usage Rules

#### Single Use Components (isSingleUse = true)

- `mise.setup` - Runtime version management setup
- `nix.setup` - Nix package manager with Home Manager setup
- `firewall.setup` - Basic firewall setup with ipset support
- `firewall.github-api` - GitHub API IP range configuration
- `shell.setup` - Shell configuration (bash, fish, zsh)
- `sudo.disable` - Security hardening by disabling sudo access

#### Multiple Use Components (isSingleUse = false)

- `apt.install` - System package installation (automatically merged)
- `mise.install` - Runtime packages (runs as vscode user)
- `nix.install` - Nix packages with Home Manager
- `firewall.domain` - Domain-based firewall rules (merged into ipset)
- `vscode.install` - VS Code extensions (merged into single customizations)
- `shell.dockerfile` - Custom shell commands in Dockerfile build phase
- `shell.post-create` - Custom shell commands after container creation

#### Special Behavior: shell.post-create

- Multiple instances are merged by user type
- Generates separate script files: `shell-post-create-vscode.sh` and
  `shell-post-create-root.sh`
- Execution order: vscode user commands first, then root user commands with sudo
- User-specific grouping: multiple vscode instances are combined into single
  script

### Recent Implementation Improvements

#### Component-Level Validation

- Moved `singleUseOnly` validation from generator to component level
- Each `ComponentHandler` now defines its own `isSingleUse` property
- Benefits: Better encapsulation, easier to maintain, type-safe

#### Enhanced shell.post-create Component

- Supports multiple instances with automatic user-based grouping
- Generates separate script files per user type for better security
- Proper execution ordering and sudo handling

#### Component Organization by Prefix

- Restructured components into prefix-based directories (`apt/`, `mise/`,
  `nix/`, etc.)
- Each prefix has its own directory with `index.ts` containing related handlers
- Tests are organized by prefix in `tests/` directory for better maintainability
- Backward compatibility maintained through re-exports

#### Firewall Improvements

- Integrated ipset support for efficient IP range management
- Consolidated package installation in `firewall.setup`
- Enhanced error handling and testing validation

### Testing Strategy

Each module has a corresponding `.test.ts` file with comprehensive unit tests
covering both success and error cases.

#### Key Test Coverage

- Component validation and duplicate prevention
- Shell script generation and user-specific merging
- Firewall configuration with ipset integration
- Configuration merging and environment variable handling
