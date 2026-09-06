import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import { db, submissionsTable, tasksTable, workerProfilesTable } from "@workspace/db";
import { isDispatcherEmail } from "@workspace/dispatcher-config";
import {
  ClaimTaskParams,
  ClaimTaskResponse,
  GetTaskParams,
  GetTaskResponse,
  GetWorkerDashboardResponse,
  GetWorkerProfileResponse,
  GetWorkerScreeningResponse,
  ListSubmissionsResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  SubmitTaskBody,
  SubmitTaskParams,
  SubmitTaskResponse,
  SubmitVideoScreeningBody,
  SubmitVideoScreeningParams,
  SubmitVideoScreeningResponse,
  UpdateWorkerProfileBody,
  UpdateWorkerProfileResponse,
} from "@workspace/api-zod";
import {
  ensureVideoScreeningTask,
  ensureSeedTasks,
  ensureWorker,
  hasCompletedVideoScreening,
  taskForWorker,
  toProfile,
  toTask,
} from "../lib/worker-data";
import { ObjectStorageService } from "../lib/objectStorage";
import { isDispatcherSession } from "../lib/dispatcher-session";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function submissionView(
  submission: typeof submissionsTable.$inferSelect,
  taskTitle: string,
  workerName: string,
) {
  return {
    id: String(submission.id),
    taskId: String(submission.taskId),
    taskTitle,
    workerName,
    response: submission.response,
    notes: submission.notes,
    status: submission.status,
    submittedAt: submission.submittedAt,
    payout: Number(submission.payout),
    reviewerNote: submission.reviewerNote,
    videoUrl: submission.videoObjectPath ? `/api/submissions/${submission.id}/video` : null,
  };
}

router.get("/worker/me", async (req, res): Promise<void> => {
  const profile = await ensureWorker(req);
  res.json(GetWorkerProfileResponse.parse(toProfile(profile)));
});

router.patch("/worker/me", async (req, res): Promise<void> => {
  const parsed = UpdateWorkerProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profile = await ensureWorker(req);
  const acceptedTerms = parsed.data.internshipTermsAccepted ?? profile.internshipTermsAccepted;
  const requestedProgress = parsed.data.onboardingProgress ?? profile.onboardingProgress;
  if (requestedProgress >= 100 && !acceptedTerms) {
    res.status(400).json({ error: "Accept the Cognifuse internship terms before completing onboarding" });
    return;
  }

  const termsChanged = parsed.data.internshipTermsAccepted !== undefined;
  const updateData = {
    ...parsed.data,
    ...(termsChanged
      ? {
          internshipTermsAcceptedAt: parsed.data.internshipTermsAccepted
            ? new Date()
            : null,
        }
      : {}),
  };
  const [updated] = await db
    .update(workerProfilesTable)
    .set(updateData)
    .where(eq(workerProfilesTable.id, profile.id))
    .returning();

  if (updated && updated.onboardingProgress >= 100) {
    await ensureVideoScreeningTask(updated.id, updated.skills);
  }

  res.json(UpdateWorkerProfileResponse.parse(toProfile(updated)));
});

router.get("/worker/screening", async (req, res): Promise<void> => {
  const profile = await ensureWorker(req);
  if (profile.onboardingProgress < 100) {
    res.status(409).json({ error: "Complete onboarding before starting screening" });
    return;
  }
  if (!profile.internshipTermsAccepted) {
    res.status(409).json({ error: "Accept the Cognifuse internship terms before starting screening" });
    return;
  }

  const task = await ensureVideoScreeningTask(profile.id, profile.skills);
  const [submission] = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.taskId, task.id), eq(submissionsTable.workerId, profile.id)))
    .orderBy(desc(submissionsTable.submittedAt))
    .limit(1);
  const status = submission?.status === "approved" || submission?.status === "rejected"
    ? submission.status
    : submission
      ? "submitted"
      : "pending";

  res.json(
    GetWorkerScreeningResponse.parse({
      task: toTask(task),
      status,
      submissionId: submission ? String(submission.id) : null,
      videoUrl: submission?.videoObjectPath ? `/api/submissions/${submission.id}/video` : null,
    }),
  );
});

