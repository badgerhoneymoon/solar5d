import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Parse model parameter from query string
  const url = new URL(req.url);
  const model = url.searchParams.get('model');
  if (!model) {
    return NextResponse.json({ error: 'Missing model parameter' }, { status: 400 });
  }

  // Read SDP offer from request body
  const offerSdp = await req.text();

  // Retrieve API key from environment
  const openAiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!openAiKey) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }

  // Forward the request to OpenAI realtime endpoint
  const openaiRes = await fetch(
    `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offerSdp,
    }
  );

  // Handle errors from OpenAI
  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return new Response(errText, {
      status: openaiRes.status,
      headers: { 'Content-Type': openaiRes.headers.get('Content-Type') || 'text/plain' },
    });
  }

  // Return the SDP answer directly
  const answerSdp = await openaiRes.text();
  return new Response(answerSdp, {
    status: 200,
    headers: { 'Content-Type': 'application/sdp' },
  });
} 