import { connectDb } from "@/db";
import { getOrganizationLimits } from "@/db/queries/organization";
import type { organizations } from "@/db/schema";
import { projects } from "@/db/schema";
import { TIERS_MAX_DOCUMENTS, TIERS_MAX_KEYS } from "@/lib/tiers";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { jobsSchema } from "./schema";

export interface TranslationLimitCheckResult {
  meta: {
    plan: string;
    tier: number;
    organizationId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface TranslationTaskOptions {
  queue: {
    name: string;
    concurrencyLimit: number;
  };
  concurrencyKey: string;
}

export async function getProjectOrganization(projectId: string) {
  const db = await connectDb();

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      organization: true,
    },
  });

  if (!project?.organization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  return project.organization;
}

export async function checkTranslationLimits(
  org: typeof organizations.$inferSelect,
  input: typeof jobsSchema._type,
): Promise<TranslationLimitCheckResult | null> {
  const { totalKeys, totalDocuments } = await getOrganizationLimits(org.id);

  const nextTotalDocuments =
    totalDocuments > 0 ? totalDocuments + 1 * input.targetLanguages.length : 0;
  const currentDocumentsLimit =
    TIERS_MAX_DOCUMENTS[org.tier as keyof typeof TIERS_MAX_DOCUMENTS];

  if (nextTotalDocuments >= currentDocumentsLimit) {
    return {
      meta: {
        plan: org.plan,
        tier: org.tier,
        organizationId: org.id,
      },
      error: {
        code: "DOCUMENT_LIMIT_REACHED",
        message: "You have reached the maximum number of documents",
      },
    };
  }

  const db = await connectDb();
  const existingKeys = await db.query.translations.findMany({
    where: (translations, { eq }) => {
      return eq(translations.projectId, input.projectId);
    },
    columns: {
      translationKey: true,
    },
  });

  const existingKeysSet = new Set(
    existingKeys.map((row) => row.translationKey),
  );

  // Count how many keys from input.content are not in existingKeysSet
  const newKeysCount = input.content.filter(
    (item) => !existingKeysSet.has(item.key),
  ).length;

  const nextTotalKeys = totalKeys + newKeysCount * input.targetLanguages.length;
  const currentKeysLimit =
    TIERS_MAX_KEYS[org.tier as keyof typeof TIERS_MAX_KEYS];

  if (nextTotalKeys >= currentKeysLimit) {
    return {
      meta: {
        plan: org.plan,
        tier: org.tier,
        organizationId: org.id,
      },
      error: {
        code: "KEY_LIMIT_REACHED",
        message: "You have reached the maximum number of keys",
      },
    };
  }

  return {
    meta: {
      plan: org.plan,
      tier: org.tier,
      organizationId: org.id,
    },
  };
}

export function getTranslationTaskOptions(
  org: typeof organizations.$inferSelect,
) {
  const isFreeUser = org.plan === "free";

  const options: TranslationTaskOptions = isFreeUser
    ? {
        queue: {
          name: "free-users",
          concurrencyLimit: 5,
        },
        // General concurrency
        concurrencyKey: "free-users",
      }
    : {
        queue: {
          name: "paid-users",
          concurrencyLimit: 5,
        },
        // Per organization concurrency
        concurrencyKey: org.id,
      };

  return {
    options,
    isFreeUser,
  };
}
