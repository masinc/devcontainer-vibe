import { assertEquals, assertThrows } from "@std/assert";
import { AptInstallHandler } from "../apt/index.ts";

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
