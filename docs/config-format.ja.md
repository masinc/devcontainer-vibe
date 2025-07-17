# 設定ファイル形式ドキュメント

このドキュメントは、Devcontainer
Generatorで使用される設定ファイル形式の包括的なガイドです。

## 目次

- [基本構造](#基本構造)
- [設定スキーマ](#設定スキーマ)
- [コンポーネントの種類](#コンポーネントの種類)
- [高度な使用方法](#高度な使用方法)
- [ベストプラクティス](#ベストプラクティス)
- [バリデーション](#バリデーション)
- [例](#例)

## 基本構造

設定ファイルは、devcontainer環境の構造とコンポーネントを定義するJSONドキュメントです。基本構造は以下の通りです：

```json
{
  "name": "string",
  "components": [
    // コンポーネントオブジェクトと文字列の配列
  ]
}
```

### ルートプロパティ

| プロパティ    | 型       | 必須 | 説明                                      |
| ------------- | -------- | ---- | ----------------------------------------- |
| `name`        | `string` | ✅   | devcontainer環境の名前                    |
| `components`  | `array`  | ✅   | インストール/設定するコンポーネントの配列 |

## 設定スキーマ

設定はZod
v4スキーマバリデーションを使用して検証されます。スキーマは型安全性を保証し、無効な設定に対して有用なエラーメッセージを提供します。

### コンポーネントスキーマ

コンポーネントは以下のいずれかです：

1. **シンプルコンポーネント** (文字列) - パラメータなしのコンポーネント
2. **複合コンポーネント** (オブジェクト) - パラメータありのコンポーネント

```typescript
// シンプルコンポーネント
"mise.setup"

// 複合コンポーネント
{
  "component": "apt.install",
  "params": {
    "packages": ["git", "curl"]
  }
}
```

## コンポーネントの種類

### 1. システムパッケージのインストール

#### `apt.install`

APTパッケージマネージャーを使用してシステムパッケージをインストールします。

```json
{
  "component": "apt.install",
  "params": {
    "packages": ["git", "curl", "ripgrep", "fd-find", "iptables"]
  }
}
```

**パラメータ:**

- `packages` (文字列の配列): インストールするAPTパッケージ名のリスト

**生成されるDockerコマンド:**

```dockerfile
RUN apt-get update && apt-get install -y \
    git curl ripgrep fd-find iptables \
    && rm -rf /var/lib/apt/lists/*
```

### 2. ランタイム管理 (mise)

#### `mise.setup`

miseランタイムバージョンマネージャーをインストールします。

```json
"mise.setup"
```

**パラメータ:** なし

**生成されるDockerコマンド:**

```dockerfile
RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:$PATH"
```

#### `mise.install`

miseを使用して言語ランタイムをインストールします。

```json
{
  "component": "mise.install",
  "params": {
    "packages": ["deno@latest", "node@lts", "python@3.12"]
  }
}
```

**パラメータ:**

- `packages` (文字列の配列): `tool@version`形式のランタイム仕様のリスト

**生成されるDockerコマンド:**

```dockerfile
RUN mise use -g deno@latest
RUN mise use -g node@lts
RUN mise use -g python@3.12
```

### 3. パッケージ管理 (Nix)

#### `nix.setup`

Nixパッケージマネージャーをインストールします。

```json
"nix.setup"
```

**パラメータ:** なし

**生成されるDockerコマンド:**

```dockerfile
RUN curl -L https://nixos.org/nix/install | sh -s -- --daemon
ENV PATH="/nix/var/nix/profiles/default/bin:$PATH"
```

#### `nix.install`

Nixを使用してパッケージをインストールします。

```json
{
  "component": "nix.install",
  "params": {
    "packages": ["starship", "fish", "ripgrep"]
  }
}
```

**パラメータ:**

- `packages` (文字列の配列): Nixパッケージ名のリスト

**生成されるDockerコマンド:**

```dockerfile
RUN nix-env -iA nixpkgs.starship nixpkgs.fish nixpkgs.ripgrep
```

### 4. ファイアウォール設定

#### `firewall.setup`

基本的なファイアウォールルールを設定します。

```json
"firewall.setup"
```

**パラメータ:** なし

**生成されるファイル:**

- `scripts/firewall-setup.sh`: 基本的なiptables設定スクリプト

#### `firewall.domain`

プリセットまたはカスタム許可を使用して、特定のドメインを許可するようにファイアウォールを設定します。

```json
{
  "component": "firewall.domain",
  "params": {
    "presets": ["github", "deno", "npm"],
    "allows": ["custom-domain.com"]
  }
}
```

**パラメータ:**

- `presets` (文字列の配列, オプション): 事前定義されたドメインセット (github, deno, npm, nix等)
- `allows` (文字列の配列, オプション): 許可するカスタムドメイン名

**生成されるファイル:**

- `scripts/firewall-domain.sh`: ドメイン固有のファイアウォールルール

#### `firewall.github-api`

GitHub APIから動的IP範囲を取得してファイアウォールを設定します。

```json
"firewall.github-api"
```

**パラメータ:** なし

**生成されるファイル:**

- `scripts/firewall-github-dynamic.sh`: GitHub API ベースのIP範囲設定

### 5. VS Code拡張機能

#### `vscode.install`

devcontainerにVS Code拡張機能をインストールします。

```json
{
  "component": "vscode.install",
  "params": {
    "extensions": [
      "denoland.vscode-deno",
      "esbenp.prettier-vscode",
      "eamodio.gitlens"
    ]
  }
}
```

**パラメータ:**

- `extensions` (文字列の配列): VS Code拡張機能IDのリスト

**生成される設定:**

```json
{
  "customizations": {
    "vscode": {
      "extensions": ["denoland.vscode-deno", "esbenp.prettier-vscode"]
    }
  }
}
```

### 6. シェル設定

#### `shell.setup`

vscodeユーザーのデフォルトシェルを設定します。

```json
{
  "component": "shell.setup",
  "params": {
    "shell": "fish"
  }
}
```

**パラメータ:**

- `shell` (列挙型): `"bash"`, `"fish"`, `"zsh"`のいずれか

**生成されるDockerコマンド:**

```dockerfile
RUN chsh -s /bin/fish vscode
```

### 7. セキュリティ強化

#### `sudo.disable`

セキュリティ強化のためsudoアクセスを無効化します。

```json
"sudo.disable"
```

**パラメータ:** なし

**生成されるファイル:**

- `scripts/disable-sudo.sh`: sudoアクセスを削除し、sudoバイナリを使用不可にする

## 高度な使用方法

### コンポーネントの順序

コンポーネントは設定内での出現順序で処理されます。これは依存関係にとって重要です：

```json
{
  "components": [
    "mise.setup", // 最初にmiseをインストール
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    }, // 次にランタイムをインストール
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    } // 最後にシェルを設定
  ]
}
```

### パッケージマネージャーの組み合わせ

同じ設定で複数のパッケージマネージャーを使用できます：

```json
{
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    },
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship"]
      }
    }
  ]
}
```

### 環境固有の設定

異なる環境用に異なる設定を作成：

```bash
# 開発環境
deno task generate --config configs/development.json

# 本番環境
deno task generate --config configs/production.json

# テスト環境
deno task generate --config configs/testing.json
```

## ベストプラクティス

### 1. 論理的なグループ化

関連するコンポーネントをグループ化します：

```json
{
  "components": [
    // 最初にシステムパッケージ
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "build-essential"]
      }
    },

    // ランタイム管理
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts"]
      }
    },

    // 開発ツール
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship", "fish"]
      }
    },

    // セキュリティ設定
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": ["github.com", "deno.land"]
      }
    },

    // IDE設定
    {
      "component": "vscode.install",
      "params": {
        "extensions": ["denoland.vscode-deno"]
      }
    },

    // 最後にシェル設定
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    }
  ]
}
```

### 2. 最小限の依存関係

実際に必要なパッケージとツールのみを含める：

```json
// 良い例 - 最小限で焦点を絞った設定
{
  "name": "deno-api",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    }
  ]
}

// 避けるべき例 - 不要なツールが多すぎる
{
  "name": "deno-api",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "vim", "emacs", "nano", "htop", "tree", "jq"]
      }
    }
  ]
}
```

### 3. バージョン固定

再現可能なビルドのために特定のバージョンを使用：

```json
{
  "component": "mise.install",
  "params": {
    "packages": [
      "deno@1.45.5", // 特定のバージョン
      "node@20.15.0", // 特定のバージョン
      "python@3.12.0" // 特定のバージョン
    ]
  }
}
```

### 4. 説明的な名前

設定に明確で説明的な名前を使用：

```json
{
  "name": "deno-web-api-development"
}
```

## バリデーション

設定はZodスキーマを使用して検証されます。よくあるバリデーションエラー：

### 無効なコンポーネント型

```json
{
  "component": "invalid.component", // ❌ 未知のコンポーネント
  "params": {}
}
```

### 必須パラメータの欠如

```json
{
  "component": "apt.install" // ❌ 必須の'params'が不足
}
```

### 無効なパラメータ型

```json
{
  "component": "apt.install",
  "params": {
    "packages": "git" // ❌ 文字列ではなく配列である必要がある
  }
}
```

### 無効なシェルオプション

```json
{
  "component": "shell.setup",
  "params": {
    "shell": "powershell" // ❌ 'bash', 'fish', 'zsh'のいずれかである必要がある
  }
}
```

## 例

### 最小限のDeno開発環境

```json
{
  "name": "minimal-deno",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest"]
      }
    },
    {
      "component": "vscode.install",
      "params": {
        "extensions": ["denoland.vscode-deno"]
      }
    }
  ]
}
```

### フルスタック開発環境

```json
{
  "name": "fullstack-development",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "ripgrep", "fd-find", "iptables"]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@latest", "node@lts", "python@3.12"]
      }
    },
    "nix.setup",
    {
      "component": "nix.install",
      "params": {
        "packages": ["starship", "fish"]
      }
    },
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": [
          "github.com",
          "deno.land",
          "jsr.io",
          "registry.npmjs.org",
          "pypi.org"
        ]
      }
    },
    {
      "component": "vscode.install",
      "params": {
        "extensions": [
          "denoland.vscode-deno",
          "esbenp.prettier-vscode",
          "eamodio.gitlens",
          "ms-python.python"
        ]
      }
    },
    {
      "component": "shell.setup",
      "params": {
        "shell": "fish"
      }
    }
  ]
}
```

### セキュリティ重視の環境

```json
{
  "name": "secure-development",
  "components": [
    {
      "component": "apt.install",
      "params": {
        "packages": ["git", "curl", "iptables", "fail2ban"]
      }
    },
    "firewall.setup",
    {
      "component": "firewall.domains",
      "params": {
        "domains": [
          "github.com",
          "api.github.com",
          "deno.land",
          "jsr.io"
        ]
      }
    },
    "mise.setup",
    {
      "component": "mise.install",
      "params": {
        "packages": ["deno@1.45.5"]
      }
    }
  ]
}
```

より多くの例については、プロジェクトルートの`examples/`ディレクトリを参照してください。
