import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetArmory,
  useEquipGear,
  useGetInventory,
  useGetStoreSections,
  usePurchaseStoreItem,
  type RpgGear,
  type InventoryItem,
  type StoreSectionItem,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// ── Constants ─────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  common:    { text: "#9ca3af", border: "#9ca3af40", bg: "#9ca3af10" },
  uncommon:  { text: "#22c55e", border: "#22c55e40", bg: "#22c55e10" },
  rare:      { text: "#3b82f6", border: "#3b82f640", bg: "#3b82f610" },
  epic:      { text: "#a855f7", border: "#a855f740", bg: "#a855f710" },
  legendary: { text: "#ffbf00", border: "#ffbf0050", bg: "#ffbf0010" },
};

const RARITY_LABELS: Record<string, string> = {
  common: "COMMON", uncommon: "UNCOMMON", rare: "RARE",
  epic: "EPIC", legendary: "LEGENDARY",
};

const SLOT_EMOJIS: Record<string, string> = {
  weapon: "⚔️", offhand: "🛡️", helmet: "🪖", chest: "🧥",
  gloves: "🧤", boots: "👢", ring: "💍", necklace: "📿",
};

const TYPE_EMOJIS: Record<string, string> = {
  consumable: "🧪", gear: "⚔️", cosmetic: "🎨", title: "📜", utility: "🔧",
};

const STYLE_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  strength:     { text: "#ef4444", border: "#ef444440", bg: "#ef444415" },
  striking:     { text: "#f97316", border: "#f9731640", bg: "#f9731615" },
  conditioning: { text: "#0dcef5", border: "#0dcef540", bg: "#0dcef515" },
  grappling:    { text: "#a855f7", border: "#a855f740", bg: "#a855f715" },
  recovery:     { text: "#22c55e", border: "#22c55e40", bg: "#22c55e15" },
  discipline:   { text: "#ffbf00", border: "#ffbf0040", bg: "#ffbf0015" },
};

function rarityOf(r?: string) {
  return RARITY_COLORS[r ?? "common"] ?? RARITY_COLORS.common;
}

// ── Sub-tab bar ───────────────────────────────────────────────────────────────

type SubTab = "armory" | "items" | "store";

