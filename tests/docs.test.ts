import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { quizRequestExample } from "../src/docs/openapi.js";
import { GenerateQuizInputSchema } from "../src/quiz/quiz.schema.js";
import { QuizService } from "../src/quiz/quiz.service.js";
import { mockLlmProviderReturning } from "./fixtures.js";

const app = createApp(new QuizService(mockLlmProviderReturning()));

describe("API documentation", () => {
  it("serves the OpenAPI document generated from the Zod schemas", async () => {
    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      openapi: "3.1.0",
      paths: { "/quiz": { post: { responses: { 200: {}, 400: {}, 413: {}, 500: {}, 502: {} } } } },
      components: {
        schemas: {
          GenerateQuizInput: { required: ["subject", "level", "question_count"] },
          QuizResponse: { required: ["subject", "level", "questions"] },
        },
      },
    });
  });

  it("documents a request example that the input schema accepts", () => {
    expect(GenerateQuizInputSchema.safeParse(quizRequestExample).success).toBe(true);
  });

  it("serves Swagger UI pointing at the OpenAPI document", async () => {
    const response = await request(app).get("/docs");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain('url: "/openapi.json"');
  });
});
