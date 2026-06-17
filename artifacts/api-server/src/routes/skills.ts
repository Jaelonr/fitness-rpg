import { Router } from "express";
import { db } from "@workspace/db";
import { skillTreesTable, skillNodesTable, playerSkillNodesTable, playerTable, xpHistoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer } from "./player";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

router.get("/skills/trees", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const trees = await db.select().from(skillTreesTable).orderBy(skillTreesTable.id);
    const nodes = await db.select().from(skillNodesTable).orderBy(skillNodesTable.tier);
    const unlockedNodes = await db.select().from(playerSkillNodesTable)
      .where(eq(playerSkillNodesTable.playerId, player.id));
    const unlockedIds = new Set(unlockedNodes.map(n => n.nodeId));

    const result = trees.map(tree => ({
      id: tree.id,
      name: tree.name,
      description: tree.description,
      category: tree.category,
      nodes: nodes
        .filter(n => n.treeId === tree.id)
        .map(n => {
          const unlockedEntry = unlockedNodes.find(u => u.nodeId === n.id);
          return {
            id: n.id,
            treeId: n.treeId,
            name: n.name,
            description: n.description,
            tier: n.tier,
            unlocked: unlockedIds.has(n.id),
            unlockedAt: unlockedEntry?.unlockedAt?.toISOString() || null,
            xpCost: n.xpCost,
            statRequirements: n.statRequirements,
            prerequisiteNodeIds: (n.prerequisiteNodeIds as number[]) || [],
            effect: n.effect,
            equipmentRequired: n.equipmentRequired,
          };
        }),
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get skill trees" });
  }
});

router.post("/skills/nodes/:id/unlock", async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer();

    const [node] = await db.select().from(skillNodesTable).where(eq(skillNodesTable.id, nodeId));
    if (!node) return res.status(404).json({ error: "Node not found" });

    // Check if already unlocked
    const existing = await db.select().from(playerSkillNodesTable)
      .where(and(eq(playerSkillNodesTable.playerId, player.id), eq(playerSkillNodesTable.nodeId, nodeId)));
    if (existing.length > 0) return res.status(400).json({ error: "Node already unlocked" });

    // Check XP cost
    if (player.totalXpEarned < node.xpCost) {
      return res.status(400).json({ error: "Insufficient XP to unlock this node" });
    }

    // Check prerequisites
    const prereqs = (node.prerequisiteNodeIds as number[]) || [];
    if (prereqs.length > 0) {
      const unlockedPrereqs = await db.select().from(playerSkillNodesTable)
        .where(eq(playerSkillNodesTable.playerId, player.id));
      const unlockedIds = new Set(unlockedPrereqs.map(u => u.nodeId));
      const missing = prereqs.filter(id => !unlockedIds.has(id));
      if (missing.length > 0) {
        return res.status(400).json({ error: "Prerequisites not met" });
      }
    }

    await db.insert(playerSkillNodesTable).values({ playerId: player.id, nodeId });

    res.json({
      id: node.id,
      treeId: node.treeId,
      name: node.name,
      description: node.description,
      tier: node.tier,
      unlocked: true,
      unlockedAt: new Date().toISOString(),
      xpCost: node.xpCost,
      statRequirements: node.statRequirements,
      prerequisiteNodeIds: (node.prerequisiteNodeIds as number[]) || [],
      effect: node.effect,
      equipmentRequired: node.equipmentRequired,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to unlock node" });
  }
});

export default router;
