import { Hono } from "hono";
import type { Env } from "../types";
import { BasecampClient } from "../lib/basecamp";
import { GitHubClient } from "../lib/github";
import { getMapping, saveMapping } from "../lib/mappings";

const ui = new Hono<{ Bindings: Env }>();

// Landing page with link form
ui.get("/", async (c) => {
  const github = new GitHubClient(c.env);
  let repos: string[] = [];

  try {
    repos = await github.listRepos();
  } catch (error) {
    console.error("Failed to fetch repos:", error);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Basecamp → GitHub Sync</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: #f5f5f5;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { margin-top: 0; color: #333; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        input, select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #0066cc;
        }
        button {
          background: #0066cc;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
        }
        button:hover { background: #0055aa; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .preview {
          background: #f9f9f9;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 1rem;
          margin: 1rem 0;
          display: none;
        }
        .preview.show { display: block; }
        .preview h3 { margin: 0 0 0.5rem 0; }
        .success { color: #22863a; background: #dcffe4; padding: 1rem; border-radius: 4px; }
        .error { color: #cb2431; background: #ffeef0; padding: 1rem; border-radius: 4px; }
        .already-linked { color: #735c0f; background: #fffbdd; padding: 1rem; border-radius: 4px; }
        a { color: #0066cc; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🔗 Basecamp → GitHub</h1>
        <p>Link a Basecamp card to a GitHub issue. Comments will sync automatically.</p>

        <form id="linkForm">
          <label for="basecampUrl">Basecamp Card URL</label>
          <input
            type="url"
            id="basecampUrl"
            name="basecampUrl"
            placeholder="https://3.basecamp.com/.../card_tables/cards/..."
            required
          />

          <label for="repo">GitHub Repository</label>
          <select id="repo" name="repo" required>
            <option value="">Select a repository...</option>
            ${repos.map(repo => `<option value="${repo}">${repo}</option>`).join('')}
          </select>

          <div id="preview" class="preview">
            <h3 id="previewTitle"></h3>
            <p id="previewContent"></p>
          </div>

          <div id="result"></div>

          <button type="button" id="previewBtn">Preview Card</button>
          <button type="submit" id="linkBtn" style="display:none; margin-top: 0.5rem;">Create GitHub Issue</button>
        </form>
      </div>

      <script>
        const form = document.getElementById('linkForm');
        const previewBtn = document.getElementById('previewBtn');
        const linkBtn = document.getElementById('linkBtn');
        const preview = document.getElementById('preview');
        const result = document.getElementById('result');

        previewBtn.addEventListener('click', async () => {
          const url = document.getElementById('basecampUrl').value;
          if (!url) return;

          previewBtn.disabled = true;
          previewBtn.textContent = 'Loading...';
          result.innerHTML = '';

          try {
            const res = await fetch('/api/preview?url=' + encodeURIComponent(url));
            const data = await res.json();

            if (data.error) {
              result.innerHTML = '<div class="error">' + data.error + '</div>';
              preview.classList.remove('show');
              linkBtn.style.display = 'none';
            } else if (data.alreadyLinked) {
              result.innerHTML = '<div class="already-linked">This card is already linked to <a href="' + data.issueUrl + '" target="_blank">issue #' + data.issueNumber + '</a></div>';
              preview.classList.remove('show');
              linkBtn.style.display = 'none';
            } else {
              document.getElementById('previewTitle').textContent = data.title;
              document.getElementById('previewContent').textContent = data.content?.substring(0, 200) + (data.content?.length > 200 ? '...' : '') || 'No content';
              preview.classList.add('show');
              linkBtn.style.display = 'block';
            }
          } catch (err) {
            result.innerHTML = '<div class="error">Failed to fetch card: ' + err.message + '</div>';
          }

          previewBtn.disabled = false;
          previewBtn.textContent = 'Preview Card';
        });

        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const basecampUrl = document.getElementById('basecampUrl').value;
          const repo = document.getElementById('repo').value;

          if (!basecampUrl || !repo) return;

          linkBtn.disabled = true;
          linkBtn.textContent = 'Creating...';
          result.innerHTML = '';

          try {
            const res = await fetch('/api/link', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ basecampUrl, repo })
            });
            const data = await res.json();

            if (data.error) {
              result.innerHTML = '<div class="error">' + data.error + '</div>';
            } else {
              result.innerHTML = '<div class="success">✓ Created <a href="' + data.issueUrl + '" target="_blank">issue #' + data.issueNumber + '</a> in ' + repo + '</div>';
              preview.classList.remove('show');
              linkBtn.style.display = 'none';
              document.getElementById('basecampUrl').value = '';
            }
          } catch (err) {
            result.innerHTML = '<div class="error">Failed to create issue: ' + err.message + '</div>';
          }

          linkBtn.disabled = false;
          linkBtn.textContent = 'Create GitHub Issue';
        });
      </script>
    </body>
    </html>
  `;

  return c.html(html);
});

// Preview a Basecamp card
ui.get("/api/preview", async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.json({ error: "Missing url parameter" }, 400);
  }

  const basecamp = new BasecampClient(c.env);
  const parsed = basecamp.parseCardUrl(url);

  if (!parsed) {
    return c.json({ error: "Invalid Basecamp card URL" }, 400);
  }

  // Check if already linked
  const existing = await getMapping(c.env, parsed.projectId, parsed.cardId);
  if (existing) {
    return c.json({
      alreadyLinked: true,
      issueNumber: existing.issueNumber,
      issueUrl: `https://github.com/${existing.repo}/issues/${existing.issueNumber}`,
    });
  }

  try {
    const card = await basecamp.getCard(parsed.projectId, parsed.cardId);
    return c.json({
      title: card.title,
      content: card.content,
      projectId: parsed.projectId,
      cardId: parsed.cardId,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch card from Basecamp" }, 500);
  }
});

