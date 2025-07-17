import type { Component, SimpleComponent } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

// VS Code 拡張機能インストール
export class VscodeInstallHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("vscode.install requires parameters");
    }

    if (component.name !== "vscode.install") {
      throw new Error("Invalid component type");
    }

    const extensions = component.params.extensions;
    const devcontainerConfig = {
      customizations: {
        vscode: {
          extensions,
        },
      },
    };

    return this.createResult([], devcontainerConfig);
  }
}
