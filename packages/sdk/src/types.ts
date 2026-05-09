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
  "js",
  "ts",
  "po",
  "xliff",
  "csv",
  "xml",
  "arb",
] as const;

export type Format = (typeof FORMAT_ENUM)[number];

export interface TranslateParams {
  projectId: string;
  sourceLocale: string;
  targetLocale: string;
  format?: Format;
  sourceText: string;
}

export interface TranslateResponse {
  success: boolean;
  translatedText: string;
}
