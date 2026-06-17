import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "@/components/install-banner";
import { BiometricLock } from "@/components/biometric-lock";
import { LevelUpOverlay } from "@/components/level-up-overlay";
import { AwakeningOverlay } from "@/components/awakening-overlay";
import { useLevelUpDetector } from "@/hooks/use-level-up";
import { useAwakeningDetector } from "@/hooks/use-awakening";

interface MainLayoutProps {
  children: ReactNode;
}

function LevelUpWatcher() {
  const { levelUpInfo, dismiss } = useLevelUpDetector();
  if (!levelUpInfo) return null;
  return <LevelUpOverlay info={levelUpInfo} onDismiss={dismiss} />;
}

function AwakeningWatcher() {
  const { awakeningInfo, dismiss } = useAwakeningDetector();
  if (!awakeningInfo) return null;
  return <AwakeningOverlay info={awakeningInfo} onDismiss={dismiss} />;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <BiometricLock>
      <LevelUpWatcher />
      <AwakeningWatcher />
      <div className="min-h-screen bg-background text-foreground pb-20">
        <InstallBanner />
        <main className="max-w-md mx-auto p-4 animate-in fade-in duration-300">
          {children}
        </main>
        <BottomNav />
      </div>
    </BiometricLock>
  );
}
