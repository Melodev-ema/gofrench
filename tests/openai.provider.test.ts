import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { LlmProviderError } from "../src/llm/llm.provider.js";
import { OpenAiProvider } from "../src/llm/openai.provider.js";

function responsesApiReplyWithText(text: string): Response {
  return Response.json({
    id: "response-test",
    object: "response",
    output: [
      {
        type: "message",
        id: "message-test",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
  });
}

function bodySentTo(fakeFetch: ReturnType<typeof vi.fn<typeof fetch>>): unknown {
  const requestBody = fakeFetch.mock.calls[0]?.[1]?.body;
  return typeof requestBody === "string" ? JSON.parse(requestBody) : undefined;
}

describe("OpenAiProvider", () => {
  it("sends the prompt to the Responses API in JSON mode and returns the text output", async () => {
    const fakeFetch = vi.fn<typeof fetch>();
    fakeFetch.mockResolvedValueOnce(responsesApiReplyWithText('{"questions":[]}'));
    const client = new OpenAI({ apiKey: "test-key", fetch: fakeFetch, maxRetries: 0 });

    const output = await new OpenAiProvider(client, "test-model").generate("the prompt");

    expect(output).toBe('{"questions":[]}');
    expect(fakeFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" }),
    );
    expect(bodySentTo(fakeFetch)).toMatchObject({
      model: "test-model",
      input: "the prompt",
      text: { format: { type: "json_object" } },
    });
  });

  it("turns an API error into an LlmProviderError that keeps the status but not the message", async () => {
    const fakeFetch = vi.fn<typeof fetch>();
    fakeFetch.mockResolvedValueOnce(
      Response.json(
        { error: { message: "Incorrect API key provided: sk-secret", code: "invalid_api_key" } },
        { status: 401 },
      ),
    );
    const client = new OpenAI({ apiKey: "sk-secret", fetch: fakeFetch, maxRetries: 0 });

    const generation = new OpenAiProvider(client, "test-model").generate("the prompt");

    await expect(generation).rejects.toBeInstanceOf(LlmProviderError);
    await expect(generation).rejects.toMatchObject({
      status: 401,
      message: "OpenAI request failed with status 401",
    });
  });

  it("turns a network failure into an LlmProviderError without status", async () => {
    const fakeFetch = vi.fn<typeof fetch>();
    fakeFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    const client = new OpenAI({ apiKey: "test-key", fetch: fakeFetch, maxRetries: 0 });

    const generation = new OpenAiProvider(client, "test-model").generate("the prompt");

    await expect(generation).rejects.toMatchObject({
      status: undefined,
      message: "OpenAI request failed",
    });
  });
});
