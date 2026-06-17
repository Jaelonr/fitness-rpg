import { pgTable, serial, text, integer, real, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";
import { weightUnitEnum } from "./nutrition";

export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "barbell", "dumbbell", "machine", "bodyweight", "cable", "cardio", "martial_arts"
]);

export const workoutCategoryEnum = pgEnum("workout_category", [
  "strength", "conditioning", "striking", "grappling", "recovery", "mixed"
]);

export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "abandoned"]);

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  instructions: text("instructions"),
  equipmentIds: json("equipment_ids").$type<number[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutTemplatesTable = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: workoutCategoryEnum("category").notNull().default("strength"),
  description: text("description"),
  exercises: json("exercises").$type<Array<{
    exerciseId: number;
    exerciseName: string;
    sets: number;
    reps: string;
    restSeconds?: number | null;
    order: number;
    notes?: string | null;
  }>>().notNull().default([]),
  estimatedDuration: integer("estimated_duration"),
  xpReward: integer("xp_reward").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutSessionsTable = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  name: text("name").notNull(),
  templateId: integer("template_id"),
  status: sessionStatusEnum("status").notNull().default("active"),
  xpEarned: integer("xp_earned"),
  goldEarned: integer("gold_earned"),
  notes: text("notes"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMinutes: integer("duration_minutes"),
});

export const workoutSetsTable = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessionsTable.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weight: real("weight").notNull(),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lbs"),
  rpe: real("rpe"),
  isPr: boolean("is_pr").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const personalRecordsTable = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id),
  exerciseName: text("exercise_name").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  weightUnit: weightUnitEnum("weight_unit").notNull().default("lbs"),
  estimatedOneRepMax: real("estimated_one_rep_max"),
  achievedAt: timestamp("achieved_at").notNull().defaultNow(),
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessionsTable).omit({ id: true, startedAt: true });
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessionsTable.$inferSelect;
export type WorkoutSet = typeof workoutSetsTable.$inferSelect;
export type Exercise = typeof exercisesTable.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplatesTable.$inferSelect;
export type PersonalRecord = typeof personalRecordsTable.$inferSelect;
