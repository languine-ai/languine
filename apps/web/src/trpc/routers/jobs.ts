import { transformKeys } from "../../workflows/utils/transform";
import { translateProject } from "../../workflows/translate";
import { TRPCError } from "@trpc/server";
import { start } from "workflow/api";
import { createTRPCRouter, protectedProcedure } from "../init";
import { hasProjectAccess } from "../permissions/project";
import { jobsSchema, transformSchema } from "./schema";

export const jobsRouter = createTRPCRouter({
  startJob: protectedProcedure
    .input(jobsSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => {
      try {
        const run = await start(translateProject, [
          {
            projectId: input.projectId,
            sourceFormat: input.sourceFormat,
            sourceLanguage: input.sourceLanguage,
            targetLanguages: input.targetLanguages,
            content: input.content,
            branch: input.branch,
            commit: input.commit,
            sourceProvider: input.sourceProvider,
            commitMessage: input.commitMessage,
            commitLink: input.commitLink,
          },
        ]);

        return { runId: run.runId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to start translation workflow",
        });
      }
    }),

  startTransformJob: protectedProcedure
    .input(transformSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => {
      return transformKeys(input.translations);
    }),
});
