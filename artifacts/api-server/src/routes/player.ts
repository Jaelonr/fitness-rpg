import { Router } from "express";
import { db } from "@workspace/db";
import {
  playerTable, playerStatsTable, titlesTable, playerTitlesTable,
  achievementsTable, playerAchievementsTable
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function xpForLevel(level: number): number {
  if (level < 10) return level * 100;
  if (level < 20) return 1000 + (level - 9) * 200;
  if (level < 35) return 3000 + (level - 19) * 400;
  if (level < 50) return 9000 + (level - 34) * 600;
  if (level < 75) return 18000 + (level - 49) * 1000;
  if (level < 100) return 43000 + (level - 74) * 2000;
  return 93000 + (level - 99) * 5000;
}

function rankForLevel(level: number): "E" | "D" | "C" | "B" | "A" | "S" | "National-Level" {
  if (level >= 100) return "National-Level";
  if (level >= 75) return "S";
  if (level >= 50) return "A";
  if (level >= 35) return "B";
  if (level >= 20) return "C";
  if (level >= 10) return "D";
  return "E";
}

async function getOrCreatePlayer() {
  const existing = await db.select().from(playerTable).limit(1);
  if (existing.length > 0) {
    const player = existing[0];
    const stats = await db.select().from(playerStatsTable).where(eq(playerStatsTable.playerId, player.id)).limit(1);
    return { player, stats: stats[0] || null };
  }
  // Create default player
  const [player] = await db.insert(playerTable).values({
    name: "Hunter",
    level: 1,
    rank: "E",
    xp: 0,
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    gold: 500,
    freeStatPoints: 5,
    streakDays: 0,
    activeTitle: "The Awakened",
  }).returning();
  const [stats] = await db.insert(playerStatsTable).values({
    playerId: player.id,
    strength: 5, agility: 5, stamina: 5, vitality: 5, discipline: 5, sense: 5,
  }).returning();
  return { player, stats };
}

function buildPlayerResponse(player: any, stats: any) {
  const xpNeeded = xpForLevel(player.level + 1);
  return {
    id: player.id,
    name: player.name,
    level: player.level,
    rank: player.rank,
    xp: player.xp,
    xpToNextLevel: xpNeeded,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    gold: player.gold,
    freeStatPoints: player.freeStatPoints,
    streakDays: player.streakDays,
    activeTitle: player.activeTitle,
    penaltyQuestActive: player.penaltyQuestActive,
    createdAt: player.createdAt.toISOString(),
    stats: stats ? {
      strength: stats.strength,
      agility: stats.agility,
      stamina: stats.stamina,
      vitality: stats.vitality,
      discipline: stats.discipline,
      sense: stats.sense,
    } : { strength: 5, agility: 5, stamina: 5, vitality: 5, discipline: 5, sense: 5 },
  };
}

router.get("/player", async (req, res) => {
  try {
    const { player, stats } = await getOrCreatePlayer();
    res.json(buildPlayerResponse(player, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get player" });
  }
});

router.patch("/player", async (req, res) => {
  try {
    const { name } = req.body;
    const { player, stats } = await getOrCreatePlayer();
    const [updated] = await db.update(playerTable)
      .set({ name: name || player.name, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();
    res.json(buildPlayerResponse(updated, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update player" });
  }
});

router.post("/player/allocate-stats", async (req, res) => {
  try {
    const { allocations } = req.body;
    const { player, stats } = await getOrCreatePlayer();
    if (!stats) return res.status(400).json({ error: "Player stats not found" });

    const total = Object.values(allocations as Record<string, number>).reduce((a, b) => a + b, 0);
    if (total > player.freeStatPoints) {
      return res.status(400).json({ error: "Not enough free stat points" });
    }

    const [updatedStats] = await db.update(playerStatsTable)
      .set({
        strength: stats.strength + (allocations.strength || 0),
        agility: stats.agility + (allocations.agility || 0),
        stamina: stats.stamina + (allocations.stamina || 0),
        vitality: stats.vitality + (allocations.vitality || 0),
        discipline: stats.discipline + (allocations.discipline || 0),
        sense: stats.sense + (allocations.sense || 0),
        updatedAt: new Date(),
      })
      .where(eq(playerStatsTable.playerId, player.id))
      .returning();

    const [updatedPlayer] = await db.update(playerTable)
      .set({ freeStatPoints: player.freeStatPoints - total, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();

    res.json(buildPlayerResponse(updatedPlayer, updatedStats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to allocate stats" });
  }
});

router.get("/player/titles", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const earned = await db
      .select({
        id: titlesTable.id,
        name: titlesTable.name,
        description: titlesTable.description,
        rarity: titlesTable.rarity,
        equipped: playerTitlesTable.equipped,
      })
      .from(playerTitlesTable)
      .innerJoin(titlesTable, eq(playerTitlesTable.titleId, titlesTable.id))
      .where(eq(playerTitlesTable.playerId, player.id));
    res.json(earned);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get titles" });
  }
});

router.post("/player/titles/:id/equip", async (req, res) => {
  try {
    const titleId = parseInt(req.params.id);
    const { player, stats } = await getOrCreatePlayer();

    // Unequip all
    await db.update(playerTitlesTable)
      .set({ equipped: false })
      .where(eq(playerTitlesTable.playerId, player.id));

    // Equip selected
    await db.update(playerTitlesTable)
      .set({ equipped: true })
      .where(and(eq(playerTitlesTable.playerId, player.id), eq(playerTitlesTable.titleId, titleId)));

    const title = await db.select().from(titlesTable).where(eq(titlesTable.id, titleId)).limit(1);
    const [updatedPlayer] = await db.update(playerTable)
      .set({ activeTitle: title[0]?.name || null, updatedAt: new Date() })
      .where(eq(playerTable.id, player.id))
      .returning();

    res.json(buildPlayerResponse(updatedPlayer, stats));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to equip title" });
  }
});

router.get("/player/achievements", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const all = await db.select().from(achievementsTable);
    const unlocked = await db.select().from(playerAchievementsTable).where(eq(playerAchievementsTable.playerId, player.id));
    const unlockedIds = new Set(unlocked.map(u => u.achievementId));

    const result = all.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      xpReward: a.xpReward,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: unlocked.find(u => u.achievementId === a.id)?.unlockedAt?.toISOString() || null,
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get achievements" });
  }
});

export { getOrCreatePlayer, buildPlayerResponse, xpForLevel, rankForLevel };
export default router;
