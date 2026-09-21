import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { GeminiProvider } from "../src/llm/gemini.provider.js";
import { createLlmProvider } from "../src/llm/llm.factory.js";
import { OpenAiProvider } from "../src/llm/openai.provider.js";

describe("createLlmProvider", () => {
  it("creates the OpenAI provider when LLM_PROVIDER is openai", () => {
    const config = loadConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" });

    expect(createLlmProvider(config)).toBeInstanceOf(OpenAiProvider);
  });

  it("creates the Gemini provider when LLM_PROVIDER is gemini", () => {
    const config = loadConfig({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "test-key" });

    expect(createLlmProvider(config)).toBeInstanceOf(GeminiProvider);
  });

  it.each([
    { provider: "openai", apiKeyVariable: "OPENAI_API_KEY", apiKey: undefined },
    { provider: "openai", apiKeyVariable: "OPENAI_API_KEY", apiKey: "" },
    { provider: "gemini", apiKeyVariable: "GEMINI_API_KEY", apiKey: undefined },
    { provider: "gemini", apiKeyVariable: "GEMINI_API_KEY", apiKey: "" },
  ])(
    "refuses to start with $provider when $apiKeyVariable is $apiKey",
    ({ provider, apiKeyVariable, apiKey }) => {
      const config = loadConfig({ LLM_PROVIDER: provider, [apiKeyVariable]: apiKey });

      expect(() => createLlmProvider(config)).toThrow(`${apiKeyVariable} is required`);
    },
  );
});
