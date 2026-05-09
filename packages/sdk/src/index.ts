import type { TranslateParams, TranslateResponse } from "./types.js";

export * from "./types.js";

export interface LanguineOptions {
  apiKey: string;
  baseUrl: string;
}

export class Languine {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: LanguineOptions) {
    const { apiKey, baseUrl } = options;
    if (!apiKey) {
      throw new Error("apiKey is required");
    }
    if (!baseUrl) {
      throw new Error(
        "baseUrl is required. Pass the URL of your self-hosted Languine deployment.",
      );
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));

      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async translate(params: TranslateParams): Promise<TranslateResponse> {
    return this.request<TranslateResponse>("/api/translate", {
      method: "POST",
      body: JSON.stringify({
        projectId: params.projectId,
        sourceLocale: params.sourceLocale,
        targetLocale: params.targetLocale,
        format: params.format || "string",
        sourceText: params.sourceText,
      }),
    });
  }
}
