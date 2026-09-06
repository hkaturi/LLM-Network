import { integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  workerId: integer("worker_id").notNull(),
  response: text("response").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("submitted"),
  payout: numeric("payout", { precision: 8, scale: 2 }).notNull().default("0.00"),
  reviewerNote: text("reviewer_note"),
  videoObjectPath: text("video_object_path"),
  videoContentType: text("video_content_type"),
  videoDurationSeconds: integer("video_duration_seconds"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({
  id: true,
  submittedAt: true,
});

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;