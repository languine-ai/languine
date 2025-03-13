import type { startTranslationsTask } from "@/jobs/translate/start-translations";
import { transformKeys } from "@/jobs/utils/transform";
import { tasks } from "@trigger.dev/sdk/v3";
import { createTRPCRouter, protectedProcedure } from "../init";
import { hasProjectAccess } from "../permissions/project";
import {
  checkTranslationLimits,
  getProjectOrganization,
  getTranslationTaskOptions,
} from "./jobs.utils";
import { jobsSchema, transformSchema } from "./schema";

export const jobsRouter = createTRPCRouter({
  startJob: protectedProcedure
    .input(jobsSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input, ctx }) => {
      const organization = await getProjectOrganization(input.projectId);

      const limitCheckResult = await checkTranslationLimits(
        organization,
        input,
      );

      if (limitCheckResult?.error) {
        return {
          run: null,
          error: limitCheckResult.error,
          meta: {
            plan: limitCheckResult.meta.plan,
            tier: limitCheckResult.meta.tier,
            organizationId: organization.id,
            polarCustomerId: organization.polarCustomerId,
          },
        };
      }

      const { options, isFreeUser } = getTranslationTaskOptions(organization);

      const run = await tasks.trigger<typeof startTranslationsTask>(
        "start-translations",
        {
          apiKey: input.apiKey,
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
          userId: ctx.type === "user" ? ctx.authenticatedId : null,
        },
        options,
      );

      return {
        run,
        meta: {
          plan: isFreeUser ? "free" : "pro",
          tier: organization.tier,
          organizationId: organization.id,
          polarCustomerId: organization.polarCustomerId,
        },
      };
    }),

  startTransformJob: protectedProcedure
    .input(transformSchema)
    // .use(hasProjectAccess)
    .mutation(async ({ input }) => {
      const result = await transformKeys(input.translations);

      return result;
    }),
});
