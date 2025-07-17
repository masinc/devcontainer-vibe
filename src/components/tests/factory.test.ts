import { assertEquals, assertThrows } from "@std/assert";
import { ComponentHandlerFactory } from "../factory.ts";

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

Deno.test("ComponentHandlerFactory - unknown handler should throw", () => {
  const factory = new ComponentHandlerFactory();

  assertThrows(
    () => factory.getHandler("unknown.handler"),
    Error,
    "Unknown component type: unknown.handler",
  );
});
