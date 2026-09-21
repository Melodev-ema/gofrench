export interface LlmProvider {
  generate(prompt: string): Promise<string>;
}

export class LlmProviderError extends Error {
  readonly status: number | undefined;

  constructor(
    readonly provider: string,
    sdkError: unknown,
  ) {
    const status = httpStatusOf(sdkError);
    super(
      status === undefined
        ? `${provider} request failed`
        : `${provider} request failed with status ${status}`,
    );
    this.name = "LlmProviderError";
    this.status = status;
  }
}

function httpStatusOf(sdkError: unknown): number | undefined {
  if (typeof sdkError === "object" && sdkError !== null && "status" in sdkError) {
    return typeof sdkError.status === "number" ? sdkError.status : undefined;
  }

  return undefined;
}
