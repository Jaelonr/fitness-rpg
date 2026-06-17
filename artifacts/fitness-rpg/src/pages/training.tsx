import { useGetWorkoutTemplates, useGetWorkoutSessions } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play } from "lucide-react";

export default function Training() {
  const { data: templates, isLoading: isLoadingTemplates } = useGetWorkoutTemplates();
  const { data: sessions, isLoading: isLoadingSessions } = useGetWorkoutSessions();

  if (isLoadingTemplates || isLoadingSessions) {
    return (
      <div className="space-y-6">
        <PageHeader title="Training Grounds" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Training Grounds" subtitle="Select a battle template" />

      <div className="space-y-4">
        {templates?.map(template => (
          <Card key={template.id} className="border-border/50 bg-card/50 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <CardContent className="p-4 relative z-10 flex items-center justify-between">
              <div>
                <h3 className="font-bold font-serif text-lg text-foreground">{template.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono uppercase text-muted-foreground border border-border/50 px-2 py-0.5 rounded-sm">
                    {template.category}
                  </span>
                  <span className="text-xs text-primary">{template.exercises.length} exercises</span>
                </div>
              </div>
              <Button size="icon" className="rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
                <Play className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-6">
        <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2 text-muted-foreground">
          <Dumbbell className="w-5 h-5" /> Recent Battles
        </h3>
        <div className="space-y-3">
          {sessions?.slice(0, 5).map(session => (
            <div key={session.id} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-border/50">
              <div>
                <div className="font-bold text-sm">{session.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(session.startedAt).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-primary">+{session.xpEarned} XP</div>
                <div className="text-xs font-mono text-gold">+{session.goldEarned} Gold</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
