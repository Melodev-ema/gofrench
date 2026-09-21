import { z } from "zod";

const EnvironmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  LLM_PROVIDER: z.enum(["openai"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
});

export type Config = z.infer<typeof EnvironmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const validation = EnvironmentSchema.safeParse(environment);

  if (!validation.success) {
    throw new Error(`Invalid environment config:\n${z.prettifyError(validation.error)}`);
  }

  return validation.data;
}
