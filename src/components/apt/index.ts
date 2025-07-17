import type { Component, SimpleComponent } from "../../types.ts";
import { BaseComponentHandler, type ComponentResult } from "../base.ts";

// APT パッケージインストール
export class AptInstallHandler extends BaseComponentHandler {
  readonly isSingleUse = false;
  handle(component: Component | SimpleComponent): ComponentResult {
    if (typeof component === "string") {
      throw new Error("apt.install requires parameters");
    }

    if (component.name !== "apt.install") {
      throw new Error("Invalid component type");
    }

    const packages = component.params.packages.join(" ");
    const dockerfileLines = [
      "USER root",
      "RUN --mount=target=/var/lib/apt/lists,type=cache,sharing=locked \\",
      "    --mount=target=/var/cache/apt,type=cache,sharing=locked \\",
      "    apt-get update && apt-get install -y \\",
      `    ${packages} \\`,
      "    && rm -rf /var/lib/apt/lists/*",
    ];

    return this.createResult(dockerfileLines);
  }
}
