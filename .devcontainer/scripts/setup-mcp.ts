#!/usr/bin/env -S mise exec deno -- deno -A

import $ from "@david/dax";

console.log("🔧 Setting up MCP (Multi-Container Platform)...");

try {
  // Claude Code
  await $`claude mcp add --transport http context7 https://mcp.context7.com/mcp`;
  await $`claude mcp add --transport http deepwiki https://mcp.deepwiki.com/mcp`;
} catch (error) {
  console.error("❌ MCP setup failed:", error);
  Deno.exit(1);
}
