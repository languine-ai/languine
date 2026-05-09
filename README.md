<p align="center">
  <img src="https://raw.githubusercontent.com/languine-ai/languine/main/apps/web/src/app/opengraph-image.png" alt="Languine" />
</p>

# Languine

**Self-hosted, Vercel-native AI localization.** Click Deploy. Run `npx languine`. That's it.

---

## One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flanguine-ai%2Flanguine&project-name=languine&repository-name=languine&root-directory=apps%2Fweb&env=LANGUINE_API_KEY,AI_MODEL&envDescription=LANGUINE_API_KEY%20is%20a%20random%20token%20you%20pick%20(e.g.%20%60openssl%20rand%20-hex%2032%60).%20AI_MODEL%20is%20optional%20(default%20openai%2Fgpt-4.1).&envLink=https%3A%2F%2Fgithub.com%2Flanguine-ai%2Flanguine%23environment-variables&stores=%5B%7B%22type%22%3A%22postgres%22%2C%22productSlug%22%3A%22neon%22%7D%5D&demo-title=Languine&demo-description=Self-hosted%20AI%20localization%20on%20your%20own%20Vercel%20account&demo-image=https%3A%2F%2Fraw.githubusercontent.com%2Flanguine-ai%2Flanguine%2Fmain%2Fapps%2Fweb%2Fsrc%2Fapp%2Fopengraph-image.png&demo-url=https%3A%2F%2Flanguine.ai)

What the button does:

1. Forks this repo to your GitHub account.
2. Creates a Vercel project with `apps/web` as the root.
3. Provisions serverless Postgres via the Vercel Marketplace — `DATABASE_URL` is auto-injected.
4. Prompts you for `LANGUINE_API_KEY` (any random string) and an optional `AI_MODEL` slug.
5. Builds and deploys. The build automatically runs `drizzle-kit migrate` against your fresh database.

After the first deploy, do these two things:

1. **Enable Deployment Protection.** In your Vercel project: *Settings → Deployment Protection* → turn on **Vercel Authentication** (or **Password Protection**). This gates the dashboard and `/cli/token`. Without this, your API key is publicly visible.
2. **Open the dashboard** (`https://<your-deployment>.vercel.app`). It shows a status checklist and ready-to-paste CLI commands.

That's it. No additional integrations to configure — Vercel AI Gateway authenticates automatically via the project's OIDC token.

## Use the CLI

> The self-hosted CLI ships under the `selfhosted` npm dist-tag so it doesn't disturb users still pointed at the legacy hosted backend. Install it with `npx languine@selfhosted ...` (or pin `"languine": "^4"` in your `package.json`). `npx languine@latest` continues to resolve to the legacy 3.x CLI for the old hosted service.

In any project that needs translations:

```bash
npx languine@selfhosted login --url https://languine.your-team.vercel.app
npx languine@selfhosted init
npx languine@selfhosted translate
```

`languine login` opens `/cli/token` in your browser. Because Deployment Protection is on, only authorized owners can see the page — copy the API key, paste it into the CLI prompt.

`languine init` creates a project on your deployment via tRPC (`project.create`) and writes the returned `projectId` into `languine.json`. You don't need to provision anything from the dashboard.

For non-interactive use (CI, scripts):

```bash
export LANGUINE_BASE_URL=https://languine.your-team.vercel.app
export LANGUINE_API_KEY=<the-key-you-set-on-vercel>
npx languine@selfhosted translate
```

## GitHub Action

```yaml
name: Languine
on:
  push:
    branches: [main]

jobs:
  translate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: languine-ai/languine@v4
        with:
          api-key: ${{ secrets.LANGUINE_API_KEY }}
          base-url: ${{ vars.LANGUINE_BASE_URL }}
          project-id: prj_xxxxxxx
          create-pull-request: 'true'
```

## Environment variables

| Variable | Required | Source | Description |
| --- | --- | --- | --- |
| `LANGUINE_API_KEY` | Yes | Set at deploy | Single API key shared between the dashboard, CLI and Action. Generate with `openssl rand -hex 32`. |
| `DATABASE_URL` | Yes | Auto-injected | Postgres connection string from the Vercel Marketplace integration you picked at deploy. |
| `AI_MODEL` | No | Set at deploy | Vercel AI Gateway model slug. Defaults to `openai/gpt-4.1`. Examples: `anthropic/claude-sonnet-4`, `openai/gpt-4.1-mini`. |
| `AI_GATEWAY_API_KEY` | No | Local dev only | Only needed when running locally outside Vercel. In production the Gateway uses the project's OIDC token. |

## Architecture

- **Hosting:** Vercel (Next.js 16, App Router, Node.js runtime).
- **Database:** Serverless Postgres from the Vercel Marketplace + Drizzle ORM.
- **Background jobs:** Vercel Workflows (`workflow` SDK) — durable, resumable, observable.
- **AI:** Vercel AI Gateway (`@ai-sdk/gateway` + AI SDK v6) — single configurable model.
- **Auth:** Single `LANGUINE_API_KEY` for the CLI/Action; the dashboard is gated by Vercel Deployment Protection.

```mermaid
flowchart LR
  Dev[Developer] -->|languine| CLI
  GHA[GitHub Action] -->|x-api-key| Web
  CLI -->|x-api-key| Web[apps/web on Vercel]
  Web --> Workflows[Vercel Workflows]
  Workflows --> Gateway[Vercel AI Gateway]
  Gateway --> Models[OpenAI / Anthropic / ...]
  Web --> DB[(Postgres)]
  Workflows --> DB
  Owner[Owner browser] -->|Deployment Protection| Web
```

## Local development

```bash
git clone https://github.com/languine-ai/languine
cd languine
bun install
cp apps/web/.env.example apps/web/.env  # fill in DATABASE_URL etc.
bun dev
```

Set `AI_GATEWAY_API_KEY` in `apps/web/.env` so the Gateway can authenticate when not running on Vercel.

## Tests

```bash
bun test                         # everything
bun test --filter @languine/web  # just the web app
bun test --filter languine       # just the CLI
```

## License

[MIT](./LICENSE) © Midday Labs AB