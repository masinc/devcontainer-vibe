import minimalTemplate from "../examples/minimal.json" with { type: "json" };
import denoTemplate from "../examples/deno.json" with { type: "json" };

// 組み込みテンプレート
const TEMPLATES = {
  minimal: minimalTemplate,
  deno: denoTemplate,
} as const;

export async function initConfig(templateName: string, overwrite = false): Promise<void> {
  const template = TEMPLATES[templateName as keyof typeof TEMPLATES];
  
  if (!template) {
    console.error(`❌ Error: Unknown template '${templateName}'`);
    console.error("Available templates: minimal, deno");
    Deno.exit(1);
  }

  const configPath = "devcontainer-config.json";
  
  // Check if config file already exists
  if (!overwrite) {
    try {
      await Deno.stat(configPath);
      console.error(`❌ Error: Configuration file '${configPath}' already exists`);
      console.error("Remove it first or use --overwrite to overwrite it");
      Deno.exit(1);
    } catch {
      // File doesn't exist, which is what we want
    }
  }

  const configContent = JSON.stringify(template, null, 2);
  await Deno.writeTextFile(configPath, configContent);
  
  const action = overwrite ? "Updated" : "Generated";
  console.log(`✅ ${action} configuration file: ${configPath}`);
  console.log(`📝 Template: ${templateName}`);
  console.log(`\nNext steps:`);
  console.log(`1. Edit ${configPath} to customize your configuration`);
  console.log(`2. Run: deno run -RW jsr:@masinc/devcontainer-vibe --config ${configPath}`);
}

export function getAvailableTemplates(): string[] {
  return Object.keys(TEMPLATES);
}