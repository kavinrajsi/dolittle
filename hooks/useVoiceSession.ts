"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Session, Message, AgentState, SessionSummary } from "@/lib/types";
import { saveSession } from "@/lib/storage";
import { getSettings } from "@/lib/utils";
import { useVAD } from "./useVAD";
import { useElevenLabsSTT } from "./useElevenLabsSTT";
import { useElevenLabsTTS } from "./useElevenLabsTTS";

interface UseVoiceSessionOptions {
  session: Session;
  onSessionUpdate: (session: Session) => void;
}

export function useVoiceSession({
  session,
  onSessionUpdate,
}: UseVoiceSessionOptions) {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [volume, setVolume] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveAgentText, setLiveAgentText] = useState(""); // live caption while streaming
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session>(session);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSpeakingRef = useRef(false);
  const sttActiveRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const settings = getSettings();

  // ── TTS ──────────────────────────────────────────────────────────────────
  const tts = useElevenLabsTTS({
    voiceId:
      settings.elevenLabsVoiceId ||
      process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ||
      "21m00Tcm4TlvDq8ikWAM",
    language: session.language,
    onStart: () => {
      isSpeakingRef.current = true;
      setAgentState("speaking");
    },
    onEnd: () => {
      isSpeakingRef.current = false;
      setAgentState("listening");
    },
    onError: (err) => {
      setError(`TTS: ${err}`);
      isSpeakingRef.current = false;
      setAgentState("listening");
    },
  });

  // ── STT — MediaRecorder + REST proxy (no browser WebSocket) ──────────────
  // Transcript arrives asynchronously after the user stops speaking.
  // handleUserMessage is called directly from onTranscript.
  const stt = useElevenLabsSTT({
    language: session.language,
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        setInterimTranscript("");
        handleUserMessage(text);
      }
    },
    onError: (err) => {
      setError(`STT: ${err}`);
      setAgentState("idle");
    },
  });

  // ── VAD ──────────────────────────────────────────────────────────────────
  const vad = useVAD({
    threshold: settings.vadThreshold || 20,
    silenceMs: 800,
    onVolumeChange: (v) => setVolume(v),
    onSpeechStart: () => {
      // Interrupt agent if it's currently speaking
      if (isSpeakingRef.current) {
        tts.interrupt();
        isSpeakingRef.current = false;
        chatAbortRef.current?.abort();

        // Mark last agent message as interrupted
        const msgs = sessionRef.current.messages;
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.role === "agent") {
          const updated: Session = {
            ...sessionRef.current,
            messages: msgs.map((m, i) =>
              i === msgs.length - 1 ? { ...m, interrupted: true } : m
            ),
          };
          sessionRef.current = updated;
          onSessionUpdate(updated);
        }
      }

      // Start recording — MediaRecorder captures the stream directly
      if (streamRef.current) {
        stt.start(streamRef.current);
        sttActiveRef.current = true;
        setAgentState("listening");
      }
    },
    onSpeechEnd: () => {
      if (!sttActiveRef.current) return;
      sttActiveRef.current = false;
      // stop() triggers recorder.onstop → async REST call → onTranscript → handleUserMessage
      stt.stop();
      setInterimTranscript("");
      setAgentState("processing");
    },
  });

  // ── Handle user message → Claude ─────────────────────────────────────────
  const handleUserMessage = useCallback(
    async (transcript: string) => {
      setAgentState("processing");

      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: transcript,
        timestamp: Date.now(),
      };

      const updatedSession: Session = {
        ...sessionRef.current,
        messages: [...sessionRef.current.messages, userMsg],
        updatedAt: Date.now(),
      };
      sessionRef.current = updatedSession;
      onSessionUpdate(updatedSession);
      await saveSession(updatedSession);

      const abort = new AbortController();
      chatAbortRef.current = abort;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: sessionRef.current.brief,
            language: sessionRef.current.language,
            messages: updatedSession.messages,
            maxQuestions: settings.maxSocraticQuestions || 8,
          }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          setError("Chat API error");
          setAgentState("listening");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let agentText = "";
        let sentenceBuffer = "";

        setAgentState("speaking");
        setLiveAgentText("");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) { setError(parsed.error); break; }
              if (parsed.text) {
                agentText += parsed.text;
                sentenceBuffer += parsed.text;
                // Update live caption with the clean streamed text so far
                setLiveAgentText(agentText.replace(/GENERATE_SUMMARY\s*/g, ""));
                const m = sentenceBuffer.match(/^(.*?[.!?।])\s+([\s\S]*)$/);
                if (m) {
                  if (!m[1].includes("GENERATE_SUMMARY")) tts.speak(m[1]);
                  sentenceBuffer = m[2];
                }
              }
            } catch { /* ignore */ }
          }
        }

        if (sentenceBuffer.trim() && !sentenceBuffer.includes("GENERATE_SUMMARY")) {
          tts.speak(sentenceBuffer.trim());
        }

        setLiveAgentText("");
        const cleanText = agentText.replace(/GENERATE_SUMMARY\s*/g, "").trim();
        if (!cleanText) { setAgentState("listening"); return; }
        const agentMsg: Message = {
          id: uuidv4(),
          role: "agent",
          content: cleanText,
          timestamp: Date.now(),
        };
        const finalSession: Session = {
          ...sessionRef.current,
          messages: [...sessionRef.current.messages, agentMsg],
          updatedAt: Date.now(),
        };
        sessionRef.current = finalSession;
        onSessionUpdate(finalSession);
        await saveSession(finalSession);

        if (agentText.includes("GENERATE_SUMMARY")) generateSummary();
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError((err as Error)?.message ?? "Unknown error");
        setAgentState("listening");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tts, settings.maxSocraticQuestions]
  );

  // ── Generate summary ──────────────────────────────────────────────────────
  const generateSummary = useCallback(async () => {
    setAgentState("processing");
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sessionRef.current.messages,
          language: sessionRef.current.language,
        }),
      });
      if (!res.ok) throw new Error("Summary generation failed");
      const summary: SessionSummary = await res.json();
      const finalSession: Session = {
        ...sessionRef.current,
        summary,
        status: "ended",
        updatedAt: Date.now(),
        durationSeconds: Math.floor((Date.now() - sessionRef.current.createdAt) / 1000),
      };
      sessionRef.current = finalSession;
      onSessionUpdate(finalSession);
      await saveSession(finalSession);
      setAgentState("idle");
    } catch (err) {
      setError((err as Error)?.message ?? "Summary error");
      setAgentState("idle");
    }
  }, [onSessionUpdate]);

  // ── Initialize microphone + VAD ───────────────────────────────────────────
  const initialize = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      // AudioContext is only used for VAD (AnalyserNode), not STT
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      vad.start(stream, ctx);
      setIsInitialized(true);
      setAgentState("idle");
      await sendOpeningQuestion();
    } catch {
      setError("Microphone access denied. Please allow microphone access and reload.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendOpeningQuestion = useCallback(async () => {
    setAgentState("processing");
    const abort = new AbortController();
    chatAbortRef.current = abort;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: sessionRef.current.brief,
          language: sessionRef.current.language,
          messages: [],
          maxQuestions: settings.maxSocraticQuestions || 8,
        }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) { setAgentState("listening"); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let agentText = "";
      let sentenceBuffer = "";
      setAgentState("speaking");
      setLiveAgentText("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              agentText += parsed.text;
              sentenceBuffer += parsed.text;
              setLiveAgentText(agentText);
              const m = sentenceBuffer.match(/^(.*?[.!?।])\s+([\s\S]*)$/);
              if (m) { tts.speak(m[1]); sentenceBuffer = m[2]; }
            }
          } catch { /* ignore */ }
        }
      }
      if (sentenceBuffer.trim()) tts.speak(sentenceBuffer.trim());
      setLiveAgentText("");

      if (!agentText.trim()) { setAgentState("listening"); return; }

      const agentMsg: Message = { id: uuidv4(), role: "agent", content: agentText, timestamp: Date.now() };
      const updatedSession: Session = { ...sessionRef.current, messages: [agentMsg], updatedAt: Date.now() };
      sessionRef.current = updatedSession;
      onSessionUpdate(updatedSession);
      await saveSession(updatedSession);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError((err as Error)?.message ?? "Opening question error");
      setAgentState("listening");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts, settings.maxSocraticQuestions]);

  // ── End session ───────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    tts.interrupt();
    chatAbortRef.current?.abort();
    stt.stop();
    vad.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await generateSummary();
  }, [tts, stt, vad, generateSummary]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      tts.interrupt();
      stt.stop();
      vad.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { agentState, volume, interimTranscript, liveAgentText, isInitialized, error, initialize, endSession, generateSummary };
}
