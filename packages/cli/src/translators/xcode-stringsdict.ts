import { generateObject } from "ai";
import dedent from "dedent";
import plist, { type PlistValue } from "plist";
import { z } from "zod";
import { debug } from "../debug.js";
import { baseRequirements, createBasePrompt } from "../prompt.js";
import type { PromptOptions, Translator } from "../types.js";

const EMPTY_STRINGSDICT = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0">',
  "<dict/>",
  "</plist>",
].join("\n");

function parseStringsdictFile(fileContent: string) {
  debug("Parsing stringsdict file");
  try {
    const parsedData = plist.parse(fileContent || EMPTY_STRINGSDICT);

    if (typeof parsedData !== "object" || parsedData === null) {
      throw new Error("Invalid .stringsdict format");
    }
    debug("Successfully parsed stringsdict file");
    return parsedData as Record<string, PlistValue>;
  } catch (error: unknown) {
    throw new Error(`Invalid .stringsdict format: ${(error as Error).message}`);
  }
}

function buildStringsdictContent(translationData: Record<string, PlistValue>) {
  debug("Building stringsdict content");
  const content = plist.build(translationData);
  debug("Successfully built stringsdict content");
  return content;
}

export const xcodeStringsdict: Translator = {
  async onUpdate(options) {
    debug("Running stringsdict translator onUpdate");
    const currentTranslations = parseStringsdictFile(options.content);
    const oldTranslations = parseStringsdictFile(options.previousContent);

    const modifiedKeys = Object.keys(currentTranslations).filter((key) => {
      if (!(key in oldTranslations)) return true;
      return (
        JSON.stringify(oldTranslations[key]) !==
        JSON.stringify(currentTranslations[key])
      );
    });

    debug(`Found ${modifiedKeys.length} modified keys`);

    if (modifiedKeys.length === 0) {
      debug("No new keys to translate");
      return {
        summary: "No new keys to translate",
        content: options.previousTranslation,
      };
    }

    const pendingTranslations = Object.fromEntries(
      modifiedKeys.map((key) => [key, currentTranslations[key]]),
    );

    debug("Generating translations for modified keys");
    const { object } = await generateObject({
      model: options.model,
      temperature: options.config.llm?.temperature ?? 0,
      prompt: getPrompt(JSON.stringify(pendingTranslations, null, 2), options),
      mode: "json",
      schema: z.object({
        items: z.record(z.string(), z.unknown()).describe("Translated strings"),
      }),
    });
    debug("Successfully generated translations");

    const existingTranslations = parseStringsdictFile(
      options.previousTranslation,
    );

    return {
      summary: `Translated ${modifiedKeys.length} new keys`,
      content: buildStringsdictContent({
        ...existingTranslations,
        ...(object.items as Record<string, PlistValue>),
      }),
    };
  },

  async onNew(options) {
    debug("Running stringsdict translator onNew");
    const sourceTranslations = parseStringsdictFile(options.content);

    debug("Generating translations for new file");
    const { object } = await generateObject({
      model: options.model,
      prompt: getPrompt(JSON.stringify(sourceTranslations, null, 2), options),
      temperature: options.config.llm?.temperature ?? 0,
      mode: "json",
      schema: z.object({
        items: z.record(z.string(), z.unknown()).describe("Translated strings"),
      }),
    });
    debug("Successfully generated translations");

    return {
      content: buildStringsdictContent(
        object.items as Record<string, PlistValue>,
      ),
    };
  },
};

function getPrompt(translationInput: string, options: PromptOptions) {
  debug("Creating prompt for stringsdict translation");
  const promptRequirements = dedent`
    ${baseRequirements}
    - Preserve all key names exactly as they appear
    - Only translate the values, not the keys
    - Return translations as a JSON object matching the original structure
    - Maintain all format specifiers like %@, %d, %lld, %1$@, etc. in the exact same order
    - Preserve any HTML tags or special formatting in the strings
    - Preserve all plural rules and NSStringFormatSpecTypeKey/NSStringFormatValueTypeKey values
    - Return the translations in the form of a JSON object specified in the schema
  `;

  return createBasePrompt(
    `${promptRequirements}\n${translationInput}`,
    options,
  );
}
