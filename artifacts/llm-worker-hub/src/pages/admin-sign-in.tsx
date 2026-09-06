import { useState, type FormEvent } from "react";
import { AuthenticateWithRedirectCallback, useSignIn } from "@clerk/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { DISPATCHER_ACCOUNT_SETUP_MESSAGE } from "@workspace/dispatcher-config";
import { Link, useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type ClerkErrorDetail = {
  code?: string;
  longMessage?: string;
  message?: string;
};

function isMissingAccountError(error: ClerkErrorDetail | undefined): boolean {
  if (!error) return false;

  const code = error.code?.toLowerCase() ?? "";
  if (code.includes("identifier_not_found") || code.includes("user_not_found")) {
    return true;
  }

  const message = `${error.longMessage ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    /(?:account|user|email|identifier).*(?:not found|does not exist|couldn't find|could not find)/.test(message) ||
    /(?:no|not found|does not exist).*(?:account|user|email|identifier)/.test(message)
  );
}

function errorMessage(error: unknown, isDispatcher = false): string {
  const clerkError = error as {
    errors?: ClerkErrorDetail[];
    message?: string;
  };
  if (isDispatcher && isMissingAccountError(clerkError.errors?.[0])) {
    return DISPATCHER_ACCOUNT_SETUP_MESSAGE;
  }

  return (
    clerkError.errors?.[0]?.longMessage ??
    clerkError.errors?.[0]?.message ??
    clerkError.message ??
    "We could not complete that request. Check your details and try again."
  );
}

type AuthMode = "sign-in" | "verify-sign-in" | "forgot-email" | "forgot-code" | "forgot-password";

type AuthVariant = "dispatcher" | "worker";

export function AdminSignInPage() {
  return <DispatcherCredentialsPage />;
}

export function WorkerSignInPage() {
  return <AuthPage variant="worker" />;
}

function DispatcherCredentialsPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("hari_babu29@yahoo.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/dispatcher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not sign in to the dispatcher control room.");
      }
      setLocation("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in to the dispatcher control room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,hsl(183_70%_31%/.12),transparent_34%),hsl(40_33%_96%)] p-0 sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1500px] overflow-hidden border border-border/70 bg-card shadow-[0_28px_100px_hsl(213_29%_17%/.14)] sm:rounded-[2rem] lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[hsl(var(--sidebar))] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-24 size-[28rem] rounded-full border border-white/10" />
          <div className="relative">
            <div className="eyebrow text-[hsl(var(--accent))]">Secure operator access</div>
            <h1 className="mt-6 text-5xl font-extrabold leading-[.98] tracking-[-.07em] xl:text-7xl">Keep every task<br /><span className="text-[hsl(var(--accent))]">moving.</span></h1>
            <p className="mt-7 max-w-md text-base leading-8 text-white/65">Publish clear briefs, monitor the open queue, and make thoughtful review decisions from one calm control room.</p>
          </div>
          <div className="relative flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-white/45"><span className="size-2 rounded-full bg-[hsl(var(--accent))]" />Dispatcher control room</div>
        </section>
        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-20">
          <div className="w-full max-w-[540px]">
            <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Back to home</Link>
            <div className="eyebrow text-[hsl(var(--primary))]">Dispatcher sign in</div>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-.06em]">Welcome back, operator.</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Use the private dispatcher credentials provisioned for this workspace.</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block text-sm font-bold">Account email
                <div className="relative mt-2"><Mail className="absolute left-3 top-3.5 text-muted-foreground" size={17} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm outline-none focus:border-[hsl(var(--primary))]" autoComplete="username" /></div>
              </label>
              <label className="block text-sm font-bold">Password
                <div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3.5 text-muted-foreground" size={17} /><input type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm outline-none focus:border-[hsl(var(--primary))]" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3.5 text-muted-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              </label>
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-[hsl(var(--primary))] px-5 py-3.5 text-sm font-extrabold text-white shadow-soft disabled:opacity-60">{busy ? "Signing in…" : "Sign in to control room"} <ArrowRight size={16} className="ml-1 inline" /></button>
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900" role="alert">{error}</div>}
            </form>
            <div className="mt-7 flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground"><ShieldCheck size={17} className="shrink-0 text-[hsl(var(--primary))]" />Dispatcher access is separate from worker accounts and protected by a server-side session.</div>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthPage({ variant }: { variant: AuthVariant }) {
  const isWorker = variant === "worker";
  const destination = isWorker ? "/dashboard" : "/admin";
  const callbackPath = isWorker ? "/worker/sso-callback" : "/admin/sso-callback";
  const accountLabel = isWorker ? "worker" : "dispatcher";
  const copy = isWorker
    ? {
        accessLabel: "Contributor workspace",
        leftTitle: <>Make the model<br /><span className="text-[hsl(var(--accent))]">more human.</span></>,
        leftDescription: "Bring your judgment to language models through thoughtful, flexible work matched to your strengths.",
        leftItems: ["Find work matched to your skills", "Set the hours that work for you", "Track reviews and earnings"],
        title: "Welcome back, contributor.",
        description: "Sign in to see your matched work and current progress.",
        emailPlaceholder: "you@example.com",
        submitLabel: "Sign in to your workbench",
      }
    : {
        accessLabel: "Secure operator access",
        leftTitle: <>Keep every task<br />moving.</>,
        leftDescription: "Publish clear briefs, monitor the open queue, and make thoughtful review decisions from one calm control room.",
        leftItems: ["Publish work to the open queue", "See worker availability at a glance", "Review submissions with context"],
        title: "Welcome back, operator.",
        description: "Sign in with the authorized dispatcher account to open the control room.",
        emailPlaceholder: "operator@example.com",
        submitLabel: "Sign in to control room",
      };

  const { signIn, fetchStatus } = useSignIn();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: passwordError } = await signIn.password({
        identifier: email.trim(),
        password,
      });
      if (passwordError) throw passwordError;

      if (signIn.status !== "complete") {
        const { error: verificationError } = await signIn.emailCode.sendCode();
        if (verificationError) throw verificationError;
        setVerificationCode("");
        setMode("verify-sign-in");
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      setLocation(destination);
    } catch (submissionError) {
      setError(errorMessage(submissionError, !isWorker));
    } finally {
      setBusy(false);
    }
  };

  const verifySignInCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: verificationError } = await signIn.emailCode.verifyCode({
        code: verificationCode.trim(),
      });
      if (verificationError) throw verificationError;

      if (signIn.status !== "complete") {
        setError(`The code was accepted, but Clerk still requires another step before opening the ${isWorker ? "workbench" : "control room"}.`);
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      setLocation(destination);
    } catch (verificationError) {
      setError(errorMessage(verificationError));
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      const { error: ssoError } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${basePath}${destination}`,
        redirectCallbackUrl: `${basePath}${callbackPath}`,
      });
      if (ssoError) throw ssoError;
    } catch (oauthError) {
      setBusy(false);
      setError(errorMessage(oauthError));
    }
  };

  const openPasswordReset = () => {
    setMode("forgot-email");
    setError("");
  };

  const returnToSignIn = () => {
    void signIn.reset();
    setMode("sign-in");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const sendPasswordResetCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      if (createError) throw createError;

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setMode("forgot-code");
    } catch (resetError) {
      setError(errorMessage(resetError, !isWorker));
    } finally {
      setBusy(false);
    }
  };

  const verifyPasswordResetCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({
        code: verificationCode.trim(),
      });
      if (verifyError) throw verifyError;
      setMode("forgot-password");
    } catch (verificationError) {
      setError(errorMessage(verificationError));
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: passwordError } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (passwordError) throw passwordError;

      if (signIn.status !== "complete") {
        setError("Your password was not updated yet. Please try the reset flow again.");
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      setLocation(destination);
    } catch (resetError) {
      setError(errorMessage(resetError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,hsl(183_70%_31%/.12),transparent_36%),hsl(40_38%_99%)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" data-testid="link-admin-auth-logo">
            <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-white shadow-soft">
              <span className="relative block size-4 rounded-[5px] border-2 border-current">
                <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full bg-[hsl(var(--accent))]" />
              </span>
            </span>
            <span className="font-extrabold tracking-[-.04em]">LLM <span className="text-[hsl(var(--accent))]">Network</span></span>
          </Link>
          <Link href="/" className="hidden items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground sm:flex" data-testid="link-admin-auth-back">
            <ArrowLeft size={15} /> Back to home
          </Link>
        </header>

        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_hsl(213_29%_17%/.12)] lg:grid-cols-[.82fr_1.18fr]">
          <section className="relative overflow-hidden bg-[hsl(var(--sidebar))] p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 -left-20 size-72 rounded-full border border-white/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.12)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[hsl(var(--accent))]">
                <ShieldCheck size={14} /> {copy.accessLabel}
              </div>
              <h1 className="mt-8 max-w-md text-4xl font-extrabold leading-[1.04] tracking-[-.06em] sm:text-5xl">
                {copy.leftTitle}
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/60">
                {copy.leftDescription}
              </p>
              <div className="mt-10 space-y-3">
                {copy.leftItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white/80">
                    <span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-7 sm:p-10 lg:p-12">
            <div className="max-w-lg">
              {mode === "sign-in" && (
                <>
                  <div className="eyebrow text-[hsl(var(--primary))]">{isWorker ? "Contributor sign in" : "Dispatcher sign in"}</div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">{copy.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {copy.description}
                  </p>

                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={fetchStatus === "fetching" || busy}
                    data-testid="button-admin-google-sign-in"
                    className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-extrabold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.4)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-white text-base font-black shadow-sm">G</span>
                    Continue with Google
                  </button>

                  <div className="my-7 flex items-center gap-3 text-[11px] font-black uppercase tracking-[.18em] text-muted-foreground/70">
                    <span className="h-px flex-1 bg-border" /> <span>or use email</span> <span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={signInWithPassword} className="space-y-5" data-testid="form-admin-sign-in">
                    <label className="block text-sm font-bold">
                      Email address
                      <span className="relative mt-2 block">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder={copy.emailPlaceholder}
                          autoComplete="email"
                          data-testid="input-admin-email"
                          className="w-full rounded-xl border border-input bg-background py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                        />
                      </span>
                    </label>

                    <label className="block text-sm font-bold">
                      <span className="flex items-center justify-between">
                        <span>Password</span>
                        <button
                          type="button"
                          onClick={openPasswordReset}
                          data-testid="button-admin-forgot-password"
                          className="text-xs font-extrabold text-[hsl(var(--primary))] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </span>
                      <span className="relative mt-2 block">
                        <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          data-testid="input-admin-password"
                          className="w-full rounded-xl border border-input bg-background py-3.5 pl-11 pr-12 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          data-testid="button-toggle-admin-password"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={fetchStatus === "fetching" || busy}
                      data-testid="button-admin-email-sign-in"
                      className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Signing in…" : copy.submitLabel} {!busy && <ArrowRight className="ml-2" size={16} />}
                    </button>
                  </form>
                </>
              )}

              {mode === "forgot-email" && (
                <>
                  <div className="eyebrow text-[hsl(var(--primary))]">Account recovery</div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Reset your password.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Enter the email tied to your {accountLabel} account and we’ll send a one-time reset code.
                  </p>
                   {!isWorker && (
                     <div className="mt-5 rounded-xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] px-4 py-3 text-sm leading-5 text-foreground" role="note" data-testid="status-dispatcher-account-setup">
                       {DISPATCHER_ACCOUNT_SETUP_MESSAGE}
                     </div>
                   )}
                  <form onSubmit={sendPasswordResetCode} className="mt-8 space-y-5" data-testid="form-admin-password-reset-email">
                    <label className="block text-sm font-bold">
                      Account email
                      <span className="relative mt-2 block">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                        <input
                          required
                          autoFocus
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder={copy.emailPlaceholder}
                          autoComplete="email"
                          data-testid="input-admin-reset-email"
                          className="w-full rounded-xl border border-input bg-background py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                        />
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={fetchStatus === "fetching" || busy}
                      data-testid="button-admin-send-reset-code"
                      className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Sending code…" : "Send reset code"}
                    </button>
                    <button type="button" onClick={returnToSignIn} className="flex w-full items-center justify-center gap-2 text-sm font-extrabold text-muted-foreground hover:text-foreground" data-testid="button-admin-back-to-sign-in">
                      <ArrowLeft size={15} /> Back to sign in
                    </button>
                  </form>
                </>
              )}

              {mode === "verify-sign-in" && (
                <>
                  <div className="eyebrow text-[hsl(var(--primary))]">Verify your sign in</div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Check your inbox.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Clerk sent a one-time verification code to <span className="font-bold text-foreground">{email}</span>. Enter it to open the {isWorker ? "workbench" : "control room"}.
                  </p>
                  <form onSubmit={verifySignInCode} className="mt-8 space-y-5" data-testid="form-admin-sign-in-verification">
                    <label className="block text-sm font-bold">
                      Verification code
                      <input
                        required
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        placeholder="Enter the code from your email"
                        data-testid="input-admin-sign-in-verification-code"
                        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm tracking-[.18em] outline-none transition placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={fetchStatus === "fetching" || busy}
                      data-testid="button-admin-verify-sign-in"
                      className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Verifying…" : "Verify and continue"}
                    </button>
                    <button type="button" onClick={returnToSignIn} className="flex w-full items-center justify-center gap-2 text-sm font-extrabold text-muted-foreground hover:text-foreground" data-testid="button-admin-cancel-sign-in-verification">
                      <ArrowLeft size={15} /> Cancel and return to sign in
                    </button>
                  </form>
                </>
              )}

              {mode === "forgot-code" && (
                <>
                  <div className="eyebrow text-[hsl(var(--primary))]">Check your inbox</div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Enter your reset code.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    We sent a verification code to <span className="font-bold text-foreground">{email}</span>.
                  </p>
                  <form onSubmit={verifyPasswordResetCode} className="mt-8 space-y-5" data-testid="form-admin-password-reset-code">
                    <label className="block text-sm font-bold">
                      Verification code
                      <input
                        required
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(event) => setVerificationCode(event.target.value)}
                        placeholder="Enter the code from your email"
                        data-testid="input-admin-reset-code"
                        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm tracking-[.18em] outline-none transition placeholder:tracking-normal placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={fetchStatus === "fetching" || busy}
                      data-testid="button-admin-verify-reset-code"
                      className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Verifying…" : "Verify code"}
                    </button>
                    <button type="button" onClick={returnToSignIn} className="flex w-full items-center justify-center gap-2 text-sm font-extrabold text-muted-foreground hover:text-foreground" data-testid="button-admin-cancel-reset">
                      <ArrowLeft size={15} /> Cancel and return to sign in
                    </button>
                  </form>
                </>
              )}

              {mode === "forgot-password" && (
                <>
                  <div className="eyebrow text-[hsl(var(--primary))]">New password</div>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Choose a new password.</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Set a new password for <span className="font-bold text-foreground">{email}</span>.
                  </p>
                  <form onSubmit={submitNewPassword} className="mt-8 space-y-5" data-testid="form-admin-new-password">
                    <label className="block text-sm font-bold">
                      New password
                      <span className="relative mt-2 block">
                        <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                        <input
                          required
                          minLength={8}
                          autoFocus
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="At least 8 characters"
                          autoComplete="new-password"
                          data-testid="input-admin-new-password"
                          className="w-full rounded-xl border border-input bg-background py-3.5 pl-11 pr-12 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((visible) => !visible)}
                          aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </span>
                    </label>
                    <label className="block text-sm font-bold">
                      Confirm new password
                      <input
                        required
                        minLength={8}
                        type={showNewPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        data-testid="input-admin-confirm-password"
                        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={fetchStatus === "fetching" || busy}
                      data-testid="button-admin-submit-new-password"
                      className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? "Updating password…" : "Update password"}
                    </button>
                  </form>
                </>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-5 text-rose-800" role="alert" data-testid="status-admin-sign-in-error">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-5 text-muted-foreground">
                <LockKeyhole className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" size={15} />
                <span>
                  {isWorker
                    ? "Your account is secured by Clerk. Use the reset link above if you need a new password."
                     : DISPATCHER_ACCOUNT_SETUP_MESSAGE}
                </span>
              </div>
              {isWorker && mode === "sign-in" && (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  New to the network?{" "}
                  <Link href="/sign-up" className="font-extrabold text-[hsl(var(--primary))]" data-testid="link-worker-create-account">
                    Create an account
                  </Link>
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function AdminSSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}

export function WorkerSSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}