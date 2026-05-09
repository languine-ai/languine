import { estimateTokensForContent } from "./tokeniser";
import type { PromptOptions } from "./types";

export function calculateChunkSize(
  content: Array<{ key: string; sourceText: string }>,
  options?: PromptOptions,
) {
  const MAX_INPUT_TOKENS = 128000;
  const MAX_OUTPUT_TOKENS = 16000;
  const MIN_CHUNK_SIZE = 1;
  const MAX_CHUNK_SIZE = 100;

  if (content.length === 0) {
    return MIN_CHUNK_SIZE;
  }

  const estimatedTokens = estimateTokensForContent(content, options);

  // Calculate how many items we can fit in a chunk based on input token limit
  // Account for both input and output token limits
  const itemsPerChunk = Math.min(
    MAX_CHUNK_SIZE,
    Math.max(
      MIN_CHUNK_SIZE,
      Math.floor(
        ((MAX_INPUT_TOKENS - MAX_OUTPUT_TOKENS) / estimatedTokens) *
          content.length,
      ),
    ),
  );

  return itemsPerChunk;
}
