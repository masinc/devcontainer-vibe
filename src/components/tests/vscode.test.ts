import { assertEquals } from "@std/assert";
import { VscodeInstallHandler } from "../vscode/index.ts";

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
