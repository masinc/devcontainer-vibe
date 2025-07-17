import { assertEquals } from "@std/assert";
import { MiseInstallHandler, MiseSetupHandler } from "../mise/index.ts";

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
  assertEquals(
    result.dockerfileLines[5],
    "    install -dm 755 /etc/apt/keyrings &&",
  );
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
    '    echo "deb [signed-by=/etc/apt/keyrings/mise-archive-keyring.gpg arch=amd64] https://mise.jdx.dev/deb stable main" | tee /etc/apt/sources.list.d/mise.list &&',
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
