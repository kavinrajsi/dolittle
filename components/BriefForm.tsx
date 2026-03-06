"use client";

import { useState } from "react";
import type { MeetingBrief, Language } from "@/lib/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";

interface BriefFormProps {
  onStart: (brief: MeetingBrief, language: Language) => void;
  isLoading?: boolean;
}

type Mode = "structured" | "paste";

const EMPTY_BRIEF: MeetingBrief = {
  topic: "",
  attendees: "",
  goals: "",
  constraints: "",
  notes: "",
  rawText: "",
};

export function BriefForm({ onStart, isLoading }: BriefFormProps) {
  const [mode, setMode] = useState<Mode>("structured");
  const [language, setLanguage] = useState<Language>("en");
  const [brief, setBrief] = useState<MeetingBrief>(EMPTY_BRIEF);

  const isValid =
    mode === "structured"
      ? brief.topic.trim().length > 0
      : (brief.rawText ?? "").trim().length > 0;

  function handleChange(
    field: keyof MeetingBrief,
    value: string
  ) {
    setBrief((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onStart(brief, language);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["structured", "paste"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "structured" ? "Structured Form" : "Paste Text"}
          </button>
        ))}
      </div>

      {mode === "structured" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic">Meeting Topic *</Label>
            <Input
              id="topic"
              placeholder="e.g. Q4 product roadmap review"
              value={brief.topic}
              onChange={(e) => handleChange("topic", e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="attendees">Attendees</Label>
            <Input
              id="attendees"
              placeholder="e.g. CEO, Engineering Lead, 3 PMs"
              value={brief.attendees}
              onChange={(e) => handleChange("attendees", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              placeholder="What do you want to achieve in this meeting?"
              rows={3}
              value={brief.goals}
              onChange={(e) => handleChange("goals", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="constraints">Constraints</Label>
            <Textarea
              id="constraints"
              placeholder="Budget limits, time constraints, technical limitations..."
              rows={2}
              value={brief.constraints}
              onChange={(e) => handleChange("constraints", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other context Dolittle should know..."
              rows={2}
              value={brief.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rawText">Paste your meeting brief</Label>
          <Textarea
            id="rawText"
            placeholder="Paste any text: agenda, email, doc excerpt, notes..."
            rows={10}
            value={brief.rawText ?? ""}
            onChange={(e) => handleChange("rawText", e.target.value)}
          />
        </div>
      )}

      {/* Language selector */}
      <div className="flex flex-col gap-1.5">
        <Label>Language</Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as Language)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ta">Tamil (தமிழ்)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" size="lg" disabled={!isValid || isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Starting session...
          </span>
        ) : (
          "Start Brainstorm"
        )}
      </Button>
    </form>
  );
}
