import { useState, useEffect } from "react";
import { useGetBiometrics, useUpdateBiometrics } from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Scale, Ruler, Activity, Save, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const EQUIPMENT_TYPES = [
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "cable", label: "Cable Machine" },
  { id: "machine", label: "Weight Machines" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "bands", label: "Resistance Bands" },
  { id: "bodyweight", label: "Bodyweight Only" },
  { id: "pull_up_bar", label: "Pull-Up Bar" },
  { id: "dip_bars", label: "Dip Bars" },
  { id: "bench", label: "Flat Bench" },
  { id: "incline_bench", label: "Incline Bench" },
  { id: "squat_rack", label: "Squat Rack / Power Rack" },
  { id: "leg_press", label: "Leg Press" },
  { id: "cardio_machine", label: "Cardio Machines" },
  { id: "heavy_bag", label: "Heavy Bag" },
];

interface FormState {
  heightCm: string;
  weightKg: string;
  bodyFatPct: string;
  squat1rm: string;
  bench1rm: string;
  deadlift1rm: string;
  ohp1rm: string;
  row1rm: string;
  equipmentTypes: string[];
  notes: string;
}

const empty: FormState = {
  heightCm: "", weightKg: "", bodyFatPct: "",
  squat1rm: "", bench1rm: "", deadlift1rm: "", ohp1rm: "", row1rm: "",
  equipmentTypes: [], notes: "",
};

function toForm(data: any): FormState {
  return {
    heightCm: data.heightCm != null ? String(data.heightCm) : "",
    weightKg: data.weightKg != null ? String(data.weightKg) : "",
    bodyFatPct: data.bodyFatPct != null ? String(data.bodyFatPct) : "",
    squat1rm: data.squat1rm != null ? String(data.squat1rm) : "",
    bench1rm: data.bench1rm != null ? String(data.bench1rm) : "",
    deadlift1rm: data.deadlift1rm != null ? String(data.deadlift1rm) : "",
    ohp1rm: data.ohp1rm != null ? String(data.ohp1rm) : "",
    row1rm: data.row1rm != null ? String(data.row1rm) : "",
    equipmentTypes: data.equipmentTypes ?? [],
    notes: data.notes ?? "",
  };
}

function numOrNull(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) || s.trim() === "" ? null : n;
}

export default function Profile() {
  const { data, isLoading } = useGetBiometrics();
  const update = useUpdateBiometrics();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(toForm(data));
      setDirty(false);
    }
  }, [data]);

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function toggleEquipment(id: string) {
    setForm(prev => {
      const has = prev.equipmentTypes.includes(id);
      return {
        ...prev,
        equipmentTypes: has ? prev.equipmentTypes.filter(e => e !== id) : [...prev.equipmentTypes, id],
      };
    });
    setDirty(true);
  }

  function handleSave() {
    update.mutate({
      data: {
        heightCm: numOrNull(form.heightCm),
        weightKg: numOrNull(form.weightKg),
        bodyFatPct: numOrNull(form.bodyFatPct),
        squat1rm: form.squat1rm ? parseInt(form.squat1rm) : null,
        bench1rm: form.bench1rm ? parseInt(form.bench1rm) : null,
        deadlift1rm: form.deadlift1rm ? parseInt(form.deadlift1rm) : null,
        ohp1rm: form.ohp1rm ? parseInt(form.ohp1rm) : null,
        row1rm: form.row1rm ? parseInt(form.row1rm) : null,
        equipmentTypes: form.equipmentTypes,
        notes: form.notes || null,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Profile saved", description: "Workout planner will use your data." });
        setDirty(false);
      },
      onError: () => {
        toast({ title: "Failed to save", variant: "destructive" });
      },
    });
  }

  const hasAny1rm = form.squat1rm || form.bench1rm || form.deadlift1rm || form.ohp1rm || form.row1rm;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Hunter Profile" subtitle="Biometric data & equipment access" />

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This data is used by the <strong className="text-foreground">Workout Planner</strong> to recommend working weights based on your strength maxes and available equipment.
        </p>
      </div>

      {/* Body Metrics */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" /> Body Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Height (cm)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 178"
                value={form.heightCm}
                onChange={e => set("heightCm", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Scale className="w-3 h-3" /> Weight (kg)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 82"
                value={form.weightKg}
                onChange={e => set("weightKg", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> Body Fat %
              </Label>
              <Input
                type="number"
                placeholder="e.g. 15"
                value={form.bodyFatPct}
                onChange={e => set("bodyFatPct", e.target.value)}
                className="bg-black/30 border-border/50 text-sm h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1RM Maxes */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Strength Maxes (1RM in kg)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] text-muted-foreground -mt-1">
            Enter your estimated 1-rep max for each lift. Used to calculate recommended working weights.
          </p>

          {!hasAny1rm && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ChevronRight className="w-3 h-3 text-yellow-400 shrink-0" />
              <p className="text-[11px] text-yellow-300">Fill in at least one max to get weight recommendations in the planner.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { field: "squat1rm" as const, label: "Squat", placeholder: "e.g. 140" },
              { field: "bench1rm" as const, label: "Bench Press", placeholder: "e.g. 100" },
              { field: "deadlift1rm" as const, label: "Deadlift", placeholder: "e.g. 180" },
              { field: "ohp1rm" as const, label: "Overhead Press", placeholder: "e.g. 70" },
              { field: "row1rm" as const, label: "Barbell Row", placeholder: "e.g. 110" },
            ].map(({ field, label, placeholder }) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={placeholder}
                    value={form[field]}
                    onChange={e => set(field, e.target.value)}
                    className={cn(
                      "bg-black/30 border-border/50 text-sm h-9 pr-8",
                      form[field] && "border-primary/40 bg-primary/5"
                    )}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equipment Access */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" /> Available Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground mb-3">
            Select everything you have access to at your gym or home setup.
          </p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_TYPES.map(eq => {
              const selected = form.equipmentTypes.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    selected
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 bg-black/20 text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {eq.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif">Injury / Limitation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            placeholder="e.g. Bad lower back, avoid axial loading. Left shoulder impingement on overhead movements."
            value={form.notes}
            onChange={e => { set("notes", e.target.value); }}
            rows={3}
            className="w-full rounded-lg bg-black/30 border border-border/50 text-sm p-3 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full h-12 text-base font-bold shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
        onClick={handleSave}
        disabled={update.isPending || isLoading}
      >
        <Save className="w-4 h-4 mr-2" />
        {update.isPending ? "Saving..." : dirty ? "Save Profile" : "Profile Saved ✓"}
      </Button>
    </div>
  );
}
