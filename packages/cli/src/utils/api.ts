import { loadEnv } from "@/utils/env.js";
import { getAPIKey } from "@/utils/session.js";
import type { AppRouter } from "@languine/web/src/trpc/routers/_app.js";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import chalk from "chalk";
import superjson from "superjson";

loadEnv();

export const client = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: () => process.env.DEBUG === "true",
    }),
    httpBatchLink({
      url: `${process.env.BASE_URL}/api/trpc`,
      transformer: superjson,
      headers: () => {
        const apiKey = getAPIKey();

        return {
          "x-api-key": apiKey || undefined,
          "x-trpc-source": "cli",
        };
      },
      fetch: (url, options) => {
        return fetch(url, options).then(async (res) => {
          if (!res.ok) {
            const error = await res.json().catch(() => null);

            if (error[0]?.error?.json?.message === "UNAUTHORIZED") {
              console.log(
                chalk.red(
                  "You are not logged in. Please run `languine auth login` first.",
                ),
              );
              process.exit(1);
            }
          }
          return res;
        });
      },
    }),
  ],
});
