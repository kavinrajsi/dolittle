"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Brain } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import type { MeetingBrief, Language, Session } from "@/lib/types";
import { getAllSessions, saveSession } from "@/lib/storage";
import { BriefForm } from "@/components/BriefForm";
import { SessionCard } from "@/components/SessionCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const all = await getAllSessions();
      setSessions(all);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleStart(brief: MeetingBrief, language: Language) {
    setIsCreating(true);
    try {
      const session: Session = {
        id: uuidv4(),
        brief,
        language,
        messages: [],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveSession(session);
      setOpen(false);
      router.push(`/session/${session.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Brainstorm Sessions</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Feed your meeting brief, then think out loud. Dolittle asks the
          questions that sharpen your thinking.
        </p>
      </div>

      {/* New session button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full">
            <Plus className="w-5 h-5" />
            New Brainstorm Session
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Session</DialogTitle>
          </DialogHeader>
          <BriefForm onStart={handleStart} isLoading={isCreating} />
        </DialogContent>
      </Dialog>

      {/* Session list */}
      {sessions.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Past Sessions
          </h2>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onDeleted={loadSessions}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Brain className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            No sessions yet. Create your first brainstorm session to get started.
          </p>
        </div>
      )}
    </div>
  );
}