router.get("/worker/dashboard", async (req, res): Promise<void> => {
  await ensureSeedTasks();
  const profile = await ensureWorker(req);
  const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)).limit(4);
  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.workerId, profile.id))
    .orderBy(desc(submissionsTable.submittedAt))
    .limit(5);

  const taskRows = await db.select().from(tasksTable).where(eq(tasksTable.status, "available"));
  const completedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissionsTable)
    .where(and(eq(submissionsTable.workerId, profile.id), eq(submissionsTable.status, "approved")));
  const pendingRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissionsTable)
    .where(and(eq(submissionsTable.workerId, profile.id), eq(submissionsTable.status, "submitted")));
  const earnedRows = await db
    .select({ total: sql<string>`coalesce(sum(${submissionsTable.payout}), 0)` })
    .from(submissionsTable)
    .where(and(eq(submissionsTable.workerId, profile.id), eq(submissionsTable.status, "approved")));

  const submissionViews = await Promise.all(
    submissions.map(async (submission) => {
      const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, submission.taskId)).limit(1);
      return submissionView(submission, task?.title ?? "LLM task", profile.name);
    }),
  );

  const response = {
    profile: toProfile(profile),
    stats: {
      availableTasks: taskRows.length,
      completedTasks: Number(completedRows[0]?.count ?? 0),
      pendingReview: Number(pendingRows[0]?.count ?? 0),
      earned: Number(earnedRows[0]?.total ?? 0),
    },
    featuredTasks: tasks.map(toTask),
    recentSubmissions: submissionViews,
  };

  res.json(GetWorkerDashboardResponse.parse(response));
});

router.get("/tasks", async (req, res): Promise<void> => {
  await ensureSeedTasks();
  const profile = await ensureWorker(req);
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (profile.onboardingProgress >= 100 && !(await hasCompletedVideoScreening(profile.id))) {
    const screeningTask = await ensureVideoScreeningTask(profile.id, profile.skills);
    res.json(ListTasksResponse.parse([toTask(screeningTask)]));
    return;
  }

  const status = parsed.data.status;
  const conditions = [sql`(${tasksTable.claimedBy} is null or ${tasksTable.claimedBy} = ${profile.id})`];
  if (status !== "all") {
    conditions.push(eq(tasksTable.status, status));
  }
  if (parsed.data.category) {
    conditions.push(eq(tasksTable.category, parsed.data.category));
  }

  const tasks = await db.select().from(tasksTable).where(and(...conditions)).orderBy(desc(tasksTable.createdAt));
  res.json(ListTasksResponse.parse(tasks.map(toTask)));
});

router.get("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const profile = await ensureWorker(req);
  const task = await taskForWorker(Number(params.data.taskId), profile.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (
    profile.onboardingProgress >= 100 &&
    task.taskType !== "video_screening" &&
    !(await hasCompletedVideoScreening(profile.id))
  ) {
    res.status(403).json({ error: "Complete the mandatory video screening first" });
    return;
  }

  res.json(GetTaskResponse.parse(toTask(task)));
});

router.post("/tasks/:taskId", async (req, res): Promise<void> => {
  const params = ClaimTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const profile = await ensureWorker(req);
  if (profile.onboardingProgress >= 100 && !(await hasCompletedVideoScreening(profile.id))) {
    const task = await taskForWorker(Number(params.data.taskId), profile.id);
    if (task?.taskType !== "video_screening") {
      res.status(403).json({ error: "Complete the mandatory video screening first" });
      return;
    }
  }
  const [claimed] = await db
    .update(tasksTable)
    .set({ status: "claimed", claimedBy: profile.id, claimedAt: new Date() })
    .where(and(eq(tasksTable.id, Number(params.data.taskId)), eq(tasksTable.status, "available")))
    .returning();

  if (!claimed) {
    res.status(409).json({ error: "Task is no longer available" });
    return;
  }

  res.json(ClaimTaskResponse.parse(toTask(claimed)));
});

router.post("/tasks/:taskId/submit", async (req, res): Promise<void> => {
  const params = SubmitTaskParams.safeParse(req.params);
  const body = SubmitTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid request" });
    return;
  }

  const profile = await ensureWorker(req);
  const task = await taskForWorker(Number(params.data.taskId), profile.id);
  if (!task || task.claimedBy !== profile.id || task.taskType === "video_screening") {
    res.status(409).json({ error: "Claim this task before submitting it" });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      taskId: task.id,
      workerId: profile.id,
      response: body.data.response,
      notes: body.data.notes,
      payout: task.payout,
      status: "submitted",
    })
    .returning();
  await db
    .update(tasksTable)
    .set({ status: "submitted", submissionsCount: task.submissionsCount + 1 })
    .where(eq(tasksTable.id, task.id));

  res.status(201).json(SubmitTaskResponse.parse(submissionView(submission, task.title, profile.name)));
});

