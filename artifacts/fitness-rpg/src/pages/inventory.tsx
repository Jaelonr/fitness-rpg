import {
  useGetInventory, useGetStoreItems, usePurchaseStoreItem,
  useGetArmory, useEquipGear, type RpgGear,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Coins, Backpack, Shield, Sword } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const RARITY_STYLES: Record<string, { label: string; color: string; border: string; glow: string; bg: string }> = {
  common:    { label: "Common",    color: "text-gray-400",   border: "border-gray-400/30",   glow: "",                                    bg: "bg-gray-400/5" },
  uncommon:  { label: "Uncommon",  color: "text-green-400",  border: "border-green-400/30",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.12)]",  bg: "bg-green-400/5" },
  rare:      { label: "Rare",      color: "text-blue-400",   border: "border-blue-400/30",   glow: "shadow-[0_0_14px_rgba(59,130,246,0.15)]",  bg: "bg-blue-400/5" },
  epic:      { label: "Epic",      color: "text-purple-400", border: "border-purple-400/30", glow: "shadow-[0_0_16px_rgba(168,85,247,0.2)]",  bg: "bg-purple-400/5" },
  legendary: { label: "Legendary", color: "text-yellow-400", border: "border-yellow-400/40", glow: "shadow-[0_0_20px_rgba(234,179,8,0.25)]",  bg: "bg-yellow-400/5" },
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔️", offhand: "🛡️", helmet: "🪖", chest: "🧥",
  gloves: "🧤", boots: "👢", ring: "💍", necklace: "📿",
};

function GearCard({ gear }: { gear: RpgGear }) {
  const r = RARITY_STYLES[gear.rarity] ?? RARITY_STYLES.common;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const equipGear = useEquipGear();

  const statBonusEntries = Object.entries(gear.statBonuses ?? {}).filter(([, v]) => (v ?? 0) > 0);

  const handleEquip = () => {
    equipGear.mutate({ id: gear.id }, {
      onSuccess: (data) => {
        toast({
          title: data.equipped ? `${gear.name} Equipped` : "Unequipped",
          description: data.equipped ? `${gear.slot} slot updated.` : `${gear.name} removed from ${gear.slot}.`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/armory"] });
      },
    });
  };

  return (
    <Card className={cn("border overflow-hidden transition-all duration-200", r.border, r.glow, r.bg, gear.equipped && "ring-1 ring-current")}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span className="text-xl shrink-0 mt-0.5">{SLOT_ICONS[gear.slot] ?? "🎁"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={cn("font-serif font-bold text-sm leading-tight truncate", r.color)}>{gear.name}</h3>
                {gear.equipped && (
                  <span className={cn("text-[9px] font-mono border px-1 py-0 rounded shrink-0 uppercase", r.color, r.border)}>
                    ON
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn("text-[9px] font-mono uppercase tracking-wide", r.color)}>{r.label}</span>
                <span className="text-[9px] text-muted-foreground capitalize">{gear.slot}</span>
              </div>
              {statBonusEntries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {statBonusEntries.map(([stat, val]) => (
                    <span key={stat} className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded", r.border, r.color, r.bg)}>
                      +{val} {stat.slice(0, 3).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
              {gear.flavorText && (
                <p className="text-[10px] text-muted-foreground italic mt-1.5 leading-tight line-clamp-2">
                  "{gear.flavorText}"
                </p>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className={cn("h-7 text-[10px] shrink-0 mt-0.5", gear.equipped ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : cn(r.border, r.color, "hover:bg-white/5"))}
            onClick={handleEquip}
            disabled={equipGear.isPending}
          >
            {gear.equipped ? "Unequip" : "Equip"}
          </Button>
        </div>

        {gear.source && (
          <p className="text-[9px] text-muted-foreground/50 mt-2 font-mono">Source: {gear.source}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Inventory() {
  const { data: inventory, isLoading: isLoadingInv } = useGetInventory();
  const { data: store, isLoading: isLoadingStore } = useGetStoreItems();
  const { data: armory, isLoading: isLoadingArmory } = useGetArmory();
  const purchase = usePurchaseStoreItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handlePurchase = (itemId: number) => {
    purchase.mutate({ data: { itemId, quantity: 1 } }, {
      onSuccess: (res) => {
        toast({ title: "Item Acquired", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
      },
      onError: (err: any) => {
        toast({ title: "Purchase Failed", description: err.message || "Not enough gold", variant: "destructive" });
      }
    });
  };

  if (isLoadingInv || isLoadingStore || isLoadingArmory) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const equippedGear = armory?.filter(g => g.equipped) ?? [];
  const allGear = armory ?? [];

  const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
  const sortedGear = [...allGear].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Inventory" />

      <Tabs defaultValue="armory" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-black/40 border border-border/50 h-12">
          <TabsTrigger value="armory" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Armory
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-card data-[state=active]:text-primary gap-1.5 text-xs">
            <Backpack className="w-3.5 h-3.5" /> Items
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Coins className="w-3.5 h-3.5" /> Store
          </TabsTrigger>
        </TabsList>

        {/* ── Armory Tab ──────────────────────────────────────────── */}
        <TabsContent value="armory" className="pt-4 space-y-4">
          {equippedGear.length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
                Equipped
              </p>
              <div className="space-y-2">
                {equippedGear.map(g => <GearCard key={g.id} gear={g} />)}
              </div>
            </div>
          )}

          {sortedGear.filter(g => !g.equipped).length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
                {equippedGear.length > 0 ? "Unequipped" : "All Gear"} · {sortedGear.filter(g => !g.equipped).length} items
              </p>
              <div className="space-y-2">
                {sortedGear.filter(g => !g.equipped).map(g => <GearCard key={g.id} gear={g} />)}
              </div>
            </div>
          )}

          {sortedGear.length === 0 && (
            <div className="text-center py-14 border border-dashed border-border/30 rounded-xl">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm font-medium">Armory is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Complete boss raids to receive gear drops.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Items Tab ───────────────────────────────────────────── */}
        <TabsContent value="inventory" className="pt-4 space-y-3">
          {inventory?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-border/50 rounded-lg bg-card/20">
              Your bag is empty.
            </div>
          ) : (
            inventory?.map(item => (
              <Card key={item.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{item.itemName}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="font-mono text-sm border border-border/50 px-2 py-1 rounded bg-black/40">
                    x{item.quantity}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Store Tab ───────────────────────────────────────────── */}
        <TabsContent value="store" className="pt-4 space-y-3">
          {store?.map(item => (
            <Card key={item.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="font-mono text-sm text-yellow-400 font-bold">{item.goldCost} G</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-yellow-400/30 hover:bg-yellow-400/10 hover:text-yellow-400"
                    onClick={() => handlePurchase(item.id)}
                    disabled={purchase.isPending}
                  >
                    Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
