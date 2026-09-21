import OpenAI from "openai";
import type { Config } from "../config.js";
import type { LlmProvider } from "./llm.provider.js";
import { OpenAiProvider } from "./openai.provider.js";

export function createLlmProvider(config: Config): LlmProvider {
  return new OpenAiProvider(
    new OpenAI({
      apiKey: requireApiKey("OPENAI_API_KEY", config.OPENAI_API_KEY),
      maxRetries: 0,
    }),
    config.OPENAI_MODEL,
  );
}

function requireApiKey(variableName: string, apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error(`${variableName} is required: set it in the .env file.`);
  }

  return apiKey;
}
