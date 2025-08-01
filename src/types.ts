import { z } from "zod";

// ファイアウォールプリセット定義
export const FIREWALL_PRESETS = {
  github: [
    "github.com",
    "api.github.com",
    "raw.githubusercontent.com",
    "objects.githubusercontent.com",
    "codeload.github.com",
    "avatars.githubusercontent.com",
    "ghcr.io",
  ],
  npm: [
    "registry.npmjs.org",
    "npm.pkg.github.com",
    "npmjs.com",
  ],
  "claude-code": [
    "api.anthropic.com",
    "claude.ai",
    "console.anthropic.com",
    "sentry.io",
    "statsig.anthropic.com",
    "statsig.com",
  ],
  nix: [
    "cache.nixos.org",
    "nixos.org",
    "channels.nixos.org",
    "nix-community.cachix.org",
    "hydra.nixos.org",
  ],
  deno: [
    "deno.land",
    "jsr.io",
    "deno.com",
  ],
  python: [
    "pypi.org",
    "files.pythonhosted.org",
    "pythonhosted.org",
  ],
  google: [
    "googleapis.com",
    "accounts.google.com",
    "oauth2.googleapis.com",
    "generativelanguage.googleapis.com",
    "ai.google.dev",
  ],
  ubuntu: [
    "archive.ubuntu.com",
    "security.ubuntu.com",
    "ports.ubuntu.com",
    "keyserver.ubuntu.com",
  ],
  debian: [
    "deb.debian.org",
    "security.debian.org",
    "ftp.debian.org",
  ],
  mise: [
    "mise.jdx.dev",
    "mise-releases.s3.amazonaws.com",
  ],
  vscode: [
    "marketplace.visualstudio.com",
    "vscode.dev",
    "code.visualstudio.com",
    "open-vsx.org",
  ],
} as const;

export type FirewallPreset = keyof typeof FIREWALL_PRESETS;

// 基本的なコンポーネント定義
export const ComponentSchema = z.discriminatedUnion("name", [
  // APT パッケージインストール
  z.object({
    $comment: z.string().optional(),
    name: z.literal("apt.install"),
    params: z.object({
      $comment: z.string().optional(),
      packages: z.array(z.string()),
    }),
  }),

  // mise セットアップ
  z.object({
    $comment: z.string().optional(),
    name: z.literal("mise.setup"),
  }),

  // mise パッケージインストール
  z.object({
    $comment: z.string().optional(),
    name: z.literal("mise.install"),
    params: z.object({
      $comment: z.string().optional(),
      packages: z.array(z.string()),
    }),
  }),

  // Nix セットアップ
  z.object({
    $comment: z.string().optional(),
    name: z.literal("nix.setup"),
  }),

  // Nix パッケージインストール
  z.object({
    $comment: z.string().optional(),
    name: z.literal("nix.install"),
    params: z.object({
      $comment: z.string().optional(),
      packages: z.array(z.string()),
    }),
  }),

  // ファイアウォール セットアップ
  z.object({
    $comment: z.string().optional(),
    name: z.literal("firewall.setup"),
  }),

  // ファイアウォール ドメイン設定（統合版）
  z.object({
    $comment: z.string().optional(),
    name: z.literal("firewall.domain"),
    params: z.object({
      $comment: z.string().optional(),
      presets: z.array(z.string()).optional(),
      allows: z.array(z.string()).optional(),
    }).refine(
      (data) => data.presets || data.allows,
      { message: "Either presets or allows must be provided" },
    ),
  }),

  // ファイアウォール GitHub動的IP設定
  z.object({
    $comment: z.string().optional(),
    name: z.literal("firewall.github-api"),
  }),

  // sudo無効化
  z.object({
    $comment: z.string().optional(),
    name: z.literal("sudo.disable"),
  }),

  // VS Code 拡張機能インストール
  z.object({
    $comment: z.string().optional(),
    name: z.literal("vscode.install"),
    params: z.object({
      $comment: z.string().optional(),
      extensions: z.array(z.string()),
    }),
  }),

  // シェル設定
  z.object({
    $comment: z.string().optional(),
    name: z.literal("shell.setup"),
    params: z.object({
      $comment: z.string().optional(),
      shell: z.enum(["bash", "fish", "zsh"]),
    }),
  }),

  // シェル実行（Dockerfile内）
  z.object({
    $comment: z.string().optional(),
    name: z.literal("shell.dockerfile"),
    params: z.object({
      $comment: z.string().optional(),
      user: z.enum(["root", "vscode"]),
      commands: z.array(z.string()),
    }),
  }),

  // シェル実行（postCreateCommand）
  z.object({
    $comment: z.string().optional(),
    name: z.literal("shell.post-create"),
    params: z.object({
      $comment: z.string().optional(),
      user: z.enum(["root", "vscode"]),
      commands: z.array(z.string()),
    }),
  }),
]);

// 文字列のみのコンポーネント（パラメータなし）
export const SimpleComponentSchema = z.string();

// 設定ファイル全体のスキーマ
export const DevcontainerConfigSchema = z.object({
  $schema: z.string().optional(),
  $comment: z.string().optional(),
  name: z.string(),
  components: z.array(
    z.union([ComponentSchema, SimpleComponentSchema]),
  ),
});

// 型定義をエクスポート
export type Component = z.infer<typeof ComponentSchema>;
export type SimpleComponent = z.infer<typeof SimpleComponentSchema>;
export type DevcontainerConfig = z.infer<typeof DevcontainerConfigSchema>;

// コンポーネントの種類
export type ComponentType = Component["name"] | SimpleComponent;
