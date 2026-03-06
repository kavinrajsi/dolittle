import { openDB, type IDBPDatabase } from "idb";
import type { Session } from "../types";

const DB_NAME = "dolittle";
const DB_VERSION = 1;
const STORE = "sessions";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function localGetAllSessions(): Promise<Session[]> {
  const db = await getDB();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function localGetSession(id: string): Promise<Session | null> {
  const db = await getDB();
  return (await db.get(STORE, id)) ?? null;
}

export async function localSaveSession(session: Session): Promise<void> {
  const db = await getDB();
  await db.put(STORE, session);
}

export async function localDeleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}
