import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";

export const wearableEntriesTable = pgTable("wearable_entries", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  date: text("date").notNull(),
  steps: integer("steps"),
  sleepHours: real("sleep_hours"),
  hrv: real("hrv"),
  restingHr: integer("resting_hr"),
  caloriesBurned: integer("calories_burned"),
  activeMinutes: integer("active_minutes"),
  weight: real("weight"),
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWearableEntrySchema = createInsertSchema(wearableEntriesTable).omit({ id: true, createdAt: true });
export type InsertWearableEntry = z.infer<typeof insertWearableEntrySchema>;
export type WearableEntry = typeof wearableEntriesTable.$inferSelect;
