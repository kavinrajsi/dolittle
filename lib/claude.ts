import type { MeetingBrief, Language, Message } from "./types";

export function buildSystemPrompt(
  brief: MeetingBrief,
  language: Language,
  maxQuestions: number
): string {
  const langInstruction =
    language === "ta"
      ? "Respond entirely in Tamil (தமிழ்). Use natural conversational Tamil."
      : "Respond in English.";

  const briefContent = brief.rawText
    ? `Meeting Brief:\n${brief.rawText}`
    : `Topic: ${brief.topic}
Attendees: ${brief.attendees}
Goals: ${brief.goals}
Constraints: ${brief.constraints}
${brief.notes ? `Additional Notes: ${brief.notes}` : ""}`.trim();

  return `You are Dolittle, an expert Socratic brainstorming coach who helps people think deeply before meetings.

${langInstruction}

${briefContent}

Your role:
- Ask ONE thoughtful, probing question at a time — never multiple questions at once
- Build directly on the user's previous answer; go deeper with each exchange
- Help uncover hidden assumptions, blind spots, risks, and opportunities
- Never give answers or suggestions unless explicitly asked — your job is to ask questions that lead the user to their own insights
- Questions should be concise (1-2 sentences max) and laser-focused
- After ${maxQuestions} exchanges, naturally close by saying you'll generate a summary, then output the word GENERATE_SUMMARY on its own line

Question types to rotate through:
- Clarifying: "What exactly do you mean by...?"
- Assumption-probing: "What are you assuming here that might not be true?"
- Perspective-shifting: "How might [an attendee] see this differently?"
- Consequence-exploring: "What happens if that constraint can't be removed?"
- Priority-testing: "Of those goals, which one matters most if you can only achieve one?"

Keep your tone: curious, warm, direct. Never preachy or academic.`;
}

export function buildSummaryPrompt(
  messages: Message[],
  language: Language
): string {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Dolittle"}: ${m.content}`)
    .join("\n");

  const langInstruction =
    language === "ta"
      ? "Write the summary content in Tamil."
      : "Write the summary in English.";

  return `Based on this brainstorming session transcript, generate a structured summary.

${langInstruction}

Transcript:
${transcript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "keyIdeas": ["idea 1", "idea 2", "idea 3"],
  "openQuestions": ["question 1", "question 2"],
  "actionItems": ["action 1", "action 2"]
}

Extract 3-6 key ideas, 2-4 open questions, and 2-4 action items from the conversation.`;
}
