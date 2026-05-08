import type { projects } from "../../db/schema";
import { getLanguageName } from "./locale";
import type { PromptOptions } from "./types";

const baseRequirements = `
Translation Requirements:
- Maintain exact file structure, indentation, and formatting
- Provide natural, culturally-adapted translations that sound native
- Keep all technical identifiers unchanged
- Keep consistent capitalization, spacing, and line breaks
- Respect existing whitespace and newline patterns
- Never change the order of the content
`;

const mapFormatToPrompt = (format?: string) => {
  switch (format) {
    case "md":
      return "Markdown";
    default:
      return "JSON";
  }
};

const fileSpecificInstructions = (format?: string) => {
  switch (format) {
    case "md":
      return `
Markdown Specific Instructions:
- Preserve all Markdown formatting and syntax
- Keep code blocks, links, and other Markdown elements intact
- Maintain heading levels and list structures

Here is one example of a markdown file with code blocks to keep:
\`\`\`js
console.log('Hello World');
\`\`\`
`;
    default:
      return "";
  }
};

export function createFinalPrompt(
  content: Array<{ key: string; sourceText: string }>,
  options: PromptOptions,
  settings: Partial<typeof projects.$inferSelect> = {
    formality: "neutral",
    toneOfVoice: "professional",
    emotiveIntent: "neutral",
    brandName: null,
    brandVoice: null,
    lengthControl: "exact",
    domainExpertise: "general",
    terminology: null,
    translationMemory: true,
    qualityChecks: true,
    contextDetection: true,
    inclusiveLanguage: true,
    idioms: true,
  },
) {
  const basePrompt = `You are a professional translator working with ${mapFormatToPrompt(options.sourceFormat)} files.

Task: Translate the content below from ${getLanguageName(options.sourceLocale)} (${options.sourceLocale}) to ${getLanguageName(options.targetLocale)} (${options.targetLocale}).

${baseRequirements}
${fileSpecificInstructions(options.sourceFormat)}`;

  const tuningInstructions = [
    // Style and tone settings
    settings.formality && `- Use ${settings.formality} language style`,
    settings.toneOfVoice &&
      `- Maintain a ${settings.toneOfVoice} tone of voice`,
    settings.emotiveIntent &&
      `- Convey a ${settings.emotiveIntent} emotional tone`,

    // Brand-specific settings
    settings.brandName &&
      `- Use "${settings.brandName}" consistently for brand references`,
    settings.brandVoice &&
      `- Follow brand voice guidelines: ${settings.brandVoice}`,

    // Technical settings
    settings.lengthControl &&
      `- Apply ${settings.lengthControl} length control`,
    settings.domainExpertise &&
      `- Use terminology appropriate for ${settings.domainExpertise} domain`,
    settings.terminology &&
      `- Follow specific terminology: ${settings.terminology}`,

    // Feature flags
    settings.translationMemory &&
      "- Maintain consistency with previous translations",
    settings.qualityChecks &&
      "- Ensure high-quality output with proper grammar and spelling",
    settings.contextDetection &&
      "- Consider surrounding context for accurate translations",
    settings.inclusiveLanguage &&
      "- Use inclusive and non-discriminatory language",
    settings.idioms && "- Adapt idioms appropriately for target culture",
  ]
    .filter(Boolean)
    .join("\n");

  return `${basePrompt}${
    tuningInstructions
      ? `\nAdditional Requirements:\n${tuningInstructions}`
      : ""
  }\nContent:\n${JSON.stringify(
    content.map(({ sourceText }) => sourceText),
    null,
    2,
  )}`;
}
