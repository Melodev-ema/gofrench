import { GoogleGenAI } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "../src/llm/gemini.provider.js";

function generateContentReplyWithParts(parts: { text: string }[]): Response {
  return Response.json({ candidates: [{ content: { role: "model", parts } }] });
}

function bodySentTo(fakeFetch: ReturnType<typeof vi.fn<typeof fetch>>): unknown {
  const requestBody = fakeFetch.mock.calls[0]?.[1]?.body;
  return typeof requestBody === "string" ? JSON.parse(requestBody) : undefined;
}

function geminiClientUsing(fakeFetch: typeof fetch): GoogleGenAI {
  return new GoogleGenAI({ apiKey: "test-key", httpOptions: { fetch: fakeFetch } });
}

describe("GeminiProvider", () => {
  it("sends the prompt to generateContent in JSON mode and returns the text output", async () => {
    const fakeFetch = vi.fn<typeof fetch>();
    fakeFetch.mockResolvedValueOnce(generateContentReplyWithParts([{ text: '{"questions":[]}' }]));

    const output = await new GeminiProvider(geminiClientUsing(fakeFetch), "test-model").generate(
      "the prompt",
    );

    expect(output).toBe('{"questions":[]}');
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent",
      expect.objectContaining({ method: "POST" }),
    );
    expect(bodySentTo(fakeFetch)).toMatchObject({
      contents: [{ parts: [{ text: "the prompt" }] }],
      generationConfig: { responseMimeType: "application/json" },
    });
  });

  it("returns an empty text when the reply has no text, so the quiz service retries", async () => {
    const fakeFetch = vi.fn<typeof fetch>();
    fakeFetch.mockResolvedValueOnce(generateContentReplyWithParts([]));

    const output = await new GeminiProvider(geminiClientUsing(fakeFetch), "test-model").generate(
      "the prompt",
    );

    expect(output).toBe("");
  });
});
