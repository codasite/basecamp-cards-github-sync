// Environment bindings for Cloudflare Worker
export interface Env {
  // KV namespace for card-to-issue mappings
  MAPPINGS: KVNamespace;

  // GitHub App credentials
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_INSTALLATION_ID: string;

  // Basecamp credentials
  BASECAMP_ACCESS_TOKEN: string;
  BASECAMP_ACCOUNT_ID: string;
  BASECAMP_WEBHOOK_SECRET?: string;
}

// Stored mapping between Basecamp card and GitHub issue
export interface CardMapping {
  repo: string; // "org/repo-name"
  issueNumber: number;
  linkedAt: string; // ISO timestamp
  basecampProjectId: string;
  basecampCardId: string;
}

// Basecamp card structure (simplified)
export interface BasecampCard {
  id: number;
  title: string;
  content: string;
  status: string;
  creator: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
  parent: {
    id: number;
    title: string;
    url: string;
  };
  bucket: {
    id: number;
    name: string;
  };
}

// Basecamp comment structure
export interface BasecampComment {
  id: number;
  content: string;
  created_at: string;
  creator: {
    id: number;
    name: string;
  };
}

// Request to link a card to an issue
export interface LinkRequest {
  basecampUrl: string;
  repo: string;
}

// Basecamp webhook payload
export interface BasecampWebhookPayload {
  id: number;
  kind: string; // "comment_created", "card_content_changed", etc.
  created_at: string;
  recording: {
    id: number;
    type: string;
    title?: string;
    content?: string;
    parent?: {
      id: number;
      type: string;
    };
    bucket: {
      id: number;
    };
  };
  creator: {
    id: number;
    name: string;
  };
}
