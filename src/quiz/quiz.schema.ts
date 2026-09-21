import { z } from "zod";
import { isKnownLanguageCode } from "./quiz.language.js";

const LevelSchema = z.enum(["easy", "medium", "hard"]);

export const GenerateQuizInputSchema = z.object({
  subject: z.string().trim().min(1),
  level: LevelSchema,
  question_count: z.number().int().min(1).max(10),
  language: z
    .string()
    .refine(isKnownLanguageCode, "Expected a known ISO 639-1 language code, such as fr or en")
    .default("fr")
    .meta({ description: "ISO 639-1 code of the quiz content language, such as fr, en or es" }),
});

const QuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_answer: z.number().min(0).max(3),
  explanation: z.string(),
});

export const QuizResponseSchema = z.object({
  subject: z.string(),
  level: LevelSchema,
  questions: z.array(QuestionSchema),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;
export type QuizResponse = z.infer<typeof QuizResponseSchema>;
