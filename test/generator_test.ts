import { assertEquals } from "@std/assert";
import { DevcontainerGenerator } from "../src/generator.ts";
import { join } from "@std/path";

Deno.test("DevcontainerGenerator - minimal config", async () => {
  const generator = new DevcontainerGenerator();

  // テスト用の一時ディレクトリを作成
  const tempDir = await Deno.makeTempDir();

  try {
    await generator.generate("examples/minimal.json", tempDir);

    // 生成されたファイルを確認
    const dockerfile = await Deno.readTextFile(join(tempDir, "Dockerfile"));
    const devcontainer = await Deno.readTextFile(
      join(tempDir, "devcontainer.json"),
    );

    // Dockerfileの内容をチェック
    assertEquals(
      dockerfile.includes("FROM mcr.microsoft.com/devcontainers/base:jammy"),
      true,
    );
    assertEquals(dockerfile.includes("git curl"), true);
    assertEquals(dockerfile.includes("curl https://mise.run"), true);
    assertEquals(dockerfile.includes("mise use -g deno@latest"), true);

    // devcontainer.jsonの内容をチェック
    const devcontainerObj = JSON.parse(devcontainer);
    assertEquals(devcontainerObj.name, "minimal-deno");
    assertEquals(
      devcontainerObj.customizations.vscode.extensions.includes(
        "denoland.vscode-deno",
      ),
      true,
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("DevcontainerGenerator - full config", async () => {
  const generator = new DevcontainerGenerator();

  // テスト用の一時ディレクトリを作成
  const tempDir = await Deno.makeTempDir();

  try {
    await generator.generate("examples/deno-project.json", tempDir);

    // 生成されたファイルを確認
    const dockerfile = await Deno.readTextFile(join(tempDir, "Dockerfile"));
    const devcontainer = await Deno.readTextFile(
      join(tempDir, "devcontainer.json"),
    );

    // Dockerfileの内容をチェック
    assertEquals(
      dockerfile.includes("FROM mcr.microsoft.com/devcontainers/base:jammy"),
      true,
    );
    assertEquals(
      dockerfile.includes("git curl ripgrep fd-find iptables"),
      true,
    );
    assertEquals(dockerfile.includes("curl https://mise.run"), true);
    assertEquals(
      dockerfile.includes("curl -L https://nixos.org/nix/install"),
      true,
    );
    assertEquals(dockerfile.includes("chsh -s /bin/fish vscode"), true);

    // devcontainer.jsonの内容をチェック
    const devcontainerObj = JSON.parse(devcontainer);
    assertEquals(devcontainerObj.name, "deno-development");
    assertEquals(
      devcontainerObj.customizations.vscode.extensions.includes(
        "denoland.vscode-deno",
      ),
      true,
    );
    assertEquals(
      devcontainerObj.customizations.vscode.extensions.includes(
        "esbenp.prettier-vscode",
      ),
      true,
    );

    // スクリプトファイルを確認
    const scriptsDir = join(tempDir, "scripts");
    const firewallSetup = await Deno.readTextFile(
      join(scriptsDir, "firewall-setup.sh"),
    );
    const firewallDomains = await Deno.readTextFile(
      join(scriptsDir, "firewall-domain.sh"),
    );

    assertEquals(firewallSetup.includes("iptables -P INPUT DROP"), true);
    assertEquals(
      firewallDomains.includes("iptables -A OUTPUT -d github.com -j ACCEPT"),
      true,
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
