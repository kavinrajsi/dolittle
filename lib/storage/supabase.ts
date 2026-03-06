import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "../types";

let client: SupabaseClient | null = null;

function getClient(url: string, key: string): SupabaseClient {
  if (!client) {
    client = createClient(url, key);
  }
  return client;
}

export function resetSupabaseClient(): void {
  client = null;
}

export async function supabaseGetAllSessions(
  url: string,
  key: string
): Promise<Session[]> {
  const sb = getClient(url, key);
  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToSession);
}

export async function supabaseGetSession(
  url: string,
  key: string,
  id: string
): Promise<Session | null> {
  const sb = getClient(url, key);
  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return rowToSession(data);
}

export async function supabaseSaveSession(
  url: string,
  key: string,
  session: Session
): Promise<void> {
  const sb = getClient(url, key);
  const { error } = await sb.from("sessions").upsert(sessionToRow(session));
  if (error) throw error;
}

export async function supabaseDeleteSession(
  url: string,
  key: string,
  id: string
): Promise<void> {
  const sb = getClient(url, key);
  const { error } = await sb.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): Session {
  return {
    id: row.id,
    brief: row.brief,
    language: row.language,
    messages: row.messages ?? [],
    summary: row.summary ?? undefined,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    durationSeconds: row.duration_seconds ?? undefined,
  };
}

function sessionToRow(session: Session) {
  return {
    id: session.id,
    brief: session.brief,
    language: session.language,
    messages: session.messages,
    summary: session.summary ?? null,
    status: session.status,
    created_at: new Date(session.createdAt).toISOString(),
    updated_at: new Date(session.updatedAt).toISOString(),
    duration_seconds: session.durationSeconds ?? null,
  };
}

// SQL to create the table in Supabase:
// CREATE TABLE sessions (
//   id TEXT PRIMARY KEY,
//   brief JSONB NOT NULL,
//   language TEXT NOT NULL DEFAULT 'en',
//   messages JSONB NOT NULL DEFAULT '[]',
//   summary JSONB,
//   status TEXT NOT NULL DEFAULT 'active',
//   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//   duration_seconds INTEGER
// );
