import type { GoogleGenAI } from "@google/genai";
import { type LlmProvider, LlmProviderError } from "./llm.provider.js";

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
  ) {}

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      return response.text ?? "";
    } catch (sdkError) {
      throw new LlmProviderError("Gemini", sdkError);
    }
  }
}
