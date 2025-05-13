const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/**
 * Sends a message to a Telegram chat.
 * @param chatId - The Telegram chat ID.
 * @param text - The message text to send.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

/**
 * Optionally sends a notification to a Telegram user if enabled and chatId is present.
 * @param params - Object containing chatId, enabled, and message.
 */
export async function sendNotification({
  chatId,
  enabled = true,
  message,
}: {
  chatId?: string;
  enabled?: boolean;
  message: string;
}): Promise<void> {
  if (!enabled) return;
  if (!chatId) return;
  await sendTelegramMessage(chatId, message);
}

/**
 * General-purpose message formatter for Telegram notifications.
 * You can extend this to support templates or variables as needed.
 * @param message - The message or template string.
 * @param variables - Optional variables to interpolate into the message.
 */
export function formatTelegramMessage(message: string, variables?: Record<string, string>): string {
  if (!variables) return message;
  return Object.entries(variables).reduce(
    (msg, [key, value]) => msg.replace(new RegExp(`{${key}}`, 'g'), value),
    message
  );
}