# CLIオプション ドキュメント

このドキュメントは、Devcontainer Generatorで利用可能なすべてのコマンドラインオプションについて詳細な情報を提供します。

## 目次

- [概要](#概要)
- [グローバルオプション](#グローバルオプション)
- [使用例](#使用例)
- [設定ファイルの発見](#設定ファイルの発見)
- [出力ディレクトリの動作](#出力ディレクトリの動作)
- [エラーハンドリング](#エラーハンドリング)
- [環境変数](#環境変数)

## 概要

Devcontainer Generatorは、3つの主要オプションを持つシンプルなコマンドラインインターフェースを提供します：

```bash
deno run --allow-read --allow-write src/main.ts [options]
```

## グローバルオプション

### `--config` / `-c`

**型:** `string`  
**デフォルト:** `devcontainer-config.json`  
**必須:** いいえ

devcontainer環境を定義する設定ファイルのパスを指定します。

#### 動作

- **相対パス**: 現在の作業ディレクトリを基準として解決
- **絶対パス**: そのまま使用
- **デフォルト動作**: 指定されていない場合、現在のディレクトリの`devcontainer-config.json`を探す
- **ファイル検証**: ファイルが存在し読み取り可能である必要があり、そうでなければコマンドは失敗

#### 例

```bash
# デフォルト設定ファイルを使用
deno task generate

# 相対パスを使用
deno task generate --config my-config.json
deno task generate --config configs/development.json
deno task generate --config ../shared-configs/deno.json

# 絶対パスを使用
deno task generate --config /home/user/configs/production.json

# 短縮フラグを使用
deno task generate -c examples/minimal.json
```

#### エラー条件

以下の場合にコマンドが失敗します：
- 指定されたファイルが存在しない
- ファイルが読み取り不可能（権限の問題）
- ファイルが有効なJSONでない
- JSONが期待されるスキーマと一致しない

```bash
# ファイルが見つからない
$ deno task generate --config nonexistent.json
❌ Error: No such file or directory (os error 2)

# 無効なJSON
$ deno task generate --config invalid.json
❌ Error: Unexpected token '}' in JSON at position 45

# スキーマ検証エラー
$ deno task generate --config invalid-schema.json
❌ Error: Invalid input: Expected object, received string at "components[0]"
```

### `--output` / `-o`

**型:** `string`  
**デフォルト:** `.devcontainer`  
**必須:** いいえ

生成されたdevcontainerファイルが作成される出力ディレクトリを指定します。

#### 動作

- **ディレクトリ作成**: 存在しない場合はディレクトリを作成
- **存在チェック**: ディレクトリが既に存在する場合はエラーを発生（安全機能）
- **相対パス**: 現在の作業ディレクトリを基準として解決
- **絶対パス**: そのまま使用
- **権限**: 親ディレクトリでの書き込み権限が必要

#### 例

```bash
# デフォルト出力ディレクトリを使用
deno task generate --config my-config.json
# 出力先: .devcontainer/

# カスタム出力ディレクトリを使用
deno task generate --config my-config.json --output my-devcontainer
# 出力先: my-devcontainer/

# 相対パスを使用
deno task generate --config my-config.json --output containers/development
# 出力先: containers/development/

# 絶対パスを使用
deno task generate --config my-config.json --output /tmp/test-container
# 出力先: /tmp/test-container/

# 短縮フラグを使用
deno task generate -c my-config.json -o test-output
# 出力先: test-output/
```

#### 安全機能

ジェネレーターには偶発的な上書きを防ぐための安全機能が含まれています：

```bash
# 初回実行 - ディレクトリを作成
$ deno task generate --config my-config.json --output test-container
✅ Devcontainer generated successfully!

# 2回目の実行 - エラーで失敗
$ deno task generate --config my-config.json --output test-container
❌ Error: Output directory 'test-container' already exists. Please remove it or use a different output directory.
```

#### 生成される構造

出力ディレクトリには以下が含まれます：

```
output-directory/
├── Dockerfile              # 生成されたDockerfile
├── devcontainer.json       # VS Code devcontainer設定
└── scripts/               # 初期化スクリプト（ある場合）
    ├── firewall-setup.sh   # ファイアウォール設定
    └── firewall-domains.sh # ドメイン許可リスト
```

### `--help` / `-h`

**型:** `boolean`  
**デフォルト:** `false`  
**必須:** いいえ

ヘルプ情報を表示して終了します。

#### 動作

- **優先度**: 他のすべてのオプションより優先される
- **終了コード**: 0（成功）で終了
- **出力**: 使用方法情報を標準出力に出力

#### 例

```bash
$ deno task generate --help
Devcontainer Generator - Generate devcontainer from configuration

Usage:
  deno run src/main.ts [options]

Options:
  --config <path>    Configuration file path (default: devcontainer-config.json)
  --output <path>    Output directory (default: .devcontainer)
  --help             Show this help message

Examples:
  deno run src/main.ts --config my-config.json --output my-devcontainer
  deno run src/main.ts --config examples/deno-project.json
```

## 使用例

### 基本的な使用法

```bash
# デフォルト設定で生成
deno task generate

# 以下と同等：
deno run --allow-read --allow-write src/main.ts --config devcontainer-config.json --output .devcontainer
```

### 開発ワークフロー

```bash
# 開発用（実際の.devcontainerを上書きしないよう安全な出力先）
deno task generate --config examples/deno-project.json --output dev-container

# 異なる設定をテスト
deno task generate --config configs/minimal.json --output test-minimal
deno task generate --config configs/full.json --output test-full
deno task generate --config configs/secure.json --output test-secure

# 本番デプロイ
deno task generate:prod --config production.json
```

### プロジェクト固有の設定

```bash
# フロントエンドプロジェクト
deno task generate --config frontend.json --output .devcontainer-frontend

# バックエンドプロジェクト
deno task generate --config backend.json --output .devcontainer-backend

# フルスタックプロジェクト
deno task generate --config fullstack.json --output .devcontainer-fullstack
```

### チーム連携

```bash
# チーム共有設定
deno task generate --config team-configs/shared.json --output .devcontainer

# 個人開発者の設定
deno task generate --config team-configs/shared.json --output .devcontainer-$(whoami)
```

## 設定ファイルの発見

ジェネレーターは設定ファイルを以下の優先順位で探します：

1. **コマンドライン引数**: `--config`オプションが最優先
2. **現在のディレクトリ**: 現在の作業ディレクトリの`devcontainer-config.json`
3. **エラー**: 設定が見つからない場合、コマンドは失敗

### 検索パス

```bash
# 以下の順序で検索：
1. ./devcontainer-config.json  (--configが指定されていない場合)
2. [ERROR] 設定が見つからない
```

### 設定ファイルの命名

サポートされる設定ファイル拡張子：
- `.json`（推奨）
- 内容が有効なJSONである限り、任意の拡張子をサポート

## 出力ディレクトリの動作

### 作成プロセス

1. **存在確認**: 出力ディレクトリが存在しないことを確認
2. **ディレクトリ作成**: 出力ディレクトリと必要な親ディレクトリを作成
3. **ファイル生成**: Dockerfile、devcontainer.json、スクリプトを作成
4. **権限設定**: スクリプトファイルを実行可能にする（chmod +x）

### ディレクトリ構造

```
output-directory/
├── Dockerfile              # 常に生成される
├── devcontainer.json       # 常に生成される
└── scripts/               # コンポーネントがスクリプトを生成する場合のみ
    ├── firewall-setup.sh   # firewall.setupコンポーネントから
    └── firewall-domains.sh # firewall.domainsコンポーネントから
```

### 上書き保護

ジェネレーターは偶発的な上書きから保護します：

```bash
# 安全 - ディレクトリが存在しない
$ deno task generate --output new-container
✅ Devcontainer generated successfully!

# 危険 - ディレクトリが存在する
$ deno task generate --output new-container
❌ Error: Output directory 'new-container' already exists. Please remove it or use a different output directory.

# 手動クリーンアップが必要
$ rm -rf new-container
$ deno task generate --output new-container
✅ Devcontainer generated successfully!
```

## エラーハンドリング

### よくあるエラー

#### 設定ファイルエラー

```bash
# ファイルが見つからない
❌ Error: No such file or directory (os error 2)

# 権限拒否
❌ Error: Permission denied (os error 13)

# 無効なJSON構文
❌ Error: Unexpected token '}' in JSON at position 45

# スキーマ検証失敗
❌ Error: Invalid input: Expected object, received string at "components[0]"
```

#### 出力ディレクトリエラー

```bash
# ディレクトリが既に存在
❌ Error: Output directory 'existing-dir' already exists. Please remove it or use a different output directory.

# 権限拒否
❌ Error: Permission denied (os error 13)

# パスがディレクトリではなくファイル
❌ Error: File exists (os error 17)
```

#### コンポーネントエラー

```bash
# 未知のコンポーネント型
❌ Error: Unknown component type: invalid.component

# 必須パラメータの不足
❌ Error: apt.install requires parameters

# 無効なパラメータ型
❌ Error: Invalid input: Expected array, received string at "params.packages"
```

### エラー終了コード

- `0`: 成功
- `1`: 一般的なエラー（設定、検証、ファイルシステム）

## 環境変数

ジェネレーターは現在環境変数を使用しませんが、標準的なシステム環境変数を尊重します：

### システム変数

- `PATH`: システムコマンドの検索に使用
- `HOME`: パスの`~`の解決に使用
- `PWD`: 相対パスの現在の作業ディレクトリ

## ベストプラクティス

### 設定管理

```bash
# 良い例 - 組織化された設定ファイル
configs/
├── base.json           # 基本設定
├── development.json    # 開発用オーバーライド
├── production.json     # 本番設定
└── testing.json        # テスト環境

# 異なる環境を生成
deno task generate --config configs/development.json --output .devcontainer-dev
deno task generate --config configs/production.json --output .devcontainer-prod
```

### 出力ディレクトリ管理

```bash
# 良い例 - 説明的な出力名
deno task generate --config frontend.json --output .devcontainer-frontend
deno task generate --config backend.json --output .devcontainer-backend

# 良い例 - 一時的なテスト
deno task generate --config test.json --output /tmp/test-container

# 避けるべき例 - 紛らわしい名前
deno task generate --config config.json --output container
```

### スクリプトでのエラーハンドリング

```bash
#!/bin/bash
set -e  # エラーで終了

# エラーハンドリング付きでdevcontainerを生成
if ! deno task generate --config production.json --output .devcontainer-prod; then
    echo "Devcontainerの生成に失敗しました"
    exit 1
fi

echo "Devcontainerの生成が完了しました"
```

詳細については、メインのREADME.mdと設定形式のドキュメントを参照してください。