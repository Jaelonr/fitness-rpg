import {
  useGetSkillTrees,
  useUnlockSkillNode,
  type SkillTree as ApiSkillTree,
  type SkillNode,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Lock, Zap, ChevronRight, Swords, Shield, Activity,
  Wind, Brain, HeartPulse, Apple, Star,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useRef, useLayoutEffect, useState, useCallback, forwardRef, Fragment } from "react";

const CATEGORY_META: Record<string, { icon: React.ReactNode; color: string; glow: string; label: string }> = {
  strength: { icon: <Swords className="w-4 h-4" />, color: "text-red-400", glow: "rgba(239,68,68,0.4)", label: "Strength" },
  striking: { icon: <Wind className="w-4 h-4" />, color: "text-orange-400", glow: "rgba(249,115,22,0.4)", label: "Striking" },
  grappling: { icon: <Shield className="w-4 h-4" />, color: "text-yellow-400", glow: "rgba(234,179,8,0.4)", label: "Grappling" },
  conditioning: { icon: <Activity className="w-4 h-4" />, color: "text-green-400", glow: "rgba(34,197,94,0.4)", label: "Conditioning" },
  discipline: { icon: <Brain className="w-4 h-4" />, color: "text-blue-400", glow: "rgba(59,130,246,0.4)", label: "Discipline" },
  recovery: { icon: <HeartPulse className="w-4 h-4" />, color: "text-cyan-400", glow: "rgba(6,182,212,0.4)", label: "Recovery" },
  nutrition: { icon: <Apple className="w-4 h-4" />, color: "text-purple-400", glow: "rgba(168,85,247,0.4)", label: "Nutrition" },
};

interface ConnectorLine {
  x1: number; y1: number; x2: number; y2: number;
  unlocked: boolean;
}

interface NodeCircleProps {
  node: SkillNode;
  meta: typeof CATEGORY_META[string];
  selected: boolean;
  onClick: () => void;
}

const NodeCircle = forwardRef<HTMLDivElement, NodeCircleProps>(function NodeCircle(
  { node, meta, selected, onClick }, ref
) {
  return (
    <div ref={ref} className="flex flex-col items-center gap-1 w-16" onClick={onClick}>
      {/* Circle */}
      <div
        className={cn(
          "relative w-14 h-14 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300",
          node.unlocked
            ? cn("bg-black/60 border-current", meta.color)
            : selected
            ? "bg-black/60 border-primary/60 text-primary"
            : "bg-black/40 border-border/30 text-muted-foreground/40 grayscale-[0.7]"
        )}
        style={
          node.unlocked
            ? { boxShadow: `0 0 16px ${meta.glow}, inset 0 0 12px ${meta.glow.replace("0.4", "0.1")}` }
            : selected
            ? { boxShadow: `0 0 10px rgba(168,85,247,0.3)` }
            : undefined
        }
      >
        {/* Tier badge */}
        <span
          className={cn(
            "absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border",
            node.unlocked ? cn(meta.color, "border-current bg-black") : "text-muted-foreground/40 border-border/30 bg-black/60"
          )}
        >
          {node.tier}
        </span>

        {node.unlocked ? (
          <div className={cn("transition-transform", selected && "scale-110")}>
            {meta.icon}
          </div>
        ) : (
          <Lock className="w-4 h-4" />
        )}
      </div>

      {/* Label */}
      <p
        className={cn(
          "text-[9px] text-center leading-tight line-clamp-2 font-medium transition-colors",
          node.unlocked ? meta.color : selected ? "text-primary/80" : "text-muted-foreground/40"
        )}
        style={{ maxWidth: "3.5rem" }}
      >
        {node.name}
      </p>
    </div>
  );
});

interface TreeGraphProps {
  tree: ApiSkillTree;
  onUnlock: (nodeId: number) => void;
  isPending: boolean;
}

