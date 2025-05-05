import { getGeminiClient } from "./gemini";

async function testGemini() {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("the first book of the Bible");
    const text = await result.response.text();
    console.log("Gemini test result:", text);
  } catch (err) {
    console.error("Gemini test error:", err);
  }
}

testGemini();
