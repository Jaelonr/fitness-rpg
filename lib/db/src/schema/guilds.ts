import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const guildsTable = pgTable("guilds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  emblem: text("emblem").notNull().default("⚔️"),
  inviteCode: text("invite_code").notNull().unique(),
  maxMembers: integer("max_members").notNull().default(10),
  createdBy: integer("created_by").references(() => playerTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const guildMembersTable = pgTable("guild_members", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().unique().references(() => playerTable.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const guildActivityTable = pgTable("guild_activity", {
  id: serial("id").primaryKey(),
  guildId: integer("guild_id").notNull().references(() => guildsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").references(() => playerTable.id),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Guild = typeof guildsTable.$inferSelect;
export type GuildMember = typeof guildMembersTable.$inferSelect;
export type GuildActivity = typeof guildActivityTable.$inferSelect;
