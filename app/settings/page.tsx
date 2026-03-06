"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, RefreshCw } from "lucide-react";
import type { AppSettings } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/utils";
import { resetSupabaseClient } from "@/lib/storage/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);
  const [showElKey, setShowElKey] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function handleChange<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    saveSettings(settings);
    resetSupabaseClient();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          API keys are stored locally in your browser only.
        </p>
      </div>

      {/* API Keys */}
      <Section title="API Keys">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="elKey">ElevenLabs API Key</Label>
            <div className="relative">
              <Input
                id="elKey"
                type={showElKey ? "text" : "password"}
                placeholder="sk_..."
                value={settings.elevenLabsApiKey}
                onChange={(e) =>
                  handleChange("elevenLabsApiKey", e.target.value)
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowElKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showElKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used for STT (Scribe Realtime v2) and TTS
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voiceId">ElevenLabs Voice ID</Label>
            <Input
              id="voiceId"
              placeholder="21m00Tcm4TlvDq8ikWAM"
              value={settings.elevenLabsVoiceId}
              onChange={(e) =>
                handleChange("elevenLabsVoiceId", e.target.value)
              }
            />
            <p className="text-xs text-muted-foreground">
              Default: Rachel (multilingual — supports Tamil + English). Find
              more in your ElevenLabs dashboard.
            </p>
          </div>
        </div>
      </Section>

      {/* Voice Settings */}
      <Section title="Voice Settings">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vadThreshold">
              VAD Sensitivity{" "}
              <span className="text-muted-foreground">
                ({settings.vadThreshold})
              </span>
            </Label>
            <input
              id="vadThreshold"
              type="range"
              min="5"
              max="60"
              value={settings.vadThreshold}
              onChange={(e) =>
                handleChange("vadThreshold", parseInt(e.target.value))
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More sensitive</span>
              <span>Less sensitive</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxQuestions">
              Max Socratic Questions{" "}
              <span className="text-muted-foreground">
                ({settings.maxSocraticQuestions})
              </span>
            </Label>
            <input
              id="maxQuestions"
              type="range"
              min="3"
              max="15"
              value={settings.maxSocraticQuestions}
              onChange={(e) =>
                handleChange("maxSocraticQuestions", parseInt(e.target.value))
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 (quick)</span>
              <span>15 (deep dive)</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Storage */}
      <Section title="Storage">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label>Storage Mode</Label>
              <p className="text-xs text-muted-foreground">
                {settings.storageMode === "local"
                  ? "Sessions stored in browser IndexedDB"
                  : "Sessions synced to Supabase"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  settings.storageMode === "local"
                    ? "text-sm text-primary"
                    : "text-sm text-muted-foreground"
                }
              >
                Local
              </span>
              <Switch
                checked={settings.storageMode === "supabase"}
                onCheckedChange={(v) =>
                  handleChange("storageMode", v ? "supabase" : "local")
                }
              />
              <span
                className={
                  settings.storageMode === "supabase"
                    ? "text-sm text-primary"
                    : "text-sm text-muted-foreground"
                }
              >
                Supabase
              </span>
            </div>
          </div>

          {settings.storageMode === "supabase" && (
            <div className="flex flex-col gap-3 pl-0 border-l-2 border-primary/20 pl-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sbUrl">Supabase Project URL</Label>
                <Input
                  id="sbUrl"
                  placeholder="https://xxxx.supabase.co"
                  value={settings.supabaseUrl}
                  onChange={(e) => handleChange("supabaseUrl", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sbKey">Supabase Anon Key</Label>
                <Input
                  id="sbKey"
                  type="password"
                  placeholder="eyJ..."
                  value={settings.supabaseAnonKey}
                  onChange={(e) =>
                    handleChange("supabaseAnonKey", e.target.value)
                  }
                />
              </div>
              <div className="rounded-lg bg-secondary/50 border border-border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  Required SQL migration:
                </p>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                  {`CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  brief JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  messages JSONB NOT NULL DEFAULT '[]',
  summary JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER
);`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Save */}
      <Button onClick={handleSave} size="lg">
        {saved ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Saved!
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </span>
        )}
      </Button>

      {/* Info */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
        <p className="text-sm font-medium">Environment Variables</p>
        <p className="text-xs text-muted-foreground">
          You can also set keys in <code className="text-primary">.env.local</code>:
        </p>
        <div className="flex flex-col gap-1">
          {[
            "ANTHROPIC_API_KEY",
            "ELEVENLABS_API_KEY",
            "NEXT_PUBLIC_ELEVENLABS_API_KEY",
            "NEXT_PUBLIC_ELEVENLABS_VOICE_ID",
          ].map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {key}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="rounded-xl border border-border bg-card p-4">{children}</div>
    </div>
  );
}
