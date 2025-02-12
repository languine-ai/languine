import { commands as authCommands } from "@/commands/auth/index.ts";
import { commands as initCommands } from "@/commands/init.ts";
import { localeCommand } from "@/commands/locale.ts";
import { commands as overridesCommands } from "@/commands/overrides/index.ts";
import { syncCommand } from "@/commands/sync.ts";
import { transformCommand } from "@/commands/transform.ts";
import { translateCommand } from "@/commands/translate.ts";
import { commands as translationsCommands } from "@/commands/translations/index.ts";
import { isCancel, select } from "@clack/prompts";
import chalk from "chalk";

type CommandOption = [string, string];
type CommandSubcommand = [string, string];

interface BaseCommand {
  description: string;
  usage: string;
}

interface CommandWithOptions extends BaseCommand {
  options: CommandOption[];
  subcommands?: never;
}

interface CommandWithSubcommands extends BaseCommand {
  options?: never;
  subcommands: CommandSubcommand[];
}

type Command = CommandWithOptions | CommandWithSubcommands;

const COMMANDS: Record<string, Command> = {
  init: {
    description: "Initialize a new Languine configuration",
    usage: "languine init [--project-id <id>]",
    options: [["--project-id <id>", "Set the project ID in the config"]],
  },
  auth: {
    description: "Manage authentication",
    usage: "languine auth <login|logout>",
    subcommands: [
      ["login", "Log in to Languine"],
      ["logout", "Log out from Languine"],
    ],
  },
  translate: {
    description: "Translate files based on your configuration",
    usage: "languine translate [options]",
    options: [
      [
        "--force [locales]",
        "Force translate all keys, optionally for specific locales",
      ],
      ["--silent", "Run without output"],
      [
        "--check",
        "Check for needed translations without updating (exits 1 if updates needed)",
      ],
      ["--base <ref>", "Git ref to compare against (default: HEAD)"],
      ["--api-key <key>", "Override API key from config"],
      ["--project-id <id>", "Override project ID from config"],
    ],
  },
  sync: {
    description: "Sync deleted keys between source and target files",
    usage: "languine sync [options]",
    options: [
      [
        "--check",
        "Check for deleted keys without syncing (exits 1 if updates needed)",
      ],
    ],
  },
  locale: {
    description: "Manage target locales",
    usage: "languine locale <add|remove> <locale,...>",
    subcommands: [
      ["add <locale,...>", "Add new target locales"],
      ["remove <locale,...>", "Remove target locales"],
    ],
  },
  overrides: {
    description: "Manage translation overrides",
    usage: "languine overrides <pull>",
    subcommands: [["pull", "Pull overrides from the server"]],
  },
  translations: {
    description: "Manage translations",
    usage: "languine translations <delete>",
    subcommands: [["delete", "Delete all translation keys for the project"]],
  },
  transform: {
    description: "Transform files",
    usage: "languine transform <directory>",
    subcommands: [["<directory>", "Directory containing React components"]],
  },
};

function showHelp(command?: keyof typeof COMMANDS) {
  if (command && COMMANDS[command]) {
    const cmd = COMMANDS[command];
    console.log();
    console.log(`${chalk.bold(cmd.description)}`);
    console.log();
    console.log(`${chalk.bold("USAGE")}`);
    console.log(`  ${cmd.usage}`);

    if ("options" in cmd && cmd.options) {
      console.log();
      console.log(`${chalk.bold("OPTIONS")}`);
      for (const [option, desc] of cmd.options) {
        console.log(`  ${chalk.yellow(option.padEnd(20))} ${desc}`);
      }
    }

    if ("subcommands" in cmd && cmd.subcommands) {
      console.log();
      console.log(`${chalk.bold("SUBCOMMANDS")}`);
      for (const [subcmd, desc] of cmd.subcommands) {
        console.log(`  ${chalk.yellow(subcmd.padEnd(20))} ${desc}`);
      }
    }
  } else {
    console.log(`
    ██╗      █████╗ ███╗   ██╗ ██████╗ ██╗   ██╗██╗███╗   ██╗███████╗
    ██║     ██╔══██╗████╗  ██║██╔════╝ ██║   ██║██║████╗  ██║██╔════╝
    ██║     ███████║██╔██╗ ██║██║  ███╗██║   ██║██║██║██╗ ██║█████╗  
    ██║     ██╔══██║██║╚██╗██║██║   ██║██║   ██║██║██║╚██╗██║██╔══╝  
    ███████╗██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝██║██║ ╚████║███████╗
    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝
    `);

    console.log(
      chalk.gray("Translate your application with Languine CLI powered by AI."),
    );
    console.log(chalk.gray(`Website: ${process.env.BASE_URL}`));
    console.log();
    console.log(`${chalk.bold("USAGE")}`);
    console.log("  languine <command> [options]");
    console.log();
    console.log(`${chalk.bold("COMMANDS")}`);
    for (const [name, { description }] of Object.entries(COMMANDS)) {
      console.log(`  ${chalk.yellow(name.padEnd(20))} ${description}`);
    }
    console.log();
    console.log(
      `Run ${chalk.yellow("languine <command> --help")} for more information about a command.`,
    );
  }
  console.log();
}

