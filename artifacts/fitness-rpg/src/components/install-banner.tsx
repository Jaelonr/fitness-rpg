import { useState } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallBanner() {
  const { canInstall, install, isInstalling } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("install-banner-dismissed") === "1"
  );

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("install-banner-dismissed", "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    const ok = await install();
    if (!ok) setDismissed(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 max-w-md mx-auto">
      <div className="m-3 p-3 rounded-xl border border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-foreground">Install App</div>
          <div className="text-[10px] text-muted-foreground">Add to Home Screen for the best experience</div>
        </div>
        <Button size="sm" className="h-7 text-xs px-3 gap-1 shrink-0" onClick={handleInstall} disabled={isInstalling}>
          <Download className="w-3 h-3" />
          {isInstalling ? "..." : "Install"}
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
