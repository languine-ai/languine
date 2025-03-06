import { createDocument, createTranslations } from "@/db/queries/translate";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { calculateChunkSize } from "../utils/chunk";
import { translateDocument, translateKeys } from "../utils/translate";

interface TranslationResult {
  key: string;
  translatedText: string;
}

const translateLocaleSchema = z.object({
  projectId: z.string(),
  organizationId: z.string(),
  apiKey: z.string(),
  sourceFormat: z.string(),
  sourceLanguage: z.string(),
  targetLocale: z.string(),
  branch: z.string().nullable().optional(),
  commit: z.string().nullable().optional(),
  sourceProvider: z.string().nullable().optional(),
  commitMessage: z.string().nullable().optional(),
  commitLink: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  content: z.array(
    z.object({
      key: z.string(),
      sourceText: z.string(),
      sourceFile: z.string(),
    }),
  ),
});

export const translateLocaleTask = schemaTask({
  id: "translate-locale",
  schema: translateLocaleSchema,
  maxDuration: 1800, // 30 minutes
  queue: {
    // Global limit for all tasks we need 40 RPS
    concurrencyLimit: 40,
  },
  retry: {
    maxAttempts: 4,
  },
  run: async (payload, { ctx }) => {
    const translations: TranslationResult[] = [];

    const chunkSize = calculateChunkSize(payload.content, {
      sourceLocale: payload.sourceLanguage,
      targetLocale: payload.targetLocale,
      sourceFormat: payload.sourceFormat,
    });

    // If the source format is markdown, we take the whole document and translate it
    if (payload.sourceFormat === "md" || payload.sourceFormat === "mdx") {
      const document = payload.content.at(0);

      if (!document?.sourceText) {
        return {
          translations: [],
          targetLocale: payload.targetLocale,
        };
      }

      const translatedContent = await translateDocument(
        document.sourceText,
        {
          sourceLocale: payload.sourceLanguage,
          targetLocale: payload.targetLocale,
          sourceFormat: payload.sourceFormat,
        },
        ctx.attempt.number,
      );

      translations.push({
        key: "content",
        translatedText: translatedContent?.at(0) ?? "",
      });

      if (document?.sourceText) {
        await createDocument({
          projectId: payload.projectId,
          organizationId: payload.organizationId,
          sourceText: document.sourceText,
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLocale,
          translatedText: translatedContent?.at(0) ?? "",
          sourceFile: document.sourceFile,
          sourceFormat: payload.sourceFormat,
          branch: payload.branch,
          commit: payload.commit,
          commitLink: payload.commitLink,
          sourceProvider: payload.sourceProvider,
          commitMessage: payload.commitMessage,
          userId: payload.userId,
        });
      }

      return {
        translations,
        targetLocale: payload.targetLocale,
      };
    }

    // Split remaining content into chunks
    const contentChunks = [];
    for (let i = 0; i < payload.content.length; i += chunkSize) {
      contentChunks.push(payload.content.slice(i, i + chunkSize));
    }

    // Process all chunks in parallel
    const chunkResults = await Promise.all(
      contentChunks.map(async (chunk, chunkIndex) => {
        let translatedContent = await translateKeys(
          chunk,
          {
            sourceLocale: payload.sourceLanguage,
            targetLocale: payload.targetLocale,
          },
          ctx.attempt.number,
        );

        // Find keys with null values and retry once with remaining keys
        const remainingKeys = chunk.filter(
          (content) => !translatedContent[chunkIndex],
        );

        if (remainingKeys.length > 0) {
          const retryTranslations = await translateKeys(
            remainingKeys,
            {
              sourceLocale: payload.sourceLanguage,
              targetLocale: payload.targetLocale,
            },
            ctx.attempt.number,
          );
          translatedContent = { ...translatedContent, ...retryTranslations };
        }

        await createTranslations({
          projectId: payload.projectId,
          organizationId: payload.organizationId,
          sourceFormat: payload.sourceFormat,
          branch: payload.branch,
          commit: payload.commit,
          sourceProvider: payload.sourceProvider,
          commitMessage: payload.commitMessage,
          commitLink: payload.commitLink,
          userId: payload.userId,
          translations: chunk.map((content, index) => ({
            translationKey: content.key,
            sourceLanguage: payload.sourceLanguage,
            targetLanguage: payload.targetLocale,
            sourceText: content.sourceText,
            sourceFile: content.sourceFile,
            translatedText: translatedContent[index],
          })),
        });

        return chunk.map((content, index) => ({
          key: content.key,
          translatedText: translatedContent[index],
        }));
      }),
    );

    // Flatten all chunk results into the translations array
    translations.push(...chunkResults.flat());

    return {
      translations,
      targetLocale: payload.targetLocale,
    };
  },
});
