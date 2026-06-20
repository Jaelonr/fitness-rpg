import { Router } from "express";
import { db } from "@workspace/db";
import { questsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getOrCreatePlayer } from "../progression";
import { CAMPAIGN_QUESTS } from "../data/campaign-quests";

const router = Router();

router.get("/campaign/story", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId!);

    const dbMainQuests = await db
      .select()
      .from(questsTable)
      .where(and(eq(questsTable.playerId, player.id), eq(questsTable.type, "main")));

    const byTitle = new Map(dbMainQuests.map((q) => [q.title, q]));

    const chapterMap = new Map<number, { chapter: number; chapterName: string; quests: any[] }>();

    for (const def of CAMPAIGN_QUESTS) {
      if (!chapterMap.has(def.chapter)) {
        chapterMap.set(def.chapter, { chapter: def.chapter, chapterName: def.chapterName, quests: [] });
      }
      const dbQuest = byTitle.get(def.title);
      const status: string = dbQuest?.status ?? "locked";
      const revealed = status !== "locked";

      chapterMap.get(def.chapter)!.quests.push({
        campaignId: def.campaignId,
        dbId: dbQuest?.id ?? null,
        title: revealed ? def.title : "???",
        description: revealed ? def.description : "This commission has not yet been revealed. Complete earlier duties to unlock it.",
        lore: status === "claimed" ? def.lore : null,
        difficulty: revealed ? def.difficulty : null,
        fitnessMapping: revealed ? def.fitnessMapping : null,
        xpReward: def.xpReward,
        goldReward: def.goldReward,
        status,
      });
    }

    const chapters = Array.from(chapterMap.values()).map((ch) => {
      const statuses = ch.quests.map((q: any) => q.status);
      let chapterStatus: "completed" | "active" | "locked";
      if (statuses.every((s: string) => s === "claimed")) chapterStatus = "completed";
      else if (statuses.some((s: string) => s !== "locked")) chapterStatus = "active";
      else chapterStatus = "locked";
      return { ...ch, status: chapterStatus };
    });

    const activeChapter = chapters.find((ch) => ch.status === "active");
    const currentChapter = activeChapter?.chapter ?? 1;
    const activeQuest = chapters
      .flatMap((ch) => ch.quests)
      .find((q: any) => q.status === "active" || q.status === "completed");

    res.json({
      currentChapter,
      currentQuestTitle: activeQuest?.title ?? null,
      totalChapters: chapters.length,
      chapters,
    });
  } catch (err) {
    req.log.error(err, "campaign story error");
    res.status(500).json({ error: "Failed to load campaign story" });
  }
});

export default router;
