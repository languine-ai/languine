import { select } from "@clack/prompts";
import { isCancel } from "@clack/prompts";
import { loginCommand } from "./login.js";
import { logoutCommand } from "./logout.js";
import { whoamiCommand } from "./whoami.js";

export async function commands(subCommand?: string, args: string[] = []) {
  if (subCommand) {
    switch (subCommand) {
      case "login":
        await loginCommand(args);
        break;
      case "logout":
        await logoutCommand();
        break;
      case "whoami":
        await whoamiCommand();
        break;
      default:
        console.error("Unknown auth subcommand:", subCommand);
        process.exit(1);
    }
    return;
  }

  const authCommand = await select({
    message: "What would you like to do?",
    options: [
      { value: "login", label: "Login to the platform." },
      { value: "logout", label: "Log out currently logged in user." },
      { value: "whoami", label: "Show the currently logged in user." },
    ],
  });

  if (isCancel(authCommand)) {
    process.exit(0);
  }

  await commands(authCommand as string);
}
