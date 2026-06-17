import { useEffect, useState } from "react";
import { AwakeningInfo } from "@/hooks/use-awakening";
import { getBaseClass, getCurrentEvolution, type BaseClassId } from "@/hooks/use-class";
import { cn } from "@/lib/utils";
import { Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  info: AwakeningInfo;
  onDismiss: () => void;
}

export function AwakeningOverlay({ info, onDismiss }: Props) {
  const [phase, setPhase] = useState<"flash" | "reveal" | "abilities" | "done">("flash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 400);
    const t2 = setTimeout(() => setPhase("abilities"), 1100);
    const t3 = setTimeout(() => setPhase("done"), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const cls = getBaseClass(info.classId as BaseClassId);
  const evo = getCurrentEvolution(info.classId as BaseClassId, info.evolutionLevel);
  if (!cls || !evo) return null;

  const colorVar = cls.color
    .replace("text-", "")
    .replace("-400", "");

  const glowStyle = cls.color.includes("purple")
    ? "rgba(168,85,247,0.35)"
    : cls.color.includes("blue")
    ? "rgba(59,130,246,0.35)"
    : cls.color.includes("red")
    ? "rgba(239,68,68,0.35)"
    : cls.color.includes("green")
    ? "rgba(34,197,94,0.35)"
    : cls.color.includes("orange")
    ? "rgba(249,115,22,0.35)"
    : cls.color.includes("cyan")
    ? "rgba(6,182,212,0.35)"
    : "rgba(168,85,247,0.35)";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-black/95"
        style={{
          background: `radial-gradient(ellipse at center, ${glowStyle} 0%, rgba(0,0,0,0.97) 70%)`,
        }}
      />

      {/* Flash burst */}
      {phase === "flash" && (
        <div
          className="absolute inset-0 animate-ping rounded-full opacity-30"
          style={{ background: glowStyle }}
        />
      )}

      {/* Particle rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full opacity-60"
            style={{
              background: glowStyle.replace("0.35", "1"),
              top: "50%",
              left: "50%",
              transform: `rotate(${i * 45}deg) translate(${60 + i * 15}px)`,
              animation: `ping 2s ease-out ${i * 0.1}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className={cn(
          "relative z-10 text-center px-8 transition-all duration-500",
          phase === "flash" ? "opacity-0 scale-75" : "opacity-100 scale-100"
        )}
      >
        {/* System-style announcement */}
        <div className="mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground border border-border/50 px-3 py-1 rounded-sm">
            Class Evolution
          </span>
        </div>

        {/* Animated title */}
        <div
          className={cn(
            "transition-all duration-700 delay-200",
            phase === "flash" ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">
            {cls.name} Path · Threshold {info.evolutionLevel}
          </p>
          <h1
            className={cn("font-serif text-4xl font-black leading-tight mb-1", cls.color)}
            style={{ textShadow: `0 0 40px ${glowStyle.replace("0.35", "0.8")}` }}
          >
            {evo.name}
          </h1>
          <p className={cn("font-mono text-sm uppercase tracking-widest", cls.color.replace("-400", "-300"))}>
            {evo.awakening}
          </p>
        </div>

        {/* Lore */}
        <div
          className={cn(
            "mt-4 transition-all duration-700 delay-500",
            phase === "flash" || phase === "reveal" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          <p className="text-xs text-muted-foreground italic max-w-xs mx-auto border-l-2 border-primary/30 pl-3 text-left">
            "{evo.lore}"
          </p>
        </div>

        {/* New abilities */}
        <div
          className={cn(
            "mt-5 transition-all duration-700 delay-700",
            phase !== "done" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
        >
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3">
            Abilities Unlocked
          </p>
          <div className="space-y-2 max-w-xs mx-auto">
            {evo.abilities.slice(0, 3).map((ab) => (
              <div
                key={ab.name}
                className="flex items-start gap-2 text-left bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              >
                <span className={cn("text-xs shrink-0 mt-0.5", ab.type === "active" ? "text-yellow-400" : cls.color)}>
                  {ab.type === "active" ? "⚡" : "◆"}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-white/90">{ab.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{ab.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            className={cn("mt-6 w-full gap-2 font-bold", cls.bg, cls.border)}
            variant="outline"
            onClick={onDismiss}
            style={{ boxShadow: `0 0 20px ${glowStyle}` }}
          >
            <Sparkles className="w-4 h-4" />
            Embrace Awakening
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
