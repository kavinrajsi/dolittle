import type { Session } from "../types";
import { getSettings } from "../utils";
import {
  localGetAllSessions,
  localGetSession,
  localSaveSession,
  localDeleteSession,
} from "./local";
import {
  supabaseGetAllSessions,
  supabaseGetSession,
  supabaseSaveSession,
  supabaseDeleteSession,
} from "./supabase";

function getSupabaseConfig() {
  const settings = getSettings();
  return {
    url: settings.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    key:
      settings.supabaseAnonKey ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
  };
}

export async function getAllSessions(): Promise<Session[]> {
  const settings = getSettings();
  if (settings.storageMode === "supabase") {
    const { url, key } = getSupabaseConfig();
    return supabaseGetAllSessions(url, key);
  }
  return localGetAllSessions();
}

export async function getSession(id: string): Promise<Session | null> {
  const settings = getSettings();
  if (settings.storageMode === "supabase") {
    const { url, key } = getSupabaseConfig();
    return supabaseGetSession(url, key, id);
  }
  return localGetSession(id);
}

export async function saveSession(session: Session): Promise<void> {
  const settings = getSettings();
  if (settings.storageMode === "supabase") {
    const { url, key } = getSupabaseConfig();
    return supabaseSaveSession(url, key, session);
  }
  return localSaveSession(session);
}

export async function deleteSession(id: string): Promise<void> {
  const settings = getSettings();
  if (settings.storageMode === "supabase") {
    const { url, key } = getSupabaseConfig();
    return supabaseDeleteSession(url, key, id);
  }
  return localDeleteSession(id);
}
