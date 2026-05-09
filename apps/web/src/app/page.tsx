import { CodeBlock } from "@/components/ui/code-block";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { listProjects } from "@/db/queries/project";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getDeploymentUrl(): string {
  if (process.env.LANGUINE_BASE_URL) return process.env.LANGUINE_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function HomePage() {
  const baseUrl = getDeploymentUrl();
  const apiKeySet = Boolean(process.env.LANGUINE_API_KEY);
  const databaseSet = Boolean(process.env.DATABASE_URL);

  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let projectsError: string | null = null;
  if (databaseSet) {
    try {
      projects = await listProjects();
    } catch (error) {
      projectsError =
        error instanceof Error
          ? error.message
          : "Failed to read projects from the database.";
    }
  }

  const loginCmd = `npx languine@selfhosted login --url ${baseUrl}`;
  const exampleProjectId = projects[0]?.id ?? "prj_xxxxxxx";
  const workflowYaml = `name: Languine
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
          api-key: \${{ secrets.LANGUINE_API_KEY }}
          base-url: \${{ vars.LANGUINE_BASE_URL }}
          project-id: ${exampleProjectId}
          create-pull-request: 'true'`;

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <header className="mb-12">
        <Logo height={20} />
        <p className="text-muted-foreground mt-4 text-sm">
          Self-hosted localization, deployed on your own Vercel account.
        </p>
      </header>

      <Card className="mb-8 border-border/80">
        <CardContent className="space-y-2 text-sm py-5">
          <StatusRow
            label="Database"
            ok={databaseSet}
            okText="Connected"
            failText="DATABASE_URL is not set. Connect Neon via the Vercel Marketplace."
          />
          <StatusRow
            label="API key"
            ok={apiKeySet}
            okText="Set"
            failText="LANGUINE_API_KEY is not set. Add it under Project Settings → Environment Variables."
          />
          <StatusRow
            label="Deployment Protection"
            ok={null}
            okText=""
            failText=""
            warnText="Make sure Vercel Deployment Protection is enabled so this dashboard and /cli/token are private."
          />
        </CardContent>
      </Card>

      <section className="mb-10">
        <h2 className="text-xl font-medium mb-3">Get started</h2>
        <ol className="space-y-5 text-sm">
          <li>
            <div className="text-muted-foreground mb-2">
              1. Connect your CLI to this deployment.
            </div>
            <CodeBlock value={loginCmd} />
          </li>
          <li>
            <div className="text-muted-foreground mb-2">
              2. From your project root, initialize the config (this also
              creates a project on your deployment).
            </div>
            <CodeBlock value="npx languine@selfhosted init" />
          </li>
          <li>
            <div className="text-muted-foreground mb-2">3. Translate.</div>
            <CodeBlock value="npx languine@selfhosted translate" />
          </li>
        </ol>
        <div className="text-xs text-muted-foreground mt-4">
          The <code>@selfhosted</code> dist-tag pins the v4 CLI that talks to
          your deployment. <code>npx languine@latest</code> still resolves to
          the legacy 3.x CLI (hosted backend) and is left untouched. Need the
          API key?{" "}
          <Link className="underline" href="/cli/token">
            Open /cli/token
          </Link>
          .
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-medium mb-3">Automate in CI</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Run translations on every push with the official GitHub Action.
          {projects.length === 0 ? (
            <>
              {" "}
              The snippet below uses a placeholder project ID — replace it
              with one of your projects after running{" "}
              <code>languine init</code>.
            </>
          ) : (
            <>
              {" "}
              The snippet below is pre-filled with{" "}
              <code className="font-mono">{exampleProjectId}</code>{" "}
              ({projects[0]?.name}).
            </>
          )}
        </p>
        <ol className="space-y-5 text-sm">
          <li>
            <div className="text-muted-foreground mb-2">
              1. In your application's GitHub repo, add two values under{" "}
              <em>Settings → Secrets and variables → Actions</em>:
            </div>
            <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1.5">
              <li>
                <code className="font-mono">LANGUINE_API_KEY</code> (Secret) —
                same key as{" "}
                <Link className="underline" href="/cli/token">
                  /cli/token
                </Link>
                .
              </li>
              <li>
                <code className="font-mono">LANGUINE_BASE_URL</code> (Variable) —{" "}
                <code className="font-mono">{baseUrl}</code>.
              </li>
            </ul>
          </li>
          <li>
            <div className="text-muted-foreground mb-2">
              2. Drop this into{" "}
              <code className="font-mono">.github/workflows/languine.yml</code>:
            </div>
            <CodeBlock value={workflowYaml} />
          </li>
        </ol>
        <div className="text-xs text-muted-foreground mt-4">
          The action defaults to the <code>selfhosted</code> CLI dist-tag, so
          it talks to <em>this</em> deployment, not the legacy hosted backend.
          With <code>create-pull-request: 'true'</code> it opens a PR per run;
          flip to <code>'false'</code> to commit directly.
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-3">Projects</h2>
        {projectsError ? (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              {projectsError}
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No projects yet. They'll show up here after the first{" "}
              <code>languine init</code> + <code>languine translate</code> run.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {projects.map((p) => (
              <Card key={p.id} className="border-border/70">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {p.id} · {p.slug}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatusRow({
  label,
  ok,
  okText,
  failText,
  warnText,
}: {
  label: string;
  ok: boolean | null;
  okText: string;
  failText: string;
  warnText?: string;
}) {
  let dotColor = "bg-yellow-500";
  let message = warnText ?? "";
  if (ok === true) {
    dotColor = "bg-emerald-500";
    message = okText;
  } else if (ok === false) {
    dotColor = "bg-red-500";
    message = failText;
  }
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1 size-2 rounded-full ${dotColor}`}
        aria-hidden="true"
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}
