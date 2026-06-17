import {
  useGetWorkoutTemplates,
  useGetWorkoutSessions,
  useCreateWorkoutSession,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS: Record<string, string> = {
  strength:     "#ef4444",
  conditioning: "#0dcef5",
  striking:     "#f97316",
  grappling:    "#a855f7",
  recovery:     "#22c55e",
  mixed:        "#ffbf00",
};

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loadingTemplates } = useGetWorkoutTemplates();
  const { data: sessionsData, isLoading: loadingSessions } = useGetWorkoutSessions(
    {},
    { query: { queryKey: ["/api/workouts/sessions"] } }
  );
  const createSession = useCreateWorkoutSession();
  const [startingId, setStartingId] = useState<number | null>(null);

  const recentSessions = ((sessionsData as any)?.sessions ?? (sessionsData as any) ?? []).slice(0, 5);

  const handleStart = (template: any) => {
    Alert.alert(
      `Start "${template.name}"?`,
      template.description ?? `${template.category} workout`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Begin Battle",
          onPress: () => {
            setStartingId(template.id);
            createSession.mutate(
              { data: { name: template.name, templateId: template.id } },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ["/api/workouts/sessions"] });
                  Alert.alert(
                    "⚔️ Battle Started",
                    "Your session is active. Log your sets to earn XP.",
                    [{ text: "OK" }]
                  );
                },
                onError: () => {
                  Alert.alert("Error", "Could not start session. Try again.");
                },
                onSettled: () => setStartingId(null),
              }
            );
          },
        },
      ]
    );
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "—";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  if (loadingTemplates && loadingSessions) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={(templates ?? []) as any[]}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            <Text style={[styles.screenLabel, { color: colors.mutedForeground }]}>
              TRAINING
            </Text>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  RECENT SESSIONS
                </Text>
                {recentSessions.map((s: any) => (
                  <View
                    key={s.id}
                    style={[
                      styles.sessionRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: s.status === "active" ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionName, { color: colors.foreground }]}>
                        {s.name}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                        {formatDate(s.createdAt)} · {s.sets?.length ?? 0} sets
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={[styles.sessionDuration, { color: colors.primary }]}>
                        {formatDuration(s.durationMinutes)}
                      </Text>
                      {s.status === "active" && (
                        <View style={[styles.activePill, { borderColor: colors.primary }]}>
                          <Text style={[styles.activePillText, { color: colors.primary }]}>
                            ACTIVE
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              TEMPLATES
            </Text>
          </>
        )}
        renderItem={({ item: template }) => {
          const cat = (template as any).category as string ?? "mixed";
          const catColor = CATEGORY_COLORS[cat] ?? colors.primary;
          const isStarting = startingId === template.id;
          const exercises = (template as any).exercises ?? [];
          const estDuration = (template as any).estimatedDuration as number | null | undefined;
          return (
            <TouchableOpacity
              style={[
                styles.templateCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => handleStart(template)}
              activeOpacity={0.7}
              disabled={isStarting}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.templateHeader}>
                  <Text style={[styles.templateName, { color: colors.foreground }]}>
                    {template.name}
                  </Text>
                  <View style={[styles.catBadge, { borderColor: catColor }]}>
                    <Text style={[styles.catText, { color: catColor }]}>
                      {cat.toUpperCase().slice(0, 4)}
                    </Text>
                  </View>
                </View>
                {(template as any).description ? (
                  <Text
                    style={[styles.templateDesc, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {(template as any).description}
                  </Text>
                ) : null}
                <View style={styles.templateMeta}>
                  {estDuration ? (
                    <Text style={[styles.metaChip, { color: colors.mutedForeground }]}>
                      ⏱ {formatDuration(estDuration)}
                    </Text>
                  ) : null}
                  {exercises.length > 0 ? (
                    <Text style={[styles.metaChip, { color: colors.mutedForeground }]}>
                      {exercises.length} exercises
                    </Text>
                  ) : null}
                </View>
              </View>
              <View
                style={[
                  styles.startBtn,
                  { backgroundColor: catColor + "22", borderColor: catColor },
                ]}
              >
                {isStarting ? (
                  <ActivityIndicator color={catColor} size="small" />
                ) : (
                  <Text style={[styles.startBtnText, { color: catColor }]}>▶</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() =>
          !loadingTemplates ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No templates found.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 16, gap: 10 },
  screenLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  sessionName: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  sessionMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sessionDuration: { fontSize: 13, fontFamily: "Inter_700Bold" },
  activePill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  activePillText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  templateName: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  catBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  catText: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  templateDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 6 },
  templateMeta: { flexDirection: "row", gap: 10 },
  metaChip: { fontSize: 10, fontFamily: "Inter_500Medium" },
  startBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
