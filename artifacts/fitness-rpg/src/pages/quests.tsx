import { useState } from "react";
import {
  useGetQuests,
  useGetCampaignStory,
  useClaimQuestReward,
  useCompleteQuestTask,
  type CampaignStoryQuest,
  type CampaignStoryChapter,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flag,
  Gift,
  Lock,
  Scroll,
  Swords,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DIFF_COLOR: Record<string, string> = {
  E: "text-gray-400 border-gray-600/40",
  D: "text-green-400 border-green-600/40",
  C: "text-blue-400 border-blue-600/40",
  B: "text-purple-400 border-purple-600/40",
  A: "text-orange-400 border-orange-600/40",
  S: "text-yellow-400 border-yellow-500/40",
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  claimed:   { label: "Completed",      color: "text-green-400",  icon: CheckCircle },
  completed: { label: "Claim Reward",   color: "text-yellow-400", icon: Gift },
  active:    { label: "In Progress",    color: "text-cyan-400",   icon: Swords },
  locked:    { label: "???",            color: "text-[#6b5d4f]",  icon: Lock },
};

function QuestStoryCard({ quest }: { quest: CampaignStoryQuest }) {
  const [open, setOpen] = useState(quest.status === "active" || quest.status === "completed");
  const meta = STATUS_META[quest.status] ?? STATUS_META.locked;
  const StatusIcon = meta.icon;
  const isLocked = quest.status === "locked";
  const diffClass = quest.difficulty ? DIFF_COLOR[quest.difficulty] : "text-[#6b5d4f] border-[#3b3328]";

  return (
    <div className={cn("border bg-card/30 transition-colors", isLocked ? "border-border/30 opacity-60" : "border-border/60")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <StatusIcon className={cn("size-4 shrink-0", meta.color)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-sm font-bold">{quest.title}</span>
            {quest.difficulty && (
              <span className={cn("border px-1 text-[10px] font-mono uppercase", diffClass)}>{quest.difficulty}</span>
            )}
          </div>
          <p className={cn("text-[10px] font-mono", meta.color)}>{meta.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground">
          <span className="text-primary">+{quest.xpReward} XP</span>
          {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
          <p className={cn("text-xs leading-relaxed", isLocked ? "text-muted-foreground/60 italic" : "text-muted-foreground")}>
            {quest.description}
          </p>

          {quest.lore && (
            <div className="border-l-2 border-accent/50 bg-accent/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-accent/70 mb-1">Guild Lore</p>
              <p className="text-xs leading-relaxed text-foreground/80 italic">{quest.lore}</p>
            </div>
          )}

          {quest.fitnessMapping && !isLocked && (
            <p className="text-[10px] text-muted-foreground/70">
              <span className="font-mono uppercase text-muted-foreground">Objective:</span> {quest.fitnessMapping}
            </p>
          )}

          <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
            <span className="text-primary">+{quest.xpReward} XP</span>
            <span className="text-yellow-500">+{quest.goldReward} Gold</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterSection({ chapter, defaultOpen }: { chapter: CampaignStoryChapter; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const completedCount = chapter.quests.filter((q) => q.status === "claimed").length;
  const totalRevealed = chapter.quests.filter((q) => q.status !== "locked").length;
  const isLocked = chapter.status === "locked";

  return (
    <div className={cn("border", isLocked ? "border-border/30" : "border-border/60")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 bg-card/50 px-4 py-3 text-left"
      >
        <div className={cn("flex size-7 shrink-0 items-center justify-center border font-mono text-xs font-bold",
          chapter.status === "completed" ? "border-green-600/40 text-green-400" :
          chapter.status === "active"    ? "border-accent/40 text-accent" :
                                          "border-border/40 text-muted-foreground"
        )}>
          {chapter.status === "completed" ? "✓" : isLocked ? "?" : chapter.chapter}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-serif text-sm font-bold", isLocked ? "text-muted-foreground/50" : "text-foreground")}>
            {isLocked ? `Chapter ${chapter.chapter} — ???` : `Ch. ${chapter.chapter}: ${chapter.chapterName}`}
          </p>
          {!isLocked && (
            <p className="text-[10px] text-muted-foreground">{completedCount}/{totalRevealed} completed</p>
          )}
        </div>
        {open ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border/30">
          {chapter.quests.map((quest) => (
            <QuestStoryCard key={quest.campaignId} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignStoryView() {
  const { data: story, isLoading } = useGetCampaignStory({ query: { queryKey: ["/api/campaign/story"] } });

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );

  if (!story) return (
    <div className="border border-dashed border-border/50 bg-card/20 py-10 text-center">
      <Flag className="mx-auto mb-3 size-8 text-muted-foreground/40" />
      <p className="font-serif text-sm font-bold">Campaign unavailable</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
        <p className="text-[10px] uppercase tracking-widest text-accent/70 mb-1 font-mono">Current Position</p>
        <p className="font-serif font-bold">
          Chapter {story.currentChapter}
          {story.currentQuestTitle && <span className="font-normal text-muted-foreground"> — {story.currentQuestTitle}</span>}
        </p>
      </div>

      {story.chapters.map((chapter) => (
        <ChapterSection
          key={chapter.chapter}
          chapter={chapter}
          defaultOpen={chapter.status === "active"}
        />
      ))}
    </div>
  );
}

export default function Quests() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const { data: quests, isLoading } = useGetQuests();
  const claimReward = useClaimQuestReward();
  const completeTask = useCompleteQuestTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleClaim = (questId: number) => {
    claimReward.mutate(
      { id: questId },
      {
        onSuccess: (data) => {
          toast({
            title: "Reward Claimed!",
            description: `Gained ${data.xpEarned} XP and ${data.goldEarned} Gold.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/quests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        }
      }
    );
  };

  const handleTaskToggle = (questId: number, taskId: number, isCompleted: boolean) => {
    if (isCompleted) return;
    completeTask.mutate(
      { id: questId, data: { taskId, value: null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/quests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quest Board" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const filteredQuests = activeTab === "all" ? quests : quests?.filter(q => q.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Quest Board" subtitle="Fulfill your destiny" />

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="w-full bg-black/40 border border-border/50 overflow-x-auto flex justify-start rounded-md p-1 h-12">
          <TabsTrigger value="all" className="min-w-fit">All</TabsTrigger>
          <TabsTrigger value="daily" className="min-w-fit">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="min-w-fit">Weekly</TabsTrigger>
          <TabsTrigger value="main" className="min-w-fit">Campaign</TabsTrigger>
          <TabsTrigger value="side" className="min-w-fit">Side</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="pt-4">
          <CampaignStoryView />
        </TabsContent>

        <TabsContent value={activeTab === "main" ? "__never__" : activeTab} className="space-y-4 pt-4">
          {filteredQuests?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground border border-border/50 rounded-lg bg-card/20">
              No quests available in this category.
            </div>
          )}

          {filteredQuests?.map(quest => (
            <Card key={quest.id} className="border-border/50 bg-card/50 overflow-hidden relative">
              <div className={`absolute top-0 left-0 w-1 h-full ${quest.status === 'completed' ? 'bg-success' : 'bg-accent'}`} />
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Scroll className={`w-4 h-4 ${quest.status === 'completed' ? 'text-success' : 'text-accent'}`} />
                      <span className={`text-[10px] font-mono uppercase border px-1 rounded-sm ${quest.status === 'completed' ? 'text-success border-success/30 bg-success/10' : 'text-accent border-accent/30 bg-accent/10'}`}>
                        {quest.type}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-lg">{quest.title}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-primary">+{quest.xpReward} XP</div>
                    <div className="text-xs font-mono text-gold">+{quest.goldReward} G</div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4">{quest.description}</p>

                <div className="space-y-2 mb-4">
                  {quest.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskToggle(quest.id, task.id, task.completed)}
                      disabled={task.completed || completeTask.isPending}
                      className="w-full flex items-center gap-3 text-sm font-mono bg-black/20 p-2 rounded border border-border/30 hover:bg-black/40 transition-colors text-left disabled:cursor-default"
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${task.completed ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground'}`}>
                        {task.completed && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span className={task.completed ? "text-muted-foreground line-through flex-1" : "text-foreground flex-1"}>
                        {task.description}
                      </span>
                      {task.targetValue && !task.completed && (
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {task.currentValue || 0}/{task.targetValue}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {quest.status === 'completed' && (
                  <Button
                    onClick={() => handleClaim(quest.id)}
                    className="w-full bg-success hover:bg-success/80 text-success-foreground shadow-[0_0_15px_hsl(var(--success)/0.3)]"
                    disabled={claimReward.isPending}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Reward
                  </Button>
                )}
                {quest.status === 'claimed' && (
                  <div className="text-center text-xs font-mono text-muted-foreground border border-border/50 py-2 rounded bg-black/20">
                    Reward Claimed
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
