// Base interfaces and classes
export type { ComponentHandler, ComponentResult } from "./base.ts";
export { BaseComponentHandler } from "./base.ts";

// APT components
export { AptInstallHandler } from "./apt/index.ts";

// Mise components
export { MiseInstallHandler, MiseSetupHandler } from "./mise/index.ts";

// Nix components
export { NixInstallHandler, NixSetupHandler } from "./nix/index.ts";

// Firewall components
export {
  FirewallDomainHandler,
  FirewallGithubApiHandler,
  FirewallSetupHandler,
} from "./firewall/index.ts";

// Shell components
export {
  ShellDockerfileHandler,
  ShellPostCreateHandler,
  ShellSetupHandler,
} from "./shell/index.ts";

// VSCode components
export { VscodeInstallHandler } from "./vscode/index.ts";

// Sudo components
export { SudoDisableHandler } from "./sudo/index.ts";

// Component factory
export { ComponentHandlerFactory } from "./factory.ts";
