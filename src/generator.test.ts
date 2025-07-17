import { assertEquals } from "@std/assert";
import { DevcontainerGenerator } from "./generator.ts";
import { join } from "@std/path";

Deno.test("DevcontainerGenerator - generate creates correct Dockerfile", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    await generator.generate("examples/minimal.json", tempDir);

    const dockerfile = await Deno.readTextFile(
      join(tempDir, ".devcontainer", "Dockerfile"),
    );

    // Check basic structure
    assertEquals(
      dockerfile.includes("FROM mcr.microsoft.com/devcontainers/base:jammy"),
      true,
    );
    assertEquals(dockerfile.includes("USER root"), true);
    assertEquals(dockerfile.includes("USER vscode"), true);

    // Check specific commands from minimal config
    assertEquals(dockerfile.includes("apt install -y mise"), true);
    assertEquals(dockerfile.includes("mise use -g node@lts"), true);
    assertEquals(dockerfile.includes("nix-shell '<home-manager>'"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - generate creates correct devcontainer.json", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    await generator.generate("examples/minimal.json", tempDir);

    const devcontainerContent = await Deno.readTextFile(
      join(tempDir, ".devcontainer", "devcontainer.json"),
    );
    const devcontainer = JSON.parse(devcontainerContent);

    // Check basic structure
    assertEquals(devcontainer.name, "minimal-package-manager");
    assertEquals(devcontainer.build.dockerfile, "Dockerfile");
    assertEquals(devcontainer.build.context, ".");
    assertEquals(devcontainer.remoteUser, "vscode");

    // Check environment variables
    assertEquals(
      devcontainer.remoteEnv.MISE_DATA_DIR,
      "/home/vscode/.local/share/mise",
    );
    assertEquals(devcontainer.remoteEnv.PATH.includes("mise/shims"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - generate creates scripts when needed", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    await generator.generate("examples/deno-project.json", tempDir);

    const scriptsDir = join(tempDir, ".devcontainer", "scripts");

    // Check scripts directory exists
    const scriptsInfo = await Deno.stat(scriptsDir);
    assertEquals(scriptsInfo.isDirectory, true);

    // Check firewall setup script
    const firewallSetup = await Deno.readTextFile(
      join(scriptsDir, "firewall-setup.sh"),
    );
    assertEquals(firewallSetup.includes("iptables -P INPUT DROP"), true);

    // Check firewall domain script
    const firewallDomain = await Deno.readTextFile(
      join(scriptsDir, "firewall-domain.sh"),
    );
    assertEquals(
      firewallDomain.includes("🔍 Resolving github.com"),
      true,
    );

    // Check script permissions
    const scriptStat = await Deno.stat(join(scriptsDir, "firewall-setup.sh"));
    assertEquals(scriptStat.mode! & 0o755, 0o755);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - mergeConfig handles arrays", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  // Create config with multiple vscode.install components
  const configContent = JSON.stringify({
    name: "merge-test",
    components: [
      {
        name: "vscode.install",
        params: {
          extensions: ["ext1", "ext2"],
        },
      },
      {
        name: "vscode.install",
        params: {
          extensions: ["ext3", "ext4"],
        },
      },
    ],
  });

  const configPath = join(tempDir, "merge-config.json");
  await Deno.writeTextFile(configPath, configContent);

  try {
    await generator.generate(configPath, join(tempDir, "output"));

    const devcontainerContent = await Deno.readTextFile(
      join(tempDir, "output", ".devcontainer", "devcontainer.json"),
    );
    const devcontainer = JSON.parse(devcontainerContent);

    // Extensions should be merged
    assertEquals(devcontainer.customizations.vscode.extensions, [
      "ext1",
      "ext2",
      "ext3",
      "ext4",
    ]);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - processes multiple apt.install components", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  // Create config with multiple apt.install components
  const configContent = JSON.stringify({
    name: "multi-apt-test",
    components: [
      {
        name: "apt.install",
        params: {
          packages: ["git", "curl"],
        },
      },
      {
        name: "apt.install",
        params: {
          packages: ["vim", "ripgrep"],
        },
      },
    ],
  });

  const configPath = join(tempDir, "multi-apt-config.json");
  await Deno.writeTextFile(configPath, configContent);

  try {
    await generator.generate(configPath, join(tempDir, "output"));

    const dockerfile = await Deno.readTextFile(
      join(tempDir, "output", ".devcontainer", "Dockerfile"),
    );

    // Should have multiple apt install commands
    assertEquals(dockerfile.includes("git curl"), true);
    assertEquals(dockerfile.includes("vim ripgrep"), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - prevents duplicate setup components", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    const configContent = JSON.stringify({
      name: "duplicate-setup-test",
      components: [
        "mise.setup",
        "mise.setup", // 重複
      ],
    });

    const configPath = join(tempDir, "duplicate-config.json");
    await Deno.writeTextFile(configPath, configContent);

    // 重複エラーが発生することを確認
    try {
      await generator.generate(configPath, join(tempDir, "output"));
      throw new Error("Should have thrown duplicate component error");
    } catch (error) {
      assertEquals(
        (error as Error).message,
        "Component 'mise.setup' can only be used once",
      );
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - merges multiple shell.post-create components", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    const configContent = JSON.stringify({
      name: "multi-post-create-test",
      components: [
        {
          name: "shell.post-create",
          params: {
            user: "vscode",
            commands: ["echo 'first command'", "npm install"],
          },
        },
        {
          name: "shell.post-create",
          params: {
            user: "root",
            commands: ["echo 'root command'"],
          },
        },
        {
          name: "shell.post-create",
          params: {
            user: "vscode",
            commands: ["echo 'second vscode command'"],
          },
        },
      ],
    });

    const configPath = join(tempDir, "multi-post-create-config.json");
    await Deno.writeTextFile(configPath, configContent);

    await generator.generate(configPath, join(tempDir, "output"));

    const vscodScript = await Deno.readTextFile(
      join(
        tempDir,
        "output",
        ".devcontainer",
        "scripts",
        "shell-post-create-vscode.sh",
      ),
    );
    const rootScript = await Deno.readTextFile(
      join(
        tempDir,
        "output",
        ".devcontainer",
        "scripts",
        "shell-post-create-root.sh",
      ),
    );
    const devcontainerJson = JSON.parse(
      await Deno.readTextFile(
        join(tempDir, "output", ".devcontainer", "devcontainer.json"),
      ),
    );

    // vscodスクリプトに該当するコマンドが含まれることを確認
    assertEquals(vscodScript.includes("echo 'first command'"), true);
    assertEquals(vscodScript.includes("npm install"), true);
    assertEquals(vscodScript.includes("echo 'second vscode command'"), true);

    // rootスクリプトに該当するコマンドが含まれることを確認
    assertEquals(rootScript.includes("echo 'root command'"), true);

    // 実行コマンドが正しく設定されることを確認
    assertEquals(
      devcontainerJson.postCreateCommand,
      "/usr/local/scripts/shell-post-create-vscode.sh && sudo /usr/local/scripts/shell-post-create-root.sh",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - overwrite existing directory", async () => {
  const generator = new DevcontainerGenerator();
  const tempDir = await Deno.makeTempDir();

  try {
    const configContent = JSON.stringify({
      name: "overwrite-test",
      components: ["mise.setup"],
    });

    const configPath = join(tempDir, "overwrite-config.json");
    await Deno.writeTextFile(configPath, configContent);

    const outputDir = join(tempDir, "my-output"); // /tmp/ を含まないパスにする
    const devcontainerDir = join(outputDir, ".devcontainer");

    // 最初の生成
    await generator.generate(configPath, outputDir);
    
    // ディレクトリが存在することを確認
    const exists1 = await Deno.stat(devcontainerDir).then(() => true).catch(() => false);
    assertEquals(exists1, true);

    // overwrite=false では失敗するはず
    try {
      await generator.generate(configPath, outputDir, false);
      throw new Error("Should have thrown directory exists error");
    } catch (error) {
      assertEquals(
        (error as Error).message.includes("already exists"),
        true,
      );
    }

    // overwrite=true では成功するはず
    await generator.generate(configPath, outputDir, true);
    
    // ディレクトリがまだ存在することを確認
    const exists2 = await Deno.stat(devcontainerDir).then(() => true).catch(() => false);
    assertEquals(exists2, true);

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
