import { getWritable } from "workflow";
import {
  type ProgressEvent,
  type TranslateLocaleInput,
  translateLocale,
} from "./translate-locale";

export type TranslateProjectInput = {
  projectId: string;
  sourceFormat: string;
  sourceLanguage: string;
  targetLanguages: string[];
  branch?: string | null;
  commit?: string | null;
  sourceProvider?: string | null;
  commitMessage?: string | null;
  commitLink?: string | null;
  content: Array<{ key: string; sourceText: string; sourceFile: string }>;
};

export type TranslateProjectOutput = {
  translations: Record<
    string,
    Array<{ key: string; translatedText: string }>
  >;
};

async function closeProgressStream() {
  "use step";
  await getWritable<ProgressEvent>().close();
}

export async function translateProject(
  input: TranslateProjectInput,
): Promise<TranslateProjectOutput> {
  "use workflow";

  const localeInputs: TranslateLocaleInput[] = input.targetLanguages.map(
    (targetLocale) => ({
      projectId: input.projectId,
      sourceFormat: input.sourceFormat,
      sourceLanguage: input.sourceLanguage,
      targetLocale,
      branch: input.branch,
      commit: input.commit,
      sourceProvider: input.sourceProvider,
      commitMessage: input.commitMessage,
      commitLink: input.commitLink,
      content: input.content,
    }),
  );

  const results = await Promise.all(localeInputs.map(translateLocale));

  const translations: TranslateProjectOutput["translations"] = {};
  for (const result of results) {
    translations[result.targetLocale] = result.translations;
  }

  await closeProgressStream();

  return { translations };
}
