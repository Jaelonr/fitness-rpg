import { useState } from "react";
import {
  useGetInventory, useGetStoreItems, usePurchaseStoreItem,
  useGetArmory, useEquipGear, useGetStoreSections,
  type RpgGear,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Backpack, Shield, Sword, Lock, Calendar, Clock, Swords } from "lucide-react";
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

const STYLE_COLORS: Record<string, string> = {
  strength: "text-red-400 border-red-400/30 bg-red-400/10",
  striking: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  conditioning: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  grappling: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  recovery: "text-green-400 border-green-400/30 bg-green-400/10",
  discipline: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
};

const SLOT_ICONS: Record<string, string> = {
  weapon: "⚔️", offhand: "🛡️", helmet: "🪖", chest: "🧥",
  gloves: "🧤", boots: "👢", ring: "💍", necklace: "📿",
};

const CATEGORY_ICONS: Record<string, string> = {
  consumable: "🧪", gear: "⚔️", cosmetic: "🎨", title: "📜", utility: "🔧",
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
                  <span className={cn("text-[9px] font-mono border px-1 py-0 rounded shrink-0 uppercase", r.color, r.border)}>ON</span>
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
                <p className="text-[10px] text-muted-foreground italic mt-1.5 leading-tight line-clamp-2">"{gear.flavorText}"</p>
              )}
            </div>
          </div>
          <Button
            size="sm" variant="outline"
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

