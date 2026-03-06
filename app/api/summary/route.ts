import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSummaryPrompt } from "@/lib/claude";
import type { Language, Message, SessionSummary } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const { messages, language }: { messages: Message[]; language: Language } =
    await req.json();

  const prompt = buildSummaryPrompt(messages, language);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const summary: SessionSummary = {
      ...JSON.parse(cleaned),
      generatedAt: Date.now(),
    };

    return NextResponse.json(summary);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