// Link a card to a new GitHub issue
ui.post("/api/link", async (c) => {
  const body = await c.req.json<{ basecampUrl: string; repo: string }>();
  const { basecampUrl, repo } = body;

  if (!basecampUrl || !repo) {
    return c.json({ error: "Missing basecampUrl or repo" }, 400);
  }

  const basecamp = new BasecampClient(c.env);
  const github = new GitHubClient(c.env);

  const parsed = basecamp.parseCardUrl(basecampUrl);
  if (!parsed) {
    return c.json({ error: "Invalid Basecamp card URL" }, 400);
  }

  // Check if already linked
  const existing = await getMapping(c.env, parsed.projectId, parsed.cardId);
  if (existing) {
    return c.json({
      error: "Card already linked",
      issueNumber: existing.issueNumber,
      issueUrl: `https://github.com/${existing.repo}/issues/${existing.issueNumber}`,
    });
  }

  try {
    // Fetch card and comments
    const card = await basecamp.getCard(parsed.projectId, parsed.cardId);
    const comments = await basecamp.getCardComments(parsed.projectId, parsed.cardId);

    // Build issue body
    const issueBody = `${card.content || ""}

---
📌 *Linked from Basecamp: [${card.title}](${basecampUrl})*
Created by ${card.creator.name} on ${new Date(card.created_at).toLocaleDateString()}`;

    // Create GitHub issue
    const issue = await github.createIssue(repo, card.title, issueBody);

    // Add existing comments
    for (const comment of comments) {
      const commentBody = `**${comment.creator.name}** commented on ${new Date(comment.created_at).toLocaleDateString()}:

${comment.content}`;
      await github.addComment(repo, issue.number, commentBody);
    }

    // Save mapping
    await saveMapping(c.env, parsed.projectId, parsed.cardId, {
      repo,
      issueNumber: issue.number,
      linkedAt: new Date().toISOString(),
      basecampProjectId: parsed.projectId,
      basecampCardId: parsed.cardId,
    });

    return c.json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      commentsImported: comments.length,
    });
  } catch (error) {
    console.error("Failed to link card:", error);
    return c.json({ error: "Failed to create GitHub issue" }, 500);
  }
});

export default ui;
