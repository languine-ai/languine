import { db } from "../../db";
import { projects } from "../../db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { t } from "../init";

/**
 * Middleware that ensures the project exists. In a single-tenant deploy any
 * authenticated caller (api-key or owner) has access to every project.
 */
export const hasProjectAccess = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.caller) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const typedInput = input as { projectId?: string };

  if (typedInput?.projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, typedInput.projectId),
      columns: { id: true },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }
  }

  return next();
});
