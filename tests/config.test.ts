import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("applies the defaults when the environment is empty", () => {
    expect(loadConfig({})).toEqual({
      PORT: 3000,
      LLM_PROVIDER: "openai",
      OPENAI_MODEL: "gpt-5.4-mini",
    });
  });

  it("reads the values set in the environment", () => {
    const config = loadConfig({
      PORT: "8080",
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model",
    });

    expect(config).toMatchObject({
      PORT: 8080,
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model",
    });
  });

  it.each([
    { variable: "LLM_PROVIDER", value: "unknown-provider" },
    { variable: "PORT", value: "not-a-port" },
  ])("rejects an invalid $variable", ({ variable, value }) => {
    expect(() => loadConfig({ [variable]: value })).toThrow(variable);
  });
});
