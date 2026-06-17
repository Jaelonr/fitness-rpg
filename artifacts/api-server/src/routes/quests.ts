import { Router } from "express";
import { db } from "@workspace/db";
import {
  questsTable, questTasksTable, playerTable, playerStatsTable, xpHistoryTable
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse, xpForLevel, rankForLevel } from "./player";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function buildQuestResponse(quest: any) {
  const tasks = await db.select().from(questTasksTable)
    .where(eq(questTasksTable.questId, quest.id))
    .orderBy(questTasksTable.order);
  return {
    ...quest,
    expiresAt: quest.expiresAt?.toISOString() || null,
    completedAt: quest.completedAt?.toISOString() || null,
    claimedAt: quest.claimedAt?.toISOString() || null,
    createdAt: quest.createdAt.toISOString(),
    tasks: tasks.map(t => ({
      ...t,
      completedAt: t.completedAt?.toISOString() || null,
    })),
  };
}

async function ensureDailyQuest(playerId: number) {
  const today = getTodayStr();
  const existing = await db.select().from(questsTable)
    .where(and(eq(questsTable.playerId, playerId), eq(questsTable.type, "daily")))
    .orderBy(desc(questsTable.createdAt))
    .limit(1);

  if (existing.length > 0) {
    const q = existing[0];
    const qDate = q.createdAt.toISOString().split("T")[0];
    if (qDate === today && q.status !== "failed") return q;
  }

  // Create today's daily quest
  const [quest] = await db.insert(questsTable).values({
    playerId,
    title: "Daily Training Protocol",
    description: "Complete your daily fitness requirements to earn XP, Gold, and bonus stat points.",
    type: "daily",
    status: "active",
    xpReward: 300,
    goldReward: 100,
    bonusStatPoints: 3,
    difficulty: "E",
    expiresAt: new Date(getTomorrowStr()),
  }).returning();

  const tasks = [
    { description: "Hit your calorie target (within 200 calories)", order: 1 },
    { description: "Hit your protein target", order: 2 },
    { description: "Complete a workout session", order: 3 },
    { description: "Log at least 3 meals", order: 4 },
    { description: "Stay hydrated — drink at least 8 glasses of water", order: 5 },
  ];

  for (const task of tasks) {
    await db.insert(questTasksTable).values({ questId: quest.id, ...task, completed: false });
  }

  return quest;
}

router.get("/quests/daily", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const quest = await ensureDailyQuest(player.id);
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get daily quest" });
  }
});

router.get("/quests", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const { type, status } = req.query;

    // Ensure daily quest exists
    await ensureDailyQuest(player.id);

    let query = db.select().from(questsTable).where(eq(questsTable.playerId, player.id));
    const quests = await db.select().from(questsTable)
      .where(eq(questsTable.playerId, player.id))
      .orderBy(desc(questsTable.createdAt));

    let filtered = quests;
    if (type) filtered = filtered.filter(q => q.type === type);
    if (status) filtered = filtered.filter(q => q.status === status);

    const result = await Promise.all(filtered.map(buildQuestResponse));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get quests" });
  }
});

router.get("/quests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, id));
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get quest" });
  }
});

router.post("/quests/:id/complete-task", async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { taskId, value } = req.body;

    await db.update(questTasksTable)
      .set({ completed: true, completedAt: new Date(), currentValue: value })
      .where(and(eq(questTasksTable.id, taskId), eq(questTasksTable.questId, questId)));

    // Check if all tasks done
    const allTasks = await db.select().from(questTasksTable).where(eq(questTasksTable.questId, questId));
    const allDone = allTasks.every(t => t.completed);

    if (allDone) {
      await db.update(questsTable)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(questsTable.id, questId));
    }

    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, questId));
    res.json(await buildQuestResponse(quest));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

router.post("/quests/:id/claim", async (req, res) => {
  try {
    const questId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer();

    const [quest] = await db.select().from(questsTable).where(eq(questsTable.id, questId));
    if (!quest) return res.status(404).json({ error: "Quest not found" });
    if (quest.status !== "completed") return res.status(400).json({ error: "Quest not completed" });
    if (quest.status === "claimed") return res.status(400).json({ error: "Quest already claimed" });

    await db.update(questsTable)
      .set({ status: "claimed", claimedAt: new Date() })
      .where(eq(questsTable.id, questId));

    const newXp = player.xp + quest.xpReward;
    const newGold = player.gold + quest.goldReward;
    const newFreeStats = player.freeStatPoints + (quest.bonusStatPoints || 0);
    const newTotalXp = player.totalXpEarned + quest.xpReward;

    // Check for level up
    let newLevel = player.level;
    let leveledUp = false;
    let levelXp = newXp;
    while (true) {
      const xpNeeded = xpForLevel(newLevel + 1);
      if (levelXp >= xpNeeded) {
        levelXp -= xpNeeded;
        newLevel++;
        leveledUp = true;
      } else break;
    }

    const newRank = rankForLevel(newLevel);
    const rankedUp = newRank !== player.rank;

    const [updatedPlayer] = await db.update(playerTable)
      .set({
        xp: leveledUp ? levelXp : newXp,
        level: newLevel,
        rank: newRank,
        gold: newGold,
        freeStatPoints: newFreeStats + (leveledUp ? (newLevel - player.level) * 5 : 0),
        totalXpEarned: newTotalXp,
        updatedAt: new Date(),
      })
      .where(eq(playerTable.id, player.id))
      .returning();

    await db.insert(xpHistoryTable).values({
      playerId: player.id,
      amount: quest.xpReward,
      source: `Quest: ${quest.title}`,
      category: quest.type,
      date: new Date().toISOString().split("T")[0],
    });

    res.json({
      xpEarned: quest.xpReward,
      goldEarned: quest.goldReward,
      bonusStatPoints: quest.bonusStatPoints || 0,
      newLevel: updatedPlayer.level,
      leveledUp,
      newRank: rankedUp ? newRank : null,
      rankedUp,
      player: buildPlayerResponse(updatedPlayer, stats),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to claim quest" });
  }
});

export default router;
