import { select } from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { pullCommand } from "./pull.js";

export async function commands(subCommand?: string) {
  if (subCommand) {
    switch (subCommand) {
      case "pull":
        await pullCommand();
        break;
      default:
        console.error("Unknown overrides subcommand:", subCommand);
        process.exit(1);
    }
    return;
  }

  const overridesCommand = await select({
    message: "What would you like to do?",
    options: [{ value: "pull", label: "Pull overrides from the server" }],
  });

  if (isCancel(overridesCommand)) {
    process.exit(0);
  }

  await commands(overridesCommand as string);
}
