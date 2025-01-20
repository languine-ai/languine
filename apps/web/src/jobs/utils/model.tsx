import { createOpenAI } from "@ai-sdk/openai";
import { calculateChunkSize } from "./chunk";

export function getModels() {
  const createRegularModel = createOpenAI({
    baseURL: process.env.AI_GATEWAY_ENDPOINT,
    apiKey: process.env.AI_API_KEY,
  });

  const createLargeModel = createOpenAI({
    baseURL: process.env.AI_GATEWAY_ENDPOINT_LARGE,
    apiKey: process.env.AI_API_KEY_LARGE,
  });

  return {
    large: createLargeModel(process.env.AI_MODEL_LARGE!),
    regular: createRegularModel(process.env.AI_MODEL!),
  };
}

const MODEL_THRESHOLD = 200;

export function chooseModel(totalItems: number) {
  const { large, regular } = getModels();

  console.log(
    `Choosing model ${totalItems > MODEL_THRESHOLD ? "large" : "regular"}`,
  );

  return totalItems > MODEL_THRESHOLD ? large : regular;
}
