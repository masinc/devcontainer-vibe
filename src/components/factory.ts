import type { ComponentHandler } from "./base.ts";
import { AptInstallHandler } from "./apt/index.ts";
import { MiseInstallHandler, MiseSetupHandler } from "./mise/index.ts";
import { NixInstallHandler, NixSetupHandler } from "./nix/index.ts";
import {
  FirewallDomainHandler,
  FirewallGithubApiHandler,
  FirewallSetupHandler,
} from "./firewall/index.ts";
import {
  ShellDockerfileHandler,
  ShellPostCreateHandler,
  ShellSetupHandler,
} from "./shell/index.ts";
import { VscodeInstallHandler } from "./vscode/index.ts";
import { SudoDisableHandler } from "./sudo/index.ts";

// コンポーネントハンドラーのファクトリー
export class ComponentHandlerFactory {
  private handlers = new Map<string, ComponentHandler>([
    ["apt.install", new AptInstallHandler()],
    ["mise.setup", new MiseSetupHandler()],
    ["mise.install", new MiseInstallHandler()],
    ["nix.setup", new NixSetupHandler()],
    ["nix.install", new NixInstallHandler()],
    ["firewall.setup", new FirewallSetupHandler()],
    ["firewall.domain", new FirewallDomainHandler()],
    ["firewall.github-api", new FirewallGithubApiHandler()],
    ["sudo.disable", new SudoDisableHandler()],
    ["vscode.install", new VscodeInstallHandler()],
    ["shell.setup", new ShellSetupHandler()],
    ["shell.dockerfile", new ShellDockerfileHandler()],
    ["shell.post-create", new ShellPostCreateHandler()],
  ]);

  getHandler(componentType: string): ComponentHandler {
    const handler = this.handlers.get(componentType);
    if (!handler) {
      throw new Error(`Unknown component type: ${componentType}`);
    }
    return handler;
  }
}
