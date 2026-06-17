import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages, playerTable, questsTable, questTasksTable } from "@workspace/db";
import { CAMPAIGN_QUESTS, getQuestById } from "../data/campaign-quests";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, and, asc } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";

const router = Router();

const GUILD_MASTER_CONTEXT = "guild_master";

const GRANDMASTER_ALDRIC_SYSTEM_PROMPT = (player: {
  name: string;
  level: number;
  rank: string;
  totalXp: number;
  currentStreak: number;
  dominantStyle: string | null;
  recentActivity: string;
}) => `You are Grandmaster Aldric, the weathered and wise Guild Master of the Hunter's Guild.

CHARACTER:
- Age: mid-60s, silver-haired, battle-scarred, calm bearing
- Tone: serious, direct, warm beneath the surface — never uses shame, sarcasm, or toxic positivity
- Voice: speaks in measured sentences; uses the hunter's world as metaphor for real fitness
- Philosophy: growth is the only true victory; stagnation is the only true enemy
- Backstory: Once an S-Rank hunter himself, retired after a gate incident that cost him two fingers on his left hand. He knows what it is to push too far, and what it costs to stop too soon.
- Never breaks character. The guild hall, gates, quests, and ranks are real to him.

YOUR HUNTER'S CURRENT STATUS:
- Name: ${player.name}
- Level: ${player.level}
- Rank: ${player.rank}
- Total XP: ${player.totalXp.toLocaleString()}
- Training Streak: ${player.currentStreak} days
- Combat Style: ${player.dominantStyle || "undetermined — train more to reveal it"}
- Recent Activity: ${player.recentActivity}

GUIDANCE PRINCIPLES:
1. Treat the player's real-world fitness data as their guild record — reference it naturally
2. Give specific, actionable advice based on their actual stats when asked
3. When they seem discouraged, acknowledge it without dismissing it — then redirect with purpose
4. Celebrate genuine progress, not just effort — results matter here
5. Keep responses 2-4 paragraphs unless a detailed plan is requested
6. Never tell them to "just believe in themselves" — give them a specific next action instead
7. If they haven't trained recently, name it directly but without judgment: "The board shows no activity this week, Hunter."

WORLD FLAVOR:
- The guild hall smells of old stone and lamp oil
- Hunters come and go with missions from the board
- The training yard is visible through the window
- Aldric keeps a battered logbook that he cross-references during conversations
- He occasionally references other hunters obliquely ("I had a hunter once, C-Rank, trained like you...")

Begin each new conversation with a brief acknowledgment of their current standing and one observation about their recent activity.`;

async function getOrCreateGMConversation(playerId: number): Promise<number> {
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.playerId, playerId), eq(conversations.context, GUILD_MASTER_CONTEXT)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(conversations)
    .values({
      title: "Guild Master Session",
      context: GUILD_MASTER_CONTEXT,
      playerId,
    })
    .returning();

  return created.id;
}

router.get("/guild-master/conversation", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);
    const convId = await getOrCreateGMConversation(player.id);

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    res.json({
      conversationId: convId,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err, "guild-master conversation error");
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

router.post("/guild-master/messages", async (req, res) => {
  const { content, conversationId } = req.body as {
    content: string;
    conversationId: number;
  };

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    // Verify this conversation belongs to this player
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.playerId, player.id)))
      .limit(1);

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Load message history (last 20 to keep token count manageable)
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(20);

    // Save user message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: content.trim(),
    });

    const p = player;
    const recentActivity =
      p.streakDays > 0
        ? `Active — ${p.streakDays}-day training streak`
        : "No recent training logged this week";

    const systemPrompt = GRANDMASTER_ALDRIC_SYSTEM_PROMPT({
      name: p.name || "Hunter",
      level: p.level,
      rank: p.rank,
      totalXp: p.totalXpEarned,
      currentStreak: p.streakDays,
      dominantStyle: (p as any).dominantStyle ?? null,
      recentActivity,
    });

    const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: content.trim() },
    ];

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      stream: true,
      max_tokens: 600,
      temperature: 0.75,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    // Save assistant response
    if (fullResponse) {
      await db.insert(messages).values({
        conversationId,
        role: "assistant",
        content: fullResponse,
      });
    }
  } catch (err) {
    req.log.error(err, "guild-master message error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

router.post("/guild-master/campaign-quests/:campaignId/start", async (req, res) => {
  const campaignId = parseInt(req.params.campaignId);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign quest ID" });
    return;
  }

  const questDef = getQuestById(campaignId);
  if (!questDef) {
    res.status(404).json({ error: "Campaign quest not found" });
    return;
  }

  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    const titlePrefix = `[Campaign] Q${String(campaignId).padStart(3, "0")}:`;

    const existing = await db
      .select()
      .from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main")));

    const alreadyStarted = existing.find((q) => q.title.startsWith(titlePrefix));
    if (alreadyStarted) {
      res.status(409).json({ error: "Quest already started", quest: alreadyStarted });
      return;
    }

    const [quest] = await db
      .insert(questsTable)
      .values({
        playerId: player.id,
        type: "main",
        title: `${titlePrefix} ${questDef.title}`,
        description: questDef.description,
        xpReward: questDef.xpReward,
        goldReward: questDef.goldReward,
        status: "active",
      })
      .returning();

    await db.insert(questTasksTable).values(
      questDef.tasks.map((t) => ({
        questId: quest.id,
        description: t.description,
        targetValue: t.targetValue,
        unit: t.unit,
        order: t.order,
      }))
    );

    res.status(201).json(quest);
  } catch (err) {
    req.log.error(err, "campaign quest start error");
    res.status(500).json({ error: "Failed to start campaign quest" });
  }
});

export default router;
