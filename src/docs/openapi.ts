import { z } from "zod";
import { GenerateQuizInputSchema, QuizResponseSchema } from "../quiz/quiz.schema.js";

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

function toOpenApiSchema(schema: z.ZodType, io: "input" | "output") {
  const jsonSchema = z.toJSONSchema(schema, { io });
  delete jsonSchema.$schema;
  return jsonSchema;
}

function jsonContent(schemaName: string) {
  return { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } };
}

function errorResponse(description: string) {
  return { description, content: jsonContent("ErrorResponse") };
}

export const quizRequestExample = {
  subject: "géographie mondiale",
  level: "medium",
  question_count: 3,
  language: "fr",
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "GoFrench quiz API",
    version: "1.0.0",
    description:
      "Generates multiple-choice quizzes with an LLM, validated against the quiz response schema.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/quiz": {
      post: {
        operationId: "generateQuiz",
        summary: "Generate a multiple-choice quiz",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateQuizInput" },
              example: quizRequestExample,
            },
          },
        },
        responses: {
          "200": {
            description: "Quiz generated and validated",
            content: jsonContent("QuizResponse"),
          },
          "400": errorResponse("INVALID_INPUT (with details) or INVALID_JSON"),
          "413": errorResponse("PAYLOAD_TOO_LARGE: request body larger than 10 kB"),
          "500": errorResponse("INTERNAL_ERROR: unexpected error"),
          "502": errorResponse(
            "QUIZ_GENERATION_FAILED: no valid quiz after 3 attempts, or LLM_PROVIDER_ERROR: provider failure",
          ),
        },
      },
    },
  },
  components: {
    schemas: {
      GenerateQuizInput: toOpenApiSchema(GenerateQuizInputSchema, "input"),
      QuizResponse: toOpenApiSchema(QuizResponseSchema, "output"),
      ErrorResponse: toOpenApiSchema(ErrorResponseSchema, "output"),
    },
  },
};
