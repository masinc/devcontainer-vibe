# Devcontainer Generator

宣言的な設定ファイルからカスタマイズされたdevcontainer環境を生成するDenoベースのツールです。

## 特徴

- 🛠️ **コンポーネントベースのアーキテクチャ** -
  異なるツールやサービス用のモジュラーコンポーネント
- 📦 **複数のパッケージマネージャー** - apt、mise、Nixをサポート
- 🔥 **ファイアウォール設定** -
  ドメイン許可リストを持つ組み込みファイアウォール設定
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
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "ripgrep"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts"]
      }
    }
  ]
}
```

## 利用可能なコンポーネント

### パッケージ管理
- `apt.install` - システムパッケージ（複数利用可能）
- `mise.setup` - ランタイム管理設定（単一利用のみ）
- `mise.install` - ランタイムパッケージ（複数利用可能）
- `nix.setup` - Home Manager対応Nixセットアップ（単一利用のみ）
- `nix.install` - Nixパッケージ（複数利用可能）

### セキュリティ & ファイアウォール
- `firewall.setup` - ipset対応基本ファイアウォール設定（単一利用のみ）
- `firewall.domain` - ドメインベースファイアウォールルール（複数利用可能）
- `firewall.github-api` - GitHub API IP範囲（単一利用のみ）
- `sudo.disable` - セキュリティ強化（単一利用のみ）

### 開発環境
- `vscode.install` - VS Code拡張機能（複数利用可能）
- `shell.setup` - シェル設定（単一利用のみ）
- `shell.dockerfile` - Docker内でのシェルコマンド（複数利用可能）
- `shell.post-create` - コンテナー作成後のシェルコマンド（複数利用可能）

### コンポーネント使用ルール
- **単一利用のみ**: セットアップコンポーネントは設定ごとに一度だけ使用可能
- **複数利用可能**: インストールとコマンドコンポーネントは複数回使用可能
- **自動マージ**: 同じコンポーネントの複数回使用は自動的にマージされる

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
