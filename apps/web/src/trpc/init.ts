import { connectDb } from "@/db";
import { users } from "@/db/schema";
import { organizations } from "@/db/schema";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { TRPCError, initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";

async function validateApiKey(
  apiKey: string,
): Promise<{ authenticatedId: string; type: "user" | "organization" } | null> {
  const db = await connectDb();

  if (apiKey.startsWith("org_")) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.apiKey, apiKey),
    });

    if (org) {
      return {
        authenticatedId: org.id,
        type: "organization",
      };
    }
  } else {
    const user = await db.query.users.findFirst({
      where: eq(users.apiKey, apiKey),
    });
    if (user) {
      return {
        authenticatedId: user.id,
        type: "user",
      };
    }
  }

  return null;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const apiKey = opts.headers.get("x-api-key");

  // Either a user or organization
  if (apiKey) {
    const result = await validateApiKey(apiKey);
    if (result) {
      return {
        authenticatedId: result.authenticatedId,
        type: result.type,
      };
    }
  }

  const {
    data: { session },
  } = await getSession();

  return {
    authenticatedId: session?.user?.id,
    type: "user",
  };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { authenticatedId, type } = opts.ctx;

  if (!authenticatedId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      authenticatedId,
      type,
    },
  });
});
