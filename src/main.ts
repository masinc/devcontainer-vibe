import { parseArgs } from "node:util";
import { DevcontainerGenerator } from "./generator.ts";

interface CliArgs {
  config?: string;
  output?: string;
  help?: boolean;
}

function showHelp(): void {
  console.log(`
Devcontainer Generator - Generate devcontainer from configuration

Usage:
  deno run src/main.ts [options]

Options:
  --config <path>    Configuration file path (default: devcontainer-config.json)
  --output <path>    Output directory (default: .devcontainer)
  --help             Show this help message

Examples:
  deno run src/main.ts --config my-config.json --output my-devcontainer
  deno run src/main.ts --config examples/deno-project.json
`);
}

async function main(): Promise<void> {
  try {
    const { values, positionals } = parseArgs({
      args: Deno.args,
      options: {
        config: {
          type: "string",
          short: "c",
          default: "devcontainer-config.json",
        },
        output: {
          type: "string",
          short: "o",
          default: ".devcontainer",
        },
        help: {
          type: "boolean",
          short: "h",
          default: false,
        },
      },
      strict: true,
      allowPositionals: true,
    });

    const args = values as CliArgs;

    if (args.help) {
      showHelp();
      return;
    }

    if (positionals.length > 0) {
      console.error("Error: Unexpected positional arguments");
      showHelp();
      Deno.exit(1);
    }

    const generator = new DevcontainerGenerator();

    console.log(`Generating devcontainer from: ${args.config}`);
    console.log(`Output directory: ${args.output}`);

    await generator.generate(args.config!, args.output!);

    console.log("✅ Devcontainer generated successfully!");
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
