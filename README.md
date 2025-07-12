# DevContainer Vibe

A secure, fully-featured development container configuration optimized for
modern AI-assisted development with Claude Code and Gemini CLI.

## Features

- **🔒 Advanced Security**: Integrated firewall with allowlist-based network
  access
- **🤖 AI Development Tools**: Pre-configured Claude Code and Gemini CLI
- **🛠️ Modern Development Stack**: Node.js, Python, Deno, TypeScript tools
- **🐚 Fish Shell**: Enhanced terminal experience with starship prompt
- **📦 Package Management**: mise for unified tool management, pnpm, uv, pipx
- **🔗 MCP Integration**: Context7 and DeepWiki MCP servers pre-configured
- **💾 Persistent Storage**: Configuration persistence for AI tools

## Quick Start

Use [tiged](https://github.com/tiged/tiged) to copy the `.devcontainer`
configuration to your project:

```bash
# Copy devcontainer configuration to your project
cd your-project

# Using npx
npx tiged masinc/devcontainer-vibe/.devcontainer .devcontainer

# Using pnpm dlx
pnpm dlx tiged masinc/devcontainer-vibe/.devcontainer .devcontainer

# Using deno run
deno run -A npm:tiged masinc/devcontainer-vibe/.devcontainer .devcontainer
```

Then:

1. Open the folder in VS Code
2. When prompted, click "Reopen in Container"
3. Wait for the container to build and initialize
4. Start coding with AI assistance!

## What's Included

### Development Tools

- **Node.js 24** with pnpm package manager
- **Python 3.12** with uv and pipx
- **Deno 2** for modern TypeScript/JavaScript
- **Fish shell** with starship prompt
- **Essential CLI tools**: gh, ghq, fd, ripgrep, eza

### AI Tools

- **Claude Code**: Pre-installed and ready to use
- **Gemini CLI**: Google's AI CLI tool
- **MCP Servers**: Context7 and DeepWiki for enhanced AI capabilities

### Security Features

- **Network Firewall**: Restricts outbound connections to approved domains
- **Privilege Escalation Protection**: sudo disabled after initialization
- **Allowlisted Domains**: Only essential services and AI APIs accessible

## Security Model

This devcontainer implements a defense-in-depth security model:

1. **Network-level**: iptables firewall with strict allowlist
2. **System-level**: sudo access removed after setup
3. **Container-level**: Non-root user operation

### Allowed Network Access

The firewall permits access to:

- GitHub APIs and repositories
- NPM registry
- Claude/Anthropic APIs
- Google/Gemini APIs
- Ubuntu package repositories
- Essential development services

All other network access is blocked by default.

## Customization

### Adding Allowed Domains

To add new domains to the firewall allowlist, edit
`.devcontainer/scripts/init-firewall.ts`:

```typescript
const allowedDomains = [
  // ... existing domains
  "your-api-domain.com",
];
```

### Additional Tools

Add tools via mise in the Dockerfile:

```dockerfile
RUN <<-EOS
    # Add your tools
    mise use -g your-tool@version;
EOS
```

## Troubleshooting

### Container Build Fails

- Ensure Docker has sufficient resources allocated
- Check that your system supports the required capabilities

### Network Access Issues

- Verify the domain is in the allowlist
- Check firewall logs for blocked connections

### AI Tool Authentication

- Claude Code and Gemini CLI configs are persisted via Docker volumes
- Re-authentication may be required on first use

## Contributing

1. Fork the repository
2. Make your changes
3. Test with a sample project
4. Submit a pull request

## License

MIT License - see LICENSE file for details
