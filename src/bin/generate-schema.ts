#!/usr/bin/env -S deno run

import * as z from "zod";
import { DevcontainerConfigSchema } from "../types.ts";

function main() {
  try {
    // Generate JSON Schema using Zod's built-in toJSONSchema method
    const jsonSchema = z.toJSONSchema(DevcontainerConfigSchema);

    // Add metadata to the schema
    const enhancedSchema = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Devcontainer Configuration",
      description: "Configuration schema for Devcontainer Vibe",
      ...jsonSchema,
    };

    const schemaJson = JSON.stringify(enhancedSchema, null, 2);

    // Output to stdout
    console.log(schemaJson);
  } catch (error) {
    console.error("❌ Error generating schema:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
