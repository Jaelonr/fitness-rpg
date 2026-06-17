import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { InstallBanner } from "@/components/install-banner";
import { BiometricLock } from "@/components/biometric-lock";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <BiometricLock>
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
