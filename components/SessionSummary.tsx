"use client";

import { Copy, Download, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { SessionSummary as SummaryType, Message } from "@/lib/types";
import { Button } from "./ui/button";
import { downloadText, summaryToText, formatRelativeTime, cn } from "@/lib/utils";
import { renderMarkdown } from "./ChatMessage";

interface SessionSummaryProps {
  summary: SummaryType;
  topic: string;
  messages: Message[];
}

type Tab = "summary" | "transcript";

export function SessionSummary({ summary, topic, messages }: SessionSummaryProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("summary");

  function handleCopy() {
    const text = summaryToText(topic, summary);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const text = summaryToText(topic, summary);
    const slug = topic.toLowerCase().replace(/\s+/g, "-").slice(0, 40);
    downloadText(text, `dolittle-${slug}-${Date.now()}.txt`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Session Complete</h2>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["summary", "transcript"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === "summary" && (
        <div className="flex flex-col gap-5">
          <Section title="Key Ideas" items={summary.keyIdeas} color="primary" />
          <Section title="Open Questions" items={summary.openQuestions} color="accent" />
          <Section title="Action Items" items={summary.actionItems} color="amber" />

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1">
              {copied ? (
                <><CheckCircle className="w-4 h-4" />Copied</>
              ) : (
                <><Copy className="w-4 h-4" />Copy</>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4" />
              Download .txt
            </Button>
          </div>
        </div>
      )}

      {/* Transcript tab */}
      {tab === "transcript" && (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages recorded.</p>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold",
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
                      "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      isUser
                        ? "bg-accent/10 border border-accent/20 text-foreground rounded-tr-sm"
                        : "bg-card border border-border text-foreground rounded-tl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{renderMarkdown(msg.content)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                      {formatRelativeTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "primary" | "accent" | "amber";
}) {
  const dotColor = { primary: "bg-primary", accent: "bg-accent", amber: "bg-amber-400" }[color];
  const titleColor = { primary: "text-primary", accent: "text-accent", amber: "text-amber-400" }[color];

  return (
    <div className="flex flex-col gap-2">
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${titleColor}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">None identified</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
