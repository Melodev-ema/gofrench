import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { createLlmProvider } from "../src/llm/llm.factory.js";
import { OpenAiProvider } from "../src/llm/openai.provider.js";

describe("createLlmProvider", () => {
  it("creates the OpenAI provider when LLM_PROVIDER is openai", () => {
    const config = loadConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" });

    expect(createLlmProvider(config)).toBeInstanceOf(OpenAiProvider);
  });

  it.each([undefined, ""])("refuses to start when the OpenAI API key is %j", (apiKey) => {
    const config = loadConfig({ LLM_PROVIDER: "openai", OPENAI_API_KEY: apiKey });

    expect(() => createLlmProvider(config)).toThrow("OPENAI_API_KEY is required");
  });
});
