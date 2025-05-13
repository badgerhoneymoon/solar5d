import { OpenAI } from 'openai';

// Ensure the API key is set
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sends a string prompt to the OpenAI responses API and returns the assistant response.
 *
 * @param prompt - The prompt string to send to the model.
 * @returns The OpenAI API response.
 */
export async function createAssistantResponse(
  prompt: string
) {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: prompt
  });
  return response;
} 