import { NextRequest, NextResponse } from 'next/server';
import { createAssistantResponse } from '@/lib/services/openai-responses-service';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    const response = await createAssistantResponse(prompt);
    return NextResponse.json({ result: response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 