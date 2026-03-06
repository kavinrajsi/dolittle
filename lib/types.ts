export type Language = "en" | "ta";

export type StorageMode = "local" | "supabase";

export type SessionStatus = "briefing" | "active" | "ended";

export type AgentState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "interrupted";

export interface MeetingBrief {
  topic: string;
  attendees: string;
  goals: string;
  constraints: string;
  notes: string;
  rawText?: string; // when user pastes freeform text
}

export interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
  interrupted?: boolean; // agent message that was cut off
}

export interface SessionSummary {
  keyIdeas: string[];
  openQuestions: string[];
  actionItems: string[];
  generatedAt: number;
}

export interface Session {
  id: string;
  brief: MeetingBrief;
  language: Language;
  messages: Message[];
  summary?: SessionSummary;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  durationSeconds?: number;
}

export interface AppSettings {
  storageMode: StorageMode;
  supabaseUrl: string;
  supabaseAnonKey: string;
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  vadThreshold: number; // 0-255, default 20
  maxSocraticQuestions: number; // default 8
}

export const DEFAULT_SETTINGS: AppSettings = {
  storageMode: "local",
  supabaseUrl: "",
  supabaseAnonKey: "",
  elevenLabsApiKey: "",
  elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
  vadThreshold: 20,
  maxSocraticQuestions: 8,
};
