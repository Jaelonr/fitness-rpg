import { Router } from "express";
import { db } from "@workspace/db";
import { equipmentTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/equipment", async (req, res) => {
  try {
    const equipment = await db.select().from(equipmentTable).orderBy(equipmentTable.category);
    res.json(equipment.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get equipment" });
  }
});

router.post("/equipment", async (req, res) => {
  try {
    const { name, category, description, owned, available, maxWeight, notes } = req.body;
    const [item] = await db.insert(equipmentTable)
      .values({ name, category, description, owned: owned ?? true, available: available ?? true, maxWeight, notes })
      .returning();
    res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add equipment" });
  }
});

router.patch("/equipment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, owned, available, maxWeight, notes } = req.body;
    const [updated] = await db.update(equipmentTable)
      .set({ name, description, owned, available, maxWeight, notes })
      .where(eq(equipmentTable.id, id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update equipment" });
  }
});

router.delete("/equipment/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(equipmentTable).where(eq(equipmentTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete equipment" });
  }
});

export default router;
