import { pgTable, serial, text, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playerTable } from "./player";

export const skillCategoryEnum = pgEnum("skill_category", [
  "strength", "striking", "grappling", "conditioning", "discipline", "recovery", "nutrition"
]);

export const skillTreesTable = pgTable("skill_trees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: skillCategoryEnum("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const skillNodesTable = pgTable("skill_nodes", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull().references(() => skillTreesTable.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tier: integer("tier").notNull().default(1),
  xpCost: integer("xp_cost").notNull().default(100),
  statRequirements: json("stat_requirements").$type<{
    strength: number; agility: number; stamina: number;
    vitality: number; discipline: number; sense: number;
  }>().notNull().default({ strength: 0, agility: 0, stamina: 0, vitality: 0, discipline: 0, sense: 0 }),
  prerequisiteNodeIds: json("prerequisite_node_ids").$type<number[]>().notNull().default([]),
  effect: text("effect"),
  equipmentRequired: text("equipment_required"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playerSkillNodesTable = pgTable("player_skill_nodes", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  nodeId: integer("node_id").notNull().references(() => skillNodesTable.id),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export type SkillTree = typeof skillTreesTable.$inferSelect;
export type SkillNode = typeof skillNodesTable.$inferSelect;
export type PlayerSkillNode = typeof playerSkillNodesTable.$inferSelect;
