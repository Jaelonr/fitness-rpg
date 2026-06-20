import {
  customFetch,
  useGetBattleLog,
  useGetPlayerStyleIdentity,
} from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const aethoriaMap = require("../../assets/images/aethoria-map.jpg");

const STYLE_META: Record<string, { label: string; color: string }> = {
  strength:     { label: "Strength",     color: "#ef4444" },
  striking:     { label: "Striking",     color: "#f97316" },
  conditioning: { label: "Conditioning", color: "#0dcef5" },
  grappling:    { label: "Grappling",    color: "#a855f7" },
  recovery:     { label: "Recovery",     color: "#22c55e" },
  discipline:   { label: "Discipline",   color: "#eab308" },
};

const STYLE_ORDER = ["strength", "striking", "conditioning", "grappling", "recovery", "discipline"] as const;
const MAP_PATH_POINTS = [
  [42, 45],
  [40, 48],
  [38, 51],
  [36, 54],
  [34, 56],
  [32, 58],
  [30, 60],
] as const;
const MAP_PATH = `M ${MAP_PATH_POINTS[0][0]} ${MAP_PATH_POINTS[0][1]} ${MAP_PATH_POINTS.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ")}`;
const RETURN_STONE_PATH = "M 30 60 C 34 54 38 49 42 45";
const MAP_CLUES = [
  { source: "Hall Ledger", title: "Western commerce exists", status: "Known", text: "Aldric has mentioned that the western coast carries more coin than crowns. Details remain unconfirmed." },
  { source: "Item Lore", title: "Tideglass Ring", status: "Undiscovered", text: "A future item description can reveal more about N'Thaloris contracts." },
  { source: "Quest Dialogue", title: "Crown of the Coast", status: "Locked", text: "A noble envoy or Guild embassy commission should reveal this before it becomes common knowledge." },
];

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

