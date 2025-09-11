import { Octokit } from "octokit";
import { z } from "zod";
import type { GitPlatform } from "../types.ts";
import { execAsync } from "../utils/exec.ts";
import { logger } from "../utils/logger.ts";

const GithubEnvSchema = z.object({
  GITHUB_REPOSITORY: z.string(),
  GITHUB_REPOSITORY_OWNER: z.string(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_REF_NAME: z.string(),
  GITHUB_HEAD_REF: z.string(),
  GITHUB_BASE_REF: z.string().optional(),
});

export class GitHubProvider implements GitPlatform {
  #_octokit?: Octokit;
  #token?: string;
  #owner: string;
  #repo: string;
  #branch: string;
  #baseBranch: string;

  constructor() {
    const { branch, owner, repository, token, baseBranch } =
      this.getPlatformConfig();

    this.#branch = branch;
    this.#owner = owner;
    this.#repo = repository;
    this.#token = token;
    this.#baseBranch = baseBranch;
  }

  get octokit(): Octokit {
    if (!this.#_octokit) {
      this.#_octokit = new Octokit({ auth: this.#token });
    }
    return this.#_octokit;
  }

  async setupGit() {
    logger.info("Setting up Git for GitHub...");
    await execAsync('git config --global user.name "Languine Bot"');
    await execAsync('git config --global user.email "bot@jordanmgsoftware.com"');
    await execAsync('git config --global user.username "languinebot"');
    await execAsync(`git config --global safe.directory ${process.cwd()}`);
  }

  async createOrUpdatePullRequest(options: {
    title: string;
    body: string;
    branch: string;
  }) {
    const { title, body, branch } = options;

    // Ensure branch exists on remote
    logger.info("Ensuring branch exists on remote...");
    await execAsync(`git push -u origin ${branch}`).catch((error) => {
      logger.warn(`Failed to push branch: ${error}`);
    });

    // First close any existing PR
    const existingPRNumber = await this.getOpenPullRequestNumber(branch);
    if (existingPRNumber) {
      logger.info(`Closing existing PR #${existingPRNumber}`);
      await this.closeOpenPullRequest({ pullRequestNumber: existingPRNumber });

      // Add comment about the new PR
      await this.addCommentToPullRequest({
        pullRequestNumber: existingPRNumber,
        body: "This PR is now outdated. A new version has been created.",
      });
    }

    // Create new PR
    logger.info("Creating new PR...");
    await this.octokit.rest.pulls.create({
      owner: this.#owner,
      repo: this.#repo,
      head: `${this.#owner}:${branch}`,
      base: this.#baseBranch,
      title,
      body,
    });
  }

  async getCurrentBranch() {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD");
    return stdout.trim();
  }

  async pullAndRebase() {
    logger.info(`Syncing with ${this.#baseBranch}`);

    // First get current branch
    const currentBranch = await this.getCurrentBranch();

    // Fetch and reset base branch
    await execAsync(`git fetch origin ${this.#baseBranch}`);
    await execAsync(`git checkout -f ${this.#baseBranch}`);
    await execAsync(`git reset --hard origin/${this.#baseBranch}`);
    await execAsync("git clean -fd"); // Clean untracked files

    // Go back to our branch and reset to base
    await execAsync(`git checkout -f ${currentBranch}`);
    await execAsync(`git reset --hard origin/${this.#baseBranch}`);
  }

  async commitAndPush(options: {
    message: string;
    branch: string;
  }) {
    const { message, branch } = options;
    logger.info(`Committing and pushing to ${branch}...`);
    await execAsync("git add .");
    await execAsync(`git commit -m "${message}"`);
    await execAsync(`git push -f origin ${branch}`);
  }

  async createBranch(branchName: string) {
    logger.info(`Creating new branch: ${branchName}`);

    // First ensure we have the latest base branch
    logger.info(`Fetching and checking out ${this.#baseBranch}`);
    await execAsync(`git fetch origin ${this.#baseBranch}`);
    await execAsync(`git checkout -f ${this.#baseBranch}`);
    await execAsync(`git reset --hard origin/${this.#baseBranch}`);
    await execAsync("git clean -fd"); // Clean untracked files

    // Create new branch from here
    logger.info(`Creating branch ${branchName} from ${this.#baseBranch}`);
    await execAsync(`git checkout -b ${branchName}`);
  }

  async addChanges() {
    logger.info("Adding changes...");
    await execAsync("git add .");
  }

  async checkBotCommit() {
    const { stdout: lastCommitAuthor } = await execAsync(
      'git log -1 --pretty=format:"%an"',
    );
    return lastCommitAuthor.trim() === "Languine Bot";
  }

  async hasChanges() {
    const { stdout } = await execAsync("git status --porcelain");
    return stdout.trim() !== "";
  }

  async getOpenPullRequestNumber(branch: string) {
    const { data } = await this.octokit.rest.pulls.list({
      owner: this.#owner,
      repo: this.#repo,
      head: `${this.#owner}:${branch}`,
      state: "open",
    });
    return data[0]?.number;
  }

  async closeOpenPullRequest(options: { pullRequestNumber: number }) {
    const { pullRequestNumber } = options;
    await this.octokit.rest.pulls.update({
      owner: this.#owner,
      repo: this.#repo,
      pull_number: pullRequestNumber,
      state: "closed",
    });
  }

  async addCommentToPullRequest(options: {
    pullRequestNumber: number;
    body: string;
  }) {
    const { pullRequestNumber, body } = options;
    await this.octokit.rest.issues.createComment({
      owner: this.#owner,
      repo: this.#repo,
      issue_number: pullRequestNumber,
      body,
    });
  }

  public getPlatformConfig() {
    const env = GithubEnvSchema.parse(process.env);

    return {
      branch: env.GITHUB_REF_NAME,
      owner: env.GITHUB_REPOSITORY_OWNER,
      repository: env.GITHUB_REPOSITORY.split("/")[1],
      token: env.GITHUB_TOKEN,
      baseBranch: env.GITHUB_BASE_REF || "main",
    };
  }
}
