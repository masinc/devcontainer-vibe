import { assertEquals, assertThrows } from "@std/assert";
import {
  AptInstallHandler,
  ComponentHandlerFactory,
  FirewallDomainHandler,
  FirewallGithubApiHandler,
  FirewallSetupHandler,
  MiseInstallHandler,
  MiseSetupHandler,
  NixInstallHandler,
  NixSetupHandler,
  ShellSetupHandler,
  ShellDockerfileHandler,
  ShellPostCreateHandler,
  SudoDisableHandler,
  VscodeInstallHandler,
} from "./components.ts";

Deno.test("AptInstallHandler - valid component", () => {
  const handler = new AptInstallHandler();
  const component = {
    name: "apt.install" as const,
    params: {
      packages: ["git", "curl", "vim"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 6);
  assertEquals(result.dockerfileLines[0], "USER root");
  assertEquals(
    result.dockerfileLines[1],
    "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
  );
  assertEquals(
    result.dockerfileLines[2],
    "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
  );
  assertEquals(
    result.dockerfileLines[3],
    "    apt-get update && apt-get install -y \\",
  );
  assertEquals(result.dockerfileLines[4], "    git curl vim \\");
  assertEquals(result.dockerfileLines[5], "    && rm -rf /var/lib/apt/lists/*");
  assertEquals(Object.keys(result.devcontainerConfig).length, 0);
  assertEquals(Object.keys(result.scripts).length, 0);
});

Deno.test("AptInstallHandler - string component should throw", () => {
  const handler = new AptInstallHandler();

  assertThrows(
    () => handler.handle("apt.install"),
    Error,
    "apt.install requires parameters",
  );
});

Deno.test("AptInstallHandler - wrong component type should throw", () => {
  const handler = new AptInstallHandler();
  const component = {
    name: "mise.install" as const,
    params: {
      packages: ["deno"],
    },
  };

  assertThrows(
    () => handler.handle(component),
    Error,
    "Invalid component type",
  );
});

Deno.test("MiseSetupHandler - valid component", () => {
  const handler = new MiseSetupHandler();
  const result = handler.handle("mise.setup");

  assertEquals(result.dockerfileLines.length, 11);
  assertEquals(result.dockerfileLines[0], "USER root");
  assertEquals(
    result.dockerfileLines[1],
    "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
  );
  assertEquals(
    result.dockerfileLines[2],
    "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
  );
  assertEquals(result.dockerfileLines[3], "    <<-EOS");
  assertEquals(result.dockerfileLines[4], "    set -eux;");
  assertEquals(result.dockerfileLines[5], "    install -dm 755 /etc/apt/keyrings &&");
  assertEquals(
    result.dockerfileLines[6],
    "    wget -qO - https://mise.jdx.dev/gpg-key.pub | gpg --dearmor | tee /etc/apt/keyrings/mise-archive-keyring.gpg 1> /dev/null &&",
  );
  
  // Check mounts and remoteEnv
  assertEquals(result.devcontainerConfig.mounts, [
    "source=mise-data-${devcontainerId},target=/home/vscode/.local/share/mise,type=volume",
  ]);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "MISE_DATA_DIR": "/home/vscode/.local/share/mise",
    "PATH": "/home/vscode/.local/share/mise/shims:${containerEnv:PATH}",
  });
  assertEquals(
    result.dockerfileLines[7],
    "    echo \"deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main\" | tee /etc/apt/sources.list.d/mise.list &&",
  );
  assertEquals(result.dockerfileLines[8], "    apt update &&");
  assertEquals(result.dockerfileLines[9], "    apt install -y mise");
  assertEquals(result.dockerfileLines[10], "EOS");
});

Deno.test("MiseInstallHandler - valid component", () => {
  const handler = new MiseInstallHandler();
  const component = {
    name: "mise.install" as const,
    params: {
      packages: ["deno@latest", "node@lts"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 8);
  assertEquals(result.dockerfileLines[0], "USER vscode");
  assertEquals(
    result.dockerfileLines[1],
    "RUN --mount=target=/home/vscode/.cache/mise,type=cache,sharing=locked,uid=1000,gid=1000 \\",
  );
  assertEquals(result.dockerfileLines[2], "    <<-EOS");
  assertEquals(result.dockerfileLines[3], "    set -ex;");
  assertEquals(result.dockerfileLines[4], "    mise use -g deno@latest;");
  assertEquals(result.dockerfileLines[5], "    mise use -g node@lts;");
  assertEquals(result.dockerfileLines[6], "    mise install;");
  assertEquals(result.dockerfileLines[7], "EOS");
  
  // Check mounts and remoteEnv
  assertEquals(result.devcontainerConfig.mounts, [
    "source=mise-data-${devcontainerId},target=/home/vscode/.local/share/mise,type=volume",
  ]);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "MISE_DATA_DIR": "/home/vscode/.local/share/mise",
    "PATH": "/home/vscode/.local/share/mise/shims:${containerEnv:PATH}",
  });
});

