import { Hono } from "hono";
import type { Env, BasecampWebhookPayload } from "../types";
import { BasecampClient } from "../lib/basecamp";
import { GitHubClient } from "../lib/github";
import { getMapping } from "../lib/mappings";

const webhook = new Hono<{ Bindings: Env }>();

// Verify Basecamp webhook signature (if secret is configured)
async function verifySignature(
  secret: string | undefined,
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!secret) return true; // Skip verification if no secret configured

  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expected;
}

webhook.post("/", async (c) => {
  const bodyText = await c.req.text();
  const signature = c.req.header("X-Basecamp-Signature");

  // Verify webhook signature
  const isValid = await verifySignature(
    c.env.BASECAMP_WEBHOOK_SECRET,
    bodyText,
    signature
  );

  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  const payload: BasecampWebhookPayload = JSON.parse(bodyText);

  console.log("Webhook received:", payload.kind, payload.recording?.id);

  // Handle different event types
  switch (payload.kind) {
    case "comment_created":
      return handleCommentCreated(c.env, payload);

    case "card_content_changed":
    case "card_title_changed":
      return handleCardUpdated(c.env, payload);

    default:
      // Ignore other events
      return c.json({ status: "ignored", kind: payload.kind });
  }
});

async function handleCommentCreated(env: Env, payload: BasecampWebhookPayload) {
  // Comment was added to a recording - check if it's a linked card
  const recording = payload.recording;
  if (!recording.parent) {
    return { status: "ignored", reason: "no parent" };
  }

  const projectId = recording.bucket.id.toString();
  const cardId = recording.parent.id.toString();

  const mapping = await getMapping(env, projectId, cardId);
  if (!mapping) {
    return { status: "ignored", reason: "card not linked" };
  }

  // Sync comment to GitHub
  const github = new GitHubClient(env);
  const commentBody = `**${payload.creator.name}** commented:

${recording.content || ""}`;

  await github.addComment(mapping.repo, mapping.issueNumber, commentBody);

  return { status: "synced", type: "comment", issueNumber: mapping.issueNumber };
}

async function handleCardUpdated(env: Env, payload: BasecampWebhookPayload) {
  const recording = payload.recording;
  const projectId = recording.bucket.id.toString();
  const cardId = recording.id.toString();

  const mapping = await getMapping(env, projectId, cardId);
  if (!mapping) {
    return { status: "ignored", reason: "card not linked" };
  }

  // Fetch the full card to get updated content
  const basecamp = new BasecampClient(env);
  const card = await basecamp.getCard(projectId, cardId);

  // Update GitHub issue
  const github = new GitHubClient(env);
  const issueBody = `${card.content || ""}

---
📌 *Linked from Basecamp*
Last updated: ${new Date().toISOString()}`;

  await github.updateIssue(mapping.repo, mapping.issueNumber, card.title, issueBody);

  return { status: "synced", type: "card_update", issueNumber: mapping.issueNumber };
}

export default webhook;
