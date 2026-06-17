import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import {
  useGetGuildMasterConversation,
  useGetQuests,
  useGetDailyQuest,
  useGetBossRaids,
  useGetPlayer,
  useCompleteQuestTask,
  useClaimQuestReward,
} from "@workspace/api-client-react";
import type { Quest, BossRaid, GuildMasterConversation } from "@workspace/api-client-react";
import {
  Landmark, Crown, MessageCircle, Shield, Swords,
  Star, Lock, Send, X, Loader2,
  Trophy, Flame, CheckCircle2, Clock, Calendar,
  BookOpen, Skull, Sparkles, ChevronRight,
  Scroll, Users, BarChart3, Map as MapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getGetQuestsQueryKey, getGetDailyQuestQueryKey, getGetGuildMasterConversationQueryKey } from "@workspace/api-client-react";

// ── Campaign Quest Data ──────────────────────────────────────────────────────

interface CampaignEntry {
  id: number;
  chapter: number;
  chapterName: string;
  title: string;
  desc: string;
  diff: "E" | "D" | "C" | "B" | "A" | "S";
  xp: number;
  gold: number;
}

const CAMPAIGN: CampaignEntry[] = [
  // Chapter 1 — The Awakening
  { id: 1,  chapter: 1, chapterName: "The Awakening",    title: "The Gate Opens",               desc: "Log your first training session to prove you answered the call.", diff: "E", xp: 120,  gold: 60 },
  { id: 2,  chapter: 1, chapterName: "The Awakening",    title: "Proving Your Worth",            desc: "The guild does not accept passengers. Complete 3 workouts.", diff: "E", xp: 200,  gold: 80 },
  { id: 3,  chapter: 1, chapterName: "The Awakening",    title: "The Registrar's Request",       desc: "Log your nutrition — the guild healer wants to assess your readiness.", diff: "E", xp: 160,  gold: 70 },
  { id: 4,  chapter: 1, chapterName: "The Awakening",    title: "Basic Rations",                 desc: "Hit your nutrition targets for 3 days. A hunter who starves is a liability.", diff: "E", xp: 190,  gold: 75 },
  { id: 5,  chapter: 1, chapterName: "The Awakening",    title: "Your First Record",             desc: "Don't train to maintain. Set your first personal record.", diff: "E", xp: 320,  gold: 110 },
  { id: 6,  chapter: 1, chapterName: "The Awakening",    title: "The Initiate's Trial",          desc: "Complete your first official daily quest from the guild board.", diff: "E", xp: 160,  gold: 65 },
  { id: 7,  chapter: 1, chapterName: "The Awakening",    title: "The Merchant's Favor",          desc: "Every tool has its time. Familiarize yourself with the guild store.", diff: "E", xp: 100,  gold: 200 },
  { id: 8,  chapter: 1, chapterName: "The Awakening",    title: "Foundations of Steel",          desc: "Chapter One complete. The foundations are solid. Now the real climb begins.", diff: "E", xp: 500,  gold: 250 },
  // Chapter 2 — The Climb
  { id: 9,  chapter: 2, chapterName: "The Climb",        title: "The Ranking Wall",              desc: "E-Rank is where every hunter begins. D-Rank is where the real ones stay.", diff: "D", xp: 550,  gold: 280 },
  { id: 10, chapter: 2, chapterName: "The Climb",        title: "Iron and Will",                 desc: "Strength is not a gift. Build it rep by rep in the quiet hours.", diff: "D", xp: 380,  gold: 160 },
  { id: 11, chapter: 2, chapterName: "The Climb",        title: "The Endless Road",              desc: "Power is useless if you collapse in the middle of a gate. Build endurance.", diff: "D", xp: 300,  gold: 130 },
  { id: 12, chapter: 2, chapterName: "The Climb",        title: "Mending Wounds",                desc: "Recovery is not weakness. It is the preparation between efforts.", diff: "D", xp: 220,  gold: 90 },
  { id: 13, chapter: 2, chapterName: "The Climb",        title: "The Seven-Day Oath",            desc: "Show the guild that discipline is not occasional. Maintain a 7-day streak.", diff: "D", xp: 560,  gold: 230 },
  { id: 14, chapter: 2, chapterName: "The Climb",        title: "The First Boss",                desc: "Entry-level boss raids exist to test whether you've been training or just showing up.", diff: "D", xp: 650,  gold: 320 },
  { id: 15, chapter: 2, chapterName: "The Climb",        title: "Proof of Progress",             desc: "Records exist to be broken. Break five of them.", diff: "D", xp: 480,  gold: 200 },
  { id: 16, chapter: 2, chapterName: "The Climb",        title: "A Warrior Emerges",             desc: "You are no longer an initiate. The next chapter will ask more of you.", diff: "D", xp: 700,  gold: 300 },
  // Chapter 3 — The Shadow Gate
  { id: 17, chapter: 3, chapterName: "The Shadow Gate",  title: "Darkness in the Valley",        desc: "A Shadow Gate has appeared northeast of the valley. Hunters are disappearing.", diff: "C", xp: 520,  gold: 220 },
  { id: 18, chapter: 3, chapterName: "The Shadow Gate",  title: "The Corrupted Forest",          desc: "The forest responds to weakness. You need to be well-rounded to survive.", diff: "C", xp: 440,  gold: 180 },
  { id: 19, chapter: 3, chapterName: "The Shadow Gate",  title: "Ancient Ruins Scouted",         desc: "The ruins near the shadow gate may hold clues — or traps. Move fast.", diff: "C", xp: 380,  gold: 155 },
  { id: 20, chapter: 3, chapterName: "The Shadow Gate",  title: "A Village Needs Aid",           desc: "You cannot protect others when you are running on empty.", diff: "C", xp: 420,  gold: 165 },
  { id: 21, chapter: 3, chapterName: "The Shadow Gate",  title: "The Siege Begins",              desc: "The shadow creatures are advancing. The guild needs hunters ready for heavy combat.", diff: "C", xp: 460,  gold: 190 },
  { id: 22, chapter: 3, chapterName: "The Shadow Gate",  title: "The Shadow General",            desc: "The shadow creatures are led by a General. You must end it.", diff: "C", xp: 780,  gold: 380 },
  { id: 23, chapter: 3, chapterName: "The Shadow Gate",  title: "Valley Reclaimed",              desc: "The Shadow General is gone. But shadows linger. Fourteen days to drive them back.", diff: "C", xp: 900,  gold: 380 },
  { id: 24, chapter: 3, chapterName: "The Shadow Gate",  title: "A Hunter Forged in Shadow",     desc: "Chapter Three complete. You survived the Shadow Gate. Most didn't even enter.", diff: "C", xp: 900,  gold: 400 },
  // Chapter 4 — The Higher Calling
  { id: 25, chapter: 4, chapterName: "The Higher Calling", title: "Whispers of the Sovereign Gate", desc: "New intelligence: a gate that doesn't want to be closed. Hunters who approach feel… unwilling to try harder.", diff: "B", xp: 1000, gold: 450 },
  { id: 26, chapter: 4, chapterName: "The Higher Calling", title: "The Grand Tournament",         desc: "The guild holds its annual tournament. Others are looking to you now.", diff: "B", xp: 660,  gold: 280 },
  { id: 27, chapter: 4, chapterName: "The Higher Calling", title: "The Master's Eye",             desc: "Ten records. That means you have pushed past yourself ten times.", diff: "B", xp: 750,  gold: 330 },
  { id: 28, chapter: 4, chapterName: "The Higher Calling", title: "The Forbidden Grounds",        desc: "A training site used by S-Rank hunters. You have been granted temporary access.", diff: "B", xp: 700,  gold: 310 },
  { id: 29, chapter: 4, chapterName: "The Higher Calling", title: "The Price of Power",           desc: "The memorial wall shows half the names who destroyed themselves through overtraining.", diff: "B", xp: 750,  gold: 320 },
  { id: 30, chapter: 4, chapterName: "The Higher Calling", title: "The Guild's Champion",         desc: "The guild sends its best to handle a C-Rank gate that has been growing for weeks. You are their best.", diff: "B", xp: 1100, gold: 550 },
  { id: 31, chapter: 4, chapterName: "The Higher Calling", title: "The Ascension",               desc: "B-Rank. Few hunters make it this far. The guild will ask more of you — and so will you.", diff: "B", xp: 1300, gold: 650 },
  { id: 32, chapter: 4, chapterName: "The Higher Calling", title: "A Light in the Darkness",     desc: "Chapter Four complete. You are not the same hunter who walked through those gates.", diff: "B", xp: 1100, gold: 550 },
  // Chapter 5 — The Sovereign
  { id: 33, chapter: 5, chapterName: "The Sovereign",    title: "The Stagnant World",            desc: "The Sovereign doesn't threaten with violence. It seduces with stillness. It makes you feel like enough.", diff: "A", xp: 1100, gold: 500 },
  { id: 34, chapter: 5, chapterName: "The Sovereign",    title: "Those Who Refused to Grow",     desc: "Hunters who fell to the Sovereign didn't die fighting. They simply… stopped.", diff: "A", xp: 1000, gold: 460 },
  { id: 35, chapter: 5, chapterName: "The Sovereign",    title: "Overcoming the Complacency Curse", desc: "Discipline is the greatest act of defiance against stagnation.", diff: "A", xp: 1200, gold: 560 },
  { id: 36, chapter: 5, chapterName: "The Sovereign",    title: "The Last Regiment",             desc: "The guild's final preparation. Six sessions in one week. Those who cannot are turned back.", diff: "A", xp: 1100, gold: 500 },
  { id: 37, chapter: 5, chapterName: "The Sovereign",    title: "Into the Sovereign's Domain",   desc: "A-Rank promotion. The gate is ahead. The Sovereign awaits.", diff: "A", xp: 1600, gold: 800 },
  { id: 38, chapter: 5, chapterName: "The Sovereign",    title: "The Mirror Trial",              desc: "Inside the gate, you face a perfect reflection of yourself — still, comfortable, unchanged.", diff: "A", xp: 1300, gold: 650 },
  { id: 39, chapter: 5, chapterName: "The Sovereign",    title: "The Final Gate",                desc: "The Sovereign waits at the heart. It is the embodiment of everything that ever told you that you were enough.", diff: "S", xp: 2200, gold: 1100 },
  { id: 40, chapter: 5, chapterName: "The Sovereign",    title: "The Sovereign Falls",           desc: "'What do you want to become next?' — Grandmaster Aldric", diff: "S", xp: 5000, gold: 2500 },
];

