import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  className?: string;
  showValues?: boolean;
}

export function StatBar({ label, value, max, colorClass, className, showValues = true }: StatBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100)) || 0;

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider">
        <span className="text-muted-foreground">{label}</span>
        {showValues && (
          <span className="text-foreground">
            {Math.floor(value)} / {max}
          </span>
        )}
      </div>
      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-border/50 relative">
        <motion.div
          className={cn("h-full absolute left-0 top-0", colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
