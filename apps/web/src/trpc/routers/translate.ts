import { connectDb } from "@/db";
import {
  deleteKeys,
  deleteTranslations,
  getOverriddenTranslations,
  getProjectLocales,
  getTranslationsByKey,
  getTranslationsBySlug,
} from "@/db/queries/translate";
import { translations } from "@/db/schema";
import { UTCDate } from "@date-fns/utc";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { isOrganizationMember } from "../permissions/organization";
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
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      const data = await getTranslationsBySlug(input);

      return data.map(({ translations }) => ({
        ...translations,
        createdAt: translations.createdAt.toISOString(),
      }));
    }),

  getProjectLocales: protectedProcedure
    .input(projectLocalesSchema)
    .use(isOrganizationMember)
    .query(async ({ input }) => {
      const locales = await getProjectLocales(input);
      return locales.map(({ targetLanguage }) => targetLanguage);
    }),

  getTranslationsByKey: protectedProcedure
    .input(translationsByKeySchema)
    .use(hasProjectAccess)
    .query(async ({ input }) => {
      const translations = await getTranslationsByKey(input);

      return translations.map((translation) => ({
        ...translation,
        createdAt: translation.createdAt.toISOString(),
        updatedAt: translation.updatedAt.toISOString(),
      }));
    }),

  deleteKeys: protectedProcedure
    .input(deleteKeysSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => {
      const data = await deleteKeys(input);

      return data;
    }),

  updateTranslations: protectedProcedure
    .input(updateTranslationsSchema)
    .mutation(async ({ input }) => {
      const db = await connectDb();
      const updatedTranslations = [];

      for (const translation of input.translations) {
        const [updated] = await db
          .update(translations)
          .set({
            translatedText: translation.translatedText,
            overridden: translation.overridden,
            updatedAt: new UTCDate(),
          })
          .where(eq(translations.id, translation.id))
          .returning();

        if (updated) {
          updatedTranslations.push(updated);
        }
      }

      return updatedTranslations;
    }),

  getOverriddenTranslations: protectedProcedure
    .input(getOverriddenTranslationsSchema)
    .use(hasProjectAccess)
    .query(async ({ input }) => {
      const data = await getOverriddenTranslations(input);
      return data;
    }),

  deleteTranslations: protectedProcedure
    .input(deleteTranslationsSchema)
    .use(hasProjectAccess)
    .mutation(async ({ input }) => {
      const data = await deleteTranslations(input);
      return data;
    }),
});
