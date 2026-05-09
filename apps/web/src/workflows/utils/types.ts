import type { projects } from "../../db/schema";

export type PromptOptions = {
  sourceLocale: string;
  targetLocale: string;
  sourceFormat?: string;
  settings?: Partial<typeof projects.$inferSelect>;
};
