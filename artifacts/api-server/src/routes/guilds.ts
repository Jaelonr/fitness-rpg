import { Router } from "express";
import { db } from "@workspace/db";
import { guildsTable, guildMembersTable, guildActivityTable, playerTable, playerStatsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreatePlayer, buildPlayerResponse } from "./player";

const router = Router();

function makeInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.get("/guilds/mine", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    if (!player.guildId) { res.json(null); return; }

    const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.id, player.guildId));
    if (!guild) { res.json(null); return; }

    const membersRaw = await db
      .select({ member: guildMembersTable, player: playerTable })
      .from(guildMembersTable)
      .innerJoin(playerTable, eq(guildMembersTable.playerId, playerTable.id))
      .where(eq(guildMembersTable.guildId, guild.id));

    const members = membersRaw.map(row => ({
      id: row.member.id,
      playerId: row.player.id,
      name: row.player.name,
      level: row.player.level,
      rank: row.player.rank,
      baseClass: row.player.baseClass,
      role: row.member.role,
      joinedAt: row.member.joinedAt?.toISOString(),
    }));

    const activity = await db.select({
      act: guildActivityTable,
      playerName: playerTable.name,
    })
      .from(guildActivityTable)
      .leftJoin(playerTable, eq(guildActivityTable.playerId, playerTable.id))
      .where(eq(guildActivityTable.guildId, guild.id))
      .orderBy(desc(guildActivityTable.createdAt))
      .limit(40);

    res.json({
      ...guild,
      createdAt: guild.createdAt?.toISOString(),
      members,
      activity: activity.map(row => ({
        id: row.act.id,
        activityType: row.act.activityType,
        description: row.act.description,
        playerName: row.playerName ?? "Unknown",
        createdAt: row.act.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get guild" });
  }
});

router.post("/guilds", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    if (player.guildId) {
      res.status(400).json({ error: "You are already in a guild. Leave first." });
      return;
    }

    const { name, description, emblem } = req.body as { name: string; description?: string; emblem?: string };
    if (!name?.trim()) { res.status(400).json({ error: "Guild name required" }); return; }

    let inviteCode = makeInviteCode();
    for (let i = 0; i < 5; i++) {
      const [existing] = await db.select({ id: guildsTable.id }).from(guildsTable).where(eq(guildsTable.inviteCode, inviteCode));
      if (!existing) break;
      inviteCode = makeInviteCode();
    }

    const [guild] = await db.insert(guildsTable).values({
      name: name.trim(),
      description: description?.trim(),
      emblem: emblem ?? "⚔️",
      inviteCode,
      createdBy: player.id,
    }).returning();

    await db.insert(guildMembersTable).values({ guildId: guild.id, playerId: player.id, role: "leader" });
    await db.update(playerTable).set({ guildId: guild.id }).where(eq(playerTable.id, player.id));
    await db.insert(guildActivityTable).values({
      guildId: guild.id,
      playerId: player.id,
      activityType: "guild_created",
      description: `${player.name} founded the guild.`,
    });

    res.status(201).json({ ...guild, createdAt: guild.createdAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create guild" });
  }
});

router.post("/guilds/join", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    if (player.guildId) {
      res.status(400).json({ error: "Leave your current guild first." });
      return;
    }

    const { inviteCode } = req.body as { inviteCode: string };
    if (!inviteCode?.trim()) { res.status(400).json({ error: "Invite code required" }); return; }

    const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.inviteCode, inviteCode.trim().toUpperCase()));
    if (!guild) { res.status(404).json({ error: "Invalid invite code" }); return; }

    const memberCount = await db.$count(guildMembersTable, eq(guildMembersTable.guildId, guild.id));
    if (memberCount >= guild.maxMembers) {
      res.status(400).json({ error: "Guild is full" });
      return;
    }

    await db.insert(guildMembersTable).values({ guildId: guild.id, playerId: player.id, role: "member" });
    await db.update(playerTable).set({ guildId: guild.id }).where(eq(playerTable.id, player.id));
    await db.insert(guildActivityTable).values({
      guildId: guild.id,
      playerId: player.id,
      activityType: "member_join",
      description: `${player.name} joined the guild.`,
    });

    res.json({ success: true, guildId: guild.id, guildName: guild.name });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to join guild" });
  }
});

router.post("/guilds/leave", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    if (!player.guildId) { res.status(400).json({ error: "Not in a guild" }); return; }

    const guildId = player.guildId;
    const [myMembership] = await db.select().from(guildMembersTable)
      .where(eq(guildMembersTable.playerId, player.id));

    if (myMembership?.role === "leader") {
      const others = await db.select().from(guildMembersTable)
        .where(eq(guildMembersTable.guildId, guildId));
      const nextLeader = others.find(m => m.playerId !== player.id);
      if (nextLeader) {
        await db.update(guildMembersTable).set({ role: "leader" }).where(eq(guildMembersTable.id, nextLeader.id));
      } else {
        await db.delete(guildsTable).where(eq(guildsTable.id, guildId));
        await db.update(playerTable).set({ guildId: null }).where(eq(playerTable.id, player.id));
        res.json({ success: true, guildDisbanded: true });
        return;
      }
    }

    await db.delete(guildMembersTable).where(eq(guildMembersTable.playerId, player.id));
    await db.update(playerTable).set({ guildId: null }).where(eq(playerTable.id, player.id));
    await db.insert(guildActivityTable).values({
      guildId,
      playerId: player.id,
      activityType: "member_leave",
      description: `${player.name} left the guild.`,
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to leave guild" });
  }
});

export { router as guildsRouter };
export default router;
