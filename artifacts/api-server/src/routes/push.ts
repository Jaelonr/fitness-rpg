import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreatePlayer } from "./player";

const router = Router();

router.get("/push/vapid-public-key", (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY ?? "";
  res.json({ key });
});

router.post("/push/subscribe", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid subscription data" });
      return;
    }

    await db.insert(pushSubscriptionsTable)
      .values({ playerId: player.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { p256dh: keys.p256dh, auth: keys.auth } });

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.delete("/push/subscribe", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer(req.userId);
    const { endpoint } = req.body as { endpoint: string };
    if (endpoint) {
      await db.delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

export default router;
