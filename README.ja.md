# Devcontainer Generator

宣言的な設定ファイルからカスタマイズされたdevcontainer環境を生成するDenoベースのツールです。

## 特徴

- 🛠️ **コンポーネントベースのアーキテクチャ** - 異なるツールやサービス用のモジュラーコンポーネント
- 📦 **複数のパッケージマネージャー** - apt、mise、Nixをサポート
- 🔥 **ファイアウォール設定** - ドメイン許可リストを持つ組み込みファイアウォール設定
- 🎨 **VS Code統合** - 自動拡張機能インストールと設定
- 🐚 **シェルカスタマイズ** - bash、fish、zshをサポート
- ✅ **型安全な設定** - Zod v4スキーマ検証
- 🧪 **包括的テスト** - 例を含む完全なテストカバレッジ

## クイックスタート

```bash
# リポジトリをクローン
git clone <repository-url>
cd devcontainer-generator

# 例の設定からdevcontainerを生成
deno task generate --config examples/minimal.json

# 特定の出力ディレクトリに生成
deno task generate --config examples/deno-project.json --output my-devcontainer

# テストを実行
deno task test
```

## 基本設定

```json
{
  "name": "my-project",
  "description": "My development environment",
  "components": [
    {
      "name": "apt.install",
      "params": {
        "packages": ["git", "curl", "ripgrep"]
      }
    },
    "mise.setup",
    {
      "name": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts"]
      }
    }
  ]
}
```

## 利用可能なコンポーネント

- `apt.install` - システムパッケージ
- `mise.setup` / `mise.install` - ランタイム管理
- `nix.setup` / `nix.install` - Nixパッケージ
- `firewall.setup` / `firewall.domains` - セキュリティ
- `vscode.install` - VS Code拡張機能
- `shell.setup` - シェル設定

## ドキュメント

### [設定ファイル形式](docs/config-format.ja.md)
設定ファイル形式の完全ガイド：
- 基本構造とスキーマ
- 利用可能なすべてのコンポーネント型
- 高度な使用パターン
- ベストプラクティス
- バリデーションルール
- 包括的な例

### [CLIオプション](docs/cli-options.ja.md)
すべてのコマンドラインオプションの詳細ドキュメント：
- `--config` / `-c`: 設定ファイルパス
- `--output` / `-o`: 出力ディレクトリ
- `--help` / `-h`: ヘルプ情報の表示
- 使用例とエラーハンドリング

## 開発

```bash
# ホットリロード付き開発
deno task dev

# devcontainerを生成（安全 - generated-devcontainerに出力）
deno task generate

# 本番用.devcontainerディレクトリに生成
deno task generate:prod

# テストを実行
deno task test
```

## 要件

- Deno 2.0+
- 出力ディレクトリへの書き込み権限

## ライセンス

MIT License - 詳細はLICENSEファイルを参照