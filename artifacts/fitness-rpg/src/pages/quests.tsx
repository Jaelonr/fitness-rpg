import { useState } from "react";
import { useGetQuests, useClaimQuestReward, useCompleteQuestTask } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scroll, Gift, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
    if (isCompleted) return; // Prevent unchecking for simplicity in UI, or if backend supports it handle it
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
          <TabsTrigger value="main" className="min-w-fit">Main</TabsTrigger>
          <TabsTrigger value="side" className="min-w-fit">Side</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 pt-4">
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
