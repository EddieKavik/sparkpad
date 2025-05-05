import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey)
    throw new Error(
      "NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables"
    );
  return new GoogleGenerativeAI(apiKey);
}
