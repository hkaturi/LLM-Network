import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import {
  db,
  submissionsTable,
  tasksTable,
  workerProfilesTable,
  type Task,
  type WorkerProfile,
} from "@workspace/db";
import type { Request } from "express";

const DEMO_USER_ID = "demo-worker";
export const VIDEO_SCREENING_TASK_TYPE = "video_screening";

export function currentUserId(req: Request): string {
  try {
    return getAuth(req).userId ?? DEMO_USER_ID;
  } catch {
    return DEMO_USER_ID;
  }
}

async function getClerkIdentity(clerkUserId: string): Promise<{ name: string; email: string }> {
  if (clerkUserId === DEMO_USER_ID) {
    return { name: "Alex Morgan", email: "alex@example.com" };
  }

  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return {
      name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
      email: user.primaryEmailAddress?.emailAddress?.trim() || "",
    };
  } catch {
    return { name: "", email: "" };
  }
}

export async function ensureWorker(req: Request): Promise<WorkerProfile> {
  const clerkUserId = currentUserId(req);
  const [existing] = await db
    .select()
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) {
    const needsIdentityName = !existing.name.trim() || existing.name === "New contributor";
    const needsIdentityEmail = !existing.email.trim() || existing.email === "contributor@example.com";

    if (clerkUserId !== DEMO_USER_ID && (needsIdentityName || needsIdentityEmail)) {
      const identity = await getClerkIdentity(clerkUserId);
      const identityUpdates = {
        ...(needsIdentityName && identity.name ? { name: identity.name } : {}),
        ...(needsIdentityEmail && identity.email ? { email: identity.email } : {}),
      };

      if (Object.keys(identityUpdates).length > 0) {
        const [updated] = await db
          .update(workerProfilesTable)
          .set(identityUpdates)
          .where(eq(workerProfilesTable.id, existing.id))
          .returning();
        if (updated && updated.onboardingProgress >= 100) {
          return ensureWorkerScreening(updated);
        }
        return updated ?? existing;
      }
    }

    return ensureWorkerScreening(existing);
  }

  const identity = await getClerkIdentity(clerkUserId);

  const [created] = await db
    .insert(workerProfilesTable)
    .values({
      clerkUserId,
      name: identity.name || "New contributor",
      email: identity.email || "contributor@example.com",
      status: "active",
      availability: "available",
      skills: ["Writing", "Reasoning"],
      languages: ["English"],
      experience: "Building a profile",
      weeklyHours: 10,
      onboardingProgress: 68,
    })
    .returning();

  return created;
}

async function ensureWorkerScreening(profile: WorkerProfile): Promise<WorkerProfile> {
  if (profile.onboardingProgress >= 100) {
    await ensureVideoScreeningTask(profile.id, profile.skills);
  }
  return profile;
}

export async function ensureVideoScreeningTask(workerId: number, skills: string[] = []): Promise<Task> {
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.taskType, VIDEO_SCREENING_TASK_TYPE), eq(tasksTable.claimedBy, workerId)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(tasksTable)
    .values({
      title: "Video screening: tell us about yourself",
      description:
        "Record a short video introducing yourself, your background, and the language-model evaluation skills you bring. Speak naturally and give one or two concrete examples of work you do well.",
      category: "Candidate screening",
      difficulty: "starter",
      estimatedMinutes: 3,
      payout: "0.00",
      status: "claimed",
      taskType: VIDEO_SCREENING_TASK_TYPE,
      requiredSkills: skills.length ? skills : ["Communication"],
      claimedBy: workerId,
      claimedAt: new Date(),
    })
    .returning();

  return created;
}

export async function hasCompletedVideoScreening(workerId: number): Promise<boolean> {
  const rows = await db
    .select({ id: submissionsTable.id })
    .from(submissionsTable)
    .innerJoin(tasksTable, eq(tasksTable.id, submissionsTable.taskId))
    .where(
      and(
        eq(submissionsTable.workerId, workerId),
        eq(tasksTable.taskType, VIDEO_SCREENING_TASK_TYPE),
        inArray(submissionsTable.status, ["submitted", "approved"]),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function ensureSeedTasks(): Promise<void> {
  const [existing] = await db.select({ count: sql<number>`count(*)` }).from(tasksTable);
  if (Number(existing?.count ?? 0) > 0) {
    return;
  }

  await db.insert(tasksTable).values([
    {
      title: "Compare two assistants on helpfulness",
      description:
        "Review two short responses to a user question. Choose the stronger answer and explain which details made it more helpful, accurate, and actionable.",
      category: "Response ranking",
      difficulty: "starter",
      estimatedMinutes: 18,
      payout: "7.50",
      requiredSkills: ["English", "Critical thinking"],
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    },
    {
      title: "Write a grounded answer from source notes",
      description:
        "Turn a compact set of source notes into a clear answer. Keep every claim grounded in the notes and flag anything the source does not support.",
      category: "Grounded generation",
      difficulty: "intermediate",
      estimatedMinutes: 32,
      payout: "12.00",
      requiredSkills: ["English", "Research"],
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
    },
    {
      title: "Find the unsafe edge case",
      description:
        "Inspect a model response for policy or safety concerns. Identify the exact risky behavior and propose a safer alternative that still helps the user.",
      category: "Safety review",
      difficulty: "advanced",
      estimatedMinutes: 40,
      payout: "18.00",
      requiredSkills: ["Safety", "Reasoning"],
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    },
  ]);
}

export function toTask(task: Task) {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description,
    category: task.category,
    difficulty: task.difficulty,
    estimatedMinutes: task.estimatedMinutes,
    payout: Number(task.payout),
    status: task.status,
    requiredSkills: task.requiredSkills,
    taskType: task.taskType,
    submissionsCount: task.submissionsCount,
    createdAt: task.createdAt,
    dueAt: task.dueAt,
    claimedAt: task.claimedAt,
  };
}

export function toProfile(profile: WorkerProfile) {
  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: String(profile.id),
    name: profile.name,
    email: profile.email,
    city: profile.city,
    country: profile.country,
    phoneNumber: profile.phoneNumber,
    education: profile.education,
    yearOfPass: profile.yearOfPass ?? undefined,
    gpa: profile.gpa,
    avatarInitials: initials,
    status: profile.status,
    availability: profile.availability,
    timezone: profile.timezone,
    skills: profile.skills,
    languages: profile.languages,
    experience: profile.experience,
    weeklyHours: profile.weeklyHours,
    onboardingProgress: profile.onboardingProgress,
    internshipTermsAccepted: profile.internshipTermsAccepted,
    internshipTermsAcceptedAt: profile.internshipTermsAcceptedAt ?? null,
  };
}

export async function taskForWorker(taskId: number, workerId: number): Promise<Task | undefined> {
  const [task] = await db
    .select()
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), sql`(${tasksTable.claimedBy} is null or ${tasksTable.claimedBy} = ${workerId})`))
    .limit(1);
  return task;
}

export async function recentTasks(): Promise<Task[]> {
  return db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt), asc(tasksTable.id)).limit(10);
}