function SubTabBar({
  active,
  onSelect,
  colors,
}: {
  active: SubTab;
  onSelect: (t: SubTab) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const tabs: { key: SubTab; label: string; icon: string }[] = [
    { key: "armory", label: "Armory", icon: "🛡️" },
    { key: "items",  label: "Items",  icon: "🎒" },
    { key: "store",  label: "Store",  icon: "🪙" },
  ];
  return (
    <View style={[s.subTabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onSelect(t.key)}
          style={[
            s.subTabBtn,
            active === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          activeOpacity={0.75}
        >
          <Text style={s.subTabIcon}>{t.icon}</Text>
          <Text
            style={[
              s.subTabLabel,
              { color: active === t.key ? colors.primary : colors.mutedForeground },
            ]}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Gear card ─────────────────────────────────────────────────────────────────

function GearCard({ gear, colors }: { gear: RpgGear; colors: ReturnType<typeof useColors> }) {
  const r = rarityOf(gear.rarity);
  const equipGear = useEquipGear();
  const queryClient = useQueryClient();

  const statEntries = Object.entries(gear.statBonuses ?? {}).filter(([, v]) => (v ?? 0) > 0);

  const handleEquip = () => {
    equipGear.mutate(
      { id: gear.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/armory"] });
        },
      }
    );
  };

  return (
    <View
      style={[
        s.gearCard,
        { backgroundColor: r.bg, borderColor: gear.equipped ? r.text + "80" : r.border },
        gear.equipped && { borderWidth: 1.5 },
      ]}
    >
      {/* Rarity accent strip */}
      <View style={[s.gearAccent, { backgroundColor: r.text }]} />

      <View style={s.gearContent}>
        <View style={s.gearHeader}>
          <Text style={s.slotEmoji}>{SLOT_EMOJIS[gear.slot] ?? "🎁"}</Text>
          <View style={{ flex: 1 }}>
            <View style={s.gearNameRow}>
              <Text style={[s.gearName, { color: r.text }]} numberOfLines={1}>
                {gear.name}
              </Text>
              {gear.equipped && (
                <View style={[s.onBadge, { borderColor: r.border }]}>
                  <Text style={[s.onBadgeText, { color: r.text }]}>ON</Text>
                </View>
              )}
            </View>
            <View style={s.gearMetaRow}>
              <Text style={[s.rarityLabel, { color: r.text }]}>
                {RARITY_LABELS[gear.rarity] ?? "COMMON"}
              </Text>
              <Text style={[s.slotLabel, { color: colors.mutedForeground }]}>
                {gear.slot}
              </Text>
            </View>
            {statEntries.length > 0 && (
              <View style={s.statBonusRow}>
                {statEntries.map(([stat, val]) => (
                  <View key={stat} style={[s.statChip, { borderColor: r.border, backgroundColor: r.bg }]}>
                    <Text style={[s.statChipText, { color: r.text }]}>
                      +{val} {stat.slice(0, 3).toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {gear.flavorText ? (
              <Text style={[s.flavorText, { color: colors.mutedForeground }]} numberOfLines={2}>
                "{gear.flavorText}"
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={handleEquip}
            disabled={equipGear.isPending}
            style={[
              s.equipBtn,
              gear.equipped
                ? { borderColor: "#ef444440", backgroundColor: "#ef444415" }
                : { borderColor: r.border, backgroundColor: r.bg },
            ]}
            activeOpacity={0.75}
          >
            {equipGear.isPending ? (
              <ActivityIndicator size={10} color={gear.equipped ? "#ef4444" : r.text} />
            ) : (
              <Text style={[s.equipBtnText, { color: gear.equipped ? "#ef4444" : r.text }]}>
                {gear.equipped ? "Remove" : "Equip"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        {gear.source ? (
          <Text style={[s.sourceText, { color: colors.mutedForeground }]}>
            Source: {gear.source}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Armory tab ────────────────────────────────────────────────────────────────

function ArmoryTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data: armory, isLoading } = useGetArmory();

  if (isLoading) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const RARITY_ORDER = ["legendary", "epic", "rare", "uncommon", "common"];
  const sorted = [...(armory ?? [])].sort((a, b) => {
    const ri = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    if (ri !== 0) return ri;
    return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
  });

  const equipped   = sorted.filter((g) => g.equipped);
  const unequipped = sorted.filter((g) => !g.equipped);

  if (sorted.length === 0) {
    return (
      <View style={[s.emptyBox, { borderColor: colors.border }]}>
        <Text style={s.emptyIcon}>🛡️</Text>
        <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>Armory is empty</Text>
        <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>
          Complete boss raids to receive gear drops.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.tabContent}>
      {equipped.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>EQUIPPED</Text>
          {equipped.map((g) => (
            <GearCard key={g.id} gear={g} colors={colors} />
          ))}
        </>
      )}
      {unequipped.length > 0 && (
        <>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
            {equipped.length > 0 ? "UNEQUIPPED" : "ALL GEAR"} · {unequipped.length}
          </Text>
          {unequipped.map((g) => (
            <GearCard key={g.id} gear={g} colors={colors} />
          ))}
        </>
      )}
    </View>
  );
}

// ── Items tab ─────────────────────────────────────────────────────────────────

function ItemsTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { data: items, isLoading } = useGetInventory();

  if (isLoading) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View style={[s.emptyBox, { borderColor: colors.border }]}>
        <Text style={s.emptyIcon}>🎒</Text>
        <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>Your bag is empty</Text>
        <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>
          Purchase items from the Store tab to fill your inventory.
        </Text>
      </View>
    );
  }

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const key = item.itemType ?? "other";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <View style={s.tabContent}>
      {Object.entries(grouped).map(([type, group]) => (
        <View key={type}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
            {TYPE_EMOJIS[type] ?? "🎁"} {type.replace(/_/g, " ").toUpperCase()}
          </Text>
          {group.map((item) => {
            const r = rarityOf(item.rarity ?? "common");
            return (
              <View
                key={item.id}
                style={[s.itemCard, { backgroundColor: r.bg, borderColor: r.border }]}
              >
                <View style={[s.gearAccent, { backgroundColor: r.text }]} />
                <View style={s.itemContent}>
                  <View style={s.itemRow}>
                    <Text style={s.slotEmoji}>{TYPE_EMOJIS[item.itemType ?? "consumable"] ?? "🎁"}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={s.gearNameRow}>
                        <Text style={[s.gearName, { color: r.text }]} numberOfLines={1}>
                          {item.itemName}
                        </Text>
                        <View style={[s.qtyBadge, { borderColor: colors.border }]}>
                          <Text style={[s.qtyBadgeText, { color: colors.foreground }]}>×{item.quantity}</Text>
                        </View>
                      </View>
                      <View style={s.gearMetaRow}>
                        <Text style={[s.rarityLabel, { color: r.text }]}>
                          {RARITY_LABELS[item.rarity ?? "common"] ?? "COMMON"}
                        </Text>
                        <Text style={[s.slotLabel, { color: colors.mutedForeground }]}>
                          {item.itemType?.replace(/_/g, " ")}
                        </Text>
                      </View>
                      {item.description ? (
                        <Text style={[s.flavorText, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Confirm purchase modal ─────────────────────────────────────────────────────

function ConfirmModal({
  item,
  visible,
  onConfirm,
  onCancel,
  isPending,
  colors,
}: {
  item: StoreSectionItem | null;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  if (!item) return null;
  const r = rarityOf(item.rarity);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={s.modalOverlay}>
        <View style={[s.confirmModal, { backgroundColor: colors.card, borderColor: r.border }]}>
          <View style={[s.gearAccent, { backgroundColor: r.text, marginBottom: 12 }]} />
          <Text style={[s.confirmTitle, { color: colors.foreground }]}>Confirm Purchase</Text>

          <View style={s.confirmItemRow}>
            <Text style={s.slotEmoji}>{TYPE_EMOJIS[item.category ?? item.type] ?? "🎁"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.gearName, { color: r.text }]}>{item.name}</Text>
              <Text style={[s.rarityLabel, { color: r.text }]}>{RARITY_LABELS[item.rarity] ?? "COMMON"}</Text>
              {item.description ? (
                <Text style={[s.flavorText, { color: colors.mutedForeground }]} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[s.costRow, { borderColor: colors.border }]}>
            <Text style={[s.costLabel, { color: colors.mutedForeground }]}>Cost</Text>
            <View style={s.costAmount}>
              <Text style={s.coinEmoji}>🪙</Text>
              <Text style={s.costGold}>{item.goldCost} Gold</Text>
            </View>
          </View>

          <View style={s.confirmBtns}>
            <TouchableOpacity
              onPress={onCancel}
              style={[s.cancelBtn, { borderColor: colors.border }]}
              activeOpacity={0.75}
              disabled={isPending}
            >
              <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[s.buyBtn, { backgroundColor: "#ffbf0020", borderColor: "#ffbf0060" }]}
              activeOpacity={0.75}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size={14} color="#ffbf00" />
              ) : (
                <Text style={s.buyBtnText}>Buy Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Store section (inner tab) ─────────────────────────────────────────────────

type StoreInnerTab = "permanent" | "daily" | "weekly";

function StoreItemCard({
  item,
  onTap,
  colors,
}: {
  item: StoreSectionItem;
  onTap: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const r = rarityOf(item.rarity);
  const locked = item.meetsRequirements === false;
  const styleC = item.styleAffinity ? (STYLE_COLORS[item.styleAffinity] ?? null) : null;

  return (
    <TouchableOpacity
      onPress={locked ? undefined : onTap}
      activeOpacity={locked ? 1 : 0.8}
      style={[
        s.storeCard,
        { backgroundColor: r.bg, borderColor: r.border },
        locked && { opacity: 0.55 },
      ]}
    >
      <View style={[s.gearAccent, { backgroundColor: r.text }]} />
      <View style={s.storeCardContent}>
        <Text style={s.slotEmoji}>{TYPE_EMOJIS[item.category ?? item.type] ?? "🎁"}</Text>
        <View style={{ flex: 1 }}>
          <View style={s.gearNameRow}>
            <Text style={[s.gearName, { color: r.text }]} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={s.gearMetaRow}>
            <Text style={[s.rarityLabel, { color: r.text }]}>{RARITY_LABELS[item.rarity] ?? "COMMON"}</Text>
            {styleC && item.styleAffinity && (
              <View style={[s.styleChip, { borderColor: styleC.border, backgroundColor: styleC.bg }]}>
                <Text style={[s.styleChipText, { color: styleC.text }]}>{item.styleAffinity}</Text>
              </View>
            )}
            {item.rankRequired && (
              <View style={[s.styleChip, { borderColor: colors.border }]}>
                <Text style={[s.styleChipText, { color: colors.mutedForeground }]}>
                  Rank {item.rankRequired}+
                </Text>
              </View>
            )}
          </View>
          {item.description ? (
            <Text style={[s.flavorText, { color: colors.mutedForeground }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <View style={s.storeFooter}>
            <View style={s.goldPill}>
              <Text style={s.coinEmoji}>🪙</Text>
              <Text style={s.goldAmt}>{item.goldCost}</Text>
            </View>
            {locked ? (
              <Text style={[s.lockedLabel, { color: colors.mutedForeground }]}>🔒 Locked</Text>
            ) : (
              <View style={[s.buyChip, { borderColor: "#ffbf0060", backgroundColor: "#ffbf0015" }]}>
                <Text style={s.buyChipText}>Buy</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StoreTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [inner, setInner] = useState<StoreInnerTab>("permanent");
  const [confirmItem, setConfirmItem] = useState<StoreSectionItem | null>(null);

  const { data: sections, isLoading } = useGetStoreSections();
  const purchase = usePurchaseStoreItem();
  const queryClient = useQueryClient();

  const dailyItems = sections?.daily ?? [];
  const weeklyItems = sections?.weekly ?? [];
  const permItems = sections?.permanent ?? [];

  const innerTabs: { key: StoreInnerTab; label: string; icon: string; count?: number }[] = [
    { key: "permanent", label: "Shop",   icon: "⚔️" },
    { key: "daily",     label: "Daily",  icon: "🌅", count: dailyItems.length },
    { key: "weekly",    label: "Weekly", icon: "📅", count: weeklyItems.length },
  ];

  const currentItems: StoreSectionItem[] =
    inner === "daily" ? dailyItems : inner === "weekly" ? weeklyItems : permItems;

  const handleConfirm = () => {
    if (!confirmItem) return;
    purchase.mutate(
      { data: { itemId: confirmItem.id, quantity: 1 } },
      {
        onSuccess: () => {
          setConfirmItem(null);
          queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
          queryClient.invalidateQueries({ queryKey: ["/api/player"] });
          queryClient.invalidateQueries({ queryKey: ["/api/store/sections"] });
        },
        onError: () => {
          setConfirmItem(null);
        },
      }
    );
  };

  return (
    <View style={s.tabContent}>
      {/* Inner tab row */}
      <View style={[s.innerTabBar, { borderColor: colors.border }]}>
        {innerTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setInner(t.key)}
            style={[
              s.innerTabBtn,
              inner === t.key && {
                backgroundColor: colors.card,
                borderColor: "#ffbf0040",
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={s.innerTabIcon}>{t.icon}</Text>
            <Text
              style={[
                s.innerTabLabel,
                { color: inner === t.key ? "#ffbf00" : colors.mutedForeground },
              ]}
            >
              {t.label}
            </Text>
            {(t.count ?? 0) > 0 && (
              <View style={s.countDot}>
                <Text style={s.countDotText}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {inner !== "permanent" && (
        <Text style={[s.refreshNote, { color: colors.mutedForeground }]}>
          {inner === "daily" ? "⏱ Refreshes at midnight" : "📅 Refreshes every Monday"}
        </Text>
      )}

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : currentItems.length === 0 ? (
        <View style={[s.emptyBox, { borderColor: colors.border }]}>
          <Text style={s.emptyIcon}>🪙</Text>
          <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>
            {inner === "daily"
              ? "No daily items today"
              : inner === "weekly"
              ? "No weekly items this week"
              : "Store is empty"}
          </Text>
        </View>
      ) : (
        currentItems.map((item) => (
          <StoreItemCard
            key={item.id}
            item={item}
            onTap={() => setConfirmItem(item)}
            colors={colors}
          />
        ))
      )}

      <ConfirmModal
        item={confirmItem}
        visible={!!confirmItem}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmItem(null)}
        isPending={purchase.isPending}
        colors={colors}
      />
    </View>
  );
}

// ── Root screen ───────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const [tab, setTab] = useState<SubTab>("armory");
  const colors = useColors();

  return (
    <SafeAreaView
      style={[s.root, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Inventory</Text>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
          Gear · Items · Store
        </Text>
      </View>

      {/* Sub-tab bar */}
      <SubTabBar active={tab} onSelect={setTab} colors={colors} />

      {/* Content */}
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          Platform.OS === "ios" && { paddingBottom: 110 },
          Platform.OS === "android" && { paddingBottom: 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {tab === "armory" && <ArmoryTab colors={colors} />}
        {tab === "items"  && <ItemsTab  colors={colors} />}
        {tab === "store"  && <StoreTab  colors={colors} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontFamily: "SpecialElite_400Regular", letterSpacing: 0.5 },
  headerSub:   { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Sub-tab bar
  subTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  subTabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    gap: 2,
  },
  subTabIcon:  { fontSize: 15 },
  subTabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  scroll: { padding: 12 },
  tabContent: { gap: 10 },

  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 4,
  },

  // Gear card
  gearCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  gearAccent: { width: 3, borderRadius: 0 },
  gearContent: { flex: 1, padding: 10 },
  gearHeader:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  gearNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  gearName:    { fontSize: 13, fontFamily: "SpecialElite_400Regular", flex: 1 },
  gearMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  rarityLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  slotLabel:   { fontSize: 9, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  slotEmoji:   { fontSize: 22, marginTop: 1 },

  onBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  onBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },

  statBonusRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  statChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  statChipText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  flavorText: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 14 },
  sourceText: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 6, opacity: 0.5 },

  equipBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 4,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  equipBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Items
  itemCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  itemContent: { flex: 1, padding: 10 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  qtyBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: "#00000040",
  },
  qtyBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Store
  innerTabBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  innerTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "transparent",
  },
  innerTabIcon:  { fontSize: 12 },
  innerTabLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  countDot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0dcef530",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  countDotText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0dcef5" },

  refreshNote: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 6, paddingLeft: 2 },

  storeCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  storeCardContent: { flex: 1, padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  storeFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },

  goldPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  coinEmoji: { fontSize: 14 },
  goldAmt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#ffbf00" },

  buyChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buyChipText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#ffbf00" },
  lockedLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  styleChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  styleChipText: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "capitalize" },

  // Confirm modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000090",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  confirmTitle: {
    fontSize: 15,
    fontFamily: "SpecialElite_400Regular",
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  confirmItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    marginHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },
  costLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  costAmount: { flexDirection: "row", alignItems: "center", gap: 6 },
  costGold: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffbf00" },

  confirmBtns: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  buyBtn: {
    flex: 1.5,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  buyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#ffbf00" },

  // Shared utility
  centerBox: { paddingVertical: 40, alignItems: "center" },
  emptyBox: {
    paddingVertical: 48,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  emptyIcon:  { fontSize: 36, opacity: 0.3, marginBottom: 4 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyHint:  { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
});
