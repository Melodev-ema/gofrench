import type { ErrorRequestHandler } from "express";
import { LlmProviderError } from "../llm/llm.provider.js";
import { QuizGenerationError } from "../quiz/quiz.service.js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const httpError = toHttpError(error);

  response.status(httpError.status).json({
    error: {
      code: httpError.code,
      message: httpError.message,
      ...(httpError.details === undefined ? {} : { details: httpError.details }),
    },
  });
};

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof QuizGenerationError) {
    return new HttpError(502, "QUIZ_GENERATION_FAILED", error.message);
  }

  if (error instanceof LlmProviderError) {
    console.error(error.message);
    return new HttpError(
      502,
      "LLM_PROVIDER_ERROR",
      "The LLM provider could not generate the quiz.",
    );
  }

  if (isBodyParserError(error, "entity.parse.failed")) {
    return new HttpError(400, "INVALID_JSON", "Request body is not valid JSON.");
  }

  if (isBodyParserError(error, "entity.too.large")) {
    return new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  logUnexpectedErrorWithoutItsMessage(error);
  return new HttpError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}

function isBodyParserError(error: unknown, type: string): boolean {
  return error instanceof Error && "type" in error && error.type === type;
}

function logUnexpectedErrorWithoutItsMessage(error: unknown): void {
  const errorName = error instanceof Error ? error.name : typeof error;
  console.error(`Unexpected error: ${errorName}`);
}
