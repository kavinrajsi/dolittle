"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Clock, Trash2 } from "lucide-react";
import type { Session } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { formatRelativeTime, formatDuration } from "@/lib/utils";
import { deleteSession } from "@/lib/storage";

interface SessionCardProps {
  session: Session;
  onDeleted: () => void;
}

export function SessionCard({ session, onDeleted }: SessionCardProps) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteSession(session.id);
    onDeleted();
  }

  const topic =
    session.brief.topic || session.brief.rawText?.slice(0, 60) || "Untitled";

  return (
    <div
      onClick={() => router.push(`/session/${session.id}`)}
      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-all hover:bg-card/80"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-foreground line-clamp-2 leading-snug pr-2">
          {topic}
        </h3>
        <Badge
          variant={session.status === "ended" ? "secondary" : "default"}
          className="flex-shrink-0"
        >
          {session.status === "ended" ? "Done" : "Active"}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {session.messages.length} messages
        </span>
        {session.durationSeconds !== undefined && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(session.durationSeconds)}
          </span>
        )}
        <span className="ml-auto">
          {session.language === "ta" ? "Tamil" : "English"}
        </span>
      </div>

      {/* Time */}
      <p className="text-xs text-muted-foreground">
        {formatRelativeTime(session.createdAt)}
      </p>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
