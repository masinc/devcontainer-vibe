import type { Component, SimpleComponent } from "../../types.ts";
import { FIREWALL_PRESETS } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

// ファイアウォール セットアップ
export class FirewallSetupHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y iptables ipset dnsutils curl jq",
    ];

    const devcontainerConfig = {
      runArgs: ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"],
    };

    const scripts = {
      "firewall-setup.sh": `#!/usr/bin/sudo /bin/bash
set -euo pipefail
IFS=$'\\n\\t'

# Basic firewall setup with ipset support (run as root via sudo shebang)

# Flush existing rules and clean up
echo "🧹 Cleaning up existing firewall rules..."
iptables -F || true
iptables -X || true
iptables -t nat -F || true
iptables -t nat -X || true
iptables -t mangle -F || true
iptables -t mangle -X || true

# Destroy existing ipsets
ipset destroy firewall-allowed-domains 2>/dev/null || true

# Create ipset for allowed domains (using hash:net for CIDR support)
echo "📋 Creating ipset for allowed domains..."
ipset create firewall-allowed-domains hash:net

# Allow DNS and SSH before setting restrictive policies
echo "🌐 Setting up DNS and SSH access..."
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --sport 22 -m conntrack --ctstate ESTABLISHED -j ACCEPT

# Allow loopback interface (localhost communication)
echo "🔄 Setting up loopback interface..."
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Detect and allow host network
echo "🏠 Detecting host network..."
HOST_IP=\\$(ip route | grep default | awk '{print \\$3}')
if [ -n "\\$HOST_IP" ]; then
    HOST_NETWORK=\\$(echo "\\$HOST_IP" | sed 's/\\\\.[0-9]*\\$/\\\\.0\\\\/24/')
    echo "Host network detected: \\$HOST_NETWORK"
    iptables -A INPUT -s "\\$HOST_NETWORK" -j ACCEPT
    iptables -A OUTPUT -d "\\$HOST_NETWORK" -j ACCEPT
else
    echo "⚠️  Warning: Could not detect host network"
fi

# Set default policies to DROP
echo "🛡️  Setting restrictive default policies..."
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow established and related connections (both directions)
echo "🔗 Setting up established connection rules..."
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Set up output rule for allowed domains ipset
echo "✅ Setting up allowed domains rule..."
iptables -A OUTPUT -m set --match-set firewall-allowed-domains dst -j ACCEPT

echo "🎉 Basic firewall setup complete!"
echo "📝 Use firewall.domain and firewall.github-api components to add allowed domains"

# Test firewall is working by verifying example.com is blocked
echo "🧪 Testing firewall configuration..."
if timeout 5 curl -s https://example.com >/dev/null 2>&1; then
    echo "❌ ERROR: Firewall test failed - example.com should be blocked but is accessible"
    exit 1
else
    echo "✅ SUCCESS: Firewall test passed - example.com is properly blocked"
fi
`,
    };

    return this.createResult(dockerfileLines, devcontainerConfig, scripts);
  }
}

// ファイアウォール ドメイン設定（統合版）
export class FirewallDomainHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("firewall.domain requires parameters");
    }

    if (component.name !== "firewall.domain") {
      throw new Error("Invalid component type");
    }

    const allDomains: string[] = [];

    // プリセットからドメインを取得
    if (component.params.presets) {
      for (const preset of component.params.presets) {
        if (preset in FIREWALL_PRESETS) {
          allDomains.push(
            ...FIREWALL_PRESETS[preset as keyof typeof FIREWALL_PRESETS],
          );
        } else {
          throw new Error(`Unknown firewall preset: ${preset}`);
        }
      }
    }

    // 個別ドメインを追加
    if (component.params.allows) {
      allDomains.push(...component.params.allows);
    }

    // 重複を削除
    const uniqueDomains = [...new Set(allDomains)];

    // ドメインを解決してipsetに追加するスクリプトを生成
    const domainResolutionScript = uniqueDomains.map((domain) => `
echo "🔍 Resolving ${domain}..."
IPS=$(dig +short A ${domain})
if [ -n "$IPS" ]; then
  for IP in $IPS; do
    if [[ $IP =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
      echo "📍 Adding IP $IP for ${domain} to ipset"
      ipset add firewall-allowed-domains "$IP" 2>/dev/null || echo "⚠️  IP $IP already exists in ipset"
    fi
  done
else
  echo "⚠️  Failed to resolve ${domain}"
fi`).join("\\n");

    const scripts = {
      "firewall-domain.sh": `#!/usr/bin/sudo /bin/bash
# Allow specific domains by adding their IPs to ipset (run as root via sudo shebang)
set -euo pipefail
IFS=$'\\n\\t'

echo "🌐 Resolving and adding domains to ipset..."
${domainResolutionScript}

echo "✅ Domain IPs added to firewall-allowed-domains ipset"
`,
    };

    return this.createResult([], {}, scripts);
  }
}

// GitHub動的IP範囲取得ファイアウォール設定
export class FirewallGithubApiHandler extends BaseComponentHandler {
  readonly isSingleUse = true;
  handle(_component: Component | SimpleComponent): ComponentResult {
    const scripts = {
      "firewall-github-dynamic.sh": `#!/usr/bin/sudo /bin/bash
# GitHub dynamic IP ranges from API (run as root via sudo shebang)
set -euo pipefail
IFS=$'\\n\\t'

echo "🐙 Fetching GitHub IP ranges from API..."

# Fetch GitHub meta information
GITHUB_META=$(curl -s https://api.github.com/meta)
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch GitHub IP ranges"
  exit 1
fi

# Validate JSON response
if ! echo "$GITHUB_META" | jq -e '.web and .api and .git' >/dev/null 2>&1; then
  echo "❌ Invalid GitHub API response format"
  exit 1
fi

echo "📋 Processing GitHub IP ranges and adding to ipset..."

# Extract and add web, API, and git IP ranges to ipset
for RANGE_TYPE in web api git; do
  echo "🔍 Processing $RANGE_TYPE ranges..."
  echo "$GITHUB_META" | jq -r --arg range "$RANGE_TYPE" '.[$range][]' | while read -r CIDR; do
    if [[ $CIDR =~ ^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+/[0-9]+$ ]]; then
      echo "📍 Adding GitHub $RANGE_TYPE range: $CIDR to ipset"
      ipset add firewall-allowed-domains "$CIDR" 2>/dev/null || echo "⚠️  Range $CIDR already exists in ipset"
    else
      echo "⚠️  Invalid CIDR range: $CIDR"
    fi
  done
done

echo "✅ GitHub dynamic IP ranges added to firewall-allowed-domains ipset"
`,
    };

    return this.createResult([], {}, scripts);
  }
}
