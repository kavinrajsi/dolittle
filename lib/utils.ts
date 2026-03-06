import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AppSettings } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return {
      storageMode: "local",
      supabaseUrl: "",
      supabaseAnonKey: "",
      elevenLabsApiKey: "",
      elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
      vadThreshold: 20,
      maxSocraticQuestions: 8,
    };
  }
  try {
    const raw = localStorage.getItem("dolittle:settings");
    if (!raw) {
      return {
        storageMode: "local",
        supabaseUrl: "",
        supabaseAnonKey: "",
        elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "",
        elevenLabsVoiceId:
          process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ??
          "21m00Tcm4TlvDq8ikWAM",
        vadThreshold: 20,
        maxSocraticQuestions: 8,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      storageMode: "local",
      supabaseUrl: "",
      supabaseAnonKey: "",
      elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? "",
      elevenLabsVoiceId:
        process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
      vadThreshold: 20,
      maxSocraticQuestions: 8,
    };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("dolittle:settings", JSON.stringify(settings));
}

// Convert Float32 audio samples to 16-bit PCM ArrayBuffer
export function float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Download text as a file
export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Build summary text for download
export function summaryToText(
  topic: string,
  summary: { keyIdeas: string[]; openQuestions: string[]; actionItems: string[] }
): string {
  const lines = [
    `Meeting Brief: ${topic}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "=== KEY IDEAS ===",
    ...summary.keyIdeas.map((i) => `• ${i}`),
    "",
    "=== OPEN QUESTIONS ===",
    ...summary.openQuestions.map((q) => `• ${q}`),
    "",
    "=== ACTION ITEMS ===",
    ...summary.actionItems.map((a) => `• ${a}`),
  ];
  return lines.join("\n");
}
