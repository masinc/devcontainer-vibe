import { assertEquals } from "@std/assert";
import {
  ShellDockerfileHandler,
  ShellPostCreateHandler,
  ShellSetupHandler,
} from "../shell/index.ts";

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
  assertEquals(
    result.dockerfileLines[0],
    "# Set default shell for vscode user",
  );
  assertEquals(result.dockerfileLines[1], "USER root");
  assertEquals(result.dockerfileLines[2], "RUN chsh -s /bin/fish vscode");

  // Check remoteEnv (no mounts needed)
  assertEquals(result.devcontainerConfig.mounts, undefined);
  assertEquals(result.devcontainerConfig.remoteEnv, {
    "SHELL": "/bin/fish",
  });
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
  assertEquals(
    result.dockerfileLines[3],
    "    # Source mise environment if available",
  );
  assertEquals(
    result.dockerfileLines[4],
    "    [ -f ~/.bashrc ] && source ~/.bashrc;",
  );
  assertEquals(
    result.dockerfileLines[5],
    '    export PATH="/home/vscode/.local/share/mise/shims:$PATH";',
  );
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
  assertEquals(
    result.devcontainerConfig.postCreateCommand,
    "/usr/local/scripts/shell-post-create.sh",
  );
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

  assertEquals(
    result.devcontainerConfig.postCreateCommand,
    "sudo /usr/local/scripts/shell-post-create.sh",
  );
  assertEquals(
    result.scripts["shell-post-create.sh"].includes("# Running as root"),
    true,
  );
});
