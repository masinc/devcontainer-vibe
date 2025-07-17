import { assertEquals } from "@std/assert";
import { SudoDisableHandler } from "../sudo/index.ts";

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
