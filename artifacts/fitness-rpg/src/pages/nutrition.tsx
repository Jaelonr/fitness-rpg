import { useGetTodayNutrition, useGetNutritionTargets, useGetNutritionLogs } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatBar } from "@/components/shared/stat-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Apple } from "lucide-react";

export default function Nutrition() {
  const { data: today, isLoading: isLoadingToday } = useGetTodayNutrition();
  const { data: targets, isLoading: isLoadingTargets } = useGetNutritionTargets();
  const { data: logs, isLoading: isLoadingLogs } = useGetNutritionLogs();

  if (isLoadingToday || isLoadingTargets || isLoadingLogs) {
    return (
      <div className="space-y-6">
        <PageHeader title="Nutrition Log" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!today || !targets || !logs) {
    return <div>Failed to load nutrition data.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="Nutrition Log" subtitle="Fuel your recovery" />
      
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success">
              <Target className="w-5 h-5" />
              <h2 className="font-serif font-bold text-lg">Daily Targets</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">
                {Math.max(0, targets.calories - today.totalCalories)}
              </div>
              <div className="text-xs text-muted-foreground uppercase">Kcal Remaining</div>
            </div>
          </div>

          <div className="space-y-4">
            <StatBar 
              label="Calories" 
              value={today.totalCalories} 
              max={targets.calories} 
              colorClass="bg-success shadow-[0_0_8px_hsl(var(--success))]" 
            />
            <StatBar 
              label="Protein" 
              value={today.totalProtein} 
              max={targets.protein} 
              colorClass="bg-primary" 
            />
            <StatBar 
              label="Carbs" 
              value={today.totalCarbs} 
              max={targets.carbs} 
              colorClass="bg-accent" 
            />
            <StatBar 
              label="Fat" 
              value={today.totalFat} 
              max={targets.fat} 
              colorClass="bg-destructive" 
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4 text-accent">
            <Apple className="w-5 h-5" />
            <h3 className="font-serif font-bold text-lg">Today's Meals</h3>
          </div>
          {logs.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-4">No meals logged today. Consume sustenance to recover HP.</p>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-border/50">
                  <div>
                    <div className="font-bold text-sm">{log.mealName}</div>
                    <div className="text-xs text-muted-foreground uppercase">{log.mealType}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{log.calories} kcal</div>
                    <div className="text-[10px] text-muted-foreground">{log.protein}g pro</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
