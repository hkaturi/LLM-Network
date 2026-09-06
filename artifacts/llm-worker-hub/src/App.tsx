import { type ReactNode, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, Show, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  getGetWorkerProfileQueryKey,
  getGetWorkerScreeningQueryKey,
  useGetWorkerProfile,
  useGetWorkerScreening,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { AdminSSOCallbackPage, AdminSignInPage, WorkerSignInPage, WorkerSSOCallbackPage } from "@/pages/admin-sign-in";
import { WorkerOnboardingPage } from "@/pages/worker-onboarding";
import { WorkerScreeningPage } from "@/pages/worker-screening";
import {
  DashboardPage,
  LandingPage,
  SettingsPage,
  SubmissionsPage,
  TaskDetailPage,
  TasksPage,
} from '@/pages/workbench-pages';
import { DispatcherPage } from "@/pages/dispatcher-page";
import {
  Route,
  Redirect,
  Switch,
  Router as WouterRouter,
  useLocation,
} from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/worker/sso-callback" component={WorkerSSOCallbackPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/onboarding" component={WorkerOnboardingPage} />
        <Route path="/screening" component={WorkerScreeningPage} />
        <Route path="/dashboard" component={WorkerDashboardRoute} />
        <Route path="/tasks" component={TasksPage} />
        <Route path="/tasks/:taskId" component={TaskDetailPage} />
        <Route path="/submissions" component={SubmissionsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/admin/sso-callback" component={AdminSSOCallbackPage} />
        <Route path="/admin" component={AdminRoute} />
        <Route path="/dispatcher" component={LegacyDispatcherRedirect} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function SignInPage() {
  const dispatcherSignIn = new URLSearchParams(window.location.search).get('dispatcher') === '1';
  if (dispatcherSignIn) {
    return <AdminSignInPage />;
  }

  return <WorkerSignInPage />;
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_right,hsl(183_70%_31%/.12),transparent_34%),hsl(40_33%_96%)] px-4">
        <div className="w-full max-w-md animate-pulse rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-[0_24px_80px_hsl(213_29%_17%/.12)]">
          <div className="mx-auto h-11 w-32 rounded-xl bg-muted" />
          <div className="mx-auto mt-8 h-7 w-56 rounded-lg bg-muted" />
          <div className="mx-auto mt-3 h-4 w-72 rounded-lg bg-muted/80" />
          <div className="mt-10 h-12 rounded-xl bg-muted" />
          <div className="my-8 h-px bg-border" />
          <div className="space-y-4">
            <div className="h-12 rounded-xl bg-muted" />
            <div className="h-12 rounded-xl bg-muted" />
            <div className="h-12 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,hsl(183_70%_31%/.12),transparent_34%),hsl(40_33%_96%)] p-0 sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1500px] overflow-hidden border border-border/70 bg-card shadow-[0_28px_100px_hsl(213_29%_17%/.14)] sm:rounded-[2rem] lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[hsl(var(--sidebar))] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
          <div className="absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-36 -left-24 size-[28rem] rounded-full border border-white/10" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(hsl(40_33%_96%/.1)_1px,transparent_1px),linear-gradient(90deg,hsl(40_33%_96%/.1)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-white shadow-[0_12px_30px_hsl(var(--primary)/.25)]">
                <span className="relative block size-5 rounded-[6px] border-2 border-current">
                  <span className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full bg-[hsl(var(--accent))]" />
                </span>
              </span>
              <span className="text-lg font-extrabold tracking-[-.04em]">LLM <span className="text-[hsl(var(--accent))]">Network</span></span>
            </div>

            <div className="mt-24 max-w-lg xl:mt-32">
              <div className="eyebrow text-[hsl(var(--accent))]">Worker network / 01</div>
              <h1 className="mt-6 text-5xl font-extrabold leading-[.98] tracking-[-.07em] xl:text-7xl">
                Your judgment<br />
                <span className="text-[hsl(var(--accent))]">is the signal.</span>
              </h1>
              <p className="mt-7 max-w-md text-base leading-8 text-white/65">
                Join a thoughtful network helping make language models more useful, accurate, and human.
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-white/45">
            <span className="size-2 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_0_6px_hsl(var(--accent)/.12)]" />
            Flexible work · meaningful signal
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-20">
          <div className="w-full max-w-[540px]">
            <div className="mb-7 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-white">
                  <span className="relative block size-4 rounded-[5px] border-2 border-current">
                    <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full bg-[hsl(var(--accent))]" />
                  </span>
                </span>
                <span className="font-extrabold tracking-[-.04em]">LLM <span className="text-[hsl(var(--accent))]">Network</span></span>
              </div>
              <span className="eyebrow text-muted-foreground">Join the network</span>
            </div>

            <div className="mb-7 hidden items-center gap-3 lg:flex">
              <span className="eyebrow text-[hsl(var(--primary))]">Create your contributor profile</span>
              <span className="h-px flex-1 bg-border" />
              <span className="size-2 rounded-full bg-[hsl(var(--accent))]" />
            </div>

            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
              forceRedirectUrl={`${basePath}/onboarding`}
              fallbackRedirectUrl={`${basePath}/onboarding`}
            />

            <p className="mx-auto mt-6 max-w-md text-center text-xs leading-5 text-muted-foreground">
              Create one account, then tell us about your skills and availability so we can match you with the right work.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkerDashboardRoute() {
  const { isLoaded, user } = useUser();
  const profileQuery = useGetWorkerProfile({
    query: {
      enabled: isLoaded && Boolean(user),
      queryKey: getGetWorkerProfileQueryKey(),
    },
  });
  const screeningQuery = useGetWorkerScreening({
    query: {
      enabled: isLoaded && Boolean(user) && (profileQuery.data?.onboardingProgress ?? 0) >= 100,
      queryKey: getGetWorkerScreeningQueryKey(),
    },
  });

  if (!isLoaded) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Preparing your workbench…</div>;
  }

  if (!user) {
    return <Redirect to="/sign-in" />;
  }

  if (profileQuery.isLoading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Checking your profile…</div>;
  }

  if (profileQuery.data && ((profileQuery.data.onboardingProgress ?? 0) < 100 || !profileQuery.data.internshipTermsAccepted)) {
    return <Redirect to="/onboarding" />;
  }

  if (screeningQuery.isLoading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Checking your screening…</div>;
  }

  if (screeningQuery.data?.status === 'pending' || screeningQuery.data?.status === 'rejected') {
    return <Redirect to="/screening" />;
  }

  return <DashboardPage />;
}

function AdminRoute() {
  const [state, setState] = useState<"loading" | "authenticated" | "signed-out">("loading");

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/dispatcher/session", { credentials: "include" })
      .then((response) => response.json() as Promise<{ authenticated?: boolean }>)
      .then((payload) => {
        if (active) setState(payload.authenticated ? "authenticated" : "signed-out");
      })
      .catch(() => {
        if (active) setState("signed-out");
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background px-6 text-sm font-semibold text-muted-foreground">
        Checking dispatcher access…
      </div>
    );
  }

  if (state === "signed-out") {
    return <Redirect to="/sign-in?dispatcher=1" />;
  }

  return <DispatcherPage />;
}

function LegacyDispatcherRedirect() {
  return <Redirect to="/admin" />;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [, setLocation] = useLocation();
  return (
    <WouterRouter base={basePath}>
      <ClerkProvider
        publishableKey={clerkPubKey}
        proxyUrl={clerkProxyUrl}
        appearance={{
          theme: shadcn,
          cssLayerName: 'clerk',
          options: {
            logoPlacement: 'inside',
            logoLinkUrl: basePath || '/',
            logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
          },
          variables: {
            colorPrimary: 'hsl(183 70% 31%)',
            colorForeground: 'hsl(213 29% 17%)',
            colorMutedForeground: 'hsl(213 12% 43%)',
            colorBackground: 'hsl(40 38% 99%)',
            colorInput: 'hsl(40 33% 96%)',
            colorInputForeground: 'hsl(213 29% 17%)',
            colorNeutral: 'hsl(34 19% 84%)',
            fontFamily: 'Manrope, sans-serif',
            borderRadius: '0.75rem',
          },
          elements: {
            rootBox: 'w-full flex justify-center',
            cardBox: 'bg-card/95 rounded-[2rem] w-full max-w-[540px] overflow-hidden border border-border/80 shadow-[0_24px_70px_hsl(213_29%_17%/.1)]',
            card: '!shadow-none !border-0 !bg-transparent !p-7 sm:!p-9',
            header: '!space-y-2',
            logoBox: 'h-11 mb-5',
            logoImage: 'max-h-11',
            headerTitle: 'text-foreground font-extrabold tracking-[-.045em] text-3xl',
            headerSubtitle: 'text-muted-foreground text-sm leading-6',
            socialButtonsBlockButton: '!h-12 !rounded-xl !border-border/90 !bg-background !font-extrabold !shadow-none hover:!border-[hsl(var(--primary)/.45)] hover:!bg-[hsl(var(--primary)/.05)]',
            socialButtonsBlockButtonText: '!text-foreground !font-extrabold',
            socialButtonsProviderIcon: '!size-5',
            dividerRow: '!my-7',
            dividerLine: '!bg-border',
            dividerText: '!px-3 !text-[10px] !font-black !uppercase !tracking-[.16em] !text-muted-foreground',
            formFieldRow: '!gap-2',
            formFieldLabel: '!text-sm !font-extrabold !text-foreground',
            formFieldInput: '!h-12 !rounded-xl !border-border/90 !bg-background !text-foreground !shadow-none focus:!border-[hsl(var(--primary))] focus:!ring-4 focus:!ring-[hsl(var(--primary)/.12)]',
            formButtonPrimary: '!mt-2 !h-12 !rounded-xl !bg-[hsl(var(--primary))] !font-extrabold !text-white !shadow-[0_10px_24px_hsl(var(--primary)/.2)] hover:!bg-[hsl(var(--primary)/.9)] hover:!-translate-y-0.5',
            footer: '!mt-7 !border-0 !bg-transparent !shadow-none',
            footerActionLink: '!font-extrabold !text-[hsl(var(--primary))]',
            footerActionText: 'text-muted-foreground',
            main: '!bg-transparent',
            alert: '!rounded-xl !border !border-rose-200 !bg-rose-50 !text-rose-900',
          },
        }}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        routerPush={(to) => setLocation(stripBase(to))}
        routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
        localization={{
          signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to access your workbench' } },
          signUp: { start: { title: 'Join the network', subtitle: 'Create your contributor profile' } },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ClerkQueryClientCacheInvalidator />
            <Router />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </WouterRouter>
  );
}

export default App;
