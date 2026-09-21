import type { GoogleGenAI } from "@google/genai";
import type { LlmProvider } from "./llm.provider.js";

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
  ) {}

  async generate(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    return response.text ?? "";
  }
}
