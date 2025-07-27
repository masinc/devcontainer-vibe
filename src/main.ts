import { parseArgs } from "node:util";
import { DevcontainerGenerator } from "./generator.ts";
import { initConfig } from "./init.ts";

interface CliArgs {
  config?: string;
  output?: string;
  help?: boolean;
  overwrite?: boolean;
  init?: string;
}

function showHelp(): void {
  console.log(`
Devcontainer Vibe - Generate devcontainer from configuration

Usage:
  deno run -RW jsr:@masinc/devcontainer-vibe [options]

Options:
  --config <path>    Configuration file path (default: devcontainer-config.json)
  --output <path>    Output directory (default: current directory)
  --overwrite        Overwrite existing .devcontainer directory
  --init <template>  Generate sample configuration file (minimal, deno)
  --help             Show this help message

Examples:
  deno run -RW jsr:@masinc/devcontainer-vibe --init minimal
  deno run -RW jsr:@masinc/devcontainer-vibe --init deno --overwrite
  deno run -RW jsr:@masinc/devcontainer-vibe --config my-config.json --output my-devcontainer
  deno run -RW jsr:@masinc/devcontainer-vibe --config config.json --overwrite
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
          default: ".",
        },
        help: {
          type: "boolean",
          short: "h",
          default: false,
        },
        overwrite: {
          type: "boolean",
          default: false,
        },
        init: {
          type: "string",
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

    if (args.init) {
      await initConfig(args.init, args.overwrite);
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

    await generator.generate(args.config!, args.output!, args.overwrite!);

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
