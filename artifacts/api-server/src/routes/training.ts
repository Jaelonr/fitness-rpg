import { Router } from "express";
import { db } from "@workspace/db";
import {
  exercisesTable, workoutTemplatesTable, workoutSessionsTable,
  workoutSetsTable, personalRecordsTable, playerTable, xpHistoryTable
} from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { getOrCreatePlayer } from "./player";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

router.get("/training/exercises", async (req, res) => {
  try {
    const { equipmentId, muscleGroup } = req.query;
    const all = await db.select().from(exercisesTable).orderBy(exercisesTable.name);
    let filtered = all;
    if (muscleGroup) {
      filtered = filtered.filter(e => e.muscleGroup.toLowerCase() === (muscleGroup as string).toLowerCase());
    }
    res.json(filtered.map(e => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      equipmentIds: (e.equipmentIds as number[]) || [],
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get exercises" });
  }
});

router.get("/training/templates", async (req, res) => {
  try {
    const templates = await db.select().from(workoutTemplatesTable).orderBy(workoutTemplatesTable.name);
    res.json(templates.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), exercises: t.exercises || [] })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

router.post("/training/templates", async (req, res) => {
  try {
    const { name, category, description, exercises, estimatedDuration } = req.body;
    const [template] = await db.insert(workoutTemplatesTable)
      .values({ name, category: category || "strength", description, exercises: exercises || [], estimatedDuration, xpReward: 150 })
      .returning();
    res.status(201).json({ ...template, createdAt: template.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/training/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [template] = await db.select().from(workoutTemplatesTable).where(eq(workoutTemplatesTable.id, id));
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json({ ...template, createdAt: template.createdAt.toISOString(), exercises: template.exercises || [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get template" });
  }
});

router.patch("/training/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, description, exercises, estimatedDuration } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (exercises !== undefined) updates.exercises = exercises;
    if (estimatedDuration !== undefined) updates.estimatedDuration = estimatedDuration;
    const [updated] = await db.update(workoutTemplatesTable).set(updates).where(eq(workoutTemplatesTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update template" });
  }
});

router.delete("/training/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(workoutTemplatesTable).where(eq(workoutTemplatesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

router.get("/training/sessions", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await db.select().from(workoutSessionsTable)
      .where(eq(workoutSessionsTable.playerId, player.id))
      .orderBy(desc(workoutSessionsTable.startedAt))
      .limit(limit);

    const result = await Promise.all(sessions.map(async (s) => {
      const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, s.id));
      return {
        ...s,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() || null,
        sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
      };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

router.post("/training/sessions", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const { name, templateId, notes } = req.body;
    const [session] = await db.insert(workoutSessionsTable)
      .values({ playerId: player.id, name, templateId, notes, status: "active" })
      .returning();
    res.status(201).json({ ...session, startedAt: session.startedAt.toISOString(), completedAt: null, sets: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

router.get("/training/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [session] = await db.select().from(workoutSessionsTable).where(eq(workoutSessionsTable.id, id));
    if (!session) return res.status(404).json({ error: "Session not found" });
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id)).orderBy(workoutSetsTable.createdAt);
    res.json({
      ...session,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() || null,
      sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get session" });
  }
});

router.patch("/training/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer();
    const { status, notes, completedAt } = req.body;

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (status === "completed") {
      const finishedAt = completedAt ? new Date(completedAt) : new Date();
      updates.completedAt = finishedAt;
      const [session] = await db.select().from(workoutSessionsTable).where(eq(workoutSessionsTable.id, id));
      if (session) {
        const durationMs = finishedAt.getTime() - session.startedAt.getTime();
        updates.durationMinutes = Math.round(durationMs / 60000);
        const xpEarned = 150 + Math.min(updates.durationMinutes, 60) * 2;
        const goldEarned = 30 + Math.floor(Math.random() * 20);
        updates.xpEarned = xpEarned;
        updates.goldEarned = goldEarned;

        await db.update(playerTable)
          .set({
            xp: player.xp + xpEarned,
            gold: player.gold + goldEarned,
            totalXpEarned: player.totalXpEarned + xpEarned,
            updatedAt: new Date(),
          })
          .where(eq(playerTable.id, player.id));

        await db.insert(xpHistoryTable).values({
          playerId: player.id,
          amount: xpEarned,
          source: "Workout Completed",
          category: "training",
          date: getTodayStr(),
        });
      }
    }

    const [updated] = await db.update(workoutSessionsTable).set(updates).where(eq(workoutSessionsTable.id, id)).returning();
    const sets = await db.select().from(workoutSetsTable).where(eq(workoutSetsTable.sessionId, id));

    res.json({
      ...updated,
      startedAt: updated.startedAt.toISOString(),
      completedAt: updated.completedAt?.toISOString() || null,
      sets: sets.map(ws => ({ ...ws, createdAt: ws.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update session" });
  }
});

router.post("/training/sessions/:id/sets", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { player } = await getOrCreatePlayer();
    const { exerciseId, setNumber, reps, weight, weightUnit, rpe, notes } = req.body;

    const exercise = await db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId)).limit(1);
    if (!exercise[0]) return res.status(404).json({ error: "Exercise not found" });

    // Check PR
    const prs = await db.select().from(personalRecordsTable)
      .where(and(eq(personalRecordsTable.playerId, player.id), eq(personalRecordsTable.exerciseId, exerciseId)));

    const e1rm = weight * (1 + reps / 30);
    const currentBestPr = prs.reduce((best, pr) => {
      const prE1rm = pr.estimatedOneRepMax || pr.weight * (1 + pr.reps / 30);
      return prE1rm > best ? prE1rm : best;
    }, 0);

    const isPr = e1rm > currentBestPr;

    const [set] = await db.insert(workoutSetsTable).values({
      sessionId,
      exerciseId,
      exerciseName: exercise[0].name,
      setNumber,
      reps,
      weight,
      weightUnit: weightUnit || "lbs",
      rpe,
      isPr,
      notes,
    }).returning();

    if (isPr) {
      await db.insert(personalRecordsTable).values({
        playerId: player.id,
        exerciseId,
        exerciseName: exercise[0].name,
        weight,
        reps,
        weightUnit: weightUnit || "lbs",
        estimatedOneRepMax: e1rm,
      });
    }

    res.status(201).json({ ...set, createdAt: set.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to log set" });
  }
});

router.patch("/training/sessions/:id/sets/:setId", async (req, res) => {
  try {
    const setId = parseInt(req.params.setId);
    const { reps, weight, weightUnit, rpe, notes } = req.body;
    const updates: Record<string, any> = {};
    if (reps !== undefined) updates.reps = reps;
    if (weight !== undefined) updates.weight = weight;
    if (weightUnit !== undefined) updates.weightUnit = weightUnit;
    if (rpe !== undefined) updates.rpe = rpe;
    if (notes !== undefined) updates.notes = notes;
    const [updated] = await db.update(workoutSetsTable).set(updates).where(eq(workoutSetsTable.id, setId)).returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update set" });
  }
});

router.delete("/training/sessions/:id/sets/:setId", async (req, res) => {
  try {
    const setId = parseInt(req.params.setId);
    await db.delete(workoutSetsTable).where(eq(workoutSetsTable.id, setId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete set" });
  }
});

router.get("/training/prs", async (req, res) => {
  try {
    const { player } = await getOrCreatePlayer();
    const prs = await db.select().from(personalRecordsTable)
      .where(eq(personalRecordsTable.playerId, player.id))
      .orderBy(desc(personalRecordsTable.achievedAt));
    res.json(prs.map(pr => ({ ...pr, achievedAt: pr.achievedAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get PRs" });
  }
});

export default router;
