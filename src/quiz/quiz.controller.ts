import type { RequestHandler } from "express";
import { HttpError } from "../middleware/error-handler.js";
import { GenerateQuizInputSchema } from "./quiz.schema.js";
import type { QuizService } from "./quiz.service.js";

export function createQuizController(quizService: QuizService): RequestHandler {
  return async (request, response) => {
    const validation = GenerateQuizInputSchema.safeParse(request.body);

    if (!validation.success) {
      throw new HttpError(
        400,
        "INVALID_INPUT",
        "Invalid request body.",
        validation.error.issues.map((issue) => ({
          path: issue.path.map(String).join("."),
          message: issue.message,
        })),
      );
    }

    response.json(await quizService.generateQuiz(validation.data));
  };
}
