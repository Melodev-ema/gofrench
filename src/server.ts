import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createLlmProvider } from "./llm/llm.factory.js";
import { QuizService } from "./quiz/quiz.service.js";

function startServer(): void {
  const config = loadConfig();
  const app = createApp(new QuizService(createLlmProvider(config)));

  app.listen(config.PORT, () => {
    console.log(
      `Quiz API listening on port ${config.PORT} with the ${config.LLM_PROVIDER} provider`,
    );
  });
}

try {
  startServer();
} catch (startupError) {
  console.error(startupError instanceof Error ? startupError.message : startupError);
  process.exitCode = 1;
}
