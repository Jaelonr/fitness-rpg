import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Trophy } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalyticsOverview();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Battle Records" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!analytics) return <div>Failed to load records.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Battle Records" subtitle="Your journey in numbers" />

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="w-6 h-6 text-primary mb-2" />
            <div className="text-2xl font-mono font-bold">{analytics.totalWorkouts}</div>
            <div className="text-xs text-muted-foreground uppercase">Battles Won</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-6 h-6 text-accent mb-2" />
            <div className="text-2xl font-mono font-bold">{analytics.totalPrs}</div>
            <div className="text-xs text-muted-foreground uppercase">PRs Broken</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Body Mass Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.weightTrend}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorWeight)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif text-gold">Hall of Fame (Recent PRs)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.recentPrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records set yet.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {analytics.recentPrs.map(pr => (
                <div key={pr.id} className="flex justify-between items-center p-3 rounded bg-black/30 border border-border/50">
                  <div className="font-bold text-sm">{pr.exerciseName}</div>
                  <div className="font-mono text-sm text-gold">
                    {pr.weight} {pr.weightUnit} × {pr.reps}
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
