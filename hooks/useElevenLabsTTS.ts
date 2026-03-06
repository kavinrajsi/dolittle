"use client";

import { useRef, useCallback } from "react";
import type { Language } from "@/lib/types";
import { getSettings } from "@/lib/utils";

interface TTSOptions {
  voiceId: string;
  language: Language;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export function useElevenLabsTTS(options: TTSOptions) {
  const { voiceId, language, onStart, onEnd, onError } = options;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const isSpeakingRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const interrupt = useCallback(() => {
    activeSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch { /* already stopped */ }
    });
    activeSourcesRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    queueRef.current = [];
    isPlayingRef.current = false;
    isSpeakingRef.current = false;
  }, []);

  const fetchAndPlayAudio = useCallback(
    async (text: string): Promise<void> => {
      const ctx = getAudioContext();
      const abort = new AbortController();
      abortRef.current = abort;

      // Read key from settings so TTS works without .env.local
      const settings = getSettings();
      const clientKey =
        settings.elevenLabsApiKey ||
        process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
        "";

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId, language, clientKey }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          onError?.(`TTS request failed: ${res.status}`);
          return;
        }

        const arrayBuffer = await res.arrayBuffer();
        if (abort.signal.aborted) return;

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (abort.signal.aborted) return;

        await new Promise<void>((resolve) => {
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          activeSourcesRef.current.push(source);
          source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(
              (s) => s !== source
            );
            resolve();
          };
          source.start(0);
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        onError?.((err as Error)?.message ?? "TTS error");
      }
    },
    [voiceId, language, onError]
  );

  const processQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (queueRef.current.length === 0) {
      isSpeakingRef.current = false;
      onEnd?.();
      return;
    }

    isPlayingRef.current = true;
    isSpeakingRef.current = true;

    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift()!;
      if (text.trim().length === 0) continue;
      await fetchAndPlayAudio(text);
      if (!isSpeakingRef.current) break;
    }

    isPlayingRef.current = false;
    if (isSpeakingRef.current) {
      isSpeakingRef.current = false;
      onEnd?.();
    }
  }, [fetchAndPlayAudio, onEnd]);

  const speak = useCallback(
    (text: string) => {
      if (!isSpeakingRef.current) onStart?.();
      queueRef.current.push(text);
      processQueue();
    },
    [onStart, processQueue]
  );

  const speakFull = useCallback(
    (text: string) => {
      interrupt();
      const sentences = text
        .split(/(?<=[.!?।])\s+/)
        .filter((s) => s.trim().length > 0);
      if (sentences.length === 0) return;
      onStart?.();
      isSpeakingRef.current = true;
      queueRef.current = sentences;
      processQueue();
    },
    [interrupt, onStart, processQueue]
  );

  const isSpeaking = () => isSpeakingRef.current;

  return { speak, speakFull, interrupt, isSpeaking };
}
