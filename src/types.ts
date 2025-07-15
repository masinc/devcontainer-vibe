import { z } from "zod";

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

  // ファイアウォール ドメイン設定
  z.object({
    name: z.literal("firewall.domains"),
    params: z.object({
      domains: z.array(z.string()),
    }),
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
