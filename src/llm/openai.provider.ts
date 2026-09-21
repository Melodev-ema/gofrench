import type OpenAI from "openai";
import { type LlmProvider, LlmProviderError } from "./llm.provider.js";

export class OpenAiProvider implements LlmProvider {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: prompt,
        text: { format: { type: "json_object" } },
      });

      return response.output_text;
    } catch (sdkError) {
      throw new LlmProviderError("OpenAI", sdkError);
    }
  }
}
