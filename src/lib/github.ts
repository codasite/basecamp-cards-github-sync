import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import type { Env } from "../types";

export class GitHubClient {
  private octokit: Octokit;

  constructor(env: Env) {
    this.octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        installationId: env.GITHUB_APP_INSTALLATION_ID,
      },
    });
  }

  // Parse repo string "owner/repo" into parts
  private parseRepo(repo: string): { owner: string; repo: string } {
    const [owner, repoName] = repo.split("/");
    return { owner, repo: repoName };
  }

  async createIssue(
    repo: string,
    title: string,
    body: string
  ): Promise<{ number: number; html_url: string }> {
    const { owner, repo: repoName } = this.parseRepo(repo);
    const response = await this.octokit.issues.create({
      owner,
      repo: repoName,
      title,
      body,
    });
    return { number: response.data.number, html_url: response.data.html_url };
  }

  async updateIssue(
    repo: string,
    issueNumber: number,
    title: string,
    body: string
  ): Promise<void> {
    const { owner, repo: repoName } = this.parseRepo(repo);
    await this.octokit.issues.update({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      title,
      body,
    });
  }

  async addComment(repo: string, issueNumber: number, body: string): Promise<void> {
    const { owner, repo: repoName } = this.parseRepo(repo);
    await this.octokit.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      body,
    });
  }

  async listRepos(): Promise<string[]> {
    const response = await this.octokit.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });
    return response.data.repositories.map((repo) => repo.full_name);
  }
}
