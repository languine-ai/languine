import { isOwnerRequest, isValidApiKey } from "../lib/auth";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";

export type TrpcContextCaller = "api-key" | "owner";

export type TrpcContext = {
  caller: TrpcContextCaller | null;
  headers: Headers;
};

export const createTRPCContext = async (opts: {
  headers: Headers;
}): Promise<TrpcContext> => {
  const apiKey = opts.headers.get("x-api-key");

  if (apiKey && isValidApiKey(apiKey)) {
    return { caller: "api-key", headers: opts.headers };
  }

  if (isOwnerRequest(opts.headers)) {
    return { caller: "owner", headers: opts.headers };
  }

  return { caller: null, headers: opts.headers };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.caller) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({ ctx: { caller: opts.ctx.caller } });
});
