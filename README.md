# Basecamp Cards → GitHub Issues Sync

A Cloudflare Worker that syncs Basecamp cards to GitHub issues with automatic comment syncing.

## Features

- **Manual linking** — Web UI to link Basecamp cards to GitHub issues
- **Comment sync** — New Basecamp comments automatically appear on linked GitHub issues
- **Content sync** — Card title/content updates sync to GitHub
- **Import existing comments** — All comments are imported when linking

## How It Works

```
1. User opens Web UI → pastes Basecamp card URL → selects repo
2. Worker creates GitHub issue with card content + existing comments
3. Mapping stored in Cloudflare KV
4. Basecamp webhook fires on new comments/edits
5. Worker syncs changes to linked GitHub issue
```

## Setup

### Prerequisites

- Cloudflare account with Workers enabled
- GitHub App with Issues read/write permissions
- Basecamp account with API access

### 1. Clone and install

```bash
git clone https://github.com/codasite/basecamp-cards-github-sync.git
cd basecamp-cards-github-sync
npm install
```

### 2. Create KV namespace

```bash
wrangler kv:namespace create MAPPINGS
wrangler kv:namespace create MAPPINGS --preview
```

Update `wrangler.toml` with the returned namespace IDs.

### 3. Configure secrets

```bash
# GitHub App credentials
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_PRIVATE_KEY
wrangler secret put GITHUB_APP_INSTALLATION_ID

# Basecamp credentials
wrangler secret put BASECAMP_ACCESS_TOKEN
wrangler secret put BASECAMP_ACCOUNT_ID

# Optional: webhook signature verification
wrangler secret put BASECAMP_WEBHOOK_SECRET
```

### 4. Deploy

```bash
npm run deploy
```

### 5. Configure Basecamp webhook

In your Basecamp account, set up a webhook pointing to:
```
https://your-worker.your-subdomain.workers.dev/webhook
```

Subscribe to these events:
- `comment_created`
- `card_content_changed`
- `card_title_changed`

## Local Development

```bash
# Copy example env file
cp .dev.vars.example .dev.vars
# Fill in your credentials

# Start dev server
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI for linking cards |
| `/api/preview` | GET | Preview a Basecamp card |
| `/api/link` | POST | Link card to new GitHub issue |
| `/webhook` | POST | Basecamp webhook receiver |
| `/health` | GET | Health check |

## Architecture

```
┌─────────────────────────────────────────┐
│         Cloudflare Worker               │
├─────────────────────────────────────────┤
│  src/                                   │
│  ├── index.ts        # Entry point      │
│  ├── types/          # TypeScript types │
│  ├── lib/                               │
│  │   ├── basecamp.ts # Basecamp client  │
│  │   ├── github.ts   # GitHub client    │
│  │   └── mappings.ts # KV operations    │
│  └── routes/                            │
│      ├── ui.tsx      # Web interface    │
│      └── webhook.ts  # Event handler    │
└─────────────────────────────────────────┘
```

## License

MIT
