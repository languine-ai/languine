import { connectDb, primaryDb } from "@/db";
import { projects, translations } from "@/db/schema";
import type {
  DeleteKeysSchema,
  DeleteTranslationsSchema,
  ProjectLocalesSchema,
} from "@/trpc/routers/schema";
import { UTCDate } from "@date-fns/utc";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

export const createTranslations = async ({
  projectId,
  organizationId,
  userId,
  sourceFormat,
  translations: translationItems,
  branch,
  commit,
  sourceProvider,
  commitMessage,
  commitLink,
}: {
  projectId: string;
  userId?: string | null;
  organizationId: string;
  sourceFormat: string;
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
  translations: {
    translationKey: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    translatedText: string;
    sourceFile: string;
    sourceType?: "key" | "document";
  }[];
}) => {
  return primaryDb
    .insert(translations)
    .values(
      translationItems.map((translation) => ({
        projectId,
        sourceFormat,
        userId,
        organizationId,
        branch,
        commit,
        sourceProvider,
        commitMessage,
        commitLink,
        ...translation,
        sourceType: translation.sourceType || "key",
      })),
    )
    .onConflictDoUpdate({
      target: [
        translations.projectId,
        translations.translationKey,
        translations.targetLanguage,
      ],
      set: {
        translatedText: translations.translatedText,
        branch,
        commit,
        commitLink,
        updatedAt: new UTCDate(),
      },
    })
    .returning();
};

export const createDocument = async ({
  projectId,
  organizationId,
  userId,
  sourceFile,
  sourceLanguage,
  sourceText,
  targetLanguage,
  translatedText,
  sourceFormat,
  branch,
  commit,
  commitLink,
  sourceProvider,
  commitMessage,
}: {
  projectId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  userId?: string | null;
  organizationId: string;
  sourceFormat: string;
  sourceFile: string;
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
}) => {
  return primaryDb
    .insert(translations)
    .values({
      projectId,
      organizationId,
      userId,
      sourceFile,
      sourceLanguage,
      targetLanguage,
      // Document translations are stored as a single key (filename)
      translationKey: sourceFile,
      sourceType: "document",
      sourceFormat,
      sourceText,
      translatedText,
      branch,
      commit,
      commitLink,
      sourceProvider,
      commitMessage,
    })
    .onConflictDoUpdate({
      target: [
        translations.projectId,
        translations.translationKey,
        translations.targetLanguage,
      ],
      set: {
        translatedText: translations.translatedText,
        branch,
        commit,
        commitLink,
        updatedAt: new UTCDate(),
      },
    })
    .returning();
};

export const getTranslationsBySlug = async ({
  limit = 10,
  slug,
  cursor,
  search,
  organizationId,
  locales,
}: {
  slug: string;
  search?: string | null;
  cursor?: string | null;
  organizationId: string;
  locales?: string[] | null;
  limit?: number;
}) => {
  const db = await connectDb();

  return db
    .select()
    .from(translations)
    .innerJoin(projects, eq(translations.projectId, projects.id))
    .where(
      and(
        eq(projects.slug, slug),
        eq(projects.organizationId, organizationId),
        locales ? inArray(translations.targetLanguage, locales) : undefined,
        cursor ? gt(translations.id, cursor) : undefined,
        search
          ? or(
              sql`to_tsvector('simple', ${translations.translationKey}) @@ to_tsquery('simple', ${`${search.toLowerCase().split(" ").join(" & ")}:*`})`,
              sql`to_tsvector('simple', ${translations.sourceText}) @@ to_tsquery('simple', ${`${search.toLowerCase().split(" ").join(" & ")}:*`})`,
              sql`to_tsvector('simple', ${translations.translatedText}) @@ to_tsquery('simple', ${`${search.toLowerCase().split(" ").join(" & ")}:*`})`,
            )
          : undefined,
      ),
    )
    .limit(limit)
    .orderBy(desc(translations.updatedAt), asc(translations.id));
};

export const deleteKeys = async ({ projectId, keys }: DeleteKeysSchema) => {
  const db = await connectDb();

  return db
    .delete(translations)
    .where(
      and(
        eq(translations.projectId, projectId),
        inArray(translations.translationKey, keys),
      ),
    )
    .returning();
};

export const getProjectLocales = async ({
  slug,
  organizationId,
}: ProjectLocalesSchema) => {
  const db = await connectDb();

  return db
    .selectDistinct({
      targetLanguage: translations.targetLanguage,
    })
    .from(translations)
    .innerJoin(projects, eq(translations.projectId, projects.id))
    .where(
      and(eq(projects.slug, slug), eq(projects.organizationId, organizationId)),
    )
    .orderBy(asc(translations.targetLanguage));
};

export const getTranslationsByKey = async ({
  projectId,
  translationKey,
}: {
  projectId: string;
  translationKey: string;
}) => {
  const db = await connectDb();

  return db
    .select()
    .from(translations)
    .where(
      and(
        eq(translations.projectId, projectId),
        eq(translations.translationKey, translationKey),
      ),
    )
    .orderBy(asc(translations.targetLanguage));
};

export const getOverriddenTranslations = async ({
  projectId,
}: {
  projectId: string;
}) => {
  return primaryDb
    .select({
      translationKey: translations.translationKey,
      translatedText: translations.translatedText,
      sourceFile: translations.sourceFile,
      targetLanguage: translations.targetLanguage,
      sourceFormat: translations.sourceFormat,
    })
    .from(translations)
    .where(
      and(
        eq(translations.projectId, projectId),
        eq(translations.overridden, true),
      ),
    );
};

export const deleteTranslations = async ({
  projectId,
}: DeleteTranslationsSchema) => {
  return primaryDb
    .delete(translations)
    .where(eq(translations.projectId, projectId));
};
