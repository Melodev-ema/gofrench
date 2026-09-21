import type { GenerateQuizInput, QuizResponse } from "../src/quiz/quiz.schema.js";

export const quizInput: GenerateQuizInput = {
  subject: "géographie mondiale",
  level: "medium",
  question_count: 1,
};

export const validQuiz: QuizResponse = {
  subject: "géographie mondiale",
  level: "medium",
  questions: [
    {
      question: "Quelle est la capitale de l'Australie ?",
      options: ["Sydney", "Melbourne", "Canberra", "Perth"],
      correct_answer: 2,
      explanation: "Canberra a été choisie comme capitale pour départager Sydney et Melbourne.",
    },
  ],
};
