import type { inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { jobsRouter } from "./jobs";
import { projectRouter } from "./project";
import { translateRouter } from "./translate";

export const appRouter = createTRPCRouter({
  project: projectRouter,
  translate: translateRouter,
  jobs: jobsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
