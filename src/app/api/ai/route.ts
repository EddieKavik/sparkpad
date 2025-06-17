import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[AI API] Incoming prompt:', prompt);
    if (!apiKey) {
      console.error('[AI API] No Gemini API key');
      return NextResponse.json({ error: 'No Gemini API key' }, { status: 500 });
    }
    if (!prompt) {
      console.error('[AI API] No prompt provided');
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI API] Gemini API error:', error);
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();
    console.log('[AI API] Gemini API response:', JSON.stringify(data));
    // Gemini's response format: data.candidates[0].content.parts[0].text
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    return NextResponse.json({ result });
  } catch (err: any) {
    console.error('[AI API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
} 