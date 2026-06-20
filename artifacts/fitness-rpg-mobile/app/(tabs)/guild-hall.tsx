import { Feather } from "@expo/vector-icons";
import {
  customFetch,
  getGetGuildHallTodayQueryKey,
  useGetGuildHallToday,
  useGetGuildMasterConversation,
  useReportToGuildMaster,
  type GuildHallReportResult,
  type QuestTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const aldricImage = require("../../assets/images/grandmaster-aldric.png");
const hallBackground = require("../../assets/images/guild-hall-background.png");
const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

type ChatLine = { id: string; role: "user" | "assistant"; content: string };

function taskIcon(description: string): keyof typeof Feather.glyphMap {
  const value = description.toLowerCase();
  if (value.includes("protein")) return "target";
  if (value.includes("meal") || value.includes("nutrition")) return "pie-chart";
  return "activity";
}

function TaskRow({ task, index }: { task: QuestTask; index: number }) {
  const target = task.targetValue ?? 1;
  const current = Math.min(task.currentValue ?? 0, target);
  const progress = task.completed ? 1 : Math.min(1, current / Math.max(1, target));
  return (
    <View style={styles.taskRow}>
      <View style={styles.taskIconWrap}>
        <Text style={styles.taskNumber}>{index + 1}</Text>
        <View style={styles.taskIcon}><Feather name={taskIcon(task.description)} size={16} color="#d8ab59" /></View>
      </View>
      <View style={styles.taskBody}>
        <View style={styles.taskTitleRow}>
          <Text style={[styles.taskTitle, task.completed && styles.taskDone]}>{task.description}</Text>
          {task.completed ? <Feather name="check-circle" size={16} color="#4fa56b" /> : null}
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, task.completed && styles.progressDone, { width: `${progress * 100}%` }]} /></View>
        <Text style={styles.progressText}>{task.currentValue ?? 0} / {task.targetValue ?? 1} {task.unit ?? ""}</Text>
      </View>
      <View style={styles.taskReward}>
        <Text style={styles.xpText}>+{index === 0 ? 150 : 100} XP</Text>
        <Text style={styles.goldText}>+{index === 0 ? 75 : 50} gold</Text>
      </View>
    </View>
  );
}