function StoreItemCard({
  item,
  onBuy,
  isPending,
}: {
  item: any;
  onBuy: (id: number) => void;
  isPending: boolean;
}) {
  const r = RARITY_STYLES[item.rarity] ?? RARITY_STYLES.common;
  const locked = item.meetsRequirements === false;
  const styleClass = item.styleAffinity ? STYLE_COLORS[item.styleAffinity] : null;

  return (
    <Card className={cn(
      "border overflow-hidden transition-all duration-200",
      r.border, r.bg,
      !locked && r.glow,
      locked && "opacity-60"
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="text-xl shrink-0 mt-0.5">
            {CATEGORY_ICONS[item.category] ?? "🎁"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <h3 className={cn("font-serif font-bold text-sm leading-tight", r.color)}>{item.name}</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <span className={cn("text-[9px] font-mono uppercase tracking-wide", r.color)}>{r.label}</span>
                  {item.styleAffinity && styleClass && (
                    <span className={cn("text-[9px] font-mono border px-1.5 py-0.5 rounded-full capitalize", styleClass)}>
                      {item.styleAffinity}
                    </span>
                  )}
                  {item.rankRequired && (
                    <span className="text-[9px] font-mono text-muted-foreground border border-border/30 px-1.5 py-0.5 rounded">
                      Rank {item.rankRequired}+
                    </span>
                  )}
                  {item.levelRequired && (
                    <span className="text-[9px] font-mono text-muted-foreground">
                      Lv.{item.levelRequired}+
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{item.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2.5 gap-2">
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-sm font-mono font-bold text-yellow-400">{item.goldCost}</span>
              </div>
              {locked ? (
                <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                  <Lock className="w-3 h-3" /> Locked
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("h-7 text-[10px]", r.border, r.color, "hover:bg-white/5")}
                  onClick={() => onBuy(item.id)}
                  disabled={isPending}
                >
                  Buy
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CATEGORY_FILTERS = ["all", "consumable", "gear", "cosmetic", "title", "utility"] as const;

function StoreSection({
  items,
  purchase,
  onBuy,
}: {
  items: any[];
  purchase: any;
  onBuy: (id: number) => void;
}) {
  const [catFilter, setCatFilter] = useState<string>("all");
  const filtered = catFilter === "all" ? items : items.filter(i => i.category === catFilter);
  const availableCats = new Set(items.map(i => i.category));

  return (
    <div className="space-y-3">
      {/* Category filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.filter(c => c === "all" || availableCats.has(c)).map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={cn(
              "text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors capitalize",
              catFilter === cat
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {cat === "all" ? `All (${items.length})` : `${CATEGORY_ICONS[cat] ?? ""} ${cat}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No items in this category.</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(item => (
            <StoreItemCard
              key={item.id}
              item={item}
              onBuy={onBuy}
              isPending={purchase.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  const { data: inventory, isLoading: isLoadingInv } = useGetInventory();
  const { data: armory, isLoading: isLoadingArmory } = useGetArmory();
  const { data: sections, isLoading: isLoadingSections } = useGetStoreSections({
    query: { queryKey: ["/api/store/sections"] },
  });
  const purchase = usePurchaseStoreItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handlePurchase = (itemId: number) => {
    purchase.mutate({ data: { itemId, quantity: 1 } }, {
      onSuccess: (res) => {
        toast({ title: "Item Acquired", description: res.message });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
        queryClient.invalidateQueries({ queryKey: ["/api/player"] });
        queryClient.invalidateQueries({ queryKey: ["/api/store/sections"] });
      },
      onError: (err: any) => {
        toast({ title: "Purchase Failed", description: err.message || "Not enough gold", variant: "destructive" });
      }
    });
  };

  if (isLoadingInv || isLoadingArmory) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const equippedGear = armory?.filter(g => g.equipped) ?? [];
  const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
  const sortedGear = [...(armory ?? [])].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
  });

  const dailyItems  = sections?.daily     ?? [];
  const weeklyItems = sections?.weekly    ?? [];
  const permItems   = sections?.permanent ?? [];
  const raidItems   = sections?.raid      ?? [];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <PageHeader title="Inventory" />

      <Tabs defaultValue="store" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-black/40 border border-border/50 h-12">
          <TabsTrigger value="armory" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Armory
          </TabsTrigger>
          <TabsTrigger value="items" className="data-[state=active]:bg-card data-[state=active]:text-primary gap-1.5 text-xs">
            <Backpack className="w-3.5 h-3.5" /> Items
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-card data-[state=active]:text-yellow-400 gap-1.5 text-xs">
            <Coins className="w-3.5 h-3.5" /> Store
          </TabsTrigger>
        </TabsList>

        {/* ── Armory ──────────────────────────────────────── */}
        <TabsContent value="armory" className="pt-4 space-y-4">
          {equippedGear.length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">Equipped</p>
              <div className="space-y-2">{equippedGear.map(g => <GearCard key={g.id} gear={g} />)}</div>
            </div>
          )}
          {sortedGear.filter(g => !g.equipped).length > 0 && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
                {equippedGear.length > 0 ? "Unequipped" : "All Gear"} · {sortedGear.filter(g => !g.equipped).length} items
              </p>
              <div className="space-y-2">{sortedGear.filter(g => !g.equipped).map(g => <GearCard key={g.id} gear={g} />)}</div>
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

        {/* ── Items ───────────────────────────────────────── */}
        <TabsContent value="items" className="pt-4 space-y-3">
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

        {/* ── Store ───────────────────────────────────────── */}
        <TabsContent value="store" className="pt-4">
          {isLoadingSections ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <Tabs defaultValue="permanent" className="w-full">
              <TabsList className="w-full grid grid-cols-4 bg-black/40 border border-border/30 h-9 mb-4">
                <TabsTrigger value="permanent" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Sword className="w-3 h-3" /> Shop
                </TabsTrigger>
                <TabsTrigger value="daily" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Daily</span>
                  {dailyItems.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary/30 text-primary text-[9px] flex items-center justify-center ml-0.5 font-bold">
                      {dailyItems.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="weekly" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Weekly</span>
                </TabsTrigger>
                <TabsTrigger value="raid" className="text-[10px] data-[state=active]:bg-card gap-1">
                  <Swords className="w-3 h-3" />
                  <span>Raid</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="permanent" className="mt-0">
                <StoreSection items={permItems} purchase={purchase} onBuy={handlePurchase} />
              </TabsContent>

              <TabsContent value="daily" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Refreshes daily at midnight
                </div>
                {dailyItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    No daily items available today.
                  </div>
                ) : (
                  <StoreSection items={dailyItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Refreshes every Monday
                </div>
                {weeklyItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    No weekly items this week.
                  </div>
                ) : (
                  <StoreSection items={weeklyItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>

              <TabsContent value="raid" className="mt-0">
                <div className="text-[9px] font-mono text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
                  <Swords className="w-3 h-3" /> Exclusive raid-tier items
                </div>
                {raidItems.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/30 rounded-xl">
                    Clear raids to unlock exclusive items.
                  </div>
                ) : (
                  <StoreSection items={raidItems} purchase={purchase} onBuy={handlePurchase} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
