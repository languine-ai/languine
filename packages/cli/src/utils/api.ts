import { loadEnv } from "@/utils/env.js";
import { getAPIKey, requireBaseUrl } from "@/utils/session.js";
import { note } from "@clack/prompts";
import type { AppRouter } from "@languine/web/src/trpc/routers/_app.js";
import {
  type CreateTRPCClient,
  createTRPCClient,
  httpBatchLink,
  loggerLink,
} from "@trpc/client";
import superjson from "superjson";

const { LANGUINE_DEBUG } = loadEnv();

type Client = CreateTRPCClient<AppRouter>;

let cachedClient: Client | null = null;

function buildClient(): Client {
  const baseUrl = requireBaseUrl();
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({ enabled: () => LANGUINE_DEBUG === "true" }),
      httpBatchLink({
        url: `${baseUrl}/api/trpc`,
        transformer: superjson,
        headers: () => {
          const apiKey = getAPIKey();
          return {
            "x-api-key": apiKey || undefined,
            "x-trpc-source": "cli",
          };
        },
        fetch: async (url, options) => {
          const res = await fetch(url, options);
          if (!res.ok) {
            const error = await res.json().catch(() => null);
            if (LANGUINE_DEBUG === "true") {
              console.log(JSON.stringify(error, null, 2));
            }
            if (error?.[0]?.error?.json?.message === "UNAUTHORIZED") {
              note(
                "You are not logged in. Run `languine login` first or set LANGUINE_API_KEY.",
                "Unauthorized",
              );
              process.exit(1);
            }
            if (error?.[0]?.error?.json?.message === "NOT_FOUND") {
              note(
                "The resource you are looking for does not exist.",
                "Not Found",
              );
              process.exit(1);
            }
          }
          return res;
        },
      }),
    ],
  });
}

export const client: Client = new Proxy({} as Client, {
  get(_target, prop) {
    if (!cachedClient) cachedClient = buildClient();
    return Reflect.get(cachedClient, prop);
  },
});