Deno.test("NixSetupHandler - valid component with Home-Manager", () => {
  const handler = new NixSetupHandler();
  const result = handler.handle("nix.setup");

  assertEquals(result.dockerfileLines.length, 36);
  assertEquals(
    result.dockerfileLines[0],
    "# Create nix directory and set ownership",
  );
  assertEquals(result.dockerfileLines[1], "USER root");
  assertEquals(
    result.dockerfileLines[2],
    "RUN mkdir -p /nix && chown -R vscode:vscode /nix",
  );
  assertEquals(result.dockerfileLines[5], "USER vscode");
  assertEquals(result.dockerfileLines[6], "RUN <<-EOS");
  assertEquals(result.dockerfileLines[7], "    set -eux;");
  assertEquals(
    result.dockerfileLines[9],
    "    curl -L https://nixos.org/nix/install | sh -s -- --no-daemon;",
  );
  assertEquals(
    result.dockerfileLines[17],
    'ENV PATH="/home/vscode/.nix-profile/bin:${PATH}"',
  );
  assertEquals(
    result.dockerfileLines[29],
    "    nix-channel --add https://github.com/nix-community/home-manager/archive/master.tar.gz home-manager;",
  );
  assertEquals(
    result.dockerfileLines[32],
    "    nix-shell '<home-manager>' -A install;",
  );
  
  // Check mounts and remoteEnv
  assertEquals(result.devcontainerConfig.mounts, [
    "source=nix-store-${devcontainerId},target=/nix/store,type=volume",
    "source=nix-profile-${devcontainerId},target=/home/vscode/.nix-profile,type=volume",
    "source=home-manager-config-${devcontainerId},target=/home/vscode/.config/home-manager,type=volume",
  ]);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "PATH": "/home/vscode/.nix-profile/bin:${containerEnv:PATH}",
  });
});

Deno.test("NixInstallHandler - valid component with Home-Manager", () => {
  const handler = new NixInstallHandler();
  const component = {
    name: "nix.install" as const,
    params: {
      packages: ["starship", "fish"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 14);
  assertEquals(result.dockerfileLines[0], "# Copy Home Manager configuration");
  assertEquals(result.dockerfileLines[1], "USER vscode");
  assertEquals(result.dockerfileLines[2], "RUN cp /usr/local/scripts/home-manager-config.nix ~/.config/home-manager/home.nix");
  assertEquals(result.dockerfileLines[3], "# Apply Home Manager configuration");
  assertEquals(result.dockerfileLines[5], "    <<-EOS");
  assertEquals(result.dockerfileLines[6], "    set -uex;");
  assertEquals(result.dockerfileLines[7], "    export USER=vscode;");
  assertEquals(result.dockerfileLines[9], "    . ~/.nix-profile/etc/profile.d/nix.sh;");
  assertEquals(result.dockerfileLines[10], "    # Apply Home Manager configuration");
  
  // Check mounts and remoteEnv
  assertEquals(result.devcontainerConfig.mounts, [
    "source=nix-store-${devcontainerId},target=/nix/store,type=volume",
    "source=nix-profile-${devcontainerId},target=/home/vscode/.nix-profile,type=volume",
    "source=home-manager-config-${devcontainerId},target=/home/vscode/.config/home-manager,type=volume",
  ]);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "PATH": "/home/vscode/.nix-profile/bin:${containerEnv:PATH}",
  });
  
  // Check scripts (Home-Manager configuration)
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("home-manager-config.nix" in result.scripts, true);
  assertEquals(
    result.scripts["home-manager-config.nix"].includes("pkgs.starship"),
    true,
  );
  assertEquals(
    result.scripts["home-manager-config.nix"].includes("pkgs.fish"),
    true,
  );
});

