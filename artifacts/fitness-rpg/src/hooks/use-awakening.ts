import { useRef, useState } from "react";
import { getBaseClass, getCurrentEvolution, type BaseClassId } from "./use-class";
import { useGetPlayer } from "@workspace/api-client-react";

const EVOLUTION_LEVELS = [15, 30, 50, 70, 90];

export interface AwakeningInfo {
  classId: BaseClassId;
  evolutionLevel: number;
  evolutionName: string;
  awakeningTitle: string;
  color: string;
}

export function useAwakeningDetector() {
  const { data: player } = useGetPlayer();
  const prevLevelRef = useRef<number | null>(null);
  const [awakeningInfo, setAwakeningInfo] = useState<AwakeningInfo | null>(null);

  const level = player?.level ?? null;
  const baseClass = (player?.baseClass ?? null) as BaseClassId | null;

  if (level !== null) {
    const prev = prevLevelRef.current;
    if (prev !== null && prev !== level && baseClass) {
      for (const evoLevel of EVOLUTION_LEVELS) {
        if (prev < evoLevel && level >= evoLevel) {
          const cls = getBaseClass(baseClass);
          const evo = getCurrentEvolution(baseClass, level);
          if (cls && evo) {
            setAwakeningInfo({
              classId: baseClass,
              evolutionLevel: evoLevel,
              evolutionName: evo.name,
              awakeningTitle: evo.awakening,
              color: cls.color,
            });
          }
          break;
        }
      }
    }
    prevLevelRef.current = level;
  }

  return {
    awakeningInfo,
    dismiss: () => setAwakeningInfo(null),
  };
}
