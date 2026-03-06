"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { AgentState } from "@/lib/types";

interface VoiceOrbProps {
  state: AgentState;
  volume: number; // 0-255
  size?: "sm" | "md" | "lg";
}

const STATE_LABELS: Record<AgentState, string> = {
  idle: "Ready",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "Speaking",
  interrupted: "Interrupted",
};

export function VoiceOrb({ state, volume, size = "lg" }: VoiceOrbProps) {
  const normalizedVolume = Math.min(volume / 80, 1); // 0-1 for visual scaling

  const orbSize = useMemo(
    () => ({ sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" }[size]),
    [size]
  );

  const ringSize = useMemo(
    () => ({ sm: "w-20 h-20", md: "w-32 h-32", lg: "w-44 h-44" }[size]),
    [size]
  );

  const orbClass = cn(
    "rounded-full transition-all duration-150 flex items-center justify-center relative",
    orbSize,
    {
      "orb-idle": state === "idle",
      "orb-listening": state === "listening",
      "orb-speaking": state === "speaking",
      "orb-processing": state === "processing",
      "orb-interrupted": state === "interrupted",
    }
  );

  // Scale the orb slightly based on input volume when listening
  const dynamicScale =
    state === "listening"
      ? 1 + normalizedVolume * 0.15
      : state === "speaking"
      ? 1.05
      : 1;

  const waveBarCount = 5;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pulse ring behind orb */}
      <div className="relative flex items-center justify-center">
        {(state === "listening" || state === "speaking") && (
          <div
            className={cn(
              "absolute rounded-full border-2 animate-pulse-ring",
              ringSize,
              state === "listening"
                ? "border-accent/40"
                : "border-primary/40"
            )}
          />
        )}

        {/* Main orb */}
        <div
          className={orbClass}
          style={{ transform: `scale(${dynamicScale})` }}
        >
          {/* Wave bars inside orb when speaking */}
          {state === "speaking" && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: waveBarCount }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/80 rounded-full animate-voice-wave"
                  style={{
                    height: `${12 + i * 4}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Mic icon when listening */}
          {state === "listening" && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-background"
            >
              <rect
                x="9"
                y="2"
                width="6"
                height="11"
                rx="3"
                fill="currentColor"
              />
              <path
                d="M5 10a7 7 0 0 0 14 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="12"
                y1="19"
                x2="12"
                y2="22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}

          {/* Processing spinner */}
          {state === "processing" && (
            <div className="w-8 h-8 border-2 border-background/30 border-t-background rounded-full animate-spin" />
          )}

          {/* Idle dot */}
          {(state === "idle" || state === "interrupted") && (
            <div className="w-3 h-3 rounded-full bg-white/50" />
          )}
        </div>
      </div>

      {/* State label */}
      <p
        className={cn("text-sm font-medium transition-colors", {
          "text-muted-foreground": state === "idle",
          "text-accent": state === "listening",
          "text-primary": state === "speaking",
          "text-amber-400": state === "processing",
          "text-destructive": state === "interrupted",
        })}
      >
        {STATE_LABELS[state]}
      </p>
    </div>
  );
}
