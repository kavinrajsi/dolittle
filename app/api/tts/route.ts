import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { text, voiceId, language, clientKey } = await req.json();

  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    req.headers.get("x-elevenlabs-key") ||
    clientKey ||
    "";

  if (!apiKey) {
    return new Response(
      "ElevenLabs API key not set. Add it in Settings or .env.local (ELEVENLABS_API_KEY).",
      { status: 500 }
    );
  }

  async function callTTS(vid: string): Promise<Response> {
    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        language_code: language === "ta" ? "ta" : "en",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });
  }

  try {
    const voice = voiceId || "";
    let elResponse = voice ? await callTTS(voice) : null;

    // If no voice configured or the voice ID 404s, fall back to first available voice
    if (!elResponse || elResponse.status === 404) {
      const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: { "xi-api-key": apiKey },
      });

      if (!voicesRes.ok) {
        return new Response(
          `Could not fetch voices: ${await voicesRes.text()}`,
          { status: voicesRes.status }
        );
      }

      const { voices } = await voicesRes.json();
      if (!voices?.length) {
        return new Response("No voices available on this ElevenLabs account.", { status: 404 });
      }

      // Prefer a multilingual voice; fall back to voices[0]
      const preferred = voices.find(
        (v: { labels?: Record<string, string> }) =>
          v.labels?.use_case === "conversational" ||
          v.labels?.language === "en"
      ) ?? voices[0];

      elResponse = await callTTS(preferred.voice_id);
    }

    if (!elResponse.ok) {
      return new Response(await elResponse.text(), { status: elResponse.status });
    }

    const audioBuffer = await elResponse.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(msg, { status: 500 });
  }
}
