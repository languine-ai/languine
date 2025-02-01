import path from "node:path";
import type { TranslationService } from "../services/translation.ts";
import type { GitPlatform, GitWorkflow } from "../types.ts";
import type { Config } from "../utils/config.ts";
import { logger } from "../utils/logger.ts";

export class PullRequestWorkflow implements GitWorkflow {
  private readonly branchName: string;

  constructor(
    private readonly gitProvider: GitPlatform,
    private readonly config: Config,
    private readonly translationService: TranslationService,
  ) {
    const { baseBranch } = this.gitProvider.getPlatformConfig();
    this.branchName = `languine/${baseBranch}`;
  }

  async preRun() {
    try {
      await this.#setupGit();
      logger.info("Successfully configured Git");
    } catch (error) {
      logger.error(error instanceof Error ? error.message : "Unknown error");
      throw new Error("Failed to configure Git");
    }

    logger.info("Checking if branch exists");
    const currentBranch = await this.gitProvider.getCurrentBranch();
    const branchExists = currentBranch === this.branchName;
    logger.info(branchExists ? "Branch exists" : "Branch does not exist");

    if (branchExists) {
      logger.info(`Branch ${this.branchName} already checked out`);
      await this.gitProvider.pullAndRebase(this.branchName);
      logger.info(`Synced branch ${this.branchName}`);
    } else {
      logger.info(`Creating branch ${this.branchName}`);
      await this.gitProvider.createBranch(this.branchName);
      logger.info(`Created branch ${this.branchName}`);
    }
  }

  async run() {
    logger.info("Running pull request workflow...");
    await this.translationService.runTranslation(this.config);

    const hasChanges = await this.gitProvider.hasChanges();

    if (hasChanges) {
      logger.info("Changes detected, committing and pushing...");
      await this.gitProvider.addChanges();
      await this.gitProvider.commitAndPush({
        message: this.config.commitMessage,
        branch: this.branchName,
      });
    }

    return hasChanges;
  }

  async postRun() {
    logger.info("Creating or updating pull request");
    await this.gitProvider.createOrUpdatePullRequest({
      title:
        this.config.prTitle ||
        "chore: (i18n) update translations using Languine.ai",
      body: this.#getPrBodyContent(),
      branch: this.branchName,
    });
  }

  async #setupGit() {
    await this.gitProvider.setupGit();

    const workingDir = path.resolve(
      process.cwd(),
      this.config?.workingDirectory,
    );

    if (workingDir !== process.cwd()) {
      logger.info(`Changing working directory to: ${workingDir}`);
      process.chdir(workingDir);
    }
  }

  #getPrBodyContent(): string {
    return `
🌐 Translation Updates

This PR contains automated translation updates from Languine.ai. The changes have been automatically generated and quality-checked.

### What Changed
- Updated translations to match latest source strings
- Maintained consistent terminology across languages
- Preserved existing translations where possible
- Applied quality checks and formatting

### Next Steps
1. Review the changes, focusing on key user-facing strings
2. Test the translations in context if possible
3. Approve and merge when ready

> Need help or have questions? Visit our [documentation](https://languine.ai/docs) or [contact support](https://languine.ai/support).

---
_Generated by [Languine](https://languine.ai) - Automated Translation Infrastructure_
    `.trim();
  }
}