async function showHelpMenu() {
  const command = await select({
    message: "Select a command to get help for",
    options: [
      { value: "", label: "Show all commands" },
      ...Object.entries(COMMANDS).map(([name, { description }]) => ({
        value: name,
        label: `${name} - ${description}`,
      })),
    ],
  });

  if (isCancel(command)) {
    process.exit(0);
  }

  showHelp(command as keyof typeof COMMANDS);
}

export async function runCommands() {
  const [mainCommand, subCommand, ...args] = process.argv.slice(2);

  // Handle help flags
  if (!mainCommand || mainCommand === "--help" || mainCommand === "-h") {
    const command = await select({
      message: "What would you like to do?",
      options: [
        { value: "init", label: "Initialize a new Languine configuration" },
        { value: "auth", label: "Manage authentication" },
        { value: "translate", label: "Translate files" },
        { value: "transform", label: "Transform files" },
        {
          value: "sync",
          label: "Sync deleted keys between source and target files",
        },
        {
          value: "locale",
          label: "Manage target locales",
        },
        {
          value: "overrides",
          label: "Manage translation overrides",
        },
        {
          value: "translations",
          label: "Manage translations",
        },
        {
          value: "help",
          label: "Show help for a command",
        },
      ],
    });

    if (isCancel(command)) {
      process.exit(0);
    }

    if (command === "help") {
      await showHelpMenu();
      return;
    }

    switch (command) {
      case "auth":
        await authCommands();
        break;
      case "init":
        await initCommands();
        break;
      case "translate":
        await translateCommand();
        break;
      case "sync":
        await syncCommand();
        break;
      case "locale":
        await localeCommand();
        break;
      case "transform":
        await transformCommand();
        break;
      case "overrides":
        await overridesCommands();
        break;
      case "translations":
        await translationsCommands();
        break;
    }
    return;
  }

  if (args.includes("--help") || args.includes("-h")) {
    showHelp(mainCommand as keyof typeof COMMANDS);
    return;
  }

  if (mainCommand) {
    switch (mainCommand) {
      case "auth":
        await authCommands(subCommand);
        break;
      case "init":
        await initCommands([subCommand, ...args].filter(Boolean));
        break;
      case "translate": {
        await translateCommand([...args, subCommand].filter(Boolean));
        break;
      }
      case "sync": {
        await syncCommand([...args, subCommand].filter(Boolean));
        break;
      }
      case "locale": {
        await localeCommand([subCommand, ...args].filter(Boolean));
        break;
      }
      case "transform": {
        await transformCommand([subCommand, ...args].filter(Boolean));
        break;
      }
      case "overrides": {
        await overridesCommands(subCommand);
        break;
      }
      case "translations": {
        await translationsCommands(subCommand, args);
        break;
      }
      default: {
        console.error(chalk.red(`Unknown command: ${mainCommand}`));
        showHelp();
        process.exit(1);
      }
    }
    return;
  }

  // If no command provided, show interactive menu
  const command = await select({
    message: "What would you like to do?",
    options: [
      { value: "init", label: "Initialize a new Languine configuration" },
      { value: "auth", label: "Manage authentication" },
      { value: "translate", label: "Translate files" },
      {
        value: "sync",
        label: "Sync deleted keys between source and target files",
      },
      {
        value: "locale",
        label: "Manage target locales",
      },
      {
        value: "overrides",
        label: "Manage translation overrides",
      },
      {
        value: "translations",
        label: "Manage translations",
      },
      {
        value: "help",
        label: "Show help for a command",
      },
    ],
  });

  if (isCancel(command)) {
    process.exit(0);
  }

  if (command === "help") {
    await showHelpMenu();
    return;
  }

  switch (command) {
    case "auth":
      await authCommands();
      break;
    case "init":
      await initCommands();
      break;
    case "translate":
      await translateCommand();
      break;
    case "sync":
      await syncCommand();
      break;
    case "locale":
      await localeCommand();
      break;
    case "overrides":
      await overridesCommands();
      break;
    case "translations":
      await translationsCommands();
      break;
  }
}
