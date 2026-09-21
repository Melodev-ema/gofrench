import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { Config } from "../config.js";
import { GeminiProvider } from "./gemini.provider.js";
import type { LlmProvider } from "./llm.provider.js";
import { OpenAiProvider } from "./openai.provider.js";

export function createLlmProvider(config: Config): LlmProvider {
  switch (config.LLM_PROVIDER) {
    case "openai":
      return new OpenAiProvider(
        new OpenAI({
          apiKey: requireApiKey("OPENAI_API_KEY", config.OPENAI_API_KEY),
          maxRetries: 0,
        }),
        config.OPENAI_MODEL,
      );
    case "gemini":
      return new GeminiProvider(
        new GoogleGenAI({ apiKey: requireApiKey("GEMINI_API_KEY", config.GEMINI_API_KEY) }),
        config.GEMINI_MODEL,
      );
  }
}

function requireApiKey(variableName: string, apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error(`${variableName} is required: set it in the .env file.`);
  }

  return apiKey;
}
