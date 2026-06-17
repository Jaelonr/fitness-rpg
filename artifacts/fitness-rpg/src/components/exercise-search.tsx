import { useState, useRef } from "react";
import { useSearchExercisesAi } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Plus, Loader2, Dumbbell, Weight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseResult {
  id: number;
  name: string;
  muscleGroup: string;
  category: string;
  instructions?: string | null;
  source?: string;
  recommendedWeightKg?: number | null;
}

interface Props {
  onAdd?: (exercise: ExerciseResult) => void;
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  barbell: "text-red-400 border-red-500/30 bg-red-500/10",
  dumbbell: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  machine: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  bodyweight: "text-green-400 border-green-500/30 bg-green-500/10",
  cable: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  cardio: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  martial_arts: "text-purple-400 border-purple-500/30 bg-purple-500/10",
};

export function ExerciseSearch({ onAdd, compact }: Props) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [source, setSource] = useState<"database" | "ai" | "existing" | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useSearchExercisesAi();

  function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setResults([]);
    setSource(null);
    search.mutate(
      { data: { query: q } },
      {
        onSuccess: (data) => {
          setResults(data.exercises as ExerciseResult[]);
          setSource(data.source as any);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  function handleAdd(ex: ExerciseResult) {
    setAdded(prev => new Set([...prev, ex.id]));
    onAdd?.(ex);
  }

  function handleClear() {
    setQuery("");
    setSubmitted("");
    setResults([]);
    setSource(null);
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any exercise... (e.g. Bulgarian split squat, face pull)"
            className="pl-9 pr-8 bg-black/30 border-border/50 text-sm h-9"
          />
          {query && (
            <button onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSearch}
          disabled={search.isPending || !query.trim()}
          className="gap-1.5 shrink-0"
        >
          {search.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {compact ? "" : "Search"}
        </Button>
      </div>

      {/* Loading state */}
      {search.isPending && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div>
            <div className="text-xs font-bold text-primary">Consulting the System...</div>
            <div className="text-[10px] text-muted-foreground">Looking up "{submitted}" via AI</div>
          </div>
        </div>
      )}

      {/* Error */}
      {search.isError && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          Lookup failed. Try a more specific exercise name or check your connection.
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !search.isPending && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {source === "ai" ? (
              <div className="flex items-center gap-1 text-[10px] text-primary font-mono uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> AI Retrieved
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                <Dumbbell className="w-3 h-3" /> From Database
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">— {results.length} result{results.length !== 1 ? "s" : ""}</span>
          </div>

          {results.map(ex => (
            <div
              key={ex.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-black/20 hover:border-primary/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn(
                    "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm border",
                    CATEGORY_COLORS[ex.category] || "text-muted-foreground border-border/50 bg-black/20"
                  )}>
                    {ex.category.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{ex.muscleGroup}</span>
                  {source === "ai" && (
                    <span className="text-[9px] text-primary font-mono px-1 py-0.5 rounded bg-primary/10 border border-primary/20">AI</span>
                  )}
                </div>
                <div className="font-bold text-sm">{ex.name}</div>
                {ex.recommendedWeightKg != null && ex.recommendedWeightKg > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Weight className="w-3 h-3 text-primary" />
                    <span className="text-xs font-mono text-primary font-bold">{ex.recommendedWeightKg} kg</span>
                    <span className="text-[10px] text-muted-foreground">recommended for you</span>
                  </div>
                )}
                {ex.instructions && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{ex.instructions}</p>
                )}
              </div>
              {onAdd && (
                <button
                  onClick={() => handleAdd(ex)}
                  disabled={added.has(ex.id)}
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all",
                    added.has(ex.id)
                      ? "border-green-500/30 bg-green-500/10 text-green-400 cursor-default"
                      : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {added.has(ex.id) ? "✓" : <Plus className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty result */}
      {submitted && results.length === 0 && !search.isPending && !search.isError && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          No results for "{submitted}". Try a different name.
        </div>
      )}
    </div>
  );
}
