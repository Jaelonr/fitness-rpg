import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const dailyLoginsTable = pgTable("daily_logins", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  claimedDate: text("claimed_date").notNull(),
  streakDay: integer("streak_day").notNull(),
  rewardType: text("reward_type").notNull(),
  rewardAmount: integer("reward_amount"),
  rewardLabel: text("reward_label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DailyLogin = typeof dailyLoginsTable.$inferSelect;
