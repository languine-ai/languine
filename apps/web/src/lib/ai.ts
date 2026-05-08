import { gateway } from "@ai-sdk/gateway";

export const DEFAULT_MODEL = "openai/gpt-4.1";

export function getModel() {
  const slug = process.env.AI_MODEL || DEFAULT_MODEL;
  return gateway(slug);
}
