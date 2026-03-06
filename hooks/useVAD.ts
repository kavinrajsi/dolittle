"use client";

import { useRef, useCallback } from "react";

interface VADOptions {
  threshold?: number; // 0-255, default 20
  silenceMs?: number; // ms of silence before onSpeechEnd fires, default 800
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void; // 0-255
}

export function useVAD(options: VADOptions) {
  const {
    threshold = 20,
    silenceMs = 800,
    onSpeechStart,
    onSpeechEnd,
    onVolumeChange,
  } = options;

  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const isSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;
    isSpeakingRef.current = false;
  }, []);

  const start = useCallback(
    (stream: MediaStream, audioContext: AudioContext) => {
      stop();

      audioCtxRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      function tick() {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;

        onVolumeChange?.(avg);

        if (avg > threshold) {
          // Speech detected
          if (silenceTimerRef.current !== null) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            onSpeechStart?.();
          }
        } else {
          // Silence — start timer if we were speaking
          if (
            isSpeakingRef.current &&
            silenceTimerRef.current === null
          ) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              silenceTimerRef.current = null;
              onSpeechEnd?.();
            }, silenceMs);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [threshold, silenceMs, onSpeechStart, onSpeechEnd, onVolumeChange, stop]
  );

  return { start, stop };
}
