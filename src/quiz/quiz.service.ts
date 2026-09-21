import type { LlmProvider } from "../llm/llm.provider.js";
import { buildQuizPrompt } from "./quiz.prompt.js";
import { type GenerateQuizInput, type QuizResponse, QuizResponseSchema } from "./quiz.schema.js";

const MAXIMUM_ATTEMPTS = 3;

export class QuizGenerationError extends Error {
  constructor() {
    super(`Unable to generate a valid quiz after ${MAXIMUM_ATTEMPTS} attempts.`);
    this.name = "QuizGenerationError";
  }
}

export class QuizService {
  constructor(private readonly llmProvider: LlmProvider) {}

  async generateQuiz(input: GenerateQuizInput): Promise<QuizResponse> {
    for (let attempt = 1; attempt <= MAXIMUM_ATTEMPTS; attempt++) {
      const rawOutput = await this.llmProvider.generate(buildQuizPrompt(input, attempt));
      const quiz = parseAndValidateQuiz(rawOutput);

      if (quiz) {
        return quiz;
      }
    }

    throw new QuizGenerationError();
  }
}

function parseAndValidateQuiz(rawOutput: string): QuizResponse | undefined {
  let parsedOutput: unknown;

  try {
    parsedOutput = JSON.parse(rawOutput);
  } catch {
    return undefined;
  }

  const validation = QuizResponseSchema.safeParse(parsedOutput);
  return validation.success ? validation.data : undefined;
}
