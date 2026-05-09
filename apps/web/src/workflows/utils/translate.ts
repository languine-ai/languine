import { getModel } from "../../lib/ai";
import { generateObject } from "ai";
import { z } from "zod";
import { createFinalPrompt } from "./prompt";
import type { PromptOptions } from "./types";

const MAX_OUTPUT_TOKENS = 8000;

export async function translateKeys(
  content: Array<{ key: string; sourceText: string }>,
  options: PromptOptions,
) {
  const prompt = createFinalPrompt(content, options);

  const { object } = await generateObject({
    model: getModel(),
    prompt,
    temperature: 0.2,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    schema: z.object({
      translatedKeys: z
        .array(z.string().describe("The original key from the source content"))
        .describe("The translated content"),
    }),
  });

  return object.translatedKeys;
}

export async function translateDocument(
  content: string,
  options: PromptOptions,
) {
  const prompt = createFinalPrompt(
    [{ key: "content", sourceText: content }],
    options,
  );

  const { object } = await generateObject({
    model: getModel(),
    prompt,
    temperature: 0.2,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    schema: z.object({
      translatedKeys: z
        .array(z.string().describe("The original key from the source content"))
        .describe("The translated content"),
    }),
  });

  return object.translatedKeys;
}
