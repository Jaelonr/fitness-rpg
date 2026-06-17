import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetWorkoutSession, useLogSet, useUpdateWorkoutSession, WorkoutSetInputWeightUnit } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Check, Timer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ActiveSession() {
  const params = useParams();
  const sessionId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading } = useGetWorkoutSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: ["/api/workouts/sessions", sessionId] }
  });

  const logSet = useLogSet();
  const finishSession = useUpdateWorkoutSession();

  // Local state for set inputs
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("45");
  const [rpe, setRpe] = useState("8");
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(0);

  const [restTimer, setRestTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Active Battle" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) return <div>Session not found.</div>;

  const handleCompleteSet = () => {
    if (!selectedExerciseId) {
      toast({ title: "Select an exercise", variant: "destructive" });
      return;
    }

    logSet.mutate({
      id: sessionId,
      data: {
        exerciseId: selectedExerciseId,
        setNumber: session.sets.filter(s => s.exerciseId === selectedExerciseId).length + 1,
        reps: parseInt(reps, 10),
        weight: parseFloat(weight),
        weightUnit: 'lbs' as WorkoutSetInputWeightUnit,
        rpe: parseInt(rpe, 10)
      }
    }, {
      onSuccess: () => {
        setRestTimer(90); // Default 90s rest
        queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions", sessionId] });
      }
    });
  };

  const handleFinishBattle = () => {
    finishSession.mutate({
      id: sessionId,
      data: { status: 'completed' }
    }, {
      onSuccess: () => {
        toast({ title: "Battle Completed", description: "Victory! Status updated." });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        setLocation("/training");
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <PageHeader title={session.name} subtitle="Combat in progress..." />

      {restTimer > 0 && (
        <Card className="border-accent/50 bg-accent/10 mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent font-mono font-bold">
              <Timer className="w-5 h-5 animate-pulse" /> RESTING
            </div>
            <div className="text-2xl font-mono text-accent">
              {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Very simplified exercise selector for the mockup - assumes you have a template or exercises */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold">Log Set</Label>
            <Input 
              type="number" 
              placeholder="Exercise ID (temp)" 
              value={selectedExerciseId || ""} 
              onChange={e => setSelectedExerciseId(parseInt(e.target.value, 10))} 
              className="bg-black/50 border-border/50 font-mono"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">LBS</Label>
              <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="bg-black/50 font-mono text-center" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">REPS</Label>
              <Input type="number" value={reps} onChange={e => setReps(e.target.value)} className="bg-black/50 font-mono text-center" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">RPE</Label>
              <Input type="number" value={rpe} onChange={e => setRpe(e.target.value)} className="bg-black/50 font-mono text-center" />
            </div>
          </div>
          
          <Button 
            className="w-full bg-primary hover:bg-primary/80" 
            onClick={handleCompleteSet}
            disabled={logSet.isPending}
          >
            <Check className="w-4 h-4 mr-2" /> Complete Set
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-serif font-bold text-sm text-muted-foreground">Battle Log</h3>
        {session.sets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No attacks landed yet.</p>
        ) : (
          session.sets.map((set, i) => (
            <div key={set.id} className="flex justify-between items-center p-3 rounded bg-black/30 border border-border/50 text-sm">
              <div className="font-mono">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {set.exerciseName || `Exercise ${set.exerciseId}`}
              </div>
              <div className="font-mono text-primary">
                {set.weight}{set.weightUnit} × {set.reps} <span className="text-muted-foreground text-xs ml-1">@{set.rpe}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/80 backdrop-blur border-t border-border/50 z-40 max-w-md mx-auto">
        <Button 
          variant="destructive" 
          className="w-full shadow-[0_0_15px_hsl(var(--destructive)/0.3)]"
          onClick={handleFinishBattle}
          disabled={finishSession.isPending}
        >
          <Square className="w-4 h-4 mr-2 fill-current" /> Finish Battle
        </Button>
      </div>
    </div>
  );
}
