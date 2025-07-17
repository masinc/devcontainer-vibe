import { assertEquals } from "@std/assert";
import {
  ComponentSchema,
  DevcontainerConfigSchema,
  FIREWALL_PRESETS,
  SimpleComponentSchema,
} from "./types.ts";

Deno.test("FIREWALL_PRESETS - should contain expected presets", () => {
  assertEquals(typeof FIREWALL_PRESETS.github, "object");
  assertEquals(typeof FIREWALL_PRESETS.npm, "object");
  assertEquals(typeof FIREWALL_PRESETS.deno, "object");
  assertEquals(typeof FIREWALL_PRESETS.vscode, "object");
  assertEquals(typeof FIREWALL_PRESETS["claude-code"], "object");
  assertEquals(typeof FIREWALL_PRESETS.python, "object");

  // GitHub プリセットの内容をチェック
  assertEquals(FIREWALL_PRESETS.github.includes("github.com"), true);
  assertEquals(FIREWALL_PRESETS.github.includes("api.github.com"), true);

  // NPM プリセットの内容をチェック
  assertEquals(FIREWALL_PRESETS.npm.includes("registry.npmjs.org"), true);
});

Deno.test("ComponentSchema - apt.install", () => {
  const validComponent = {
    name: "apt.install",
    params: {
      packages: ["git", "curl", "vim"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.name, "apt.install");
    if (result.data.name === "apt.install") {
      assertEquals(result.data.params.packages, ["git", "curl", "vim"]);
    }
  }
});

Deno.test("ComponentSchema - mise.setup (no params)", () => {
  const validComponent = {
    name: "mise.setup",
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - mise.install", () => {
  const validComponent = {
    name: "mise.install",
    params: {
      packages: ["deno@latest", "node@lts"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - nix.setup", () => {
  const validComponent = {
    name: "nix.setup",
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - nix.install", () => {
  const validComponent = {
    name: "nix.install",
    params: {
      packages: ["starship", "fish"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - firewall.setup", () => {
  const validComponent = {
    name: "firewall.setup",
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - firewall.domain with presets", () => {
  const validComponent = {
    name: "firewall.domain",
    params: {
      presets: ["github", "npm"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - firewall.domain with allows", () => {
  const validComponent = {
    name: "firewall.domain",
    params: {
      allows: ["example.com", "test.org"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - firewall.domain with both presets and allows", () => {
  const validComponent = {
    name: "firewall.domain",
    params: {
      presets: ["github"],
      allows: ["example.com"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - firewall.domain without params should fail", () => {
  const invalidComponent = {
    name: "firewall.domain",
    params: {},
  };

  const result = ComponentSchema.safeParse(invalidComponent);
  assertEquals(result.success, false);
});

Deno.test("ComponentSchema - vscode.install", () => {
  const validComponent = {
    name: "vscode.install",
    params: {
      extensions: ["denoland.vscode-deno", "esbenp.prettier-vscode"],
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - shell.setup", () => {
  const validComponent = {
    name: "shell.setup",
    params: {
      shell: "fish",
    },
  };

  const result = ComponentSchema.safeParse(validComponent);
  assertEquals(result.success, true);
});

Deno.test("ComponentSchema - shell.setup with invalid shell should fail", () => {
  const invalidComponent = {
    name: "shell.setup",
    params: {
      shell: "invalid-shell",
    },
  };

  const result = ComponentSchema.safeParse(invalidComponent);
  assertEquals(result.success, false);
});

Deno.test("ComponentSchema - invalid component name should fail", () => {
  const invalidComponent = {
    name: "invalid.component",
    params: {},
  };

  const result = ComponentSchema.safeParse(invalidComponent);
  assertEquals(result.success, false);
});

Deno.test("SimpleComponentSchema - valid string", () => {
  const result = SimpleComponentSchema.safeParse("mise.setup");
  assertEquals(result.success, true);
  assertEquals(result.data, "mise.setup");
});

Deno.test("SimpleComponentSchema - invalid type should fail", () => {
  const result = SimpleComponentSchema.safeParse(123);
  assertEquals(result.success, false);
});

Deno.test("DevcontainerConfigSchema - valid config", () => {
  const validConfig = {
    name: "test-project",
    components: [
      "mise.setup",
      {
        name: "apt.install",
        params: {
          packages: ["git"],
        },
      },
    ],
  };

  const result = DevcontainerConfigSchema.safeParse(validConfig);
  assertEquals(result.success, true);

  if (result.success) {
    assertEquals(result.data.name, "test-project");
    assertEquals(result.data.components.length, 2);
  }
});

Deno.test("DevcontainerConfigSchema - missing name should fail", () => {
  const invalidConfig = {
    components: [],
  };

  const result = DevcontainerConfigSchema.safeParse(invalidConfig);
  assertEquals(result.success, false);
});

Deno.test("DevcontainerConfigSchema - missing components should fail", () => {
  const invalidConfig = {
    name: "test-project",
  };

  const result = DevcontainerConfigSchema.safeParse(invalidConfig);
  assertEquals(result.success, false);
});
