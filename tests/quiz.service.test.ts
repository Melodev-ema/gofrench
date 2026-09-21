import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../src/llm/llm.provider.js";
import { buildQuizPrompt } from "../src/quiz/quiz.prompt.js";
import { QuizResponseSchema } from "../src/quiz/quiz.schema.js";
import { QuizGenerationError, QuizService } from "../src/quiz/quiz.service.js";
import { quizInput, validQuiz } from "./fixtures.js";

const validOutput = JSON.stringify(validQuiz);

function mockLlmProviderReturning(...outputs: string[]) {
  const generate = vi.fn<LlmProvider["generate"]>();
  for (const output of outputs) {
    generate.mockResolvedValueOnce(output);
  }
  return { generate };
}

function outputWithFirstQuestionChanged(changes: Record<string, unknown>): string {
  return JSON.stringify({ ...validQuiz, questions: [{ ...validQuiz.questions[0], ...changes }] });
}

describe("QuizService.generateQuiz", () => {
  it("returns a quiz that matches the response schema", async () => {
    const llmProvider = mockLlmProviderReturning(validOutput);

    const response = await new QuizService(llmProvider).generateQuiz(quizInput);

    expect(QuizResponseSchema.safeParse(response).success).toBe(true);
    expect(response).toEqual(validQuiz);
    expect(llmProvider.generate).toHaveBeenCalledTimes(1);
  });

  it("retries with an adjusted prompt when the output is malformed", async () => {
    const llmProvider = mockLlmProviderReturning("not json {", validOutput);

    const response = await new QuizService(llmProvider).generateQuiz(quizInput);

    expect(QuizResponseSchema.safeParse(response).success).toBe(true);
    expect(llmProvider.generate).toHaveBeenCalledTimes(2);
    expect(llmProvider.generate).toHaveBeenNthCalledWith(1, buildQuizPrompt(quizInput, 1));
    expect(llmProvider.generate).toHaveBeenNthCalledWith(2, buildQuizPrompt(quizInput, 2));
  });

  it.each([
    { reason: "malformed JSON", output: '{ "subject": ' },
    { reason: "Markdown around the JSON", output: "```json\n" + validOutput + "\n```" },
    { reason: "a missing field", output: JSON.stringify({ subject: "x", level: "medium" }) },
    { reason: "a wrong type", output: outputWithFirstQuestionChanged({ correct_answer: "2" }) },
    {
      reason: "3 options instead of 4",
      output: outputWithFirstQuestionChanged({ options: ["a", "b", "c"] }),
    },
    {
      reason: "an out-of-range answer index",
      output: outputWithFirstQuestionChanged({ correct_answer: 4 }),
    },
  ])("retries when the output has $reason", async ({ output }) => {
    const llmProvider = mockLlmProviderReturning(output, validOutput);

    await new QuizService(llmProvider).generateQuiz(quizInput);

    expect(llmProvider.generate).toHaveBeenCalledTimes(2);
  });

  it("throws QuizGenerationError after 3 invalid outputs", async () => {
    const llmProvider = mockLlmProviderReturning("invalid", "invalid", "invalid", validOutput);

    const quizGeneration = new QuizService(llmProvider).generateQuiz(quizInput);

    await expect(quizGeneration).rejects.toBeInstanceOf(QuizGenerationError);
    await expect(quizGeneration).rejects.toThrow(
      "Unable to generate a valid quiz after 3 attempts.",
    );
    expect(llmProvider.generate).toHaveBeenCalledTimes(3);
  });
});
