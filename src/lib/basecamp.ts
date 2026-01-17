import type { BasecampCard, BasecampComment, Env } from "../types";

const BASECAMP_API_BASE = "https://3.basecampapi.com";

export class BasecampClient {
  private accessToken: string;
  private accountId: string;

  constructor(env: Env) {
    this.accessToken = env.BASECAMP_ACCESS_TOKEN;
    this.accountId = env.BASECAMP_ACCOUNT_ID;
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${BASECAMP_API_BASE}/${this.accountId}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "Basecamp-GitHub-Sync (https://github.com/codasite/basecamp-cards-github-sync)",
      },
    });

    if (!response.ok) {
      throw new Error(`Basecamp API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Parse a Basecamp card URL to extract project ID and card ID
  // URL format: https://3.basecamp.com/{account_id}/buckets/{project_id}/card_tables/cards/{card_id}
  parseCardUrl(url: string): { projectId: string; cardId: string } | null {
    const match = url.match(/buckets\/(\d+)\/card_tables\/cards\/(\d+)/);
    if (!match) return null;
    return { projectId: match[1], cardId: match[2] };
  }

  async getCard(projectId: string, cardId: string): Promise<BasecampCard> {
    return this.fetch<BasecampCard>(`/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }

  async getCardComments(projectId: string, cardId: string): Promise<BasecampComment[]> {
    return this.fetch<BasecampComment[]>(`/buckets/${projectId}/recordings/${cardId}/comments.json`);
  }
}
