import { assertEquals } from "@std/assert";
import { NixInstallHandler, NixSetupHandler } from "../nix/index.ts";

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
  assertEquals(
    result.dockerfileLines[2],
    "RUN cp /usr/local/scripts/home-manager-config.nix ~/.config/home-manager/home.nix",
  );
  assertEquals(result.dockerfileLines[3], "# Apply Home Manager configuration");
  assertEquals(result.dockerfileLines[5], "    <<-EOS");
  assertEquals(result.dockerfileLines[6], "    set -uex;");
  assertEquals(result.dockerfileLines[7], "    export USER=vscode;");
  assertEquals(
    result.dockerfileLines[9],
    "    . ~/.nix-profile/etc/profile.d/nix.sh;",
  );
  assertEquals(
    result.dockerfileLines[10],
    "    # Apply Home Manager configuration",
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
