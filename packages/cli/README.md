<p align="center">
  <img src="https://raw.githubusercontent.com/languine-ai/languine/main/apps/web/src/app/opengraph-image.png" alt="Languine" />
</p>

<p align="center">
  Self-hosted, AI-powered localization for your codebase. The CLI for a Languine deployment you run on your own Vercel account.
</p>

---

```bash
npx languine@selfhosted login --url https://languine.your-team.vercel.app
npx languine@selfhosted init
npx languine@selfhosted translate
```

> The `selfhosted` dist-tag pins this v4 CLI to the self-hosted backend.
> `npx languine@latest` continues to resolve to the legacy 3.x CLI for the
> hosted service and is intentionally left untouched.

## What is Languine?

Languine is an AI-powered localization engine. The dashboard, the API, the
queue and the AI gateway all live inside a single Next.js app you deploy
to your own Vercel account in one click — no SaaS account, no per-key
pricing, you only pay the model provider.

This package is the CLI that talks to that deployment.

## What it does

- **Diff-based translation.** `languine translate` only translates keys
  that changed since the last commit (tracked via `languine.lock`).
- **18+ formats.** JSON, YAML, MDX, `.strings`, `.stringsdict`,
  `.xcstrings`, `.arb`, `.po`, XLIFF, Android XML, PHP, Properties, CSV,
  Fluent, raw HTML, JS / TS modules and more.
- **Project bootstrap.** `languine init` creates a project on your
  deployment via tRPC and writes the returned `projectId` into
  `languine.json` for you.
- **CI ready.** Pair with the `languine-ai/languine@v4` GitHub Action to
  open PRs with new translations on every push.
- **Auth without OAuth.** A single `LANGUINE_API_KEY` — the same key the
  CLI, dashboard and Action share. The dashboard is gated by Vercel
  Deployment Protection.

## Quickstart

1. Click "Deploy with Vercel" in the [main repo
   README](https://github.com/languine-ai/languine).
2. Generate `LANGUINE_API_KEY` (`openssl rand -hex 32`) and paste it in
   the deploy prompt. Neon Postgres is provisioned via the Vercel
   Marketplace; migrations run automatically on first build.
3. Enable Deployment Protection on the Vercel project so the dashboard
   and `/cli/token` aren't public.
4. From your app's repo:

   ```bash
   npx languine@selfhosted login --url https://languine.your-team.vercel.app
   npx languine@selfhosted init
   npx languine@selfhosted translate
   ```

For non-interactive use (CI, scripts):

```bash
export LANGUINE_BASE_URL=https://languine.your-team.vercel.app
export LANGUINE_API_KEY=<the-key-you-set-on-vercel>
npx languine@selfhosted translate
```

## License

[MIT](https://github.com/languine-ai/languine/blob/main/LICENSE) © Midday Labs AB
