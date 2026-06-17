import { pgTable, serial, text, boolean, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "barbell", "rack", "machine", "free_weights", "cardio", "mat", "striking", "cable", "bench", "other"
]);

export const equipmentTable = pgTable("equipment", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: equipmentCategoryEnum("category").notNull(),
  description: text("description"),
  owned: boolean("owned").notNull().default(true),
  available: boolean("available").notNull().default(true),
  maxWeight: real("max_weight"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipmentTable).omit({ id: true, createdAt: true });
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipmentTable.$inferSelect;
