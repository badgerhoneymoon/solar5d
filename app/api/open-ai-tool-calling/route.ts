// Boilerplate for OpenAI function calling (tool use) using responses.create API.
// Accepts a user message, lets the LLM call a single generic tool, and returns the final response.

import { OpenAI } from "openai";
import { NextResponse } from "next/server";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define a single generic tool (function) for demonstration
const tools = [
  {
    type: "function" as const,
    name: "getData",
    description: "Retrieve some data based on a query string.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Query string for the data." }
      },
      required: ["query"],
      additionalProperties: false
    },
    strict: true
  }
];

// Example function implementation (replace with your own logic)
function getData({ query }: { query: string }) {
  // TODO: Replace with your own data lookup logic
  return { result: `You asked for: ${query}` };
}

export async function POST(req: Request) {
  try {
    // Parse user message from request body
    const { message } = await req.json();

    // System prompt for the LLM
    const systemPrompt =
      "You are a helpful assistant. Use the getData tool if the user asks for any data. Reply concisely.";

    // Compose the message history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    // First LLM call: see if the model wants to use a tool
    const response1 = await openai.responses.create({
      model: "gpt-4.1",
      input: messages,
      tools
    });

    const first = response1.output[0] as any;

    // If the LLM wants to call a function/tool
    if (first.type === "function_call") {
      const { name, arguments: argsJson, call_id } = first;
      const args = JSON.parse(argsJson);

      // Call the function
      let result: any = null;
      if (name === "getData") {
        result = getData(args);
      }

      // Add the function call and its output to the message history
      messages.push(first);
      messages.push({ type: "function_call_output", call_id, output: JSON.stringify(result) });

      // Second LLM call: ask for a final assistant reply
      const response2 = await openai.responses.create({
        model: "gpt-4.1",
        input: messages,
        tools
      });

      const secondOutput = (response2 as any).output?.[0];
      const assistantMessage = response2.output_text || secondOutput?.content || "";
      return NextResponse.json({
        answer: assistantMessage,
        tool: {
          name,
          arguments: args,
          result
        }
      });
    }

    // If the LLM replied directly (no tool needed), return its answer
    const direct = response1.output_text || first.content || "";
    return NextResponse.json({ answer: direct, tool: null });
  } catch (err) {
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
} 