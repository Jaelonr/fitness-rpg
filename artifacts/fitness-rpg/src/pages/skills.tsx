import { useGetSkillTrees, useUnlockSkillNode } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Skills() {
  const { data: skillTrees, isLoading } = useGetSkillTrees();
  const unlockNode = useUnlockSkillNode();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUnlock = (nodeId: number) => {
    unlockNode.mutate({ id: nodeId }, {
      onSuccess: () => {
        toast({ title: "Skill Unlocked", description: "You have grown stronger." });
        queryClient.invalidateQueries({ queryKey: ["/api/player/skill-trees"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      },
      onError: (err: any) => {
        toast({ title: "Unlock Failed", description: err.message || "Not enough XP or missing prerequisites.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Skill Trees" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Skill Trees" subtitle="Unlock new abilities" />

      <div className="space-y-8">
        {skillTrees?.map(tree => (
          <div key={tree.id} className="space-y-3 relative">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-lg font-bold text-primary uppercase tracking-wider">{tree.name}</h2>
            </div>
            
            <div className="grid gap-3 relative pl-4 border-l-2 border-border/50 ml-2">
              {tree.nodes.map(node => (
                <Card key={node.id} className={`border-border/50 relative overflow-hidden transition-all duration-300 ${node.unlocked ? 'bg-card/80 border-primary/30' : 'bg-black/40 grayscale-[0.5]'}`}>
                  {/* Decorative connection line */}
                  <div className="absolute w-4 h-[2px] bg-border/50 -left-4 top-1/2" />
                  
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${node.unlocked ? 'border-primary text-primary bg-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.2)]' : 'border-muted-foreground text-muted-foreground bg-black/50'}`}>
                      {node.unlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{node.name}</h3>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{node.description}</p>
                      {node.effect && (
                        <p className="text-[10px] text-accent mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-accent inline-block" /> {node.effect}
                        </p>
                      )}
                    </div>
                    
                    {!node.unlocked && (
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs font-mono text-primary block font-bold">{node.xpCost} XP</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-6 text-[10px] border-primary/30 text-primary hover:bg-primary/20"
                          onClick={() => handleUnlock(node.id)}
                          disabled={unlockNode.isPending}
                        >
                          Unlock
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
