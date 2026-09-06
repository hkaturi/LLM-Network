import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("starter"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(20),
  payout: numeric("payout", { precision: 8, scale: 2 }).notNull().default("5.00"),
  status: text("status").notNull().default("available"),
  taskType: text("task_type").notNull().default("standard"),
  requiredSkills: text("required_skills").array().notNull().default([]),
  submissionsCount: integer("submissions_count").notNull().default(0),
  claimedBy: integer("claimed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  dueAt: true,
  claimedAt: true,
  submissionsCount: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;