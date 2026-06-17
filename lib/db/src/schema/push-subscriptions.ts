import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playerTable } from "./player";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playerTable.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
