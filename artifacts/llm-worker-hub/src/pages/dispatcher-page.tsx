import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Check, Clock3, FileCheck2, Layers3, Plus, Radio, Users, Video, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetDispatcherOverviewQueryKey,
  getListReviewQueueQueryKey,
  useCreateTask,
  useGetDispatcherOverview,
  useListReviewQueue,
  useReviewSubmission,
  type ReviewItem,
  type TaskInput,
  TaskDifficulty,
} from "@workspace/api-client-react";
import {
  AppShell,
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  PageTitle,
  StatCard,
  StatusPill,
} from "@/components/workbench";

const money = (value: number) => `$${value.toFixed(2)}`;
const dateLabel = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(new Date(value))
    : "No activity yet";

export function DispatcherPage() {
  return <AuthorizedDispatcherPage />;
}

function AuthorizedDispatcherPage() {
  const overview = useGetDispatcherOverview({
    query: { queryKey: getGetDispatcherOverviewQueryKey(), refetchInterval: 15000 },
  });
  const reviewQueue = useListReviewQueue({
    query: { queryKey: getListReviewQueueQueryKey(), refetchInterval: 15000 },
  });
  const create = useCreateTask();
  const review = useReviewSubmission();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [form, setForm] = useState<TaskInput>({
    title: "",
    description: "",
    category: "Writing",
    difficulty: TaskDifficulty.intermediate,
    estimatedMinutes: 30,
    payout: 12,
    requiredSkills: ["English"],
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetDispatcherOverviewQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
  };

  const publish = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { data: form },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({
            title: "",
            description: "",
            category: "Writing",
            difficulty: TaskDifficulty.intermediate,
            estimatedMinutes: 30,
            payout: 12,
            requiredSkills: ["English"],
          });
          refresh();
        },
      },
    );
  };

  const decide = (item: ReviewItem, status: "approved" | "rejected") => {
    review.mutate(
      {
        submissionId: item.id,
        data: { status, reviewerNote: reviewNote[item.id] },
      },
      { onSuccess: refresh },
    );
  };

  if (overview.isLoading) {
    return (
      <AppShell admin>
        <LoadingBlock lines={10} />
      </AppShell>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <AppShell admin>
        <ErrorBlock message="The dispatcher workspace could not be reached." />
      </AppShell>
    );
  }

  const { stats, workers, tasks } = overview.data;

  return (
    <AppShell admin>
      <PageTitle
        eyebrow="Dispatcher control room"
        title="Good morning."
        description="Publish work, see who is available, and spot stalled or review-ready tasks before they become bottlenecks."
        action={
          <div className="relative pt-4">
            <span className="absolute -top-1 right-3 -rotate-3 rounded bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--accent-foreground))] shadow-sm">Start here</span>
            <button
              onClick={() => setShowCreate((value) => !value)}
              data-testid="button-dispatcher-add-task"
              className="rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-extrabold text-white shadow-[0_0_0_4px_hsl(var(--accent)/.25)] hover:-translate-y-0.5"
            >
              <Plus className="mr-1 inline" size={15} /> Add task
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 rounded-2xl border-2 border-dashed border-[hsl(var(--accent)/.7)] bg-[hsl(var(--accent)/.08)] p-4 sm:grid-cols-3 sm:p-5" data-testid="dispatcher-quick-start">
        <div className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-black text-[hsl(var(--accent-foreground))]">1</span>
          <div><div className="text-sm font-extrabold">Add task</div><div className="text-xs leading-5 text-muted-foreground">Create a brief and payout.</div></div>
        </div>
        <div className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-black text-[hsl(var(--accent-foreground))]">2</span>
          <div><div className="text-sm font-extrabold">Publish to queue</div><div className="text-xs leading-5 text-muted-foreground">It becomes open for pickup.</div></div>
        </div>
        <div className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-xs font-black text-[hsl(var(--accent-foreground))]">3</span>
          <div><div className="text-sm font-extrabold">Watch workers claim</div><div className="text-xs leading-5 text-muted-foreground">Track ownership in Task traffic.</div></div>
        </div>
      </div>

      {showCreate && (
        <form
          onSubmit={publish}
          className="mb-6 rounded-2xl border border-[hsl(var(--primary)/.28)] bg-[hsl(var(--primary)/.04)] p-5 shadow-soft sm:p-7"
          data-testid="form-dispatcher-create-task"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">Publish a new brief</div>
              <h2 className="mt-1 text-xl font-extrabold">Give workers a task worth picking up.</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              data-testid="button-dispatcher-close-task"
              className="rounded-lg p-2 hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold sm:col-span-2">
              Task title
              <input
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. Compare two customer support responses"
                data-testid="input-dispatcher-title"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Instructions
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={4}
                placeholder="Explain exactly what a strong submission should include."
                data-testid="textarea-dispatcher-description"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Category
              <input
                required
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                data-testid="input-dispatcher-category"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Difficulty
              <select
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value as TaskInput["difficulty"] })}
                data-testid="select-dispatcher-difficulty"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              >
                <option value="starter">Starter</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              Estimated minutes
              <input
                required
                type="number"
                min="1"
                value={form.estimatedMinutes}
                onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })}
                data-testid="input-dispatcher-minutes"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="text-sm font-bold">
              Worker payout
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.payout}
                onChange={(event) => setForm({ ...form, payout: Number(event.target.value) })}
                data-testid="input-dispatcher-payout"
                className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none"
              />
            </label>
          </div>
          <button
            disabled={create.isPending}
            data-testid="button-dispatcher-publish"
            className="mt-5 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {create.isPending ? "Publishing…" : "Publish task"} <ArrowRight className="ml-1 inline" size={15} />
          </button>
          {create.isError && <span className="ml-3 text-sm font-semibold text-rose-700">Could not publish this task.</span>}
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Workers" value={stats.totalWorkers} detail="in your network" icon={Users} tint="ink" />
        <StatCard label="Available" value={stats.availableWorkers} detail="ready for matching" icon={Radio} tint="teal" />
        <StatCard label="Active tasks" value={stats.activeTasks} detail="currently in progress" icon={Layers3} tint="blue" />
        <StatCard label="In review" value={stats.tasksInReview} detail="need a decision" icon={FileCheck2} tint="orange" />
        <StatCard label="Done today" value={stats.completedToday} detail="approved submissions" icon={Check} tint="teal" />
        <StatCard label="Completion" value={`${stats.completionRate}%`} detail="approval rate" icon={BarChart3} tint="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">Live workforce</div>
              <h2 className="mt-2 text-xl font-extrabold tracking-[-.04em]">Monitor workers</h2>
              <p className="mt-1 text-sm text-muted-foreground">Availability and current workload at a glance.</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-xs font-bold text-[hsl(var(--primary))]">
              Auto-refreshed
            </span>
          </div>
          {workers.length ? (
            <div className="mt-5 space-y-3">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className="rounded-xl border border-border p-4"
                  data-testid={`dispatcher-worker-${worker.id}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">
                        {worker.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div>
                        <div className="font-extrabold">{worker.name}</div>
                        <div className="text-xs text-muted-foreground">{worker.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={worker.availability} />
                      <StatusPill status={worker.status} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-border pt-3 text-xs sm:grid-cols-3">
                    <div>
                      <div className="text-muted-foreground">Current task</div>
                      <div className="mt-1 font-bold">{worker.activeTaskTitle ?? "Available for a task"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Track record</div>
                      <div className="mt-1 font-bold">{worker.completedTasks} approved</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last activity</div>
                      <div className="mt-1 font-bold">{dateLabel(worker.lastSubmissionAt)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {worker.skills.map((skill) => (
                      <span key={skill} className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyBlock title="No workers yet" description="Workers will appear here as they complete onboarding." />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div>
            <div className="eyebrow text-[hsl(var(--accent-foreground)/.8)]">Task traffic</div>
            <h2 className="mt-2 text-xl font-extrabold tracking-[-.04em]">Monitor task flow</h2>
            <p className="mt-1 text-sm text-muted-foreground">Available tasks stay in the open queue until a free worker claims them.</p>
          </div>
          <div className="mt-5 rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.05)] p-4 text-sm">
            <div className="font-extrabold text-[hsl(var(--primary))]">Open queue matching</div>
            <p className="mt-1 leading-6 text-muted-foreground">
              You do not need to assign these tasks manually. Workers who are available will see open tasks in their task feed and claim the work that matches their skills.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {tasks.length ? (
              tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-border p-4" data-testid={`dispatcher-task-${task.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="eyebrow text-[hsl(var(--primary))]">{task.category}</div>
                      <h3 className="mt-1 font-extrabold">{task.title}</h3>
                    </div>
                    <StatusPill status={task.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock3 size={13} />{task.estimatedMinutes} min</span>
                    <span className="font-mono text-[hsl(var(--primary))]">{money(task.payout)}</span>
                    <span>{task.claimedByName ?? (task.status === "available" ? "Open for pickup" : "Unclaimed")}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock title="No tasks published" description="Add your first brief to start the work queue." />
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow text-[hsl(var(--primary))]">Review handoff</div>
            <h2 className="mt-2 text-xl font-extrabold tracking-[-.04em]">Submissions needing a decision</h2>
          </div>
          <span className="rounded-full bg-[hsl(var(--accent)/.15)] px-2.5 py-1 text-xs font-bold text-[hsl(var(--accent-foreground))]">
            {reviewQueue.data?.length ?? 0} waiting
          </span>
        </div>
        {reviewQueue.isLoading ? (
          <div className="mt-5"><LoadingBlock lines={3} /></div>
        ) : reviewQueue.isError ? (
          <div className="mt-5"><ErrorBlock message="The review queue could not be reached." /></div>
        ) : reviewQueue.data?.length ? (
          <div className="mt-5 grid gap-4">
            {reviewQueue.data.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                note={reviewNote[item.id] ?? ""}
                onNoteChange={(value) => setReviewNote({ ...reviewNote, [item.id]: value })}
                onDecide={decide}
                busy={review.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5"><EmptyBlock title="Queue is clear" description="No submissions are waiting for review." /></div>
        )}
      </section>
    </AppShell>
  );
}

function ReviewCard({
  item,
  note,
  onNoteChange,
  onDecide,
  busy,
}: {
  item: ReviewItem;
  note: string;
  onNoteChange: (value: string) => void;
  onDecide: (item: ReviewItem, status: "approved" | "rejected") => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-5" data-testid={`dispatcher-review-${item.id}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-[hsl(var(--primary))]">{item.category}</span>
            <span className="text-xs text-muted-foreground">{dateLabel(item.submittedAt)}</span>
          </div>
          <h3 className="mt-2 font-extrabold">{item.taskTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{item.workerName ?? "Contributor"} · {item.workerEmail}</p>
        </div>
        <span className="font-mono text-[hsl(var(--primary))]">{money(item.payout)}</span>
      </div>
      <div className="mt-4 rounded-xl bg-muted/60 p-4 text-sm leading-6">{item.response ?? "No response text provided."}</div>
      {item.videoUrl && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[hsl(var(--sidebar))]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-bold text-white/75">
            <Video size={14} className="text-[hsl(var(--accent))]" /> Private video screening
          </div>
          <video
            controls
            preload="metadata"
            src={item.videoUrl}
            className="aspect-video w-full bg-black object-contain"
            data-testid={`video-dispatcher-review-${item.id}`}
          >
            Your browser does not support video playback.
          </video>
        </div>
      )}
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        rows={2}
        placeholder="Optional note for the contributor"
        data-testid={`textarea-dispatcher-review-${item.id}`}
        className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button
          onClick={() => onDecide(item, "rejected")}
          disabled={busy}
          data-testid={`button-dispatcher-reject-${item.id}`}
          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
        >
          Needs another pass
        </button>
        <button
          onClick={() => onDecide(item, "approved")}
          disabled={busy}
          data-testid={`button-dispatcher-approve-${item.id}`}
          className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-white hover:-translate-y-0.5"
        >
          Approve payout <Check size={13} className="ml-1 inline" />
        </button>
      </div>
    </div>
  );
}