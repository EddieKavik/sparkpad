const GenAI = require("@google/genai");

console.log("Exported keys from @google/genai:", Object.keys(GenAI));
console.log("GoogleGenAI:", GenAI.GoogleGenAI);
console.log("Type of GoogleGenAI:", typeof GenAI.GoogleGenAI);

if (GenAI.GoogleGenAI) {
  const instance = new GenAI.GoogleGenAI({ apiKey: "dummy" });
  console.log("Instance keys:", Object.keys(instance));
  console.log("getGenerativeModel:", typeof instance.getGenerativeModel);
  console.log("getModel:", typeof instance.getModel);
}
