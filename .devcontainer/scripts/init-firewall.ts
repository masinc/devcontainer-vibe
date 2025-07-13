#!/usr/bin/env -S sudo mise exec deno -- deno -A
import $ from "@david/dax";

console.log("🔥 Initializing advanced firewall configuration...");

try {
  // Check if required tools are available
  await $`which iptables`;
  await $`which ipset`;

  console.log("🧹 Flushing existing rules and ipsets...");
  // Flush existing rules and delete existing ipsets
  await $`iptables -F`;
  await $`iptables -X`;
  await $`iptables -t nat -F`;
  await $`iptables -t nat -X`;
  await $`iptables -t mangle -F`;
  await $`iptables -t mangle -X`;
  await $`ipset destroy allowed-domains`.noThrow();

  console.log("🌐 Setting up basic connectivity rules...");
  // First allow DNS and localhost before any restrictions
  await $`iptables -A OUTPUT -p udp --dport 53 -j ACCEPT`;
  await $`iptables -A INPUT -p udp --sport 53 -j ACCEPT`;
  await $`iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT`;
  await $`iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT`;
  await $`iptables -A INPUT -i lo -j ACCEPT`;
  await $`iptables -A OUTPUT -o lo -j ACCEPT`;

  console.log("📦 Creating ipset for allowed domains...");
  // Create ipset with CIDR support
  await $`ipset create allowed-domains hash:net`;

  console.log("🐙 Fetching GitHub IP ranges...");
  // Fetch GitHub meta information
  const ghRangesResp = await fetch("https://api.github.com/meta");
  if (!ghRangesResp.ok) {
    throw new Error("Failed to fetch GitHub IP ranges");
  }
  const ghRanges = await ghRangesResp.json();

  if (!ghRanges.web || !ghRanges.api || !ghRanges.git) {
    throw new Error("GitHub API response missing required fields");
  }

  console.log("📋 Processing GitHub IPs...");
  const allGithubIPs = [
    ...new Set([...ghRanges.web, ...ghRanges.api, ...ghRanges.git]),
  ]; // Remove duplicates

  // Aggregate and add GitHub IP ranges
  for (const cidr of allGithubIPs) {
    if (
      !/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\/[0-9]{1,2}$/.test(cidr)
    ) {
      console.warn(`⚠️  Invalid CIDR range from GitHub meta: ${cidr}`);
      continue;
    }
    console.log(`📍 Adding GitHub range ${cidr}`);
    await $`ipset add allowed-domains ${cidr}`.noThrow();
  }

  console.log("🔍 Resolving and adding allowed domains...");
  // Resolve and add other allowed domains
  const allowedDomains = [
    "registry.npmjs.org",
    "api.anthropic.com",
    "sentry.io",
    "statsig.anthropic.com",
    "statsig.com",
    "mise.jdx.dev",
    "mise-releases.s3.amazonaws.com",
    "releases.hashicorp.com",
    "objects.githubusercontent.com",
    "deno.land",
    "jsr.io",
    // APT repositories
    "archive.ubuntu.com",
    "security.ubuntu.com",
    "ports.ubuntu.com",
    "deb.debian.org",
    "security.debian.org",
    "ftp.debian.org",
    "keyserver.ubuntu.com",
    "pgp.mit.edu",
    // Google Gemini CLI (minimal secure set)
    "generativelanguage.googleapis.com",
    "cloudaicompanion.googleapis.com",
    "cloudcode-pa.googleapis.com",
    "accounts.google.com",
    "oauth2.googleapis.com",
    "ai.google.dev",
    "us-central1-aiplatform.googleapis.com",
    "us-east1-aiplatform.googleapis.com",
    // Context7
    "mcp.context7.com",
    "context7.com",
    // DeepWiki
    "mcp.deepwiki.com",
    "deepwiki.com",
    // Nix
    "cache.nixos.org",
    "nix-community.cachix.org",
  ];

  for (const domain of allowedDomains) {
    console.log(`🔍 Resolving ${domain}...`);
    try {
      const ips = await $`dig +short A ${domain}`.text();
      if (!ips.trim()) {
        console.warn(`⚠️  Failed to resolve ${domain}`);
        continue;
      }

      for (const ip of ips.trim().split("\n")) {
        if (!/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip)) {
          console.warn(`⚠️  Invalid IP from DNS for ${domain}: ${ip}`);
          continue;
        }
        console.log(`📍 Adding ${ip} for ${domain}`);
        await $`ipset add allowed-domains ${ip}`.noThrow();
      }
    } catch (error) {
      console.warn(`⚠️  Failed to resolve ${domain}: ${error}`);
    }
  }

  console.log("🏠 Detecting host network...");
  // Get host IP from default route
  const hostIP = await $`ip route | grep default | cut -d' ' -f3`.text();
  if (!hostIP.trim()) {
    throw new Error("Failed to detect host IP");
  }

  const hostNetwork = hostIP.trim().replace(/\.[0-9]*$/, ".0/24");
  console.log(`🏠 Host network detected as: ${hostNetwork}`);

  // Set up remaining iptables rules
  await $`iptables -A INPUT -s ${hostNetwork} -j ACCEPT`;
  await $`iptables -A OUTPUT -d ${hostNetwork} -j ACCEPT`;

  console.log("🔒 Setting restrictive default policies...");
  // Set default policies to DROP first
  await $`iptables -P INPUT DROP`;
  await $`iptables -P FORWARD DROP`;
  await $`iptables -P OUTPUT DROP`;

  // Allow established connections for already approved traffic
  await $`iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT`;
  await $`iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT`;

  // Allow only specific outbound traffic to allowed domains
  await $`iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT`;

  console.log("✅ Firewall configuration complete");

  console.log("🧪 Verifying firewall rules...");
  // Verify firewall by trying to reach example.com (should fail)
  const exampleResult = await $`curl --connect-timeout 5 https://example.com`
    .noThrow();
  if (exampleResult.code === 0) {
    console.log(
      "❌ Firewall verification failed - was able to reach https://example.com",
    );
    Deno.exit(1);
  } else {
    console.log(
      "✅ Firewall verification passed - unable to reach https://example.com as expected",
    );
  }

  // Verify GitHub API access (should succeed)
  const githubResult =
    await $`curl --connect-timeout 5 https://api.github.com/zen`.noThrow();
  if (githubResult.code === 0) {
    console.log(
      "✅ Firewall verification passed - able to reach https://api.github.com as expected",
    );
  } else {
    console.log(
      "❌ Firewall verification failed - unable to reach https://api.github.com",
    );
    Deno.exit(1);
  }

  console.log("🎉 Advanced firewall initialization completed successfully!");

  console.log("🔒 Disabling sudo access to prevent privilege escalation...");
  // Remove sudo access by clearing sudoers entries for vscode user
  await $`sed -i '/vscode/d' /etc/sudoers`.noThrow();
  await $`rm -f /etc/sudoers.d/vscode`.noThrow();

  // Make sudo binary unusable for non-root users
  await $`chmod 700 /usr/bin/sudo`.noThrow();

  console.log("🔐 sudo access disabled - system is now locked down");
} catch (error) {
  console.log(
    "⚠️  Firewall setup skipped (not available in this environment):",
    error instanceof Error ? error.message : String(error),
  );
  // Don't exit with error code since this might run in environments without iptables
}
