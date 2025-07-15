import { z } from "zod";

// ファイアウォールプリセット定義
export const FIREWALL_PRESETS = {
  github: [
    "github.com",
    "api.github.com",
    "raw.githubusercontent.com",
    "objects.githubusercontent.com"
  ],
  vscode: [
    "marketplace.visualstudio.com",
    "vscode.dev",
    "code.visualstudio.com",
    "open-vsx.org"
  ],
  npm: [
    "registry.npmjs.org",
    "npm.pkg.github.com"
  ],
  claude: [
    "claude.ai",
    "api.anthropic.com"
  ],
  deno: [
    "deno.land",
    "jsr.io"
  ],
  python: [
    "pypi.org",
    "files.pythonhosted.org"
  ]
} as const;

export type FirewallPreset = keyof typeof FIREWALL_PRESETS;

// 基本的なコンポーネント定義
export const ComponentSchema = z.discriminatedUnion("name", [
  // APT パッケージインストール
  z.object({
    name: z.literal("apt.install"),
    params: z.object({
      packages: z.array(z.string()),
    }),
  }),

  // mise セットアップ
  z.object({
    name: z.literal("mise.setup"),
  }),

  // mise パッケージインストール
  z.object({
    name: z.literal("mise.install"),
    params: z.object({
      packages: z.array(z.string()),
    }),
  }),

  // Nix セットアップ
  z.object({
    name: z.literal("nix.setup"),
  }),

  // Nix パッケージインストール
  z.object({
    name: z.literal("nix.install"),
    params: z.object({
      packages: z.array(z.string()),
    }),
  }),

  // ファイアウォール セットアップ
  z.object({
    name: z.literal("firewall.setup"),
  }),

  // ファイアウォール ドメイン設定（統合版）
  z.object({
    name: z.literal("firewall.domain"),
    params: z.object({
      presets: z.array(z.string()).optional(),
      allows: z.array(z.string()).optional(),
    }).refine(
      (data) => data.presets || data.allows,
      { message: "Either presets or allows must be provided" }
    ),
  }),

  // VS Code 拡張機能インストール
  z.object({
    name: z.literal("vscode.install"),
    params: z.object({
      extensions: z.array(z.string()),
    }),
  }),

  // シェル設定
  z.object({
    name: z.literal("shell.setup"),
    params: z.object({
      shell: z.enum(["bash", "fish", "zsh"]),
    }),
  }),
]);

// 文字列のみのコンポーネント（パラメータなし）
export const SimpleComponentSchema = z.string();

// 設定ファイル全体のスキーマ
export const DevcontainerConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
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
