"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, StopCircle, FileText, Mic, MicOff } from "lucide-react";
import type { Session } from "@/lib/types";
import { getSession } from "@/lib/storage";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { VoiceOrb } from "@/components/VoiceOrb";
import { ChatMessage } from "@/components/ChatMessage";
import { SessionSummary } from "@/components/SessionSummary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/utils";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession(id).then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, [id]);

  // Timer
  useEffect(() => {
    if (!session || session.status === "ended") return;
    timerRef.current = setInterval(
      () => setElapsedSeconds((s) => s + 1),
      1000
    );
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages?.length]);

  const handleSessionUpdate = useCallback((updated: Session) => {
    setSession(updated);
    if (updated.summary && updated.status === "ended") {
      setSummaryOpen(true);
    }
  }, []);

  const voice = useVoiceSession(
    session
      ? { session, onSessionUpdate: handleSessionUpdate }
      : // Dummy placeholder — won't be used until session loads
        {
          session: {
            id: "",
            brief: { topic: "", attendees: "", goals: "", constraints: "", notes: "" },
            language: "en",
            messages: [],
            status: "active",
            createdAt: 0,
            updatedAt: 0,
          },
          onSessionUpdate: () => {},
        }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center flex flex-col gap-4">
        <p className="text-muted-foreground">Session not found.</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  const topic =
    session.brief.topic ||
    session.brief.rawText?.slice(0, 60) ||
    "Untitled";

  const isEnded = session.status === "ended";

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{topic}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[11px] py-0">
              {session.language === "ta" ? "Tamil" : "English"}
            </Badge>
            {!isEnded && (
              <span className="text-xs text-muted-foreground">
                {formatDuration(elapsedSeconds)}
              </span>
            )}
            {isEnded && (
              <Badge variant="outline" className="text-[11px] py-0">
                Ended
              </Badge>
            )}
          </div>
        </div>

        {/* Summary button (when ended) */}
        {isEnded && session.summary && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSummaryOpen(true)}
          >
            <FileText className="w-4 h-4" />
            Summary
          </Button>
        )}

        {/* End session */}
        {!isEnded && voice.isInitialized && (
          <Button
            variant="destructive"
            size="sm"
            onClick={voice.endSession}
          >
            <StopCircle className="w-4 h-4" />
            <span className="hidden sm:inline">End</span>
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {session.messages.length === 0 && !voice.isInitialized && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {isEnded ? "No messages in this session." : "Starting session..."}
            </p>
          </div>
        )}
        {session.messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Interim transcript */}
        {voice.interimTranscript && (
          <div className="flex gap-3 flex-row-reverse opacity-60">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
              You
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 bg-accent/5 border border-accent/10 text-sm text-muted-foreground italic">
              {voice.interimTranscript}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {voice.error && (
        <div className="mx-4 mb-2 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {voice.error}
        </div>
      )}

      {/* Bottom voice control area */}
      {!isEnded && (
        <div className="border-t border-border bg-card/50 px-4 py-6 flex flex-col items-center gap-4">
          {!voice.isInitialized ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Allow microphone access to begin
              </p>
              <Button
                size="lg"
                onClick={voice.initialize}
                className="flex items-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Start Listening
              </Button>
            </div>
          ) : (
            <>
              {/* Live caption strip */}
              {(voice.liveAgentText || voice.interimTranscript) && (
                <div className="w-full max-w-md rounded-xl bg-black/60 backdrop-blur-sm border border-border px-4 py-2.5 min-h-[44px] flex items-start gap-2">
                  {voice.liveAgentText ? (
                    <>
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary">D</span>
                      <p className="text-sm text-foreground/90 leading-snug line-clamp-3">
                        {voice.liveAgentText}
                      </p>
                    </>
                  ) : voice.interimTranscript ? (
                    <>
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[10px] font-bold text-accent">Y</span>
                      <p className="text-sm text-muted-foreground italic leading-snug line-clamp-3">
                        {voice.interimTranscript}
                      </p>
                    </>
                  ) : null}
                </div>
              )}

              <VoiceOrb
                state={voice.agentState}
                volume={voice.volume}
                size="lg"
              />
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {voice.agentState === "speaking"
                  ? "Speak to interrupt at any time"
                  : voice.agentState === "listening"
                  ? "Speak your answer..."
                  : voice.agentState === "processing"
                  ? "Formulating next question..."
                  : "Waiting for you to speak..."}
              </p>
            </>
          )}
        </div>
      )}

      {/* Ended state bottom */}
      {isEnded && (
        <div className="border-t border-border bg-card/50 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MicOff className="w-4 h-4" />
            Session ended
            {session.durationSeconds !== undefined && (
              <span>· {formatDuration(session.durationSeconds)}</span>
            )}
          </div>
          <Button onClick={() => router.push("/")} variant="outline" size="sm">
            New Session
          </Button>
        </div>
      )}

      {/* Summary dialog */}
      {session.summary && (
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Session Summary</DialogTitle>
            </DialogHeader>
            <SessionSummary
              summary={session.summary}
              topic={topic}
              messages={session.messages}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
