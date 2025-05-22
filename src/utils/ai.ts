// Central AI utility for SparkPad
// Usage: askAI(prompt, userToken)

export async function askAI(prompt: string, userToken?: string): Promise<string> {
  if (!userToken) throw new Error('User must be logged in to use AI features.');
  // TODO: Replace with real API call to OpenAI/Gemini
  // Example placeholder:
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error('AI request failed');
  const data = await response.json();
  return data.result || 'No response from AI.';
} 