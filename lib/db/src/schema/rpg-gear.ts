import { pgTable, serial, text, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const gearSlotEnum = pgEnum("gear_slot", [
  "weapon", "offhand", "helmet", "chest", "gloves", "boots", "ring", "necklace"
]);

export const rpgGearTable = pgTable("rpg_gear", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  name: text("name").notNull(),
  slot: gearSlotEnum("slot").notNull(),
  rarity: text("rarity").notNull().default("common"),
  statBonuses: json("stat_bonuses").$type<{
    strength?: number; agility?: number; stamina?: number;
    vitality?: number; discipline?: number; sense?: number;
  }>().notNull().default({}),
  flavorText: text("flavor_text"),
  source: text("source"),
  equipped: boolean("equipped").notNull().default(false),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
});

export type RpgGear = typeof rpgGearTable.$inferSelect;