const CHAPTERS = [
  { num: 1, name: "The Awakening",     color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-700/40" },
  { num: 2, name: "The Climb",         color: "text-blue-400",    bg: "bg-blue-900/20",    border: "border-blue-700/40" },
  { num: 3, name: "The Shadow Gate",   color: "text-purple-400",  bg: "bg-purple-900/20",  border: "border-purple-700/40" },
  { num: 4, name: "The Higher Calling",color: "text-orange-400",  bg: "bg-orange-900/20",  border: "border-orange-700/40" },
  { num: 5, name: "The Sovereign",     color: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-700/40" },
];

const AMBIENT_TEXTS = [
  "A pair of D-rank hunters review their gate maps near the fireplace.",
  "The guild blacksmith sharpens blades at the forge in the corner.",
  "Three recruits practice basic stances in the training yard.",
  "A healer tends to a wounded hunter who just returned from a gate.",
  "The quartermaster inventories a fresh shipment of mana potions.",
  "Two merchants argue prices at the front counter.",
  "An old S-rank hunter reads silently by the window.",
  "The quest board rattles as a new mission is pinned.",
  "Rain begins to fall outside the guild hall's stone walls.",
  "The smell of lamp oil and old stone fills the hall.",
];

// ── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function diffColor(d: string) {
  return {
    E: "text-emerald-400 border-emerald-700/50 bg-emerald-900/20",
    D: "text-blue-400 border-blue-700/50 bg-blue-900/20",
    C: "text-purple-400 border-purple-700/50 bg-purple-900/20",
    B: "text-orange-400 border-orange-700/50 bg-orange-900/20",
    A: "text-red-400 border-red-700/50 bg-red-900/20",
    S: "text-yellow-300 border-yellow-600/50 bg-yellow-900/20",
  }[d] ?? "text-muted-foreground border-border bg-card";
}

function getCampaignQuestId(title: string): number | null {
  const m = title.match(/^\[Campaign\] Q(\d+):/);
  return m ? parseInt(m[1]) : null;
}

// ── Grand Master Portrait ────────────────────────────────────────────────────

function GrandmasterPortrait({ size = "md" }: { size?: "sm" | "md" }) {
  const w = size === "sm" ? "w-16 h-22" : "w-24 h-32";
  return (
    <div className={cn("relative rounded-lg overflow-hidden border-2 border-amber-700/60 shadow-xl shadow-amber-900/30 flex-shrink-0", size === "sm" ? "w-16 h-[88px]" : "w-24 h-32")}>
      <div className="absolute inset-0 bg-gradient-radial from-amber-950/60 via-stone-900 to-stone-950" style={{ background: "radial-gradient(ellipse at 50% 20%, #78350f55 0%, #1c1917 55%, #0c0a09 100%)" }} />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        {/* Cloak shadow */}
        <path d="M22 42 Q8 68 14 108 L50 118 L86 108 Q92 68 78 42 Z" fill="#0d0a07" />
        {/* Hood */}
        <ellipse cx="50" cy="38" rx="25" ry="27" fill="#1a0d05" />
        {/* Face */}
        <ellipse cx="50" cy="47" rx="14" ry="17" fill="#7a5c3e" />
        {/* White/silver hair */}
        <path d="M36 28 Q40 20 50 18 Q60 20 64 28" fill="none" stroke="#b0b0a8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M36 28 Q29 37 31 47" fill="none" stroke="#989890" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M64 28 Q71 37 69 47" fill="none" stroke="#989890" strokeWidth="1.5" strokeLinecap="round" />
        {/* Eyes */}
        <ellipse cx="44" cy="45" rx="2.8" ry="2.2" fill="#1a0d05" />
        <ellipse cx="56" cy="45" rx="2.8" ry="2.2" fill="#1a0d05" />
        {/* Eye glint */}
        <ellipse cx="43.5" cy="44" rx="0.9" ry="0.8" fill="#d97706" opacity="0.6" />
        <ellipse cx="55.5" cy="44" rx="0.9" ry="0.8" fill="#d97706" opacity="0.6" />
        {/* Battle scar */}
        <line x1="52" y1="34" x2="59" y2="53" stroke="#5a3820" strokeWidth="1.2" />
        {/* Beard */}
        <path d="M38 59 Q50 70 62 59 Q59 77 50 80 Q41 77 38 59 Z" fill="#8b6b4e" />
        {/* Beard gray streaks */}
        <path d="M46 62 Q48 72 50 74" fill="none" stroke="#a09080" strokeWidth="1" strokeLinecap="round" />
        <path d="M54 62 Q52 72 50 74" fill="none" stroke="#a09080" strokeWidth="1" strokeLinecap="round" />
        {/* Shoulder armor */}
        <path d="M18 98 Q12 112 16 128 L50 125 L84 128 Q88 112 82 98 Z" fill="#1e1610" />
        {/* Chest armor detail */}
        <path d="M32 98 Q50 92 68 98 L70 125 L30 125 Z" fill="#231a10" />
        {/* Gold insignia */}
        <polygon points="50,93 52,99 58,99 53,103 55,109 50,105 45,109 47,103 42,99 48,99" fill="#c4952a" />
        {/* Armor rivets */}
        <circle cx="28" cy="104" r="2" fill="#3a2d1a" />
        <circle cx="72" cy="104" r="2" fill="#3a2d1a" />
      </svg>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent py-1 text-center">
        <span className="text-[7px] font-bold tracking-widest text-amber-500 uppercase">Grandmaster</span>
      </div>
    </div>
  );
}

// ── Quest Task Row ───────────────────────────────────────────────────────────

function QuestTaskRow({
  task,
  questId,
  questStatus,
}: {
  task: { id: number; description: string; completed: boolean; targetValue?: number | null; currentValue?: number | null; unit?: string | null };
  questId: number;
  questStatus: string;
}) {
  const qc = useQueryClient();
  const completeTask = useCompleteQuestTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
      },
    },
  });

  return (
    <div className={cn("flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors", task.completed ? "opacity-60" : "hover:bg-white/5")}>
      <button
        className="flex-shrink-0 mt-0.5"
        disabled={task.completed || questStatus === "claimed" || completeTask.isPending}
        onClick={() => completeTask.mutate({ id: questId, data: { taskId: task.id } })}
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 hover:border-amber-500 transition-colors" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn("text-xs leading-tight", task.completed ? "line-through text-muted-foreground" : "text-foreground/80")}>
          {task.description}
        </span>
        {task.targetValue && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(100, ((task.currentValue ?? 0) / task.targetValue) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {task.currentValue ?? 0}/{task.targetValue} {task.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quest Card ───────────────────────────────────────────────────────────────

function QuestCard({ quest, compact = false }: { quest: Quest; compact?: boolean }) {
  const [expanded, setExpanded] = useState(!compact);
  const qc = useQueryClient();
  const { toast } = useToast();
  const claim = useClaimQuestReward({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDailyQuestQueryKey() });
        toast({ title: "Reward claimed!", description: `+${quest.xpReward} XP • +${quest.goldReward} Gold` });
      },
    },
  });

  const allDone = quest.tasks.every((t) => t.completed);
  const canClaim = quest.status === "completed" || (allDone && quest.status === "active");
  const isClaimed = quest.status === "claimed";

  const diffClass = diffColor(quest.difficulty ?? "E");

  return (
    <Card className={cn("border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden", isClaimed && "opacity-60")}>
      <div
        className={cn("flex items-start gap-3 p-3 cursor-pointer", compact && "hover:bg-white/5")}
        onClick={() => compact && setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">{quest.title}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", diffClass)}>
              {quest.difficulty ?? "E"}
            </Badge>
            {isClaimed && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-400 border-emerald-700/50">Claimed</Badge>}
          </div>
          {(!compact || expanded) && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{quest.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xs font-medium text-amber-400">+{quest.xpReward} XP</div>
          <div className="text-[10px] text-amber-600/80">+{quest.goldReward}g</div>
        </div>
      </div>

      {(!compact || expanded) && (
        <div className="px-3 pb-3 space-y-0.5">
          {quest.tasks.map((t) => (
            <QuestTaskRow key={t.id} task={t} questId={quest.id} questStatus={quest.status} />
          ))}
          {canClaim && !isClaimed && (
            <Button
              size="sm"
              className="w-full mt-2 bg-amber-600 hover:bg-amber-500 text-white text-xs"
              onClick={() => claim.mutate({ id: quest.id })}
              disabled={claim.isPending}
            >
              {claim.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trophy className="w-3 h-3 mr-1" />}
              Claim Reward
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Campaign Quest Card ──────────────────────────────────────────────────────

function CampaignQuestCard({
  entry,
  dbQuest,
  isLocked,
  isNext,
  onStart,
  starting,
}: {
  entry: CampaignEntry;
  dbQuest?: Quest;
  isLocked: boolean;
  isNext: boolean;
  onStart: (id: number) => void;
  starting: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const chap = CHAPTERS.find((c) => c.num === entry.chapter)!;
  const isClaimed = dbQuest?.status === "claimed";
  const isActive = dbQuest && !isClaimed;

  return (
    <Card
      className={cn(
        "border overflow-hidden transition-all",
        isLocked && !isNext ? "opacity-40 border-border/30 bg-card/30" : "border-border/50 bg-card/60 backdrop-blur-sm",
        isNext && !dbQuest && "border-amber-700/60 bg-amber-950/10",
        isClaimed && "border-emerald-800/40 opacity-70",
      )}
    >
      <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
        <div className="flex-shrink-0 mt-0.5">
          {isClaimed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : isLocked ? (
            <Lock className="w-5 h-5 text-muted-foreground/40" />
          ) : isNext && !dbQuest ? (
            <Sparkles className="w-5 h-5 text-amber-400" />
          ) : (
            <Scroll className="w-5 h-5 text-amber-500/70" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-medium", chap.color)}>{chap.name}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold text-foreground leading-tight">{entry.title}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", diffColor(entry.diff))}>
              {entry.diff}
            </Badge>
          </div>
          {expanded && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.desc}</p>}
        </div>
        <div className="flex-shrink-0 text-right text-[10px] text-muted-foreground">
          <div className="text-xs font-medium text-amber-500/80">+{entry.xp} XP</div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          {dbQuest && isActive && (
            <>
              <div className="space-y-0.5 mb-2">
                {dbQuest.tasks.map((t) => (
                  <QuestTaskRow key={t.id} task={t} questId={dbQuest.id} questStatus={dbQuest.status} />
                ))}
              </div>
            </>
          )}
          {dbQuest && (dbQuest.status === "completed" || dbQuest.tasks.every((t) => t.completed)) && !isClaimed && (
            <ClaimInline questId={dbQuest.id} xp={entry.xp} gold={entry.gold} />
          )}
          {!dbQuest && !isLocked && (
            <Button
              size="sm"
              className="w-full bg-amber-700 hover:bg-amber-600 text-white text-xs"
              disabled={starting === entry.id}
              onClick={(e) => { e.stopPropagation(); onStart(entry.id); }}
            >
              {starting === entry.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Swords className="w-3 h-3 mr-1" />}
              Accept Mission
            </Button>
          )}
          {isClaimed && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
              <CheckCircle2 className="w-3.5 h-3.5" /> Mission complete
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ClaimInline({ questId, xp, gold }: { questId: number; xp: number; gold: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const claim = useClaimQuestReward({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
        toast({ title: "Mission reward claimed!", description: `+${xp} XP • +${gold} Gold` });
      },
    },
  });
  return (
    <Button
      size="sm"
      className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs"
      onClick={() => claim.mutate({ id: questId })}
      disabled={claim.isPending}
    >
      {claim.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trophy className="w-3 h-3 mr-1" />}
      Claim Reward
    </Button>
  );
}

// ── Guild Master Chat Modal ──────────────────────────────────────────────────

function GuildMasterChatModal({
  open,
  onClose,
  conversationData,
  narrativeMode = "balanced",
}: {
  open: boolean;
  onClose: () => void;
  conversationData?: GuildMasterConversation;
  narrativeMode?: "technical" | "balanced" | "immersive";
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversationData && chatMessages.length === 0) {
      setChatMessages(
        conversationData.messages.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    }
  }, [conversationData]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    const convId = conversationData?.conversationId;
    if (!text || !convId || isStreaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsStreaming(true);

    const streamingId = `s-${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: streamingId, role: "assistant", content: "", streaming: true }]);

    try {
      const res = await fetch("/api/guild-master/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, conversationId: convId, narrativeMode }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              full += data.content;
              setChatMessages((prev) =>
                prev.map((m) => (m.id === streamingId ? { ...m, content: full } : m))
              );
            }
            if (data.done) {
              setChatMessages((prev) =>
                prev.map((m) => (m.id === streamingId ? { ...m, streaming: false } : m))
              );
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, content: "(Grandmaster Aldric is momentarily unavailable. Try again shortly.)", streaming: false }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [inputText, conversationData, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = chatMessages.length === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex flex-col h-[92dvh] max-w-lg w-full p-0 bg-stone-950 border-amber-800/40 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-800/30 bg-stone-900/60 flex-shrink-0">
          <GrandmasterPortrait size="sm" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-400 text-sm">Grandmaster Aldric</div>
            <div className="text-xs text-muted-foreground">Guild Master · S-Rank (Retired)</div>
            <div className={cn("flex items-center gap-1 text-[10px] mt-0.5", isStreaming ? "text-amber-400/70" : "text-emerald-500/70")}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isStreaming ? "bg-amber-400 animate-pulse" : "bg-emerald-500")} />
              {isStreaming ? "Grandmaster is responding…" : "Available"}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="flex-shrink-0 text-muted-foreground" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
          <div className="px-4 py-4 space-y-4">
            {isEmpty && (
              <div className="text-center py-8">
                <div className="text-amber-500/30 text-4xl mb-3">⚔</div>
                <p className="text-sm text-muted-foreground/60 italic">
                  "Ask me anything — about your training, your progress, or what lies ahead."
                </p>
                <p className="text-xs text-muted-foreground/40 mt-1">— Grandmaster Aldric</p>
              </div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-900/40 border border-amber-700/40 flex items-center justify-center text-amber-400 text-xs font-bold mt-0.5">
                    A
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2.5 rounded-xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary/20 border border-primary/30 text-foreground rounded-tr-sm"
                      : "bg-stone-900 border border-amber-900/30 text-foreground/90 rounded-tl-sm"
                  )}
                >
                  {msg.content}
                  {msg.streaming && msg.content.length === 0 && (
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="w-1 h-1 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-amber-800/30 bg-stone-900/60 px-3 py-3">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak with the Grandmaster…"
              className="flex-1 resize-none min-h-[40px] max-h-[100px] text-sm bg-stone-950/60 border-amber-800/30 focus:border-amber-600/50 placeholder:text-muted-foreground/40"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputText.trim() || isStreaming}
              className="flex-shrink-0 bg-amber-700 hover:bg-amber-600 text-white h-10 w-10"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function GuildHall() {
  const [chatOpen, setChatOpen] = useState(false);
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [startingCampaignId, setStartingCampaignId] = useState<number | null>(null);
  const [report, setReport] = useState<{ text: string; month: number; year: number } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { settings } = useSettings();

  const { data: player } = useGetPlayer();
  const { data: allQuests = [] } = useGetQuests();
  const { data: dailyQuest } = useGetDailyQuest();
  const { data: bossRaids = [] } = useGetBossRaids();
  const { data: convData } = useGetGuildMasterConversation();

  // Rotate ambient text
  useEffect(() => {
    const t = setInterval(() => setAmbientIdx((i) => (i + 1) % AMBIENT_TEXTS.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Quest filtering
  const weeklyQuests = allQuests.filter((q) => q.type === "weekly");
  const mainQuests = allQuests.filter((q) => q.type === "main");
  const sideQuests = allQuests.filter((q) => q.type === "side");
  const completedQuests = allQuests.filter((q) => q.status === "claimed");
  const activeQuests = allQuests.filter((q) => q.status === "active" || q.status === "completed");

  // Campaign quest DB mapping
  const campaignDbMap = new Map<number, Quest>();
  for (const q of mainQuests) {
    const cid = getCampaignQuestId(q.title);
    if (cid) campaignDbMap.set(cid, q);
  }

  // Determine highest completed campaign quest
  let highestCompleted = 0;
  for (const [cid, q] of campaignDbMap.entries()) {
    if (q.status === "claimed" && cid > highestCompleted) highestCompleted = cid;
  }
  const nextCampaignId = highestCompleted + 1;

  const handleStartCampaignQuest = async (campaignId: number) => {
    setStartingCampaignId(campaignId);
    try {
      const res = await fetch(`/api/guild-master/campaign-quests/${campaignId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 && err.quest) {
          // Already started - just refresh
          qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
          return;
        }
        throw new Error("Failed to start quest");
      }
      qc.invalidateQueries({ queryKey: getGetQuestsQueryKey() });
      toast({ title: "Mission accepted!", description: "The guild record has been updated." });
    } catch {
      toast({ title: "Could not start quest", variant: "destructive" });
    } finally {
      setStartingCampaignId(null);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const now = new Date();
      const res = await fetch(`/api/guild-master/monthly-report?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReport({ text: data.reportText, month: data.month, year: data.year });
    } catch {
      toast({ title: "The report could not be retrieved at this time.", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const currentChapter = CAMPAIGN.find((q) => campaignDbMap.get(q.id)?.status === "active")?.chapter
    ?? CAMPAIGN.find((q) => q.id === nextCampaignId)?.chapter
    ?? 1;

  // Group campaign quests by chapter
  const byChapter = CHAPTERS.map((ch) => ({
    ...ch,
    quests: CAMPAIGN.filter((q) => q.chapter === ch.num),
  }));

  const rankLabel = player?.rank ?? "E";
  const levelLabel = player?.level ?? 1;
  const streakLabel = player?.streakDays ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Landmark className="w-5 h-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Guild Hall</h1>
            <p className="text-[10px] text-muted-foreground/70 italic transition-opacity duration-1000 line-clamp-1">
              {AMBIENT_TEXTS[ambientIdx]}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-4 pt-4">
        {/* Guild Master Section */}
        <Card className="border border-amber-800/40 bg-gradient-to-br from-amber-950/30 via-stone-900/40 to-stone-950/20 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4 items-start">
              <GrandmasterPortrait />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold text-base">Grandmaster Aldric</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-700/50 text-amber-500/80">S-Rank</Badge>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1 italic leading-relaxed">
                  "The hall is never empty. Some days the missions are urgent. Other days, the most important work is the conversation at the fire."
                </p>
                <div className="mt-3 space-y-1.5">
                  {streakLabel > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                      <Flame className="w-3 h-3" />
                      <span>{streakLabel}-day training streak — Aldric has noticed.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                      <Clock className="w-3 h-3" />
                      <span>The board shows no recent training activity.</span>
                    </div>
                  )}
                </div>
                <Button
                  className="mt-3 w-full bg-amber-800/60 hover:bg-amber-700/80 border border-amber-700/50 text-amber-200 text-xs h-8"
                  onClick={() => setChatOpen(true)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  Speak with the Grandmaster
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Status Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Badge variant="outline" className="whitespace-nowrap text-xs border-amber-700/50 text-amber-400 bg-amber-900/20 px-2.5 py-1 flex-shrink-0">
            <Crown className="w-3 h-3 mr-1" />{rankLabel}-Rank
          </Badge>
          <Badge variant="outline" className="whitespace-nowrap text-xs border-border/50 text-foreground/70 px-2.5 py-1 flex-shrink-0">
            Lv. {levelLabel}
          </Badge>
          {streakLabel > 0 && (
            <Badge variant="outline" className="whitespace-nowrap text-xs border-orange-700/40 text-orange-400 bg-orange-900/10 px-2.5 py-1 flex-shrink-0">
              <Flame className="w-3 h-3 mr-1" />{streakLabel}d streak
            </Badge>
          )}
          <Badge variant="outline" className={cn("whitespace-nowrap text-xs px-2.5 py-1 flex-shrink-0", CHAPTERS.find(c=>c.num===currentChapter)?.border ?? "", CHAPTERS.find(c=>c.num===currentChapter)?.color ?? "", CHAPTERS.find(c=>c.num===currentChapter)?.bg ?? "")}>
            <MapIcon className="w-3 h-3 mr-1" />Ch.{currentChapter}: {CHAPTERS.find(c=>c.num===currentChapter)?.name}
          </Badge>
        </div>

        {/* Tab System */}
        <Tabs defaultValue="daily">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-card/40 border border-border/50 p-1 rounded-xl">
            {[
              { v: "daily",    label: "Daily",    icon: <Clock className="w-3 h-3" /> },
              { v: "weekly",   label: "Weekly",   icon: <Calendar className="w-3 h-3" /> },
              { v: "campaign", label: "Campaign", icon: <Scroll className="w-3 h-3" /> },
              { v: "side",     label: "Side",     icon: <MapIcon className="w-3 h-3" /> },
              { v: "raids",    label: "Raids",    icon: <Skull className="w-3 h-3" /> },
              { v: "done",     label: "Done",     icon: <CheckCircle2 className="w-3 h-3" /> },
              { v: "records",  label: "Records",  icon: <Trophy className="w-3 h-3" /> },
              { v: "log",      label: "Log",      icon: <BookOpen className="w-3 h-3" /> },
              { v: "report",   label: "Report",   icon: <Sparkles className="w-3 h-3" /> },
            ].map(({ v, label, icon }) => (
              <TabsTrigger key={v} value={v} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg flex-shrink-0">
                {icon}{label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── DAILY ── */}
          <TabsContent value="daily" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">Today's Quest</h2>
              <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />Resets at midnight
              </span>
            </div>
            {dailyQuest ? (
              <QuestCard quest={dailyQuest} />
            ) : (
              <div className="text-center py-8 text-muted-foreground/50 text-sm">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No daily quest yet.</p>
                <p className="text-xs mt-1">Complete a training session to unlock today's mission.</p>
              </div>
            )}
          </TabsContent>

          {/* ── WEEKLY ── */}
          <TabsContent value="weekly" className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Weekly Missions</h2>
            {weeklyQuests.filter(q => q.status !== "claimed").length > 0 ? (
              weeklyQuests.filter(q => q.status !== "claimed").map(q => <QuestCard key={q.id} quest={q} compact />)
            ) : (
              <div className="text-center py-8 text-muted-foreground/50 text-sm">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No active weekly missions.</p>
                <p className="text-xs mt-1">Weekly missions reset every Monday.</p>
              </div>
            )}
          </TabsContent>

          {/* ── CAMPAIGN ── */}
          <TabsContent value="campaign" className="mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">The Grand Campaign</h2>
              <span className="text-xs text-muted-foreground/60">{highestCompleted}/40 complete</span>
            </div>
            {byChapter.map((ch) => (
              <div key={ch.num} className="space-y-2">
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border", ch.bg, ch.border)}>
                  <span className={cn("text-xs font-bold", ch.color)}>Chapter {ch.num}</span>
                  <span className="text-xs text-muted-foreground/80">— {ch.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground/50">
                    {ch.quests.filter(q => campaignDbMap.get(q.id)?.status === "claimed").length}/{ch.quests.length}
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {ch.quests.map((entry) => {
                    const dbQ = campaignDbMap.get(entry.id);
                    const isLocked = entry.id > nextCampaignId;
                    const isNext = entry.id === nextCampaignId;
                    return (
                      <CampaignQuestCard
                        key={entry.id}
                        entry={entry}
                        dbQuest={dbQ}
                        isLocked={isLocked}
                        isNext={isNext}
                        onStart={handleStartCampaignQuest}
                        starting={startingCampaignId}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── SIDE QUESTS ── */}
          <TabsContent value="side" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">Side Missions</h2>
              <span className="text-xs text-muted-foreground/60">{sideQuests.filter(q=>q.status!=="claimed").length} active</span>
            </div>
            {sideQuests.filter(q => q.status !== "claimed").length > 0 ? (
              sideQuests.filter(q => q.status !== "claimed").map(q => <QuestCard key={q.id} quest={q} compact />)
            ) : (
              <div className="text-center py-8 text-muted-foreground/50 text-sm space-y-2">
                <MapIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>The guild board has no open side missions.</p>
                <p className="text-xs">Complete your daily and weekly missions — new side missions become available as you advance.</p>
              </div>
            )}
          </TabsContent>

          {/* ── RAIDS ── */}
          <TabsContent value="raids" className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Boss Raids</h2>
            {bossRaids.length > 0 ? (
              <div className="space-y-2">
                {(bossRaids as BossRaid[]).map((raid) => (
                  <Card key={raid.id} className="border border-red-900/40 bg-red-950/10 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <Skull className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">{raid.title}</div>
                        <div className="text-xs text-muted-foreground">{raid.description}</div>
                      </div>
                      <Badge variant="outline" className="text-xs border-red-800/50 text-red-400 flex-shrink-0">
                        {(raid as any).difficulty ?? "B"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground/50 text-sm">
                <Skull className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No active boss raids.</p>
                <p className="text-xs mt-1">Continue training to unlock gate incursions.</p>
              </div>
            )}
          </TabsContent>

          {/* ── COMPLETED ── */}
          <TabsContent value="done" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">Completed Missions</h2>
              <span className="text-xs text-muted-foreground/60">{completedQuests.length} total</span>
            </div>
            {completedQuests.length > 0 ? (
              completedQuests.slice().reverse().slice(0, 20).map(q => <QuestCard key={q.id} quest={q} compact />)
            ) : (
              <div className="text-center py-8 text-muted-foreground/50 text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No completed missions yet.</p>
                <p className="text-xs mt-1">Claim rewards on finished quests to see them here.</p>
              </div>
            )}
          </TabsContent>

          {/* ── RECORDS ── */}
          <TabsContent value="records" className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Guild Records</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Rank", value: rankLabel + "-Rank", icon: <Crown className="w-4 h-4 text-amber-400" />, color: "text-amber-400" },
                { label: "Level", value: String(levelLabel), icon: <Star className="w-4 h-4 text-blue-400" />, color: "text-blue-400" },
                { label: "Training Streak", value: `${streakLabel}d`, icon: <Flame className="w-4 h-4 text-orange-400" />, color: "text-orange-400" },
                { label: "Campaign Progress", value: `${highestCompleted}/40`, icon: <Scroll className="w-4 h-4 text-purple-400" />, color: "text-purple-400" },
                { label: "Missions Cleared", value: String(completedQuests.length), icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: "text-emerald-400" },
                { label: "Active Missions", value: String(activeQuests.length), icon: <Swords className="w-4 h-4 text-red-400" />, color: "text-red-400" },
              ].map(({ label, value, icon, color }) => (
                <Card key={label} className="border border-border/40 bg-card/50 p-3">
                  <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
                  <div className={cn("text-xl font-bold", color)}>{value}</div>
                </Card>
              ))}
            </div>
            <Card className="border border-amber-800/30 bg-amber-950/10 p-4 mt-2">
              <div className="text-xs text-amber-400/70 italic text-center leading-relaxed">
                "Every number on this board represents a choice you made to show up when it would have been easier not to."
              </div>
              <div className="text-[10px] text-muted-foreground/40 text-center mt-1">— Grandmaster Aldric</div>
            </Card>
          </TabsContent>
          {/* ── BATTLE LOG ── */}
          <TabsContent value="log" className="mt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground/80">Battle Log</h2>
            <Card className="border border-cyan-900/40 bg-cyan-950/10 p-4">
              <p className="text-xs text-muted-foreground/70 mb-1 leading-relaxed">
                Every completed training session is converted into a battle chronicle — encounter, enemy, combat style, and victory summary.
              </p>
              <p className="text-[11px] text-muted-foreground/50 mb-4 italic">
                "The logbook does not lie. It shows what was done, not what was intended." — Aldric
              </p>
              <Link href="/battle-log">
                <Button className="w-full bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/40 text-cyan-300 text-xs h-9">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />Open Battle Chronicles
                </Button>
              </Link>
            </Card>
          </TabsContent>

          {/* ── MONTHLY REPORT ── */}
          <TabsContent value="report" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/80">Monthly Guild Assessment</h2>
              <span className="text-[10px] text-muted-foreground/50">Official review</span>
            </div>
            {report ? (
              <Card className="border border-amber-800/40 bg-amber-950/10 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-800/30">
                  <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">
                    {new Date(report.year, report.month - 1).toLocaleString("en-US", { month: "long", year: "numeric" })} — Field Assessment
                  </span>
                </div>
                <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{report.text}</div>
                <div className="mt-4 pt-3 border-t border-amber-800/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/40 italic">Sealed and filed by the Guild Master</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] text-amber-600/60 hover:text-amber-400 h-6 px-2"
                    onClick={() => setReport(null)}
                  >
                    View another month
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card className="border border-border/40 bg-card/50 p-5 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500/30" />
                  <p className="text-sm text-foreground/70 font-medium mb-1">Current Month Report</p>
                  <p className="text-xs text-muted-foreground/60 mb-4 leading-relaxed">
                    Grandmaster Aldric reviews your full guild record — training, nutrition, quests, raids, and recovery — and files an official performance assessment.
                  </p>
                  <Button
                    onClick={generateReport}
                    disabled={reportLoading}
                    className="bg-amber-800/60 hover:bg-amber-700/80 border border-amber-700/50 text-amber-200 text-xs h-9 px-5"
                  >
                    {reportLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Aldric is reviewing your record…</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Request Monthly Assessment</>
                    )}
                  </Button>
                </Card>
                <Card className="border border-amber-800/30 bg-amber-950/10 p-3">
                  <p className="text-[11px] text-amber-400/60 italic text-center leading-relaxed">
                    "Every number on that board represents a choice you made to show up when it would have been easier not to."
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 text-center mt-1">— Grandmaster Aldric</p>
                </Card>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* GM Chat Modal */}
      <GuildMasterChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        conversationData={convData}
        narrativeMode={settings.narrative.intensity}
      />
    </div>
  );
}
