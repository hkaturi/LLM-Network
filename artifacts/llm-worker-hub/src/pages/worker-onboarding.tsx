import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  MapPin,
  Phone,
  Plus,
  ScrollText,
  UserRound,
  X,
} from "lucide-react";
import { Link, Redirect, useLocation } from "wouter";
import {
  getGetWorkerProfileQueryKey,
  useGetWorkerProfile,
  useUpdateWorkerProfile,
} from "@workspace/api-client-react";
import { Logo } from "@/components/workbench";

type FormState = {
  name: string;
  city: string;
  country: string;
  phoneNumber: string;
  email: string;
  education: string;
  yearOfPass: string;
  gpa: string;
  skills: string[];
  internshipTermsAccepted: boolean;
};

const emptyForm: FormState = {
  name: "",
  city: "",
  country: "",
  phoneNumber: "",
  email: "",
  education: "",
  yearOfPass: "",
  gpa: "",
  skills: [],
  internshipTermsAccepted: false,
};

function inputClassName() {
  return "mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]";
}

export function WorkerOnboardingPage() {
  const { isLoaded, user } = useUser();
  const [, setLocation] = useLocation();
  const profileQuery = useGetWorkerProfile({
    query: {
      enabled: isLoaded && Boolean(user),
      queryKey: getGetWorkerProfileQueryKey(),
    },
  });
  const update = useUpdateWorkerProfile();
  const initialized = useRef(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [skillDraft, setSkillDraft] = useState("");
  const [error, setError] = useState("");
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!profileQuery.data || initialized.current) return;
    initialized.current = true;
    const profileName = profileQuery.data.name?.trim() || "";
    const profileEmail = profileQuery.data.email?.trim() || "";
    const clerkName = user?.fullName?.trim() || "";
    const clerkEmail = user?.primaryEmailAddress?.emailAddress?.trim() || "";

    setForm({
      name: profileName && profileName !== "New contributor" ? profileName : clerkName,
      city: profileQuery.data.city ?? "",
      country: profileQuery.data.country ?? "",
      phoneNumber: profileQuery.data.phoneNumber ?? "",
      email: profileEmail && profileEmail !== "contributor@example.com" ? profileEmail : clerkEmail,
      education: profileQuery.data.education ?? "",
      yearOfPass: profileQuery.data.yearOfPass ? String(profileQuery.data.yearOfPass) : "",
      gpa: profileQuery.data.gpa ?? "",
      skills: profileQuery.data.skills ?? [],
      internshipTermsAccepted: profileQuery.data.internshipTermsAccepted ?? false,
    });
  }, [profileQuery.data, user]);

  if (!isLoaded) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Preparing your profile…</div>;
  }

  if (!user) {
    return <Redirect to="/sign-up" />;
  }

  if (profileQuery.isLoading) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm font-semibold text-muted-foreground">Loading your profile…</div>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background px-5 text-center"><div><p className="text-sm font-semibold text-rose-700">We could not load your profile.</p><Link href="/dashboard" className="mt-4 inline-flex font-bold text-[hsl(var(--primary))]">Continue to dashboard <ArrowRight className="ml-1" size={15} /></Link></div></div>;
  }

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addSkill = (event?: FormEvent) => {
    event?.preventDefault();
    const skill = skillDraft.trim();
    if (!skill || form.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    setForm((current) => ({ ...current, skills: [...current.skills, skill] }));
    setSkillDraft("");
  };

  const removeSkill = (skill: string) => {
    setForm((current) => ({ ...current, skills: current.skills.filter((item) => item !== skill) }));
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.skills.length === 0) {
      setError("Add at least one skill so we can match you with relevant work.");
      return;
    }
    if (!form.internshipTermsAccepted) {
      setError("Please review and accept the Cognifuse internship terms before completing onboarding.");
      return;
    }
    const year = Number(form.yearOfPass);
    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 10) {
      setError("Enter a valid year of passing.");
      return;
    }

    setError("");
    update.mutate(
      {
        data: {
          name: form.name.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
          phoneNumber: form.phoneNumber.trim(),
          education: form.education.trim(),
          yearOfPass: year,
          gpa: form.gpa.trim(),
          skills: form.skills,
          onboardingProgress: 100,
           internshipTermsAccepted: form.internshipTermsAccepted,
        },
      },
      {
        onSuccess: async () => {
          await profileQuery.refetch();
          setLocation("/screening");
        },
        onError: () => setError("We could not save your profile. Please try again."),
      },
    );
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,hsl(183_70%_31%/.12),transparent_36%),hsl(40_38%_99%)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <Logo />
          <Link href="/" className="hidden items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground sm:flex">
            <ChevronLeft size={15} /> Back to home
          </Link>
        </header>

        <div className="grid overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_24px_80px_hsl(213_29%_17%/.12)] lg:grid-cols-[.72fr_1.28fr]">
          <section className="relative overflow-hidden bg-[hsl(var(--sidebar))] p-7 text-white sm:p-10 lg:p-12">
            <div className="absolute -right-20 -top-20 size-64 rounded-full border border-white/10" />
            <div className="absolute -bottom-28 -left-20 size-72 rounded-full border border-white/10" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.12)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[.16em] text-[hsl(var(--accent))]">
                <UserRound size={14} /> Your contributor profile
              </div>
              <h1 className="mt-8 max-w-md text-4xl font-extrabold leading-[1.04] tracking-[-.06em] sm:text-5xl">
                Help us find<br /><span className="text-[hsl(var(--accent))]">your best fit.</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/60">
                A little context helps us send you work that matches your experience, interests, and goals.
              </p>
              <div className="mt-10 space-y-3 text-sm font-semibold text-white/80">
                {["Your details stay with your worker profile", "Skills shape the tasks you see", "You can update this information later"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Check size={14} strokeWidth={3} /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-7 sm:p-10 lg:p-12">
            <div className="max-w-2xl">
              <div className="eyebrow text-[hsl(var(--primary))]">Step 1 of 1 · Worker onboarding</div>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.055em] sm:text-4xl">Tell us about yourself.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Complete your profile so we can match you with meaningful work.</p>

              <form onSubmit={saveProfile} className="mt-8 space-y-7" data-testid="form-worker-onboarding">
                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-extrabold"><UserRound size={17} className="text-[hsl(var(--primary))]" /> Personal details</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold sm:col-span-2">Full name<input required value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Your full name" data-testid="input-onboarding-full-name" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold">City<input required value={form.city} onChange={(event) => setField("city", event.target.value)} placeholder="e.g. New York" data-testid="input-onboarding-city" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold">Country<input required value={form.country} onChange={(event) => setField("country", event.target.value)} placeholder="e.g. United States" data-testid="input-onboarding-country" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold"><span className="flex items-center gap-2">Phone number <Phone size={14} className="text-muted-foreground" /></span><input required type="tel" value={form.phoneNumber} onChange={(event) => setField("phoneNumber", event.target.value)} placeholder="+1 555 123 4567" autoComplete="tel" data-testid="input-onboarding-phone" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold"><span className="flex items-center gap-2">Email address <span className="text-[11px] font-semibold text-muted-foreground">(from Clerk)</span></span><input required type="email" readOnly value={form.email || user.primaryEmailAddress?.emailAddress || ""} data-testid="input-onboarding-email" className={`${inputClassName()} cursor-not-allowed bg-muted/60`} /></label>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-extrabold"><GraduationCap size={17} className="text-[hsl(var(--primary))]" /> Education</div>
                  <div className="grid gap-4 sm:grid-cols-[1.4fr_.8fr_.8fr]">
                    <label className="block text-sm font-bold">Education<input required value={form.education} onChange={(event) => setField("education", event.target.value)} placeholder="Degree, school, or field of study" data-testid="input-onboarding-education" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold">Year of pass<input required type="number" min="1950" max={new Date().getFullYear() + 10} value={form.yearOfPass} onChange={(event) => setField("yearOfPass", event.target.value)} placeholder="2024" data-testid="input-onboarding-year" className={inputClassName()} /></label>
                    <label className="block text-sm font-bold">GPA<input required value={form.gpa} onChange={(event) => setField("gpa", event.target.value)} placeholder="3.8 / 4.0" data-testid="input-onboarding-gpa" className={inputClassName()} /></label>
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-extrabold"><MapPin size={17} className="text-[hsl(var(--primary))]" /> Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary)/.09)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))]">{skill}<button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`} data-testid={`button-remove-skill-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="rounded-full hover:bg-[hsl(var(--primary)/.12)]"><X size={13} /></button></span>)}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addSkill(event); }} placeholder="Add a skill, e.g. Research" data-testid="input-onboarding-skill" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.12)]" />
                    <button type="button" onClick={() => addSkill()} data-testid="button-onboarding-add-skill" className="shrink-0 rounded-xl border border-border px-4 text-sm font-extrabold text-[hsl(var(--primary))] hover:bg-muted"><Plus size={17} /></button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Add as many skills as you like. These guide your task matches.</p>
                </section>

                <section className="rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.04)] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <ScrollText size={19} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-extrabold">Cognifuse internship offer terms</div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">AI/ML Engineer · Remote · Flexible schedule · Unpaid</p>
                        </div>
                        <button type="button" onClick={() => setShowTerms((visible) => !visible)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-extrabold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.08)]" aria-expanded={showTerms} data-testid="button-toggle-internship-terms">
                          {showTerms ? "Hide terms" : "Review terms"} {showTerms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                      {showTerms && (
                        <div className="mt-4 space-y-3 border-t border-[hsl(var(--primary)/.15)] pt-4 text-xs leading-5 text-muted-foreground" data-testid="panel-internship-terms">
                          <p><strong className="text-foreground">Responsibilities and conduct.</strong> During the internship, you will perform assignments related to your role, follow workplace policies, maintain professional conduct, protect confidential information, and complete assigned work to the best of your ability.</p>
                          <p><strong className="text-foreground">Nature of internship.</strong> This internship is temporary and does not guarantee continued employment or a future position. Either party may end the internship at any time.</p>
                          <p><strong className="text-foreground">Conditions.</strong> This offer is contingent upon completion of any required documentation, verification, background screening, work authorization, or academic approval applicable to the internship.</p>
                        </div>
                      )}
                      <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-[hsl(var(--primary)/.15)] pt-4 text-sm font-semibold leading-5">
                        <input type="checkbox" checked={form.internshipTermsAccepted} onChange={(event) => setForm((current) => ({ ...current, internshipTermsAccepted: event.target.checked }))} className="mt-1 size-4 shrink-0 accent-[hsl(var(--primary))]" data-testid="checkbox-accept-internship-terms" />
                        <span>I have reviewed and accept the Cognifuse internship offer terms outlined above, including the unpaid, temporary nature of the internship.</span>
                      </label>
                    </div>
                  </div>
                </section>

                {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-5 text-rose-800" role="alert" data-testid="status-onboarding-error">{error}</div>}
                <button type="submit" disabled={update.isPending} data-testid="button-submit-onboarding" className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3.5 text-sm font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[hsl(var(--primary)/.92)] disabled:cursor-not-allowed disabled:opacity-60">
                  {update.isPending ? "Saving profile…" : "Complete my profile"} {!update.isPending && <ArrowRight className="ml-2" size={16} />}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}