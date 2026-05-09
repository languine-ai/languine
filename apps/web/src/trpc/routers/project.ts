import {
  createProject,
  deleteProject,
  getProjectBySlug,
  listProjects,
  updateProject,
  updateProjectSettings,
} from "../../db/queries/project";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { projectSettingsSchema } from "./schema";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return listProjects();
  }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const project = await getProjectBySlug(input);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return project;
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const project = await createProject(input);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
      return project;
    }),

  update: protectedProcedure
    .input(z.object({ slug: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const project = await updateProject(input);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project",
        });
      }
      return project;
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        settings: projectSettingsSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const project = await updateProjectSettings(input);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project settings",
        });
      }
      return project;
    }),

  delete: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input }) => {
      const project = await deleteProject(input);
      if (!project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete project",
        });
      }
      return project;
    }),
});