function ChronicleMapViewer({
  footSteps,
  footMiles,
  assistedMiles,
  footRouteProgress,
}: {
  footSteps: number;
  footMiles: number;
  assistedMiles: number;
  footRouteProgress: number;
}) {
  const colors = useColors();
  const [routeFocused, setRouteFocused] = useState(false);
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(3, Math.max(1, startScale.value * event.scale));
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const maxOffset = 180 * scale.value;
      translateX.value = Math.min(maxOffset, Math.max(-maxOffset, startX.value + event.translationX));
      translateY.value = Math.min(maxOffset, Math.max(-maxOffset, startY.value + event.translationY));
    });

  const animatedMapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetMap = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  return (
    <View style={[styles.mapCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.mapHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MAP OF AETHORIA</Text>
          <Text style={[styles.mapTitle, { color: colors.foreground }]}>Known Routes</Text>
          <Text style={[styles.mapText, { color: colors.mutedForeground }]}>
            The parchment shows the continent, but the Chronicle only trusts what your journey has earned.
          </Text>
        </View>
        <TouchableOpacity onPress={resetMap} style={[styles.mapReset, { borderColor: colors.border }]}>
          <Text style={[styles.mapResetText, { color: colors.primary }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan)}>
        <View style={[styles.mapViewport, { borderColor: colors.border }]}>
          <Animated.View style={[styles.mapCanvas, animatedMapStyle]}>
            <Image source={aethoriaMap} resizeMode="cover" style={styles.mapImage} />
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setRouteFocused((current) => !current)}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={routeFocused ? "Hide emphasized route" : "Emphasize route"}
            >
            <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
              <Rect x="0" y="0" width="100" height="100" fill="rgba(4,7,8,0.14)" />
              <Path d={MAP_PATH} fill="none" stroke="rgba(7,7,6,0.82)" strokeWidth="0.72" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.2 2.6" />
              <Path d={MAP_PATH} fill="none" stroke="#49a3a0" strokeWidth="0.42" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.3 2.5" opacity="0.82" />
              {routeFocused ? (
                <>
                  <Path d={MAP_PATH} fill="none" stroke="rgba(7,7,6,0.82)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d={MAP_PATH} fill="none" stroke="#49a3a0" strokeWidth="0.86" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2.4 2.2" opacity="0.9" />
                  <Path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeWidth="0.82" strokeLinecap="round" strokeDasharray="1.1 1.3" opacity="0.9" />
                </>
              ) : null}
              <Path d={MAP_PATH} fill="none" stroke="#d9ad63" strokeWidth="0.48" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${footRouteProgress} ${100 - footRouteProgress}`} />
              <Path d={RETURN_STONE_PATH} fill="none" stroke="#a78bfa" strokeWidth="0.42" strokeLinecap="round" strokeDasharray="0.3 2.4" opacity="0.88" />
              {MAP_PATH_POINTS.slice(0, Math.max(2, Math.ceil((footRouteProgress / 100) * MAP_PATH_POINTS.length))).map(([x, y], index) => (
                <Circle key={`${x}-${y}`} cx={x} cy={y} r={index === 0 ? 0.8 : 0.58} fill={index === 0 ? "#49a3a0" : "#d9ad63"} stroke="#0c0b09" strokeWidth="0.28" />
              ))}
              <Circle cx="30" cy="60" r="0.86" fill="#a78bfa" stroke="#0c0b09" strokeWidth="0.28" />
            </Svg>
            </TouchableOpacity>
            <View style={styles.summonMarker}>
              <Text style={styles.summonMarkerText}>Summoning marker</Text>
            </View>
            <View style={styles.endpointMarker}>
              <Text style={styles.endpointMarkerText}>Expedition endpoint</Text>
            </View>
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.mapStatsRow}>
        <View style={[styles.mapStat, { borderColor: colors.border }]}>
          <Text style={[styles.mapStatKey, { color: colors.mutedForeground }]}>On Foot</Text>
          <Text style={[styles.mapStatVal, { color: "#d9ad63" }]}>{footSteps.toLocaleString()}</Text>
          <Text style={[styles.mapStatNote, { color: colors.mutedForeground }]}>~{footMiles.toFixed(1)} mi effort</Text>
        </View>
        <View style={[styles.mapStat, { borderColor: colors.border }]}>
          <Text style={[styles.mapStatKey, { color: colors.mutedForeground }]}>Caravan & Mount</Text>
          <Text style={[styles.mapStatVal, { color: colors.primary }]}>{assistedMiles.toFixed(1)} mi</Text>
          <Text style={[styles.mapStatNote, { color: colors.mutedForeground }]}>Assisted route</Text>
        </View>
      </View>
      <View style={styles.mapStatsRow}>
        <View style={[styles.mapStat, { borderColor: colors.border }]}>
          <Text style={[styles.mapStatKey, { color: colors.mutedForeground }]}>Endpoint</Text>
          <Text style={[styles.mapStatVal, { color: colors.foreground }]}>Field marker</Text>
          <Text style={[styles.mapStatNote, { color: colors.mutedForeground }]}>Expedition concludes</Text>
        </View>
        <View style={[styles.mapStat, { borderColor: colors.border }]}>
          <Text style={[styles.mapStatKey, { color: colors.mutedForeground }]}>Return Stone</Text>
          <Text style={[styles.mapStatVal, { color: "#c4b5fd" }]}>Guild Hall</Text>
          <Text style={[styles.mapStatNote, { color: colors.mutedForeground }]}>No walked return</Text>
        </View>
      </View>
      <Text style={[styles.mapText, { color: colors.mutedForeground }]}>
        Pinch to zoom. Drag to pan. Tap the route to {routeFocused ? "return it to dotted charting" : "emphasize it as a solid guide"}. Steps mark on-foot effort only.
      </Text>
      <View style={[styles.mapLegend, { borderColor: colors.border }]}>
        <Text style={styles.mapLegendText}><Text style={{ color: "#d9ad63" }}>Gold</Text> on foot</Text>
        <Text style={styles.mapLegendText}><Text style={{ color: "#49a3a0" }}>Teal</Text> assisted</Text>
        <Text style={styles.mapLegendText}><Text style={{ color: "#c4b5fd" }}>Violet</Text> return stone</Text>
      </View>

      <View style={styles.clueGrid}>
        {MAP_CLUES.map((clue) => (
          <View key={clue.title} style={[styles.clueCard, { borderColor: colors.border }]}>
            <View style={styles.clueTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clueSource, { color: colors.mutedForeground }]}>{clue.source}</Text>
                <Text style={[styles.clueTitle, { color: colors.foreground }]}>{clue.title}</Text>
              </View>
              <Text style={[styles.clueStatus, { color: clue.status === "Known" ? colors.primary : colors.mutedForeground }]}>
                {clue.status}
              </Text>
            </View>
            <Text style={[styles.mapText, { color: colors.mutedForeground }]}>{clue.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function BattleLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [chronicle, setChronicle] = useState<any | null>(null);

  const { data: battles, isLoading: loadingBattles } = useGetBattleLog(
    {},
    { query: { queryKey: ["/api/battle-log"] } }
  );
  const { data: identity } = useGetPlayerStyleIdentity({
    query: { queryKey: ["/api/player/style-identity"] },
  });

  useEffect(() => {
    let cancelled = false;
    customFetch<any>("/api/chronicle/summary")
      .then((data) => { if (!cancelled) setChronicle(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const allBattles = (battles ?? []) as any[];
  const filtered =
    styleFilter === "all"
      ? allBattles
      : allBattles.filter((b) => b.dominantStyle === styleFilter);

  const topStyle = identity?.dominantStyle as string | undefined;
  const topMeta = topStyle ? STYLE_META[topStyle] : undefined;
  const pcts = identity?.percentages as Record<string, number> | undefined;
  const totals = allBattles.reduce((sum, battle) => ({
    xp: sum.xp + (battle.xpEarned ?? 0),
    gold: sum.gold + (battle.goldEarned ?? 0),
    prs: sum.prs + (battle.prCount ?? 0),
  }), { xp: 0, gold: 0, prs: 0 });
  const footSteps = Math.max(1800, Math.round((identity?.totalSessions ?? 0) * 900 + allBattles.length * 650 + totals.prs * 250));
  const footMiles = Math.max(0.8, footSteps / 2200);
  const caravanMiles = Math.max(8, Math.round(((identity?.totalSessions ?? 0) * 1.8 + allBattles.length * 3.2) * 10) / 10);
  const mountMiles = Math.max(2, Math.round((totals.prs * 1.5 + Math.max(0, allBattles.length - 1) * 0.8) * 10) / 10);
  const assistedMiles = caravanMiles + mountMiles;
  const footRouteProgress = Math.max(9, Math.min(34, Math.round((footSteps / 70000) * 100)));

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
              CHRONICLE
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Battle replays, reports, discoveries, records, and the road still ahead.
            </Text>

            <View style={styles.totalsRow}>
              <View style={[styles.totalCell, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                <Text style={[styles.totalVal, { color: colors.primary }]}>{allBattles.length}</Text>
                <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>Replays</Text>
              </View>
              <View style={[styles.totalCell, { backgroundColor: "#ffbf0018", borderColor: "#ffbf0040" }]}>
                <Text style={[styles.totalVal, { color: "#ffbf00" }]}>{chronicle?.discoveredItems?.length ?? 0}</Text>
                <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>Items</Text>
              </View>
              <View style={[styles.totalCell, { backgroundColor: "#fde04718", borderColor: "#fde04740" }]}>
                <Text style={[styles.totalVal, { color: "#fde047" }]}>{chronicle?.majorMilestones?.length ?? 0}</Text>
                <Text style={[styles.totalKey, { color: colors.mutedForeground }]}>Marks</Text>
              </View>
            </View>

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

            <ChronicleMapViewer
              footSteps={footSteps}
              footMiles={footMiles}
              assistedMiles={assistedMiles}
              footRouteProgress={footRouteProgress}
            />

            {chronicle?.guildReports?.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LATEST GUILD REPORT</Text>
                <Text style={[styles.reportText, { color: colors.foreground }]} numberOfLines={4}>
                  {chronicle.guildReports[0].reportText}
                </Text>
              </View>
            )}

            {chronicle?.discoveredItems?.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DISCOVERED ITEMS</Text>
                {chronicle.discoveredItems.slice(0, 3).map((item: any) => (
                  <Text key={item.id} style={[styles.reportText, { color: colors.foreground }]}>
                    {item.itemName} - {item.currentState}
                  </Text>
                ))}
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
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -8, marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 4,
  },
  reportText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
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
  mapCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12, overflow: "hidden" },
  mapHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  mapTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 2 },
  mapText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  mapReset: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  mapResetText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  mapViewport: {
    height: 240,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#070706",
  },
  mapCanvas: { width: "100%", aspectRatio: 1.5 },
  mapImage: { width: "100%", height: "100%" },
  summonMarker: {
    position: "absolute",
    left: "38%",
    top: "39%",
    borderWidth: 1,
    borderColor: "#49a3a0aa",
    backgroundColor: "#061010dd",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  summonMarkerText: { color: "#bde7df", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  endpointMarker: {
    position: "absolute",
    left: "25%",
    top: "59%",
    borderWidth: 1,
    borderColor: "#a78bfaaa",
    backgroundColor: "#10091add",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  endpointMarkerText: { color: "#ddd6fe", fontSize: 9, fontFamily: "Inter_600SemiBold" },
  mapStatsRow: { flexDirection: "row", gap: 8 },
  mapStat: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: "#0c0b09" },
  mapStatKey: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  mapStatVal: { marginTop: 4, fontSize: 14, fontFamily: "Inter_700Bold" },
  mapStatNote: { marginTop: 2, fontSize: 9, fontFamily: "Inter_400Regular" },
  mapLegend: { borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: "#0c0b09", gap: 4 },
  mapLegendText: { color: "#b7ab9c", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  clueGrid: { gap: 8 },
  clueCard: { borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: "#0c0b09" },
  clueTop: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  clueSource: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  clueTitle: { marginTop: 2, fontSize: 13, fontFamily: "Inter_700Bold" },
  clueStatus: { fontSize: 9, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
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