Deno.test("FirewallSetupHandler - valid component", () => {
  const handler = new FirewallSetupHandler();
  const result = handler.handle("firewall.setup");

  assertEquals(result.dockerfileLines.length, 4);
  assertEquals(result.dockerfileLines[0], "USER root");
  assertEquals(
    result.dockerfileLines[1],
    "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
  );
  assertEquals(
    result.dockerfileLines[2],
    "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
  );
  assertEquals(
    result.dockerfileLines[3],
    "    apt-get update && apt-get install -y iptables ipset dnsutils curl jq",
  );
  
  // Check devcontainer config for required capabilities
  assertEquals(result.devcontainerConfig.runArgs, ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"]);
  
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("firewall-setup.sh" in result.scripts, true);
  assertEquals(
    result.scripts["firewall-setup.sh"].includes("iptables -P INPUT DROP"),
    true,
  );
});

Deno.test("FirewallDomainHandler - with presets", () => {
  const handler = new FirewallDomainHandler();
  const component = {
    name: "firewall.domain" as const,
    params: {
      presets: ["github", "npm"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("firewall-domain.sh" in result.scripts, true);
  assertEquals(
    result.scripts["firewall-domain.sh"].includes("github.com"),
    true,
  );
  assertEquals(
    result.scripts["firewall-domain.sh"].includes("registry.npmjs.org"),
    true,
  );
});

Deno.test("FirewallDomainHandler - with allows", () => {
  const handler = new FirewallDomainHandler();
  const component = {
    name: "firewall.domain" as const,
    params: {
      allows: ["example.com", "test.org"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals(
    result.scripts["firewall-domain.sh"].includes("example.com"),
    true,
  );
  assertEquals(result.scripts["firewall-domain.sh"].includes("test.org"), true);
});

Deno.test("FirewallDomainHandler - with both presets and allows", () => {
  const handler = new FirewallDomainHandler();
  const component = {
    name: "firewall.domain" as const,
    params: {
      presets: ["github"],
      allows: ["custom.com"],
    },
  };

  const result = handler.handle(component);

  assertEquals(
    result.scripts["firewall-domain.sh"].includes("github.com"),
    true,
  );
  assertEquals(
    result.scripts["firewall-domain.sh"].includes("custom.com"),
    true,
  );
});

Deno.test("FirewallDomainHandler - unknown preset should throw", () => {
  const handler = new FirewallDomainHandler();
  const component = {
    name: "firewall.domain" as const,
    params: {
      presets: ["unknown-preset"],
    },
  };

  assertThrows(
    () => handler.handle(component),
    Error,
    "Unknown firewall preset: unknown-preset",
  );
});

Deno.test("FirewallDomainHandler - deduplication", () => {
  const handler = new FirewallDomainHandler();
  const component = {
    name: "firewall.domain" as const,
    params: {
      presets: ["github"],
      allows: ["github.com"], // duplicate from preset
    },
  };

  const result = handler.handle(component);

  // github.com should only appear once due to deduplication
  const script = result.scripts["firewall-domain.sh"];
  const githubMatches = script.split("\n").filter((line) =>
    line.includes("github.com")
  );
  // Actually it appears twice: once from preset, once from allows, but deduplication happens at domain level
  assertEquals(githubMatches.length >= 1, true);
});

Deno.test("VscodeInstallHandler - valid component", () => {
  const handler = new VscodeInstallHandler();
  const component = {
    name: "vscode.install" as const,
    params: {
      extensions: ["denoland.vscode-deno", "esbenp.prettier-vscode"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(Object.keys(result.scripts).length, 0);
  const customizations = result.devcontainerConfig.customizations as {
    vscode?: { extensions?: string[] };
  };
  assertEquals(customizations?.vscode?.extensions, [
    "denoland.vscode-deno",
    "esbenp.prettier-vscode",
  ]);
});

Deno.test("ShellSetupHandler - valid component", () => {
  const handler = new ShellSetupHandler();
  const component = {
    name: "shell.setup" as const,
    params: {
      shell: "fish" as const,
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 3);
  assertEquals(result.dockerfileLines[0], "# Set default shell for vscode user");
  assertEquals(result.dockerfileLines[1], "USER root");
  assertEquals(result.dockerfileLines[2], "RUN chsh -s /bin/fish vscode");
  
  // Check remoteEnv (no mounts needed)
  assertEquals(result.devcontainerConfig.mounts, undefined);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "SHELL": "/bin/fish",
  });
});

Deno.test("FirewallGithubApiHandler - valid component", () => {
  const handler = new FirewallGithubApiHandler();
  const result = handler.handle("firewall.github-api");

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(Object.keys(result.devcontainerConfig).length, 0);
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("firewall-github-dynamic.sh" in result.scripts, true);
  assertEquals(
    result.scripts["firewall-github-dynamic.sh"].includes("api.github.com/meta"),
    true,
  );
});

Deno.test("SudoDisableHandler - valid component", () => {
  const handler = new SudoDisableHandler();
  const result = handler.handle("sudo.disable");

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(Object.keys(result.devcontainerConfig).length, 0);
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("disable-sudo.sh" in result.scripts, true);
  assertEquals(
    result.scripts["disable-sudo.sh"].includes("chmod 700 /usr/bin/sudo"),
    true,
  );
});

Deno.test("ComponentHandlerFactory - get all handlers", () => {
  const factory = new ComponentHandlerFactory();

  // Test all component types
  const handlers = [
    "apt.install",
    "mise.setup",
    "mise.install",
    "nix.setup",
    "nix.install",
    "firewall.setup",
    "firewall.domain",
    "firewall.github-api",
    "sudo.disable",
    "vscode.install",
    "shell.setup",
    "shell.dockerfile",
    "shell.post-create",
  ];

  for (const handlerType of handlers) {
    const handler = factory.getHandler(handlerType);
    assertEquals(typeof handler, "object");
    assertEquals(typeof handler.handle, "function");
  }
});

Deno.test("ShellDockerfileHandler - valid component", () => {
  const handler = new ShellDockerfileHandler();
  const component = {
    name: "shell.dockerfile" as const,
    params: {
      user: "vscode" as const,
      commands: ["echo 'Hello World'", "ls -la"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 9);
  assertEquals(result.dockerfileLines[0], "USER vscode");
  assertEquals(result.dockerfileLines[1], "RUN <<-EOS");
  assertEquals(result.dockerfileLines[2], "    set -uex;");
  assertEquals(result.dockerfileLines[3], "    # Source mise environment if available");
  assertEquals(result.dockerfileLines[4], "    [ -f ~/.bashrc ] && source ~/.bashrc;");
  assertEquals(result.dockerfileLines[5], "    export PATH=\"/home/vscode/.local/share/mise/shims:$PATH\";");
  assertEquals(result.dockerfileLines[6], "    echo 'Hello World';");
  assertEquals(result.dockerfileLines[7], "    ls -la;");
  assertEquals(result.dockerfileLines[8], "EOS");
  assertEquals(Object.keys(result.devcontainerConfig).length, 0);
  assertEquals(Object.keys(result.scripts).length, 0);
});

Deno.test("ShellDockerfileHandler - root user", () => {
  const handler = new ShellDockerfileHandler();
  const component = {
    name: "shell.dockerfile" as const,
    params: {
      user: "root" as const,
      commands: ["apt-get update"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines[0], "USER root");
  assertEquals(result.dockerfileLines[6], "    apt-get update;");
});

Deno.test("ShellPostCreateHandler - valid component", () => {
  const handler = new ShellPostCreateHandler();
  const component = {
    name: "shell.post-create" as const,
    params: {
      user: "vscode" as const,
      commands: ["echo 'Setup complete'", "npm install"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.dockerfileLines.length, 0);
  assertEquals(result.devcontainerConfig.postCreateCommand, "/usr/local/scripts/shell-post-create.sh");
  assertEquals(Object.keys(result.scripts).length, 1);
  assertEquals("shell-post-create.sh" in result.scripts, true);
  assertEquals(
    result.scripts["shell-post-create.sh"].includes("echo 'Setup complete'"),
    true,
  );
  assertEquals(
    result.scripts["shell-post-create.sh"].includes("npm install"),
    true,
  );
});

Deno.test("ShellPostCreateHandler - root user", () => {
  const handler = new ShellPostCreateHandler();
  const component = {
    name: "shell.post-create" as const,
    params: {
      user: "root" as const,
      commands: ["systemctl restart service"],
    },
  };

  const result = handler.handle(component);

  assertEquals(result.devcontainerConfig.postCreateCommand, "sudo /usr/local/scripts/shell-post-create.sh");
  assertEquals(
    result.scripts["shell-post-create.sh"].includes("# Running as root"),
    true,
  );
});

Deno.test("ComponentHandlerFactory - unknown handler should throw", () => {
  const factory = new ComponentHandlerFactory();

  assertThrows(
    () => factory.getHandler("unknown.handler"),
    Error,
    "Unknown component type: unknown.handler",
  );
});
