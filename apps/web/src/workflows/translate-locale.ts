import { createDocument, createTranslations } from "../db/queries/translate";
import { getWritable } from "workflow";
import { calculateChunkSize } from "./utils/chunk";
import { translateDocument, translateKeys } from "./utils/translate";

export type ProgressEvent =
  | { type: "started"; targetLocale: string; total: number }
  | {
      type: "progress";
      targetLocale: string;
      done: number;
      total: number;
    }
  | {
      type: "completed";
      targetLocale: string;
      translations: Array<{ key: string; translatedText: string }>;
    }
  | { type: "error"; targetLocale: string; message: string };

export type TranslateLocaleInput = {
  projectId: string;
  sourceFormat: string;
  sourceLanguage: string;
  targetLocale: string;
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
  content: Array<{ key: string; sourceText: string; sourceFile: string }>;
};

export type TranslateLocaleResult = {
  targetLocale: string;
  translations: Array<{ key: string; translatedText: string }>;
};

async function emit(event: ProgressEvent) {
  "use step";
  const writable = getWritable<ProgressEvent>();
  const writer = writable.getWriter();
  try {
    await writer.write(event);
  } finally {
    writer.releaseLock();
  }
}

async function translateChunkStep(
  chunk: Array<{ key: string; sourceText: string; sourceFile: string }>,
  options: {
    sourceLocale: string;
    targetLocale: string;
    sourceFormat: string;
  },
): Promise<Array<{ key: string; translatedText: string }>> {
  "use step";

  const translatedContent = await translateKeys(chunk, options);

  return chunk.map((item, index) => ({
    key: item.key,
    translatedText: translatedContent[index] ?? "",
  }));
}

async function persistChunkStep(input: {
  projectId: string;
  sourceFormat: string;
  sourceLanguage: string;
  targetLocale: string;
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
  chunk: Array<{ key: string; sourceText: string; sourceFile: string }>;
  translated: Array<{ key: string; translatedText: string }>;
}): Promise<void> {
  "use step";

  await createTranslations({
    projectId: input.projectId,
    sourceFormat: input.sourceFormat,
    branch: input.branch,
    commit: input.commit,
    sourceProvider: input.sourceProvider,
    commitMessage: input.commitMessage,
    commitLink: input.commitLink,
    translations: input.chunk.map((content, index) => ({
      translationKey: content.key,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLocale,
      sourceText: content.sourceText,
      sourceFile: content.sourceFile,
      translatedText: input.translated[index]?.translatedText ?? "",
    })),
  });
}

async function translateAndPersistDocumentStep(input: {
  projectId: string;
  sourceFormat: string;
  sourceLanguage: string;
  targetLocale: string;
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
  document: { key: string; sourceText: string; sourceFile: string };
}): Promise<{ key: string; translatedText: string } | null> {
  "use step";

  const result = await translateDocument(input.document.sourceText, {
    sourceLocale: input.sourceLanguage,
    targetLocale: input.targetLocale,
    sourceFormat: input.sourceFormat,
  });

  const translatedText = result?.[0];
  if (!translatedText) return null;

  await createDocument({
    projectId: input.projectId,
    sourceText: input.document.sourceText,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLocale,
    translatedText,
    sourceFile: input.document.sourceFile,
    sourceFormat: input.sourceFormat,
    branch: input.branch,
    commit: input.commit,
    commitLink: input.commitLink,
    sourceProvider: input.sourceProvider,
    commitMessage: input.commitMessage,
  });

  return { key: "content", translatedText };
}

export async function translateLocale(
  input: TranslateLocaleInput,
): Promise<TranslateLocaleResult> {
  "use workflow";

  await emit({
    type: "started",
    targetLocale: input.targetLocale,
    total: input.content.length,
  });

  if (
    (input.sourceFormat === "md" || input.sourceFormat === "mdx") &&
    input.content.length > 0
  ) {
    const document = input.content[0];

    const result = await translateAndPersistDocumentStep({
      projectId: input.projectId,
      sourceFormat: input.sourceFormat,
      sourceLanguage: input.sourceLanguage,
      targetLocale: input.targetLocale,
      branch: input.branch,
      commit: input.commit,
      sourceProvider: input.sourceProvider,
      commitMessage: input.commitMessage,
      commitLink: input.commitLink,
      document,
    });

    const translations = result ? [result] : [];

    await emit({
      type: "completed",
      targetLocale: input.targetLocale,
      translations,
    });

    return { targetLocale: input.targetLocale, translations };
  }

  const chunkSize = calculateChunkSize(input.content, {
    sourceLocale: input.sourceLanguage,
    targetLocale: input.targetLocale,
    sourceFormat: input.sourceFormat,
  });

  const chunks: Array<typeof input.content> = [];
  for (let i = 0; i < input.content.length; i += chunkSize) {
    chunks.push(input.content.slice(i, i + chunkSize));
  }

  const translations: Array<{ key: string; translatedText: string }> = [];
  let done = 0;

  for (const chunk of chunks) {
    const translated = await translateChunkStep(chunk, {
      sourceLocale: input.sourceLanguage,
      targetLocale: input.targetLocale,
      sourceFormat: input.sourceFormat,
    });

    await persistChunkStep({
      projectId: input.projectId,
      sourceFormat: input.sourceFormat,
      sourceLanguage: input.sourceLanguage,
      targetLocale: input.targetLocale,
      branch: input.branch,
      commit: input.commit,
      sourceProvider: input.sourceProvider,
      commitMessage: input.commitMessage,
      commitLink: input.commitLink,
      chunk,
      translated,
    });

    translations.push(...translated);
    done += chunk.length;

    await emit({
      type: "progress",
      targetLocale: input.targetLocale,
      done,
      total: input.content.length,
    });
  }

  await emit({
    type: "completed",
    targetLocale: input.targetLocale,
    translations,
  });

  return { targetLocale: input.targetLocale, translations };
}
