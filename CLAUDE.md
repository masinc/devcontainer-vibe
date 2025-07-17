# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Deno-based devcontainer generator that creates customized development container configurations from declarative JSON files. It uses a component-based architecture with Zod v4 schema validation.

## Development Commands

### Building and Running
- `deno task dev` - Run with hot reload for development
- `deno task generate` - Generate devcontainer to `generated-devcontainer/` (safe testing)
- `deno task generate:prod` - Generate devcontainer to current directory's `.devcontainer/`
- `deno run --allow-read --allow-write src/main.ts --config <file> --output <dir>` - Run with custom options

### Testing
- `deno task test` - Run all tests
- `deno test src/components.test.ts` - Run specific test file
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

2. **src/components.ts** - Component handler system
   - `ComponentHandler` interface - Base for all handlers
   - `ComponentHandlerFactory` - Maps component types to handlers
   - Individual handlers for each component type (e.g., `AptInstallHandler`)
   - Each handler returns `ComponentResult` with Dockerfile lines, devcontainer config, and scripts

3. **src/generator.ts** - Main generation logic
   - `DevcontainerGenerator` - Orchestrates the entire generation process
   - Validates config, processes components, merges results
   - Handles special merging logic for arrays, environment variables, and commands
   - Adds component comments to generated Dockerfile for better traceability

4. **src/main.ts** - CLI entry point
   - Command-line argument parsing
   - Error handling and user feedback

### Key Design Patterns

1. **Component System**: Each component type has a dedicated handler that generates specific Dockerfile instructions, devcontainer.json configuration, and shell scripts.

2. **Result Merging**: The generator intelligently merges configuration from multiple components:
   - Arrays are concatenated with deduplication
   - Environment variables handle PATH-like concatenation using `${containerEnv:PATH}` format
   - Commands are chained with `&&`

3. **Script Generation**: Components can generate shell scripts placed in `.devcontainer/scripts/` with proper permissions.

### Component Types
- `apt.install` - System package installation
- `mise.setup/install` - Runtime version management (mise.install runs as vscode user)
- `nix.setup/install` - Nix package manager with Home Manager
- `firewall.setup/domain/github-api` - Network security configuration
- `vscode.install` - VS Code extensions
- `shell.setup` - Shell configuration
- `sudo.disable` - Security hardening by disabling sudo access

### Testing Strategy
Each module has a corresponding `.test.ts` file with comprehensive unit tests covering both success and error cases.