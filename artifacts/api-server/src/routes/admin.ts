import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, submissionsTable, tasksTable, workerProfilesTable } from "@workspace/db";
import {
  CreateTaskBody,
  CreateTaskResponse,
  GetDispatcherOverviewResponse,
  ListReviewQueueResponse,
  ReviewSubmissionBody,
  ReviewSubmissionParams,
  ReviewSubmissionResponse,
} from "@workspace/api-zod";
import { ensureSeedTasks, toTask } from "../lib/worker-data";
import { requireDispatcher } from "../middlewares/dispatcherAccess";

const router: IRouter = Router();
router.use("/admin", requireDispatcher);

router.post("/admin/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db
    .insert(tasksTable)
    .values({
      ...parsed.data,
      payout: String(parsed.data.payout),
      status: "available",
    })
    .returning();
  res.status(201).json(CreateTaskResponse.parse(toTask(task)));
});

router.get("/admin/overview", async (_req, res): Promise<void> => {
  await ensureSeedTasks();
  const [workers, tasks] = await Promise.all([
    db.select().from(workerProfilesTable).orderBy(desc(workerProfilesTable.updatedAt)),
    db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)).limit(12),
  ]);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [completedTodayRows, totalSubmissionsRows, approvedSubmissionsRows, reviewRows] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(submissionsTable)
        .where(and(eq(submissionsTable.status, "approved"), gte(submissionsTable.submittedAt, today))),
      db.select({ count: sql<number>`count(*)` }).from(submissionsTable),
      db
        .select({ count: sql<number>`count(*)` })
        .from(submissionsTable)
        .where(eq(submissionsTable.status, "approved")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(submissionsTable)
        .where(eq(submissionsTable.status, "submitted")),
    ]);

  const workerViews = await Promise.all(
    workers.map(async (worker) => {
      const [activeTask] = await db
        .select()
        .from(tasksTable)
        .where(and(eq(tasksTable.claimedBy, worker.id), eq(tasksTable.status, "claimed")))
        .limit(1);
      const [lastSubmission] = await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.workerId, worker.id))
        .orderBy(desc(submissionsTable.submittedAt))
        .limit(1);
      const [completed] = await db
        .select({ count: sql<number>`count(*)` })
        .from(submissionsTable)
        .where(and(eq(submissionsTable.workerId, worker.id), eq(submissionsTable.status, "approved")));
      const [pending] = await db
        .select({ count: sql<number>`count(*)` })
        .from(submissionsTable)
        .where(and(eq(submissionsTable.workerId, worker.id), eq(submissionsTable.status, "submitted")));

      return {
        id: String(worker.id),
        name: worker.name,
        email: worker.email,
        availability: worker.availability,
        status: worker.status,
        skills: worker.skills,
        activeTaskTitle: activeTask?.title ?? null,
        activeTaskStatus: activeTask?.status ?? null,
        lastSubmissionAt: lastSubmission?.submittedAt ?? null,
        completedTasks: Number(completed?.count ?? 0),
        pendingReview: Number(pending?.count ?? 0),
      };
    }),
  );

  const taskViews = await Promise.all(
    tasks.map(async (task) => {
      const [worker] = task.claimedBy
        ? await db
            .select()
            .from(workerProfilesTable)
            .where(eq(workerProfilesTable.id, task.claimedBy))
            .limit(1)
        : [];
      return {
        ...toTask(task),
        claimedByName: worker?.name ?? null,
        claimedByEmail: worker?.email ?? null,
      };
    }),
  );

  const totalSubmissions = Number(totalSubmissionsRows[0]?.count ?? 0);
  const approvedSubmissions = Number(approvedSubmissionsRows[0]?.count ?? 0);
  const overview = {
    stats: {
      totalWorkers: workers.length,
      availableWorkers: workers.filter((worker) => worker.availability === "available").length,
      activeTasks: tasks.filter((task) => task.status === "claimed").length,
      tasksInReview: Number(reviewRows[0]?.count ?? 0),
      completedToday: Number(completedTodayRows[0]?.count ?? 0),
      completionRate: totalSubmissions ? Math.round((approvedSubmissions / totalSubmissions) * 100) : 0,
    },
    workers: workerViews,
    tasks: taskViews,
  };

  res.json(GetDispatcherOverviewResponse.parse(overview));
});

router.get("/admin/review", async (_req, res): Promise<void> => {
  await ensureSeedTasks();
  const rows = await db
    .select({
      submission: submissionsTable,
      task: tasksTable,
      worker: workerProfilesTable,
    })
    .from(submissionsTable)
    .innerJoin(tasksTable, eq(tasksTable.id, submissionsTable.taskId))
    .innerJoin(workerProfilesTable, eq(workerProfilesTable.id, submissionsTable.workerId))
    .where(eq(submissionsTable.status, "submitted"))
    .orderBy(desc(submissionsTable.submittedAt));

  const response = rows.map(({ submission, task, worker }) => ({
    id: String(submission.id),
    taskId: String(submission.taskId),
    taskTitle: task.title,
    workerName: worker.name,
    workerEmail: worker.email,
    category: task.category,
    response: submission.response,
    notes: submission.notes,
    status: submission.status,
    submittedAt: submission.submittedAt,
    payout: Number(submission.payout),
    reviewerNote: submission.reviewerNote,
    videoUrl: submission.videoObjectPath ? `/api/submissions/${submission.id}/video` : null,
  }));

  res.json(ListReviewQueueResponse.parse(response));
});

router.post("/admin/submissions/:submissionId/review", async (req, res): Promise<void> => {
  const params = ReviewSubmissionParams.safeParse(req.params);
  const body = ReviewSubmissionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid request" });
    return;
  }

  const [updated] = await db
    .update(submissionsTable)
    .set({ status: body.data.status, reviewerNote: body.data.reviewerNote })
    .where(eq(submissionsTable.id, Number(params.data.submissionId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, updated.taskId)).limit(1);
  const [worker] = await db
    .select()
    .from(workerProfilesTable)
    .where(eq(workerProfilesTable.id, updated.workerId))
    .limit(1);
  res.json(
    ReviewSubmissionResponse.parse({
      id: String(updated.id),
      taskId: String(updated.taskId),
      taskTitle: task?.title ?? "LLM task",
      workerName: worker?.name,
      response: updated.response,
      notes: updated.notes,
      status: updated.status,
      submittedAt: updated.submittedAt,
      payout: Number(updated.payout),
      reviewerNote: updated.reviewerNote,
      videoUrl: updated.videoObjectPath ? `/api/submissions/${updated.id}/video` : null,
    }),
  );
});

export default router;