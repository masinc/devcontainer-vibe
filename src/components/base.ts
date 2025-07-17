import type { Component, SimpleComponent } from "../types.ts";

// コンポーネントの処理結果
export interface ComponentResult {
  dockerfileLines: string[];
  devcontainerConfig: Record<string, unknown>;
  scripts: Record<string, string>;
}

// コンポーネントハンドラーのインターフェース
export interface ComponentHandler {
  handle(component: Component | SimpleComponent): ComponentResult;
  readonly isSingleUse: boolean;
}

// 基本的なコンポーネントハンドラー
export abstract class BaseComponentHandler implements ComponentHandler {
  abstract handle(component: Component | SimpleComponent): ComponentResult;
  abstract readonly isSingleUse: boolean;

  protected createResult(
    dockerfileLines: string[] = [],
    devcontainerConfig: Record<string, unknown> = {},
    scripts: Record<string, string> = {},
  ): ComponentResult {
    return {
      dockerfileLines,
      devcontainerConfig,
      scripts,
    };
  }
}
