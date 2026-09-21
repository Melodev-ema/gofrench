import { inspect } from "node:util";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { LlmProviderError } from "../src/llm/llm.provider.js";
import { QuizResponseSchema } from "../src/quiz/quiz.schema.js";
import { QuizService } from "../src/quiz/quiz.service.js";
import { mockLlmProviderReturning, validQuiz } from "./fixtures.js";

const validRequestBody = { subject: "géographie mondiale", level: "medium", question_count: 1 };
const validOutput = JSON.stringify(validQuiz);

function appWithLlmProvider(llmProvider: ReturnType<typeof mockLlmProviderReturning>) {
  return createApp(new QuizService(llmProvider));
}

describe("POST /quiz", () => {
  it("returns 200 with a quiz that matches the response schema", async () => {
    const llmProvider = mockLlmProviderReturning(validOutput);

    const response = await request(appWithLlmProvider(llmProvider))
      .post("/quiz")
      .send(validRequestBody);

    expect(response.status).toBe(200);
    expect(QuizResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body).toEqual(validQuiz);
  });

  it("returns 400 INVALID_INPUT with details, without calling the LLM", async () => {
    const llmProvider = mockLlmProviderReturning(validOutput);

    const response = await request(appWithLlmProvider(llmProvider))
      .post("/quiz")
      .send({ sujet: "géographie mondiale", niveau: "moyen", nombre_questions: 11 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "INVALID_INPUT",
        details: [{ path: "subject" }, { path: "level" }, { path: "question_count" }],
      },
    });
    expect(llmProvider.generate).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_JSON when the body is malformed JSON", async () => {
    const response = await request(appWithLlmProvider(mockLlmProviderReturning()))
      .post("/quiz")
      .set("Content-Type", "application/json")
      .send('{ "subject": ');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: "INVALID_JSON" } });
  });

  it("returns 413 PAYLOAD_TOO_LARGE when the body exceeds 10 kB", async () => {
    const response = await request(appWithLlmProvider(mockLlmProviderReturning()))
      .post("/quiz")
      .send({ ...validRequestBody, subject: "x".repeat(20_000) });

    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
  });

  it("returns 502 QUIZ_GENERATION_FAILED after 3 invalid LLM outputs", async () => {
    const llmProvider = mockLlmProviderReturning("invalid", "invalid", "invalid");

    const response = await request(appWithLlmProvider(llmProvider))
      .post("/quiz")
      .send(validRequestBody);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "QUIZ_GENERATION_FAILED",
        message: "Unable to generate a valid quiz after 3 attempts.",
      },
    });
  });

  it("returns 502 LLM_PROVIDER_ERROR when the provider fails, and logs only provider and status", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const llmProvider = mockLlmProviderReturning();
    llmProvider.generate.mockRejectedValueOnce(new LlmProviderError("OpenAI", { status: 429 }));

    const response = await request(appWithLlmProvider(llmProvider))
      .post("/quiz")
      .send(validRequestBody);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "LLM_PROVIDER_ERROR",
        message: "The LLM provider could not generate the quiz.",
      },
    });
    expect(consoleError).toHaveBeenCalledWith("OpenAI request failed with status 429");
    consoleError.mockRestore();
  });

  it("returns 500 INTERNAL_ERROR without exposing or logging the error message", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const llmProvider = mockLlmProviderReturning();
    llmProvider.generate.mockRejectedValueOnce(new Error("Incorrect API key provided: sk-secret"));

    const response = await request(appWithLlmProvider(llmProvider))
      .post("/quiz")
      .send(validRequestBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    });
    expect(inspect(consoleError.mock.calls)).not.toContain("sk-secret");
    consoleError.mockRestore();
  });

  it("does not reveal the framework in the response headers", async () => {
    const response = await request(appWithLlmProvider(mockLlmProviderReturning(validOutput)))
      .post("/quiz")
      .send(validRequestBody);

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
