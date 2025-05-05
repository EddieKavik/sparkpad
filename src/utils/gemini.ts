import { GoogleGenerativeAI } from "@google/genai";

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment variables");
  return new GoogleGenerativeAI(apiKey);
} 