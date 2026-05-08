import { db } from "../../db";
import {
  deleteKeys,
  deleteTranslations,
  getOverriddenTranslations,
  getProjectLocales,
  getTranslationsByKey,
  getTranslationsBySlug,
} from "../../db/queries/translate";
import { translations } from "../../db/schema";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { hasProjectAccess } from "../permissions/project";
import {
  deleteKeysSchema,
  deleteTranslationsSchema,
  getOverriddenTranslationsSchema,
  projectLocalesSchema,
  translateSchema,
  translationsByKeySchema,
  updateTranslationsSchema,
} from "./schema";

export const translateRouter = createTRPCRouter({
  getTranslationsBySlug: protectedProcedure
    .input(translateSchema)
    .query(async ({ input }) => {
      const data = await getTranslationsBySlug(input);
      return data.map(({ translations: row }) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }),

  getProjectLocales: protectedProcedure
    .input(projectLocalesSchema)
    .query(async ({ input }) => {
      const locales = await getProjectLocales(input);
      return locales.map(({ targetLanguage }) => targetLanguage);
    }),

  getTranslationsByKey: protectedProcedure
    .input(translationsByKeySchema)
    .use(hasProjectAccess)
    .query(async ({ input }) => {
      const rows = await getTranslationsByKey(input);
      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }),

  deleteKeys: protectedProcedure
    .input(deleteKeysSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => deleteKeys(input)),

  updateTranslations: protectedProcedure
    .input(updateTranslationsSchema)
    .mutation(async ({ input }) => {
      const updated: Array<typeof translations.$inferSelect> = [];

      for (const translation of input.translations) {
        const [row] = await db
          .update(translations)
          .set({
            translatedText: translation.translatedText,
            overridden: translation.overridden,
            updatedAt: new Date(),
          })
          .where(eq(translations.id, translation.id))
          .returning();

        if (row) updated.push(row);
      }

      return updated;
    }),

  getOverriddenTranslations: protectedProcedure
    .input(getOverriddenTranslationsSchema)
    .use(hasProjectAccess)
    .query(async ({ input }) => getOverriddenTranslations(input)),

  deleteTranslations: protectedProcedure
    .input(deleteTranslationsSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => deleteTranslations(input)),
});
