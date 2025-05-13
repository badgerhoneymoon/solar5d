export const maxDuration = 60; // 1 minute timeout
export const dynamic = 'force-dynamic'; // Disable static optimization

import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '../../../lib/services/telegram-service';

// Webhook secret to ensure requests come from authorized sources
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Helper to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generic POST handler for incoming requests
export async function POST(request: Request) {
  try {
    // Secret validation
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    if (secret !== WEBHOOK_SECRET) {
      console.error('Unauthorized access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Webhook body:', body);

    // Telegram message handling
    if (body.message?.chat?.id) {
      const chatId = body.message.chat.id;
      const text = body.message.text || '';

      if (text === '/start') {
        await sendTelegramMessage(String(chatId),
          "👋 Welcome! Send me your email to verify and subscribe to notifications."
        );
      } else if (isValidEmail(text)) {
        // TODO: verify email against your database
        await sendTelegramMessage(String(chatId),
          "✅ Thanks! We received your email. (Database logic not yet hooked up)"
        );
      } else {
        await sendTelegramMessage(String(chatId),
          "❗️ Please send a valid email or type /start to restart."
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Default response for other events
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}