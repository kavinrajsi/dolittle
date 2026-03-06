"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { Badge } from "./ui/badge";

interface ChatMessageProps {
  message: Message;
}

/** Render the most common markdown patterns Claude uses in conversation */
export function renderMarkdown(text: string): React.ReactNode[] {
  // Split into lines to handle block-level elements
  return text.split("\n").map((line, i) => {
    // Inline: **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
      const codeMatch = remaining.match(/`(.+?)`/);

      // Find which match comes first
      const matches = [
        boldMatch && { match: boldMatch, type: "bold" },
        italicMatch && { match: italicMatch, type: "italic" },
        codeMatch && { match: codeMatch, type: "code" },
      ]
        .filter(Boolean)
        .sort((a, b) => (a!.match.index ?? 0) - (b!.match.index ?? 0)) as {
          match: RegExpMatchArray;
          type: string;
        }[];

      if (matches.length === 0) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      const first = matches[0];
      const before = remaining.slice(0, first.match.index);
      if (before) parts.push(<span key={key++}>{before}</span>);

      const inner = first.match[1];
      if (first.type === "bold") {
        parts.push(<strong key={key++} className="font-semibold">{inner}</strong>);
      } else if (first.type === "italic") {
        parts.push(<em key={key++}>{inner}</em>);
      } else {
        parts.push(
          <code key={key++} className="px-1 py-0.5 rounded bg-muted text-xs font-mono">
            {inner}
          </code>
        );
      }

      remaining = remaining.slice((first.match.index ?? 0) + first.match[0].length);
    }

    return (
      <span key={i}>
        {parts}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
          isUser
            ? "bg-accent/20 text-accent border border-accent/30"
            : "bg-primary/20 text-primary border border-primary/30"
        )}
      >
        {isUser ? "You" : "D"}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-accent/10 border border-accent/20 text-foreground rounded-tr-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        )}
      >
        <p className="whitespace-pre-wrap">{renderMarkdown(message.content)}</p>
        <div
          className={cn(
            "flex items-center gap-2 mt-1.5",
            isUser ? "justify-start" : "justify-end"
          )}
        >
          {message.interrupted && (
            <Badge variant="destructive" className="text-[10px] py-0">
              interrupted
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}
