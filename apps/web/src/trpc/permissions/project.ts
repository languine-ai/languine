import { connectDb } from "@/db";
import { members, organizations, projects } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { t } from "../init";

/**
 * Middleware to check if the authenticated user has access to the specified project.
 * Also allows access if the request is made with an organization's API key.
 */
export const hasProjectAccess = t.middleware(async ({ ctx, next, input }) => {
  console.log("hasProjectAccess", ctx, input);
  // Ensure user is authenticated
  if (!ctx.authenticatedId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }

  const typedInput = input as { projectId: string };

  const db = await connectDb();

  if (ctx.type === "organization") {
    const result = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.authenticatedId),
    });

    // Allow access if using organization's API key
    if (ctx.type === "organization" && ctx.authenticatedId === result.id) {
      return next();
    }
  }

  // Get project and its organization
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, typedInput.projectId),
    with: {
      organization: {
        with: {
          members: {
            where: eq(members.userId, ctx.authenticatedId),
          },
        },
      },
    },
  });

  if (!result) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  // Block access if not a member and not using org API key
  if (!result.organization.members.length && ctx.type !== "organization") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project",
    });
  }

  return next();
});
