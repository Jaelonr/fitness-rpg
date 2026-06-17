import {
  useGetBattleLog,
  useGetPlayerStyleIdentity,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STYLE_META: Record<string, { label: string; color: string }> = {
  strength:     { label: "Strength",     color: "#ef4444" },
  striking:     { label: "Striking",     color: "#f97316" },
  conditioning: { label: "Conditioning", color: "#0dcef5" },
  grappling:    { label: "Grappling",    color: "#a855f7" },
  recovery:     { label: "Recovery",     color: "#22c55e" },
  discipline:   { label: "Discipline",   color: "#eab308" },
};

const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;

const VERDICT_COLORS: Record<string, string> = {
  "Victory":           "#ffbf00",
  "Narrow Victory":    "#0dcef5",
  "Strategic Retreat": "#f97316",
  "Training Complete": "#22c55e",
};

function StyleBar({ style, pct }: { style: string; pct: number }) {
  const colors = useColors();
  const meta = STYLE_META[style];
  if (!meta) return null;
  return (
    <View style={styles.styleBarRow}>
      <Text style={[styles.styleBarLabel, { color: meta.color }]}>
        {meta.label.slice(0, 4).toUpperCase()}
      </Text>
      <View style={[styles.styleBarTrack, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.styleBarFill,
            { width: `${pct}%` as any, backgroundColor: meta.color },
          ]}
        />
      </View>
      <Text style={[styles.styleBarPct, { color: colors.mutedForeground }]}>
        {pct}%
      </Text>
    </View>
  );
}

export default function BattleLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: battles, isLoading: loadingBattles } = useGetBattleLog(
    {},
    { query: { queryKey: ["/api/battle-log"] } }
  );
  const { data: identity } = useGetPlayerStyleIdentity({
    query: { queryKey: ["/api/player/style-identity"] },
  });

  const allBattles = (battles ?? []) as any[];
  const filtered =
    styleFilter === "all"
      ? allBattles
      : allBattles.filter((b) => b.dominantStyle === styleFilter);

  const topStyle = identity?.dominantStyle as string | undefined;
  const topMeta = topStyle ? STYLE_META[topStyle] : undefined;
  const pcts = identity?.percentages as Record<string, number> | undefined;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>
              BATTLE LOG
            </Text>

            {/* Style Identity Card */}
            {identity && identity.totalSessions > 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.identityHeader}>
                  <View>
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                      COMBAT STYLE · {identity.totalSessions} Sessions
                    </Text>
                    {topMeta && (
                      <Text style={[styles.archetypeTitle, { color: topMeta.color }]}>
                        {topMeta.label} Archetype
                      </Text>
                    )}
                    {identity.hybridArchetype ? (
                      <Text style={[styles.hybridText, { color: colors.mutedForeground }]}>
                        {identity.hybridArchetype}
                      </Text>
                    ) : null}
                  </View>
                  {topMeta && (
                    <View
                      style={[
                        styles.styleDot,
                        {
                          borderColor: topMeta.color,
                          backgroundColor: topMeta.color + "22",
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>⚔️</Text>
                    </View>
                  )}
                </View>
                <View style={styles.styleBars}>
                  {STYLE_ORDER.map((s) => (
                    <StyleBar key={s} style={s} pct={pcts?.[s] ?? 0} />
                  ))}
                </View>
              </View>
            )}

            {/* Totals */}
            {allBattles.length > 0 && (
              <View style={styles.totalsRow}>
                <View style={[styles.totalCell, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                  <Text style={[styles.totalVal, { color: colors.primary }]}>
                    {allBattles.reduce((s, b) => s + (b.xpEarned ?? 0), 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>XP</Text>
                </View>
                <View style={[styles.totalCell, { backgroundColor: "#ffbf0018", borderColor: "#ffbf0040" }]}>
                  <Text style={[styles.totalVal, { color: "#ffbf00" }]}>
                    {allBattles.reduce((s, b) => s + (b.goldEarned ?? 0), 0).toLocaleString()}
                  </Text>
                  <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>Gold</Text>
                </View>
                <View style={[styles.totalCell, { backgroundColor: "#fde04718", borderColor: "#fde04740" }]}>
                  <Text style={[styles.totalVal, { color: "#fde047" }]}>
                    {allBattles.reduce((s, b) => s + (b.prCount ?? 0), 0)}
                  </Text>
                  <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>PRs</Text>
                </View>
              </View>
            )}

            {/* Style Filters */}
            {allBattles.length > 0 && (
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    {
                      borderColor: styleFilter === "all" ? colors.primary : colors.border,
                      backgroundColor: styleFilter === "all" ? colors.primary + "22" : "transparent",
                    },
                  ]}
                  onPress={() => setStyleFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: styleFilter === "all" ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {STYLE_ORDER.filter((s) =>
                  allBattles.some((b) => b.dominantStyle === s)
                ).map((s) => {
                  const m = STYLE_META[s];
                  const active = styleFilter === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.filterPill,
                        {
                          borderColor: active ? m.color : colors.border,
                          backgroundColor: active ? m.color + "22" : "transparent",
                        },
                      ]}
                      onPress={() => setStyleFilter(s)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: active ? m.color : colors.mutedForeground },
                        ]}
                      >
                        {m.label.slice(0, 4)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {filtered.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 4 }]}>
                {filtered.length} BATTLE{filtered.length !== 1 ? "S" : ""} RECORDED
              </Text>
            )}
          </>
        )}
        renderItem={({ item: battle }) => {
          const styleMeta = STYLE_META[battle.dominantStyle] ?? STYLE_META.strength;
          const verdictColor = VERDICT_COLORS[battle.verdict] ?? colors.primary;
          const isExpanded = expandedId === battle.id;
          const events = (battle.events ?? []) as Array<{ text: string; type: string }>;

          return (
            <TouchableOpacity
              style={[
                styles.battleCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isExpanded ? styleMeta.color + "60" : colors.border,
                },
              ]}
              onPress={() => setExpandedId(isExpanded ? null : battle.id)}
              activeOpacity={0.8}
            >
              <View style={styles.battleTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.battleBadges}>
                    <Text style={[styles.styleBadge, { color: styleMeta.color }]}>
                      {styleMeta.label.toUpperCase().slice(0, 4)}
                    </Text>
                    <View
                      style={[
                        styles.verdictPill,
                        { borderColor: verdictColor + "60", backgroundColor: verdictColor + "18" },
                      ]}
                    >
                      <Text style={[styles.verdictText, { color: verdictColor }]}>
                        {battle.verdict}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.battleName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {battle.encounterName}
                  </Text>
                  <Text style={[styles.enemyName, { color: colors.mutedForeground }]}>
                    vs. {battle.enemyName}
                  </Text>
                </View>
                <Text style={[styles.battleDate, { color: colors.mutedForeground }]}>
                  {formatDate(battle.createdAt)}
                </Text>
              </View>

              <View style={styles.battleRewards}>
                <Text style={[styles.rewardText, { color: colors.primary }]}>
                  ⚡ +{battle.xpEarned}
                </Text>
                <Text style={[styles.rewardText, { color: "#ffbf00" }]}>
                  ✦ +{battle.goldEarned}
                </Text>
                {battle.prCount > 0 && (
                  <Text style={[styles.rewardText, { color: "#fde047" }]}>
                    🏆 ×{battle.prCount}
                  </Text>
                )}
              </View>

              {isExpanded && events.length > 0 && (
                <View style={[styles.events, { borderTopColor: colors.border }]}>
                  {events.map((ev, i) => (
                    <Text
                      key={i}
                      style={[styles.eventText, { color: colors.foreground, backgroundColor: colors.secondary }]}
                    >
                      {ev.text}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() =>
          !loadingBattles ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
                No battles yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Complete a workout to generate your first battle report.
              </Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { paddingTop: 40, alignItems: "center" },
  list: { paddingHorizontal: 16, gap: 10 },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  identityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  archetypeTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 2 },
  hybridText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  styleDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  styleBars: { gap: 6 },
  styleBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  styleBarLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", width: 30 },
  styleBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  styleBarFill: { height: 5, borderRadius: 3 },
  styleBarPct: { fontSize: 9, fontFamily: "Inter_400Regular", width: 28, textAlign: "right" },
  totalsRow: { flexDirection: "row", gap: 8 },
  totalCell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  totalVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalKey: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  battleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  battleTop: { flexDirection: "row", gap: 8 },
  battleBadges: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  styleBadge: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  verdictPill: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  verdictText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  battleName: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  enemyName: { fontSize: 11, fontFamily: "Inter_400Regular" },
  battleDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  battleRewards: { flexDirection: "row", gap: 12 },
  rewardText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  events: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  eventText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    padding: 8,
    borderRadius: 6,
  },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  emptySubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
