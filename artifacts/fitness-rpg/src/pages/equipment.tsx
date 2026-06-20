import { useState } from "react";
import { useGetEquipment, useUpdateEquipment, useAddEquipment } from "@workspace/api-client-react";
import { AethoriaHeader, AethoriaPage, AethoriaPanel, AethoriaSectionTitle } from "@/components/shared/aethoria-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Plus, Loader2, ChevronDown, ChevronUp, Dumbbell, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  rack: "Rack",
  machine: "Machine",
  barbell: "Barbell",
  free_weights: "Free Weights",
  striking: "Striking",
  mat: "Mat / Grappling",
  bench: "Bench",
  cable: "Cable",
  cardio: "Cardio",
  bands: "Bands",
  other: "Other",
};

const CATEGORY_OPTIONS = [
  "barbell", "free_weights", "rack", "machine", "bench", "cable",
  "striking", "mat", "cardio", "bands", "other",
];

const defaultForm = () => ({ name: "", category: "other" });

export default function Equipment() {
  const { data: equipment, isLoading } = useGetEquipment();
  const updateEquipment = useUpdateEquipment();
  const addEquipment = useAddEquipment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [toggling, setToggling] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });

  const handleToggle = (id: number, currentlyAvailable: boolean) => {
    setToggling(id);
    updateEquipment.mutate(
      { id, data: { available: !currentlyAvailable } as any },
      {
        onSuccess: () => { invalidate(); setToggling(null); },
        onError: () => { toast({ title: "Failed to update", variant: "destructive" }); setToggling(null); },
      }
    );
  };

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast({ title: "Enter an equipment name", variant: "destructive" });
      return;
    }
    addEquipment.mutate(
      { data: { name: form.name.trim(), category: form.category, available: true, owned: true } as any },
      {
        onSuccess: () => {
          setForm(defaultForm());
          setShowAdd(false);
          invalidate();
          toast({ title: `${form.name} added to armory!` });
        },
        onError: () => toast({ title: "Failed to add equipment", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AethoriaPage>
        <AethoriaHeader icon={Shield} title="Training Armory" subtitle="Real equipment the Guild can assign" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </AethoriaPage>
    );
  }

  const available = equipment?.filter(e => e.available) ?? [];
  const unavailable = equipment?.filter(e => !e.available) ?? [];

  return (
    <AethoriaPage className="animate-in fade-in duration-500">
      <AethoriaHeader icon={Shield} title="Training Armory" subtitle="Real equipment the Guild can assign" />

      <AethoriaPanel accent>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center border border-[#8c6a36] bg-[#15130f]">
            <Dumbbell className="size-5 text-[#d9ad63]" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold text-[#d9ad63]">Aldric's Equipment Ledger</p>
            <p className="mt-1 text-sm leading-relaxed text-[#cfc5b8]">
              These are real-world tools, not fantasy gear. Commissions and workout plans use this ledger to avoid assigning drills you cannot perform.
            </p>
          </div>
        </div>
      </AethoriaPanel>

      {/* Add Equipment toggle */}
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="flex w-full items-center gap-3 border border-[#c08c4e] bg-[#74291f] p-3.5 transition-all hover:bg-[#8c3527]"
      >
        <div className="flex size-8 items-center justify-center border border-[#c08c4e] bg-[#15130f]">
          <Plus className="w-4 h-4 text-[#f1dfc6]" />
        </div>
        <span className="flex-1 text-left font-serif text-sm font-bold text-[#f1dfc6]">Add Training Tool</span>
        {showAdd
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Add form */}
      {showAdd && (
        <Card className="animate-in slide-in-from-top-2 rounded-none border-[#6b4d2f] bg-[#11100e] duration-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="font-serif text-sm text-[#d9ad63]">New Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Name</div>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kettlebell, Pull-up Bar..."
                className="bg-black/30 border-border/50 h-9 text-sm"
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Category</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={cn(
                      "border px-2.5 py-1 text-xs font-medium transition-all",
                      form.category === cat
                        ? "border-[#d9ad63] bg-[#3b2a18] text-[#d9ad63]"
                        : "border-[#3b3328] bg-[#0c0b09] text-[#8f887d] hover:border-[#6b4d2f]"
                    )}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full gap-2 rounded-none bg-[#74291f] text-[#f1dfc6] hover:bg-[#8c3527]" onClick={handleAdd} disabled={addEquipment.isPending}>
              {addEquipment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Armory
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available */}
      <div>
        <AethoriaSectionTitle icon={Check}>Available For Commissions ({available.length})</AethoriaSectionTitle>
        <div className="space-y-2">
          {available.length === 0 && (
            <p className="border border-dashed border-[#3b3328] bg-[#11100e]/70 py-8 text-center text-xs text-[#8f887d]">
              No equipment marked available.
            </p>
          )}
          {available.map(item => (
            <Card key={item.id} className="rounded-none border-[#3e8f5c]/50 bg-[#11100e]">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{item.name}</h3>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(item.id, true)}
                  disabled={toggling === item.id}
                  className="group flex items-center gap-1.5 border border-[#3e8f5c]/50 bg-[#153421] px-2.5 py-1.5 text-xs text-[#a8c9b0] transition-all hover:border-[#9d3e2a] hover:bg-[#3a1712] hover:text-[#d95f45]"
                >
                  {toggling === item.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <>
                        <Check className="w-3 h-3 group-hover:hidden" />
                        <X className="w-3 h-3 hidden group-hover:block" />
                      </>}
                  <span className="group-hover:hidden">Equipped</span>
                  <span className="hidden group-hover:inline">Remove</span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Unavailable */}
      {unavailable.length > 0 && (
        <div>
          <AethoriaSectionTitle icon={X}>Unavailable ({unavailable.length})</AethoriaSectionTitle>
          <div className="space-y-2">
            {unavailable.map(item => (
              <Card key={item.id} className="rounded-none border-[#3b3328] bg-[#0c0b09] opacity-75">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-muted-foreground">{item.name}</h3>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground/60">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggle(item.id, false)}
                    disabled={toggling === item.id}
                    className="flex items-center gap-1.5 border border-[#3b3328] px-2.5 py-1.5 text-xs text-[#8f887d] transition-all hover:border-[#3e8f5c] hover:bg-[#153421] hover:text-[#a8c9b0]"
                  >
                    {toggling === item.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />}
                    Equip
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AethoriaPage>
  );
}
