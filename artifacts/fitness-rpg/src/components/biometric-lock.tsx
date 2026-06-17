import { useState, useEffect } from "react";
import { useBiometric } from "@/hooks/use-biometric";
import { useSettings } from "@/hooks/use-settings";
import { Fingerprint, Shield, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BiometricLock({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { isLocked, unlock, isRegistered } = useBiometric();
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (settings.security.biometricEnabled && isRegistered() && isLocked()) {
      setLocked(true);
    }
  }, []);

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    setAttempted(true);
    try {
      const ok = await unlock();
      if (ok) {
        setLocked(false);
      } else {
        setError("Biometric authentication failed. Try again.");
      }
    } catch {
      setError("Authentication error. Try again.");
    } finally {
      setUnlocking(false);
    }
  };

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background/98 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-6 p-8 max-w-xs text-center">
        <div className="relative">
          <Shield className="w-20 h-20 text-primary/20" />
          <Fingerprint className="w-10 h-10 text-primary absolute inset-0 m-auto" />
        </div>

        <div>
          <h2 className="font-serif font-bold text-2xl text-foreground mb-1">App Locked</h2>
          <p className="text-sm text-muted-foreground">Authenticate to continue your journey</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400 w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          className="w-full gap-2 h-12"
          onClick={handleUnlock}
          disabled={unlocking}
        >
          {unlocking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Fingerprint className="w-5 h-5" />
          )}
          {unlocking ? "Verifying..." : attempted ? "Try Again" : "Unlock with Biometrics"}
        </Button>

        <p className="text-[10px] text-muted-foreground opacity-50">
          Uses your device fingerprint or Face ID
        </p>
      </div>
    </div>
  );
}
