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

      // Handle potential translation failure with retry
      let translatedText = translatedContent?.[0];

      if (!translatedText) {
        console.log("Initial markdown translation failed, attempting retry...");
        const retryContent = await translateDocument(
          document.sourceText,
          {
            sourceLocale: payload.sourceLanguage,
            targetLocale: payload.targetLocale,
            sourceFormat: payload.sourceFormat,
          },
          ctx.attempt.number,
        );

        translatedText = retryContent?.[0];

        if (!translatedText) {
          console.error("Markdown translation failed after retry:", {
            sourceFile: document.sourceFile,
            sourceLanguage: payload.sourceLanguage,
            targetLocale: payload.targetLocale,
          });
          return {
            translations: [],
            targetLocale: payload.targetLocale,
          };
        }
      }

      translations.push({
        key: "content",
        translatedText,
      });

      if (document?.sourceText) {
        await createDocument({
          projectId: payload.projectId,
          organizationId: payload.organizationId,
          sourceText: document.sourceText,
          sourceLanguage: payload.sourceLanguage,
          targetLanguage: payload.targetLocale,
          translatedText,
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
        const translatedContent = await translateKeys(
          chunk,
          {
            sourceLocale: payload.sourceLanguage,
            targetLocale: payload.targetLocale,
          },
          ctx.attempt.number,
        );

        console.log("Initial translation results:", translatedContent);

        // Find indices with null values and retry once with remaining keys
        const nullIndices = chunk
          .map((_, index) => ({ index, content: chunk[index] }))
          .filter(({ index }) => !translatedContent[index]);

        console.log("Indices with null translations:", nullIndices);

        if (nullIndices.length > 0) {
          const remainingKeys = nullIndices.map(({ content }) => content);
          const retryTranslations = await translateKeys(
            remainingKeys,
            {
              sourceLocale: payload.sourceLanguage,
              targetLocale: payload.targetLocale,
            },
            ctx.attempt.number,
          );
          console.log("Retry translation results:", retryTranslations);

          // Update the null translations with retry results
          nullIndices.forEach(({ index }, retryIndex) => {
            translatedContent[index] = retryTranslations[retryIndex];
          });
        }

        // Validate that all translations are present
        const missingTranslations = chunk
          .map((_, index) => ({ index, content: chunk[index] }))
          .filter(({ index }) => !translatedContent[index]);

        if (missingTranslations.length > 0) {
          console.error(
            "Some translations are still missing after retry:",
            missingTranslations,
          );
        }

        console.log("Final translation results:", translatedContent);

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
