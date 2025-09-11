import { connectDb } from "@/db";
import {
  createOrganization,
  deleteOrganization,
  deleteOrganizationInvite,
  deleteOrganizationMember,
  getAllOrganizationsWithProjects,
  getOrganization,
  getOrganizationInvites,
  getOrganizationMembers,
  getOrganizationStats,
  inviteMember,
  leaveOrganization,
  updateOrganization,
  updateOrganizationApiKey,
} from "@/db/queries/organization";
import { members } from "@/db/schema";
import InviteEmail from "@/emails/templates/invite";
import { resend } from "@/lib/resend";
import { getAppUrl } from "@/lib/url";
import { getSession } from "@jordanmgsoftware/languine-supabase/session";
import { TRPCError } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { and, ne } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import {
  isOrganizationMember,
  isOrganizationOwner,
} from "../permissions/organization";
import {
  createOrganizationSchema,
  deleteOrganizationInviteSchema,
  deleteOrganizationMemberSchema,
  inviteMemberSchema,
  organizationSchema,
  organizationStatsSchema,
  updateOrganizationSchema,
} from "./schema";

export const organizationRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      const org = await getOrganization(input.organizationId);

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return org;
    }),

  getAll: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    return getAllOrganizationsWithProjects(ctx.authenticatedId);
  }),

  getMembers: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      return getOrganizationMembers(input.organizationId);
    }),

  getInvites: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      return getOrganizationInvites(input.organizationId);
    }),

  create: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const org = await createOrganization({
        name: input.name,
        userId: ctx.authenticatedId,
      });

      if (!org) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create organization",
        });
      }

      return org;
    }),

  update: protectedProcedure
    .input(updateOrganizationSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input }) => {
      const org = await updateOrganization({
        id: input.organizationId,
        name: input.name,
        logo: input.logo,
        email: input.email,
      });

      if (!org) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update organization",
        });
      }

      return org;
    }),

  delete: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input, ctx }) => {
      const members = await getOrganizationMembers(input.organizationId);
      const userOrgs = await getAllOrganizationsWithProjects(
        ctx.authenticatedId,
      );

      if (members.length === 1) {
        // Get all organizations for this user

        // Allow deletion if user has more than one organization
        if (userOrgs.length > 1) {
          const org = await deleteOrganization(input.organizationId);

          if (!org) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to delete organization",
            });
          }

          return org;
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete your only organization, instead delete your account",
        });
      }

      const org = await deleteOrganization(input.organizationId);

      if (!org) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete organization",
        });
      }

      return {
        organization: org,
        organizations: userOrgs,
      };
    }),

  deleteInvite: protectedProcedure
    .input(deleteOrganizationInviteSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input }) => {
      const invite = await deleteOrganizationInvite(input.inviteId);

      if (!invite) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete organization invite",
        });
      }

      return invite;
    }),

  deleteMember: protectedProcedure
    .input(deleteOrganizationMemberSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input }) => {
      const db = await connectDb();

      const otherOwners = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.organizationId, input.organizationId),
            eq(members.role, "owner"),
            ne(members.id, input.memberId),
          ),
        );

      if (otherOwners.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Organization must have at least one owner. Transfer ownership to another member before removing this owner.",
        });
      }

      const deletedMember = await deleteOrganizationMember(input.memberId);

      if (!deletedMember) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove organization member",
        });
      }

      return deletedMember;
    }),

  leave: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationMember)
    .mutation(async ({ input, ctx }) => {
      const db = await connectDb();

      const otherOwners = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.organizationId, input.organizationId),
            eq(members.role, "owner"),
            ne(members.userId, ctx.authenticatedId),
          ),
        );

      if (otherOwners.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot leave as the last owner of the organization",
        });
      }

      return leaveOrganization(input.organizationId, ctx.authenticatedId);
    }),

  updateApiKey: protectedProcedure
    .input(organizationSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input }) => {
      return updateOrganizationApiKey(input.organizationId);
    }),

  inviteMember: protectedProcedure
    .input(inviteMemberSchema)
    .use(isOrganizationOwner)
    .mutation(async ({ input, ctx }) => {
      try {
        const invite = await inviteMember({
          organizationId: input.organizationId,
          email: input.email,
          role: input.role,
          inviterId: ctx.authenticatedId,
        });

        const organization = await getOrganization(input.organizationId);

        if (!organization) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Organization not found",
          });
        }

        const {
          data: { session },
        } = await getSession();

        if (!session?.user) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User not found",
          });
        }

        const inviteLink = `${getAppUrl()}/api/invite/${invite.id}`;

        waitUntil(
          resend.emails.send({
            from: "Languine <hello@emails.languine.ai>",
            to: input.email,
            subject: `You've been invited to join ${organization.name} on Languine`,
            react: InviteEmail({
              invitedByUsername: session.user.user_metadata.full_name,
              invitedByEmail: session.user.email!,
              teamName: organization.name,
              inviteLink,
            }),
          }),
        );

        return invite;
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite member",
        });
      }
    }),

  getStats: protectedProcedure
    .input(organizationStatsSchema)
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      return getOrganizationStats(input.organizationId);
    }),
});
