import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Prefer server env var; fall back to key sent from the client (Settings page)
  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    req.headers.get("x-elevenlabs-key") ||
    "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs API key not set. Add it in Settings or .env.local (ELEVENLABS_API_KEY)." },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const audio = incoming.get("audio") as File | null;
  const language = (incoming.get("language") as string) || "en";

  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: "No audio data" }, { status: 400 });
  }

  const body = new FormData();
  body.append("file", audio, audio.name || "audio.webm");
  body.append("model_id", "scribe_v2");
  body.append("language_code", language);

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text ?? "" });
}
