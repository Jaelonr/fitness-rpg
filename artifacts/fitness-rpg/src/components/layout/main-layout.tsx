import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="max-w-md mx-auto p-4 animate-in fade-in duration-300">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
