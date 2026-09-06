import { useEffect, useRef, useState, type ComponentType } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileVideo,
  LockKeyhole,
  Mic,
  RefreshCcw,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { Link, Redirect } from "wouter";
import {
  getGetWorkerDashboardQueryKey,
  getGetWorkerScreeningQueryKey,
  getListReviewQueueQueryKey,
  getListSubmissionsQueryKey,
  useGetWorkerScreening,
  useRequestUploadUrl,
  useSubmitVideoScreening,
} from "@workspace/api-client-react";
import { AppShell, ErrorBlock, LoadingBlock } from "@/components/workbench";

const MAX_DURATION_SECONDS = 180;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getRecordingType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function WorkerScreeningPage() {
  const { isLoaded, user } = useUser();
  const queryClient = useQueryClient();
  const screening = useGetWorkerScreening({
    query: {
      enabled: isLoaded && Boolean(user),
      queryKey: getGetWorkerScreeningQueryKey(),
    },
  });

  if (!isLoaded) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Preparing your screening room…</div>;
  }

  if (!user) return <Redirect to="/sign-in" />;

  if (screening.isLoading) {
    return <AppShell><LoadingBlock lines={7} /></AppShell>;
  }

  if (screening.isError || !screening.data) {
    return <AppShell><ErrorBlock message="Your screening room could not be loaded. Please try again." /></AppShell>;
  }

  return (
    <ScreeningWorkspace
      screening={screening.data}
      onSubmitted={() => {
        void queryClient.invalidateQueries({ queryKey: getGetWorkerScreeningQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetWorkerDashboardQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListReviewQueueQueryKey() });
      }}
    />
  );
}

