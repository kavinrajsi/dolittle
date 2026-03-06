"use client";

import { useRef, useCallback } from "react";
import type { Language } from "@/lib/types";
import { getSettings } from "@/lib/utils";

interface STTOptions {
  language: Language;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
}

export function useElevenLabsSTT({ language, onTranscript, onError }: STTOptions) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("");

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      mimeTypeRef.current = mimeType;
      chunksRef.current = [];

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current || "audio/webm",
        });

        if (blob.size < 1000) return;

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          formData.append("language", language);

          // Read key from settings (localStorage) and forward to server route
          const settings = getSettings();
          const clientKey =
            settings.elevenLabsApiKey ||
            process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
            "";

          const res = await fetch("/api/stt", {
            method: "POST",
            headers: clientKey ? { "x-elevenlabs-key": clientKey } : {},
            body: formData,
          });

          if (!res.ok) {
            onError?.(`STT ${res.status}: ${await res.text()}`);
            return;
          }

          const { text, error } = await res.json();
          if (error) { onError?.(error); return; }
          if (text?.trim()) onTranscript(text.trim(), true);
        } catch (err) {
          onError?.((err as Error)?.message ?? "STT request failed");
        }
      };

      recorder.start();
    },
    [language, onTranscript, onError]
  );

  return { start, stop };
}
