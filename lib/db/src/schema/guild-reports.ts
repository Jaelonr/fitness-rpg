import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const guildReportsTable = pgTable("guild_reports", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  reportText: text("report_text").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export type GuildReport = typeof guildReportsTable.$inferSelect;
