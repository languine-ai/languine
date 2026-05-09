import "server-only";

import { CodeBlock } from "@/components/ui/code-block";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getBaseUrl(): string {
  if (process.env.LANGUINE_BASE_URL) return process.env.LANGUINE_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default function CliTokenPage() {
  const apiKey = process.env.LANGUINE_API_KEY ?? "";
  const baseUrl = getBaseUrl();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <header>
          <Logo height={18} />
          <h1 className="text-xl mt-6">CLI token</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Copy this key into the CLI. This page is only reachable for
            authorized owners (Vercel Deployment Protection).
          </p>
        </header>

        {apiKey ? (
          <>
            <CodeBlock label="LANGUINE_API_KEY" value={apiKey} />

            <div className="space-y-3">
              <h2 className="text-sm font-medium">Interactive (recommended)</h2>
              <CodeBlock
                value={`npx languine@selfhosted login --url ${baseUrl}`}
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">
                Non-interactive (CI / scripts)
              </h2>
              <CodeBlock
                value={`export LANGUINE_BASE_URL=${baseUrl}\nexport LANGUINE_API_KEY=${apiKey}\nnpx languine@selfhosted translate`}
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium">GitHub Actions</h2>
              <CodeBlock
                value={`- uses: languine-ai/languine@v4
  with:
    api-key: \${{ secrets.LANGUINE_API_KEY }}
    base-url: ${baseUrl}
    project-id: prj_xxxxxxx`}
              />
            </div>
          </>
        ) : (
          <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <strong className="block mb-1">LANGUINE_API_KEY is not set.</strong>
            <p className="text-muted-foreground">
              Generate one with{" "}
              <code className="font-mono">openssl rand -hex 32</code>, set it
              under Project Settings → Environment Variables on Vercel, then
              redeploy.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
