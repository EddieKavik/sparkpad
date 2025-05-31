import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Environment variables available:', process.env);
    throw new Error(
      "NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables. Please check your .env.local file is in the correct location and contains the correct variable."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}
