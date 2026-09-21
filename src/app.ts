import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { createQuizController } from "./quiz/quiz.controller.js";
import type { QuizService } from "./quiz/quiz.service.js";

export function createApp(quizService: QuizService): express.Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));
  app.post("/quiz", createQuizController(quizService));
  app.use(errorHandler);

  return app;
}