router.post("/tasks/:taskId/video-submit", async (req, res): Promise<void> => {
  const params = SubmitVideoScreeningParams.safeParse(req.params);
  const body = SubmitVideoScreeningBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error?.message ?? "Invalid request" });
    return;
  }

  const profile = await ensureWorker(req);
  const task = await taskForWorker(Number(params.data.taskId), profile.id);
  if (!task || task.taskType !== "video_screening" || task.claimedBy !== profile.id) {
    res.status(404).json({ error: "Video screening task not found" });
    return;
  }

  const [latestSubmission] = await db
    .select()
    .from(submissionsTable)
    .where(and(eq(submissionsTable.taskId, task.id), eq(submissionsTable.workerId, profile.id)))
    .orderBy(desc(submissionsTable.submittedAt))
    .limit(1);
  if (latestSubmission?.status === "submitted" || latestSubmission?.status === "approved") {
    res.status(409).json({ error: "Your video screening is already under review" });
    return;
  }

  if (!body.data.contentType.startsWith("video/") || !body.data.objectPath.startsWith("/objects/")) {
    res.status(400).json({ error: "Upload a valid video recording first" });
    return;
  }

  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    await objectStorageService.getObjectEntityFile(body.data.objectPath);
    await objectStorageService.trySetObjectEntityAclPolicy(body.data.objectPath, {
      owner: userId,
      visibility: "private",
    });
  } catch (error) {
    req.log.error({ err: error }, "Could not verify uploaded screening video");
    res.status(400).json({ error: "The uploaded video could not be verified" });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({
      taskId: task.id,
      workerId: profile.id,
      response: "Candidate video screening",
      notes: "Candidate introduced themselves and described their language-model evaluation skills.",
      status: "submitted",
      payout: "0.00",
      videoObjectPath: body.data.objectPath,
      videoContentType: body.data.contentType,
      videoDurationSeconds: Math.round(body.data.durationSeconds),
    })
    .returning();
  await db
    .update(tasksTable)
    .set({ status: "submitted", submissionsCount: task.submissionsCount + 1 })
    .where(eq(tasksTable.id, task.id));

  res.status(201).json(SubmitVideoScreeningResponse.parse(submissionView(submission, task.title, profile.name)));
});

router.get("/submissions/:submissionId/video", async (req, res): Promise<void> => {
  const rawId = req.params.submissionId;
  const submissionId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  if (!Number.isInteger(submissionId)) {
    res.status(400).json({ error: "Invalid submission id" });
    return;
  }

  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [row] = await db
    .select({ submission: submissionsTable, worker: workerProfilesTable })
    .from(submissionsTable)
    .innerJoin(workerProfilesTable, eq(workerProfilesTable.id, submissionsTable.workerId))
    .where(eq(submissionsTable.id, submissionId))
    .limit(1);
  if (!row?.submission.videoObjectPath) {
    res.status(404).json({ error: "Video submission not found" });
    return;
  }

  let allowed = isDispatcherSession(req) || row.worker.clerkUserId === userId;
  if (!allowed) {
    try {
      const user = await clerkClient.users.getUser(userId);
      allowed = isDispatcherEmail(user.primaryEmailAddress?.emailAddress);
    } catch (error) {
      req.log.warn({ err: error }, "Could not verify video viewer");
    }
  }
  if (!allowed) {
    res.status(403).json({ error: "You are not allowed to view this video" });
    return;
  }

  try {
    const file = await objectStorageService.getObjectEntityFile(row.submission.videoObjectPath);
    const response = await objectStorageService.downloadObject(file, 0);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Could not stream screening video");
    res.status(404).json({ error: "Video submission not found" });
  }
});

router.get("/submissions", async (req, res): Promise<void> => {
  const profile = await ensureWorker(req);
  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.workerId, profile.id))
    .orderBy(desc(submissionsTable.submittedAt));
  const views = await Promise.all(
    submissions.map(async (submission) => {
      const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, submission.taskId)).limit(1);
      return submissionView(submission, task?.title ?? "LLM task", profile.name);
    }),
  );
  res.json(ListSubmissionsResponse.parse(views));
});

export default router;