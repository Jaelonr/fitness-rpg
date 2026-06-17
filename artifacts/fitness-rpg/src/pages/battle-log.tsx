import { useState } from "react";
import { useGetBattleLog, useGetPlayerStyleIdentity } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Swords, Zap, Coins, Trophy, ChevronDown, ChevronUp, BookOpen } from "lucide-react";

const STYLE_META: Record<string, { text: string; border: string; bg: string; bar: string; label: string }> = {
  strength:     { text: "text-red-400",    border: "border-red-400/30",    bg: "bg-red-400/10",    bar: "bg-red-400",    label: "Strength" },
  striking:     { text: "text-orange-400", border: "border-orange-400/30", bg: "bg-orange-400/10", bar: "bg-orange-400", label: "Striking" },
  conditioning: { text: "text-cyan-400",   border: "border-cyan-400/30",   bg: "bg-cyan-400/10",   bar: "bg-cyan-400",   label: "Conditioning" },
  grappling:    { text: "text-purple-400", border: "border-purple-400/30", bg: "bg-purple-400/10", bar: "bg-purple-400", label: "Grappling" },
  recovery:     { text: "text-green-400",  border: "border-green-400/30",  bg: "bg-green-400/10",  bar: "bg-green-400",  label: "Recovery" },
  discipline:   { text: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10", bar: "bg-yellow-400", label: "Discipline" },
};
const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

const VERDICT_COLOR: Record<string, string> = {
  "Victory":           "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  "Narrow Victory":    "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  "Strategic Retreat": "text-orange-400 border-orange-400/30 bg-orange-400/10",
  "Training Complete": "text-green-400 border-green-400/30 bg-green-400/10",
};

function StyleBar({ style, pct }: { style: string; pct: number }) {
  const m = STYLE_META[style];
  if (!m) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-[10px] font-mono w-20 shrink-0", m.text)}>{m.label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", m.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

function BattleCard({ replay }: { replay: any }) {
  const [expanded, setExpanded] = useState(false);
  const style = replay.dominantStyle as string;
  const m = STYLE_META[style] ?? STYLE_META.strength;
  const events = (replay.events ?? []) as Array<{ text: string; type: string }>;
  const verdictClass = VERDICT_COLOR[replay.verdict] ?? "text-muted-foreground border-border/30 bg-white/5";

  const date = new Date(replay.createdAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className={cn("border transition-all duration-200", m.border, m.bg)}>
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className={cn("text-[10px] font-mono uppercase font-bold tracking-wider", m.text)}>
                  {m.label}
                </span>
                <span className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded-full", verdictClass)}>
                  {replay.verdict}
                </span>
                {replay.hybridArchetype && (
                  <span className="text-[9px] text-muted-foreground font-mono">{replay.hybridArchetype}</span>
                )}
              </div>
              <h3 className="font-serif font-bold text-sm text-white leading-tight">{replay.encounterName}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">vs. {replay.enemyName}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-muted-foreground font-mono">{dateStr}</div>
              <div className="text-[10px] text-muted-foreground/60 font-mono">{timeStr}</div>
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground mt-1 ml-auto" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground mt-1 ml-auto" />
              }
            </div>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1 text-cyan-400">
              <Zap className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold">+{replay.xpEarned}</span>
            </div>
            <div className="flex items-center gap-1 text-yellow-400">
              <Coins className="w-3 h-3" />
              <span className="text-[10px] font-mono font-bold">+{replay.goldEarned}</span>
            </div>
            {replay.prCount > 0 && (
              <div className="flex items-center gap-1 text-yellow-300">
                <Trophy className="w-3 h-3" />
                <span className="text-[10px] font-mono font-bold">{replay.prCount} PR{replay.prCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </button>

        {/* Expanded events */}
        {expanded && events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
            {events.map((ev, i) => (
              <p key={i} className="text-xs text-foreground/80 leading-relaxed bg-white/5 border border-white/8 rounded-lg p-2.5">
                {ev.text}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BattleLog() {
  const { data: battles, isLoading: loadingBattles } = useGetBattleLog(
    {},
    { query: { queryKey: ["/api/battle-log"] } }
  );
  const { data: identity, isLoading: loadingIdentity } = useGetPlayerStyleIdentity({
    query: { queryKey: ["/api/player/style-identity"] },
  });

  const pcts = identity?.percentages;
  const topStyle = identity?.dominantStyle as string | null | undefined;
  const topMeta = topStyle ? STYLE_META[topStyle] : undefined;

  if (loadingBattles || loadingIdentity) {
    return (
      <div className="space-y-4">
        <PageHeader title="Battle Log" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const hasBattles = battles && battles.length > 0;
  const hasIdentity = identity && identity.totalSessions > 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Battle Log" subtitle="Your combat history" />

      {/* Style Identity Card */}
      {hasIdentity && (
        <Card className="border-border/50 bg-card/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Style Identity · {identity.totalSessions} Sessions
                </div>
                {topMeta && (
                  <div className={cn("text-sm font-bold font-serif", topMeta.text)}>
                    {topMeta.label} Archetype
                  </div>
                )}
                {identity.hybridArchetype && (
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {identity.hybridArchetype}
                  </div>
                )}
              </div>
              {topStyle && STYLE_META[topStyle] && (
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0",
                  STYLE_META[topStyle].border, STYLE_META[topStyle].bg
                )}>
                  <Swords className={cn("w-5 h-5", STYLE_META[topStyle].text)} />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {STYLE_ORDER.map(s => (
                <StyleBar key={s} style={s} pct={pcts?.[s] ?? 0} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!hasBattles && (
        <div className="text-center py-16 border border-dashed border-border/30 rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground text-sm font-medium">No battles recorded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Complete a workout session to generate your first battle report.</p>
        </div>
      )}

      {/* Battle list */}
      {hasBattles && (
        <div className="space-y-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground px-1">
            {battles.length} Battle{battles.length > 1 ? "s" : ""} Recorded
          </div>
          {battles.map((replay) => (
            <BattleCard key={replay.id} replay={replay} />
          ))}
        </div>
      )}
    </div>
  );
}