function ScreeningWorkspace({
  screening,
  onSubmitted,
}: {
  screening: {
    task: { id: string; title: string; description: string };
    status: string;
    submissionId: string | null;
    videoUrl: string | null;
  };
  onSubmitted: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [permissionReady, setPermissionReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(screening.status === "submitted" || screening.status === "approved");
  const requestUpload = useRequestUploadUrl();
  const submitScreening = useSubmitVideoScreening();

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const next = Math.min(MAX_DURATION_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(next);
      if (next >= MAX_DURATION_SECONDS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
        startedAtRef.current = null;
        setRecording(false);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [permissionReady]);

  const startPreview = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support camera recording. Please use a recent version of Chrome, Edge, Safari, or Firefox.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setPermissionReady(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      return true;
    } catch {
      setError("Camera and microphone access is needed for this screening. Check your browser permissions, then try again.");
      return false;
    }
  };

  const beginRecording = async () => {
    setError("");
    let hasPreview = streamRef.current;
    if (!hasPreview) {
      const ready = await startPreview();
      hasPreview = ready ? streamRef.current : null;
    }
    if (!hasPreview) return;
    try {
      chunksRef.current = [];
      const mimeType = getRecordingType();
      const recorder = mimeType ? new MediaRecorder(hasPreview, { mimeType }) : new MediaRecorder(hasPreview);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (!blob.size) {
          setError("The recording was empty. Please try recording again.");
          return;
        }
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        if (videoRef.current) videoRef.current.srcObject = null;
      };
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start(250);
      setRecording(true);
    } catch {
      setError("The recording could not start. Check that your camera and microphone are available.");
    }
  };

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    startedAtRef.current = null;
    setRecording(false);
  }

  const retake = () => {
    if (recording) stopRecording();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setError("");
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  };

  const submit = async () => {
    if (!recordedBlob || elapsed < 1) {
      setError("Record at least one second before submitting your screening.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const extension = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const upload = await requestUpload.mutateAsync({
        data: {
          name: `video-screening-${Date.now()}.${extension}`,
          size: recordedBlob.size,
          contentType: recordedBlob.type,
        },
      });
      const response = await fetch(upload.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": recordedBlob.type },
        body: recordedBlob,
      });
      if (!response.ok) throw new Error("upload");
      await submitScreening.mutateAsync({
        taskId: screening.task.id,
        data: {
          objectPath: upload.objectPath,
          contentType: recordedBlob.type,
          durationSeconds: Math.max(1, Math.min(MAX_DURATION_SECONDS, elapsed)),
        },
      });
      setSubmitted(true);
      onSubmitted();
    } catch {
      setError("Your video could not be uploaded or submitted. Nothing was sent to the review team. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    const approved = screening.status === "approved";
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl animate-rise">
          <div className="eyebrow text-[hsl(var(--primary))]">Candidate screening / review state</div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft sm:p-9">
              <div className="grid size-12 place-items-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
                {approved ? <CheckCircle2 size={25} /> : <Clock3 size={25} />}
              </div>
              <h1 className="mt-6 text-3xl font-extrabold tracking-[-.06em]">{approved ? "Screening approved." : "Your introduction is with the review team."}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                {approved
                  ? "Your contributor profile is ready for matched work. Return to your dashboard when you are ready to begin."
                  : "Thank you for taking the time to introduce yourself. A reviewer will listen for clear communication, thoughtful examples, and the evaluation skills you bring."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-extrabold text-white">Go to dashboard</Link>
                {screening.videoUrl && <a href={screening.videoUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-border px-5 py-3 text-sm font-bold hover:bg-muted">Open submitted video</a>}
              </div>
            </section>
            <aside className="rounded-[1.75rem] border border-border bg-[hsl(var(--secondary)/.42)] p-6">
              <div className="eyebrow text-[hsl(var(--primary))]">What happens next</div>
              <div className="mt-5 space-y-4">
                <Step done>Video received securely</Step>
                <Step done={approved}>Review team listens for signal</Step>
                <Step done={approved}>Task feed opens after approval</Step>
              </div>
              <p className="mt-7 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><LockKeyhole size={13} className="mr-1 inline" />Your recording is private and only available to the review team.</p>
            </aside>
          </div>
        </div>
      </AppShell>
    );
  }

  const rejected = screening.status === "rejected";
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl animate-rise">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow text-[hsl(var(--primary))]">Candidate screening / required step</div>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-.06em] sm:text-[2.7rem]">Let the review team meet the person behind the profile.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">A short, private introduction helps us understand how you communicate and evaluate language-model work. Take a breath; this is not a performance test.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[hsl(var(--accent)/.5)] bg-[hsl(var(--accent)/.1)] px-3 py-2 text-xs font-bold text-[hsl(var(--accent-foreground))]"><span className="size-2 rounded-full bg-[hsl(var(--accent))]" />About 3 minutes</div>
        </div>

        {rejected && <div className="mb-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><CircleAlert className="mt-0.5 shrink-0" size={18} /><div><div className="font-extrabold">The review team requested another introduction.</div><p className="mt-1 leading-6 text-rose-800/80">Use this chance to give a little more context and one concrete example of how you judge model output.</p></div></div>}
        {error && <div className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900" data-testid="status-screening-error"><X className="mt-0.5 shrink-0" size={16} />{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-soft">
            <div className="relative aspect-video bg-[hsl(var(--sidebar))]">
              <video ref={videoRef} muted playsInline controls={Boolean(recordedUrl)} src={recordedUrl ?? undefined} className="size-full object-cover" />
              {!permissionReady && !recordedUrl && <div className="absolute inset-0 grid place-items-center p-8 text-center text-white"><div><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/10"><Video size={24} /></div><p className="mt-4 text-sm font-bold">Your camera preview will appear here.</p><p className="mt-1 text-xs leading-5 text-white/55">Nothing is recorded until you choose to start.</p></div></div>}
              {recording && <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-lg"><span className="size-2 animate-pulse rounded-full bg-white" />Recording {formatTime(elapsed)}</div>}
              {recordedUrl && !recording && <div className="absolute left-4 top-4 rounded-full bg-[hsl(var(--sidebar))]/85 px-3 py-1.5 text-xs font-bold text-white">Preview your recording</div>}
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-2 rounded-full ${recording ? "bg-rose-500" : permissionReady ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />{recording ? "Recording in progress" : permissionReady ? "Camera and microphone ready" : "Camera not connected"}</div>
              <div className="flex flex-wrap gap-2">
                {!permissionReady && !recording && <button onClick={() => void startPreview()} className="rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold hover:bg-muted" data-testid="button-enable-camera"><Camera size={14} className="mr-1.5 inline" />Enable camera</button>}
                {!recording && !recordedUrl && <button onClick={() => void beginRecording()} className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-extrabold text-white hover:-translate-y-0.5" data-testid="button-start-recording"><span className="mr-1.5 inline-block size-2 rounded-full bg-[hsl(var(--accent))]" />Start recording</button>}
                {recording && <button onClick={stopRecording} className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white hover:-translate-y-0.5" data-testid="button-stop-recording">Stop recording</button>}
                {recordedUrl && !recording && <button onClick={retake} className="rounded-xl border border-border px-4 py-2.5 text-xs font-extrabold hover:bg-muted" data-testid="button-retake-recording"><RefreshCcw size={14} className="mr-1.5 inline" />Retake</button>}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-soft">
              <div className="eyebrow text-[hsl(var(--primary))]">Your prompt</div>
              <h2 className="mt-3 text-xl font-extrabold tracking-[-.04em]">{screening.task.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{screening.task.description}</p>
              <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm">
                <PromptLine icon={UserMark} text="Introduce yourself and your background." />
                <PromptLine icon={Mic} text="Share the languages or domains you work in." />
                <PromptLine icon={FileVideo} text="Give one concrete example of evaluating model output." />
              </div>
            </section>
            <section className="rounded-[1.75rem] border border-border bg-[hsl(var(--secondary)/.42)] p-6">
              <div className="flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={17} className="text-[hsl(var(--primary))]" />A private, respectful review</div>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">Your recording is uploaded directly to secure storage and shared only with the review team. You can retake it before submission.</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock3 size={14} />Maximum length: 03:00</div>
            </section>
            <button onClick={() => void submit()} disabled={!recordedBlob || recording || uploading} className="w-full rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-extrabold text-white shadow-soft hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-screening">{uploading ? "Uploading securely…" : "Submit for review"} <Check size={15} className="ml-1 inline" /></button>
            {!recordedBlob && <p className="text-center text-xs text-muted-foreground">Make a recording before submitting.</p>}
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Step({ children, done }: { children: string; done?: boolean }) {
  return <div className="flex items-center gap-3 text-sm"><span className={`grid size-6 place-items-center rounded-full ${done ? "bg-[hsl(var(--primary))] text-white" : "border border-border text-transparent"}`}><Check size={13} /></span><span className={done ? "font-semibold text-foreground" : "text-muted-foreground"}>{children}</span></div>;
}

function UserMark({ size = 15 }: { size?: number; className?: string; strokeWidth?: number }) {
  return <span className="grid size-6 place-items-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[10px] font-black text-[hsl(var(--primary))]" style={{ fontSize: size > 14 ? 10 : 9 }}>01</span>;
}

function PromptLine({ icon: Icon, text }: { icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; text: string }) {
  return <div className="flex items-start gap-3"><Icon /><span className="leading-6">{text}</span></div>;
}