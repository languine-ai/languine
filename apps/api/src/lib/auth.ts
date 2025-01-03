import { db } from "@/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import type { Context } from "hono";

export const setupAuth = (c: Context) => {
  return betterAuth({
    database: drizzleAdapter(db(c.env.DB), {
      provider: "sqlite",
      usePlural: true,
    }),
    secret: c.env.BETTER_AUTH_SECRET,
    baseURL: c.env.BETTER_AUTH_BASE_URL,
    trustedOrigins: c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(","),
    socialProviders: {
      github: {
        clientId: c.env.GITHUB_CLIENT_ID,
        clientSecret: c.env.GITHUB_CLIENT_SECRET,
      },
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
    },
    plugins: [organization()],
  });
};
