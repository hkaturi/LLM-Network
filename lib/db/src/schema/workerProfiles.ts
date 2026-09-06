import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workerProfilesTable = pgTable("worker_profiles", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull().default("New contributor"),
  email: text("email").notNull().default("contributor@example.com"),
  city: text("city").notNull().default(""),
  country: text("country").notNull().default(""),
  phoneNumber: text("phone_number").notNull().default(""),
  education: text("education").notNull().default(""),
  yearOfPass: integer("year_of_pass"),
  gpa: text("gpa").notNull().default(""),
  status: text("status").notNull().default("pending"),
  availability: text("availability").notNull().default("available"),
  timezone: text("timezone").notNull().default("America/New_York"),
  skills: text("skills").array().notNull().default([]),
  languages: text("languages").array().notNull().default(["English"]),
  experience: text("experience").notNull().default("Building a profile"),
  weeklyHours: integer("weekly_hours").notNull().default(10),
  onboardingProgress: integer("onboarding_progress").notNull().default(20),
  internshipTermsAccepted: boolean("internship_terms_accepted").notNull().default(false),
  internshipTermsAcceptedAt: timestamp("internship_terms_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkerProfileSchema = createInsertSchema(workerProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkerProfile = z.infer<typeof insertWorkerProfileSchema>;
export type WorkerProfile = typeof workerProfilesTable.$inferSelect;