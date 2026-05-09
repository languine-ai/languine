import { z } from "zod";

export const FORMAT_ENUM = [
  "string",
  "json",
  "yaml",
  "properties",
  "android",
  "xcode-strings",
  "xcode-stringsdict",
  "xcode-xcstrings",
  "md",
  "mdx",
  "html",
  "ftl",
  "js",
  "ts",
  "php",
  "po",
  "xliff",
  "csv",
  "xml",
  "arb",
] as const;

export const translateRequestSchema = z.object({
  projectId: z.string(),
  sourceLocale: z.string(),
  targetLocale: z.string(),
  format: z.enum(FORMAT_ENUM).optional().default("string"),
  sourceText: z.string(),
});

export type TranslateRequest = z.infer<typeof translateRequestSchema>;

export const getValidationErrorMessage = (error: z.ZodError): string => {
  const issues = error.issues.map((issue) => {
    const field = issue.path.join(".");
    return `${field || "request"}: ${issue.message}`;
  });
  return issues[0] || "Invalid request format";
};