function TreeGraph({ tree, onUnlock, isPending }: TreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeWrapRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const meta = CATEGORY_META[tree.category] ?? CATEGORY_META.discipline;

  const recalc = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    setSvgSize({ w: cr.width, h: cr.height });
    const newLines: ConnectorLine[] = [];
    for (const node of tree.nodes) {
      for (const prereqId of node.prerequisiteNodeIds ?? []) {
        const fromEl = nodeWrapRefs.current.get(prereqId);
        const toEl = nodeWrapRefs.current.get(node.id);
        if (fromEl && toEl) {
          const fr = fromEl.getBoundingClientRect();
          const tr = toEl.getBoundingClientRect();
          newLines.push({
            x1: fr.left + fr.width / 2 - cr.left,
            y1: fr.bottom - cr.top - 4,
            x2: tr.left + tr.width / 2 - cr.left,
            y2: tr.top - cr.top + 4,
            unlocked: node.unlocked,
          });
        }
      }
    }
    setLines(newLines);
  }, [tree.nodes]);

  useLayoutEffect(() => {
    recalc();
    const obs = new ResizeObserver(recalc);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [recalc]);

  const tiers = new Map<number, SkillNode[]>();
  for (const node of tree.nodes) {
    if (!tiers.has(node.tier)) tiers.set(node.tier, []);
    tiers.get(node.tier)!.push(node);
  }
  const sortedTiers = [...tiers.entries()].sort(([a], [b]) => a - b);

  const selectedNode = selectedId !== null ? tree.nodes.find(n => n.id === selectedId) : null;
  const prereqsMet = selectedNode
    ? (selectedNode.prerequisiteNodeIds ?? []).every(pid =>
        tree.nodes.find(n => n.id === pid)?.unlocked
      )
    : false;

  const hasStatReqs = selectedNode?.statRequirements
    ? Object.values(selectedNode.statRequirements).some(v => v > 0)
    : false;

  return (
    <div>
      {/* Graph area */}
      <div ref={containerRef} className="relative py-4">
        {/* SVG connector lines */}
        {svgSize.w > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={svgSize.w}
            height={svgSize.h}
            style={{ zIndex: 0 }}
          >
            <defs>
              <marker id={`arrow-${tree.id}-on`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill={meta.glow.replace("0.4", "0.8")} />
              </marker>
              <marker id={`arrow-${tree.id}-off`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--border))" />
              </marker>
            </defs>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {/* Glow layer */}
                {l.unlocked && (
                  <line
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                    stroke={meta.glow.replace("0.4", "0.2")}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                )}
                {/* Main line */}
                <line
                  x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.unlocked ? meta.glow.replace("0.4", "0.7") : "hsl(var(--border))"}
                  strokeWidth={l.unlocked ? 1.5 : 1}
                  strokeDasharray={l.unlocked ? undefined : "4 3"}
                  markerEnd={`url(#arrow-${tree.id}-${l.unlocked ? "on" : "off"})`}
                />
              </Fragment>
            ))}
          </svg>
        )}

        {/* Tier rows */}
        <div className="relative space-y-6" style={{ zIndex: 1 }}>
          {sortedTiers.map(([tier, nodes]) => (
            <div key={tier} className="flex justify-center gap-2 flex-wrap">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeWrapRefs.current.set(node.id, el);
                    else nodeWrapRefs.current.delete(node.id);
                  }}
                >
                  <NodeCircle
                    node={node}
                    meta={meta}
                    selected={selectedId === node.id}
                    onClick={() => setSelectedId(selectedId === node.id ? null : node.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div
          className={cn(
            "mt-2 rounded-xl border p-4 bg-black/50 transition-all duration-300",
            selectedNode.unlocked ? cn("border-current/40", meta.color) : "border-border/40"
          )}
          style={
            selectedNode.unlocked
              ? { boxShadow: `0 0 20px ${meta.glow.replace("0.4", "0.15")}` }
              : undefined
          }
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {selectedNode.unlocked && (
                  <span className={cn("text-[9px] font-mono uppercase border px-1.5 py-0.5 rounded-sm", meta.color, `border-current/30 bg-current/10`)}>
                    UNLOCKED
                  </span>
                )}
                <span className="text-[9px] font-mono text-muted-foreground">Tier {selectedNode.tier}</span>
              </div>
              <h3 className={cn("font-serif text-base font-bold", selectedNode.unlocked ? meta.color : "text-foreground")}>
                {selectedNode.name}
              </h3>
            </div>
            {!selectedNode.unlocked && (
              <span className={cn("font-mono text-sm font-bold shrink-0", meta.color)}>
                {selectedNode.xpCost} XP
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
            {selectedNode.description}
          </p>

          {selectedNode.effect && (
            <div className="flex items-start gap-1.5 mb-2">
              <Zap className={cn("w-3 h-3 mt-0.5 shrink-0", meta.color)} />
              <p className={cn("text-[11px] font-medium", meta.color)}>{selectedNode.effect}</p>
            </div>
          )}

          {selectedNode.equipmentRequired && (
            <p className="text-[10px] text-muted-foreground mb-2">
              <span className="text-yellow-400">⚠ Requires: </span>{selectedNode.equipmentRequired}
            </p>
          )}

          {hasStatReqs && (
            <div className="mb-2">
              <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Stat Requirements</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedNode.statRequirements).filter(([, v]) => v > 0).map(([stat, val]) => (
                  <span key={stat} className="text-[9px] font-mono border border-border/40 px-1.5 py-0.5 rounded bg-black/40 text-muted-foreground">
                    {stat[0].toUpperCase() + stat.slice(1)} {val}+
                  </span>
                ))}
              </div>
            </div>
          )}

          {!selectedNode.unlocked && (
            <div className="mt-3">
              {!prereqsMet && (
                <p className="text-[10px] text-red-400/70 mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Prerequisites not met
                </p>
              )}
              <Button
                size="sm"
                className={cn("w-full text-xs font-bold", meta.color.replace("text-", "hover:border-"))}
                variant="outline"
                onClick={() => { onUnlock(selectedNode.id); setSelectedId(null); }}
                disabled={!prereqsMet || isPending}
              >
                <Star className="w-3 h-3 mr-1" />
                Unlock for {selectedNode.xpCost} XP
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const { data: skillTrees, isLoading } = useGetSkillTrees();
  const unlockNode = useUnlockSkillNode();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTree, setActiveTree] = useState<number | null>(null);

  const handleUnlock = (nodeId: number) => {
    unlockNode.mutate({ id: nodeId }, {
      onSuccess: () => {
        toast({ title: "Skill Unlocked", description: "Your power grows." });
        queryClient.invalidateQueries({ queryKey: ["/api/player/skill-trees"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      },
      onError: (err: any) => {
        toast({
          title: "Unlock Failed",
          description: err.message || "Not enough XP or prerequisites not met.",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Skill Trees" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  const trees = skillTrees ?? [];
  const displayTree = activeTree !== null ? trees.find(t => t.id === activeTree) ?? trees[0] : trees[0];

  if (trees.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Skill Trees" />
        <div className="text-center py-16 border border-dashed border-border/30 rounded-xl text-muted-foreground">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No skill trees available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Skill Trees" subtitle="Forge your path through the disciplines" />

      {/* Tree selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
        {trees.map(tree => {
          const meta = CATEGORY_META[tree.category] ?? CATEGORY_META.discipline;
          const unlockedCount = tree.nodes.filter(n => n.unlocked).length;
          const isActive = (activeTree === null ? trees[0].id : activeTree) === tree.id;
          return (
            <button
              key={tree.id}
              onClick={() => setActiveTree(tree.id)}
              className={cn(
                "flex items-center gap-1.5 shrink-0 rounded-lg border px-3 py-2 text-[11px] font-mono font-bold transition-all duration-200",
                isActive
                  ? cn("border-current bg-black/60", meta.color)
                  : "border-border/40 bg-black/20 text-muted-foreground hover:border-border/60"
              )}
              style={isActive ? { boxShadow: `0 0 12px ${meta.glow}` } : undefined}
            >
              <span className={isActive ? meta.color : "text-muted-foreground/60"}>{meta.icon}</span>
              <span className="whitespace-nowrap">{meta.label}</span>
              <span className={cn(
                "text-[9px] border rounded px-1",
                isActive ? cn(meta.color, "border-current/30 bg-current/10") : "border-border/30 text-muted-foreground/50"
              )}>
                {unlockedCount}/{tree.nodes.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tree */}
      {displayTree && (
        <div className="rounded-xl border border-border/40 bg-card/30 p-4">
          {/* Tree header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              {CATEGORY_META[displayTree.category]?.icon && (
                <span className={CATEGORY_META[displayTree.category].color}>
                  {CATEGORY_META[displayTree.category].icon}
                </span>
              )}
              <h2 className={cn(
                "font-serif text-lg font-bold uppercase tracking-wide",
                CATEGORY_META[displayTree.category]?.color ?? "text-primary"
              )}>
                {displayTree.name}
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground">{displayTree.description}</p>

            {/* Progress bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground mb-1">
                <span>Mastery</span>
                <span>
                  {displayTree.nodes.filter(n => n.unlocked).length} / {displayTree.nodes.length} nodes
                </span>
              </div>
              <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${displayTree.nodes.length > 0 ? (displayTree.nodes.filter(n => n.unlocked).length / displayTree.nodes.length) * 100 : 0}%`,
                    background: CATEGORY_META[displayTree.category]?.glow?.replace("0.4", "1") ?? "hsl(var(--primary))",
                  }}
                />
              </div>
            </div>
          </div>

          <TreeGraph
            tree={displayTree}
            onUnlock={handleUnlock}
            isPending={unlockNode.isPending}
          />
        </div>
      )}
    </div>
  );
}
