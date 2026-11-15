import { ApiError, GoogleGenAI } from "@google/genai";
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";

export const GEMINI_MODEL = "gemini-3.8-flash";
// Used only when the primary model is overloaded (429/5xx after retries).
export const GEMINI_FALLBACK_MODEL = "gemini-3.6-flash";
export const GEMINI_STABLE_MODEL = "gemini-2.5-flash";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    retryOptions: {
      attempts: 4,
      initialDelay: 1,
      maxDelay: 8,
      expBase: 2,
      jitter: 1,
      httpStatusCodes: [...RETRYABLE_STATUS_CODES],
    },
  },
});

export async function generateContent(
  params: Omit<GenerateContentParameters, "model">,
): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent({
      ...params,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      !RETRYABLE_STATUS_CODES.has(error.status)
    ) {
      throw error;
    }

    console.warn(
      `[gemini] ${GEMINI_MODEL} returned ${error.status}; retrying with ${GEMINI_FALLBACK_MODEL}`,
    );
    try {
      return await ai.models.generateContent({
        ...params,
        model: GEMINI_FALLBACK_MODEL,
      });
    } catch (fallbackError) {
      if (
        !(fallbackError instanceof ApiError) ||
        !RETRYABLE_STATUS_CODES.has(fallbackError.status)
      ) {
        throw fallbackError;
      }

      console.warn(
        `[gemini] ${GEMINI_FALLBACK_MODEL} returned ${fallbackError.status}; ` +
          `retrying with ${GEMINI_STABLE_MODEL}`,
      );
      return ai.models.generateContent({
        ...params,
        model: GEMINI_STABLE_MODEL,
      });
    }
  }
}
