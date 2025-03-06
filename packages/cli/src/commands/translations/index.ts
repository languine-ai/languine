import { deleteCommand } from "./delete.js";

export async function commands(subCommand?: string, args: string[] = []) {
  switch (subCommand) {
    case "delete":
      await deleteCommand(args);
      break;
    default:
      throw new Error('Please specify a subcommand: "delete"');
  }
}