function CommissionLocationPanel({ commission }: { commission: any }) {
  const location = commission?.location;
  const travel = commission?.travel;
  if (!location || !travel) return null;
  return (
    <View style={styles.locationPanel}>
      <View style={styles.locationTop}>
        <Feather name="map-pin" size={15} color="#d9ad63" />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationLabel}>COMMISSION LOCATION</Text>
          <Text style={styles.locationName}>{location.name}</Text>
          <Text style={styles.locationMeta}>{location.region} - {location.distanceFromGuildHallMiles} mi from the Guild Hall</Text>
          <Text style={styles.locationMeta}>Realm: {location.realm ?? "Uncharted realm"}</Text>
          <Text style={styles.locationMeta}>Faction: {location.primaryFaction ?? "Unknown faction"}</Text>
        </View>
      </View>
      <Text style={styles.locationText}>{travel.narrativeReason}</Text>
      <View style={styles.travelGrid}>
        {[
          ["FOOT", `${travel.onFootMiles} mi`, "#d9ad63"],
          ["CARAVAN", `${travel.caravanMiles} mi`, "#49a3a0"],
          ["MOUNT", `${travel.mountMiles} mi`, "#79b8d8"],
          ["RETURN", `${travel.returnStoneMiles} mi`, "#c4b5fd"],
        ].map(([label, value, color]) => (
          <View key={label} style={styles.travelCell}>
            <Text style={styles.travelLabel}>{label}</Text>
            <Text style={[styles.travelValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.locationText}>{travel.routeNote}</Text>
    </View>
  );
}

function GuildMasterModal({ visible, onClose, report }: {
  visible: boolean;
  onClose: () => void;
  report: GuildHallReportResult | null;
}) {
  const insets = useSafeAreaInsets();
  const { data: conversation, refetch } = useGetGuildMasterConversation({ query: { queryKey: ["/api/guild-master/conversation"], enabled: visible } });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [localLines, setLocalLines] = useState<ChatLine[]>([]);
  const lines = useMemo<ChatLine[]>(() => [
    ...(conversation?.messages ?? []).map((message) => ({
      id: String(message.id),
      role: message.role === "user" ? "user" as const : "assistant" as const,
      content: message.content,
    })),
    ...localLines,
  ], [conversation?.messages, localLines]);

  async function send() {
    const content = draft.trim();
    if (!content || !conversation?.conversationId || sending) return;
    setDraft("");
    setSending(true);
    setLocalLines((current) => [...current, { id: `u-${Date.now()}`, role: "user", content }]);
    try {
      const sse = await customFetch<string>("/api/guild-master/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, conversationId: conversation.conversationId, narrativeMode: "balanced" }),
        responseType: "text",
      });
      const answer = sse.split("\n").filter((line) => line.startsWith("data: ")).map((line) => {
        try { return (JSON.parse(line.slice(6)) as { content?: string }).content ?? ""; } catch { return ""; }
      }).join("");
      if (answer) setLocalLines((current) => [...current, { id: `a-${Date.now()}`, role: "assistant", content: answer }]);
      await refetch();
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 16) }]}>
          <View><Text style={styles.modalTitle}>Grandmaster Aldric</Text><Text style={styles.modalSubtitle}>Private audience</Text></View>
          <Pressable onPress={onClose} accessibilityLabel="Close"><Feather name="x" size={24} color="#d6ccbe" /></Pressable>
        </View>
        {report?.counsel ? <View style={styles.reportNotice}><Text style={styles.reportNoticeText}>{report.counsel}</Text></View> : null}
        <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
          {lines.map((line) => (
            <View key={line.id} style={[styles.chatBubble, line.role === "user" ? styles.userBubble : styles.aldricBubble]}>
              <Text style={styles.chatText}>{line.content}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Speak plainly to the Guildmaster..." placeholderTextColor="#6f695f" multiline style={styles.input} />
          <Pressable onPress={() => void send()} disabled={!draft.trim() || sending} style={styles.sendButton}>
            {sending ? <ActivityIndicator color="#f1dfc6" /> : <Feather name="send" size={18} color="#f1dfc6" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function GuildHallScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetGuildHallToday();
  const [reportResult, setReportResult] = useState<GuildHallReportResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const report = useReportToGuildMaster({
    mutation: {
      onSuccess: async (result) => {
        setReportResult(result);
        setModalVisible(true);
        await queryClient.invalidateQueries({ queryKey: getGetGuildHallTodayQueryKey() });
      },
    },
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#d7a54d" /></View>;
  if (isError || !data) return (
    <View style={styles.center}>
      <Feather name="shield" size={32} color="#9d3e2a" />
      <Text style={styles.errorText}>The Guild ledger could not be opened.</Text>
      <Pressable onPress={() => void refetch()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
    </View>
  );

  const extended = data as any;
  const quest = data.commission.quest;
  const completed = quest.tasks.filter((task) => task.completed).length;

  return (
    <ImageBackground source={hallBackground} resizeMode="cover" style={styles.root}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Feather name="flag" size={22} color="#d09b43" />
          <View><Text style={styles.headerTitle}>Guild Hall</Text><Text style={styles.headerSub}>TRAIN. FUEL. RECOVER. ENDURE.</Text></View>
        </View>

        <View style={styles.aldricPanel}>
          <Image source={aldricImage} resizeMode="cover" style={styles.aldricImage} />
          <View style={styles.aldricCopy}>
            <View style={styles.aldricTitleRow}><Text style={styles.aldricName}>Grandmaster Aldric</Text><Text style={styles.rankTag}>S-RANK</Text></View>
            <Text style={styles.counsel}>{data.counsel.message}</Text>
            <View style={styles.streakRow}><Feather name="zap" size={14} color="#c6903e" /><Text style={styles.streakText}>{data.player.streakDays}-day training streak - Aldric has noticed.</Text></View>
          </View>
        </View>

        <Pressable onPress={() => report.mutate()} disabled={report.isPending} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
          {report.isPending ? <ActivityIndicator color="#f1dfc6" /> : <Feather name="message-circle" size={20} color="#f1dfc6" />}
          <Text style={styles.reportButtonText}>REPORT TO THE GUILDMASTER</Text>
        </Pressable>

        <View style={styles.statusGrid}>
          {[
            ["award", "RANK", `${data.player.rank}-Rank`, "#d6a14b"],
            ["chevrons-up", "LEVEL", `Lv. ${data.player.level}`, "#d8c4a5"],
            ["zap", "STREAK", `${data.player.streakDays} days`, "#dc7540"],
            ["book-open", "CAMPAIGN", `Ch. ${data.campaign.chapter}`, "#55a6a1"],
          ].map(([icon, label, value, color], index) => (
            <View key={label} style={[styles.statusCell, index === 3 && styles.lastStatusCell]}>
              <Feather name={icon as keyof typeof Feather.glyphMap} size={16} color={color} />
              <Text style={styles.statusLabel}>{label}</Text><Text numberOfLines={1} style={styles.statusValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.commission}>
          <View style={styles.commissionHeader}>
            <View><Text style={styles.commissionTitle}>Today's Commission</Text><Text style={styles.commissionSub}>{completed} of {quest.tasks.length} duties complete</Text></View>
            <View style={styles.resetRow}><Feather name="clock" size={12} color="#8f887d" /><Text style={styles.resetText}>MIDNIGHT</Text></View>
          </View>
          <CommissionLocationPanel commission={extended.commission} />
          {quest.tasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} />)}
          <View style={styles.rewardRow}>
            <View style={styles.rewardBlock}><Text style={styles.rewardLabel}>COMMISSION REWARD</Text><Text style={styles.rewardXp}>+{quest.xpReward} XP</Text></View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardBlock}><Text style={styles.rewardLabel}>GUILD GOLD</Text><Text style={styles.rewardGold}>+{quest.goldReward}</Text></View>
          </View>
        </View>

        {data.equippedGear.length > 0 ? (
          <View style={styles.affinity}><Feather name="star" size={18} color="#53aeb0" /><View style={{ flex: 1 }}><Text style={styles.affinityLabel}>SYSTEM AFFINITY</Text><Text numberOfLines={1} style={styles.affinityText}>{data.equippedGear.map((gear) => `${gear.name}: ${gear.elementalAffinity}`).join(" | ")}</Text></View></View>
        ) : null}
        <Text style={styles.footerLine}>{completed === quest.tasks.length ? "The Guild is ready to receive your report." : "Consistency is the weapon. The next action is enough."}</Text>
      </ScrollView>
      <GuildMasterModal visible={modalVisible} onClose={() => setModalVisible(false)} report={reportResult} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c0b09" },
  scroll: { paddingHorizontal: 14, gap: 14 },
  center: { flex: 1, backgroundColor: "#0c0b09", alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  errorText: { color: "#aaa197", textAlign: "center", fontFamily: "Inter_400Regular" },
  retry: { borderWidth: 1, borderColor: "#6b4d2f", paddingHorizontal: 18, paddingVertical: 9 },
  retryText: { color: "#d9ad63", fontFamily: "Inter_600SemiBold" },
  header: { flexDirection: "row", gap: 10, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#6d4a25", paddingBottom: 12 },
  headerTitle: { color: "#e5c386", fontSize: 25, fontFamily: serif, fontWeight: "700" },
  headerSub: { color: "#9f9586", fontSize: 9, letterSpacing: 1.8, fontFamily: "Inter_600SemiBold" },
  aldricPanel: { borderWidth: 1, borderColor: "#6b4d2f", backgroundColor: "#11100e", overflow: "hidden" },
  aldricImage: { width: "100%", aspectRatio: 4 / 3 },
  aldricCopy: { borderTopWidth: 1, borderTopColor: "#6b4d2f", padding: 14 },
  aldricTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  aldricName: { color: "#d9ad63", fontSize: 18, fontFamily: serif, fontWeight: "700", flex: 1 },
  rankTag: { borderWidth: 1, borderColor: "#72552e", color: "#d5a557", fontSize: 9, fontFamily: "Inter_700Bold", paddingHorizontal: 6, paddingVertical: 2 },
  counsel: { marginTop: 8, color: "#ded5c8", fontSize: 15, lineHeight: 22, fontFamily: serif },
  streakRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  streakText: { color: "#c6903e", fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  reportButton: { minHeight: 54, borderWidth: 1, borderColor: "#c08c4e", backgroundColor: "#74291f", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 10 },
  reportButtonText: { color: "#f1dfc6", fontSize: 14, fontFamily: serif, fontWeight: "700", textAlign: "center" },
  pressed: { opacity: 0.82 },
  statusGrid: { flexDirection: "row", borderWidth: 1, borderColor: "#514332", backgroundColor: "#11100e" },
  statusCell: { flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 2, paddingVertical: 11, borderRightWidth: 1, borderRightColor: "#3b3328" },
  lastStatusCell: { borderRightWidth: 0 },
  statusLabel: { color: "#80796f", fontSize: 8, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  statusValue: { color: "#e2d8ca", fontSize: 11, fontFamily: serif, marginTop: 2, maxWidth: "100%" },
  commission: { borderWidth: 1, borderColor: "#514332", backgroundColor: "#11100e", paddingHorizontal: 13 },
  commissionHeader: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#3b3328", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  commissionTitle: { color: "#d9ad63", fontSize: 18, fontFamily: serif, fontWeight: "700" },
  commissionSub: { color: "#8f887d", fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  resetRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  resetText: { color: "#8f887d", fontSize: 8, fontFamily: "Inter_600SemiBold" },
  locationPanel: { borderBottomWidth: 1, borderBottomColor: "#3b3328", paddingVertical: 12, gap: 9 },
  locationTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  locationLabel: { color: "#8f887d", fontSize: 8, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  locationName: { color: "#d9ad63", fontSize: 16, fontFamily: serif, fontWeight: "700", marginTop: 2 },
  locationMeta: { color: "#8f887d", fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 2 },
  locationText: { color: "#b7ab9c", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
  travelGrid: { flexDirection: "row", borderWidth: 1, borderColor: "#3b3328", backgroundColor: "#0c0b09" },
  travelCell: { flex: 1, alignItems: "center", paddingVertical: 8, borderRightWidth: 1, borderRightColor: "#2f2922" },
  travelLabel: { color: "#8f887d", fontSize: 8, fontFamily: "Inter_600SemiBold" },
  travelValue: { marginTop: 3, fontSize: 11, fontFamily: "Inter_700Bold" },
  taskRow: { flexDirection: "row", gap: 9, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#3b3328" },
  taskIconWrap: { width: 38, alignItems: "center" },
  taskNumber: { position: "absolute", left: -1, top: -6, color: "#9b7842", fontSize: 9, fontFamily: "Inter_700Bold", zIndex: 1 },
  taskIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#8c6a36", backgroundColor: "#15130f" },
  taskBody: { flex: 1, minWidth: 0 },
  taskTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  taskTitle: { color: "#eee5d7", fontSize: 13, lineHeight: 17, fontFamily: serif, fontWeight: "600", flex: 1 },
  taskDone: { color: "#a8c9b0" },
  progressTrack: { height: 5, backgroundColor: "#25231f", marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#b48432" },
  progressDone: { backgroundColor: "#3e8f5c" },
  progressText: { color: "#928b80", fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 4 },
  taskReward: { width: 55, alignItems: "flex-end" },
  xpText: { color: "#e2ad4d", fontSize: 10, fontFamily: "Inter_700Bold" },
  goldText: { color: "#b99c6b", fontSize: 9, fontFamily: "Inter_500Medium", marginTop: 4 },
  rewardRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 14 },
  rewardBlock: { flex: 1, alignItems: "center" },
  rewardDivider: { width: 1, height: 32, backgroundColor: "#3b3328" },
  rewardLabel: { color: "#8f887d", fontSize: 8, fontFamily: "Inter_600SemiBold" },
  rewardXp: { color: "#49a3a0", fontSize: 16, fontFamily: serif, marginTop: 3 },
  rewardGold: { color: "#d7a54d", fontSize: 16, fontFamily: serif, marginTop: 3 },
  affinity: { borderLeftWidth: 2, borderLeftColor: "#428f91", backgroundColor: "#10191a", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  affinityLabel: { color: "#73999a", fontSize: 8, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  affinityText: { color: "#d8e4e3", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  footerLine: { color: "#8d8579", fontSize: 10, textAlign: "center", fontFamily: "Inter_400Regular" },
  modalRoot: { flex: 1, backgroundColor: "#0f0e0c" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#4b3925" },
  modalTitle: { color: "#d9ad63", fontSize: 20, fontFamily: serif, fontWeight: "700" },
  modalSubtitle: { color: "#81786d", fontSize: 10, fontFamily: "Inter_500Medium" },
  reportNotice: { margin: 14, borderLeftWidth: 2, borderLeftColor: "#9d3e2a", backgroundColor: "#1b1511", padding: 11 },
  reportNoticeText: { color: "#d6ccbe", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  chatScroll: { flex: 1 },
  chatContent: { padding: 14, gap: 10 },
  chatBubble: { maxWidth: "88%", paddingHorizontal: 12, paddingVertical: 10 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#4c2119" },
  aldricBubble: { alignSelf: "flex-start", backgroundColor: "#181713", borderWidth: 1, borderColor: "#3b3328" },
  chatText: { color: "#e1d8ca", fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#3b3328" },
  input: { flex: 1, minHeight: 46, maxHeight: 110, borderWidth: 1, borderColor: "#4a4032", backgroundColor: "#171510", color: "#eee5d7", paddingHorizontal: 11, paddingVertical: 9, fontFamily: "Inter_400Regular" },
  sendButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: "#8e3525", borderWidth: 1, borderColor: "#c08c4e" },
});
