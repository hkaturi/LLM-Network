import { type ComponentType, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  FileCheck2,
  House,
  Layers3,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sparkles,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { useState } from 'react';

type IconType = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
      <span className={`grid size-9 place-items-center rounded-xl ${inverse ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'}`}>
        <span className="relative block size-4 rounded-[5px] border-2 border-current">
          <span className="absolute -right-1.5 -top-1.5 size-2 rounded-full bg-current" />
        </span>
      </span>
      <span className={`font-extrabold tracking-[-.04em] ${inverse ? 'text-white' : ''}`}>LLM <span className="text-[hsl(var(--accent))]">Network</span></span>
    </Link>
  );
}

const navItems: { href: string; label: string; icon: IconType }[] = [
  { href: '/dashboard', label: 'Overview', icon: House },
  { href: '/tasks', label: 'Task feed', icon: Layers3 },
  { href: '/submissions', label: 'Submissions', icon: FileCheck2 },
];

export function AppShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const dispatcherLink = { href: '/admin', label: 'Dispatcher', icon: BarChart3 };
  const links = admin ? [dispatcherLink, ...navItems] : navItems;
  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark', !dark);
  };
  const handleSignOut = async () => {
    if (admin) {
      await fetch('/api/auth/dispatcher/logout', { method: 'POST', credentials: 'include' });
      setLocation('/sign-in?dispatcher=1');
      return;
    }
    await signOut();
    setLocation('/');
  };
  return (
    <div className="app-noise min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 flex items-center justify-between"><Logo inverse /><button className="lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-nav"><X size={18} /></button></div>
        <div className="eyebrow mb-3 px-3 text-white/40">{admin ? 'Operations' : 'Workspace'}</div>
        <nav className="space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${location === href || (href !== '/dashboard' && location.startsWith(href)) ? 'bg-[hsl(var(--sidebar-accent))] text-white' : label === 'Dispatcher' ? 'border border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.12)] text-white hover:bg-[hsl(var(--accent)/.2)]' : 'text-white/60 hover:bg-white/7 hover:text-white'}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{href === '/tasks' && <span className="ml-auto rounded-full bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[10px] font-extrabold text-[hsl(var(--accent-foreground))]">12</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-5">
          <Link href="/settings" data-testid="link-nav-settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/7 hover:text-white"><Settings2 size={17} /><span>Settings</span></Link>
          {admin && <Link href="/admin" data-testid="link-admin-review" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/7 hover:text-white"><Target size={17} /><span>Review queue</span></Link>}
          <button onClick={toggleTheme} data-testid="button-toggle-theme" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/60 hover:bg-white/7 hover:text-white">{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Light mode' : 'Dim interface'}</span></button>
          <button onClick={handleSignOut} data-testid="link-sign-out" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white/60 hover:bg-white/7 hover:text-white"><LogOut size={17} /><span>Sign out</span></button>
        </div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="mb-2 flex items-center gap-2"><span className="size-2 rounded-full bg-[hsl(var(--accent))]" /><span className="eyebrow text-white/50">System healthy</span></div>
          <p className="text-xs leading-relaxed text-white/50">Matching is tuned to your current skills and hours.</p>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-overlay" />}
      <main className="min-h-[100dvh] lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8">
          <button className="rounded-lg p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-nav"><Menu size={20} /></button>
          <div className="hidden text-sm text-muted-foreground sm:block">{admin ? 'Operator desk / ' : 'Your workbench / '}<span className="text-foreground">{location === '/dashboard' ? 'Overview' : location.slice(1) || 'Home'}</span></div>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/submissions" className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="link-activity"><Activity size={19} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[hsl(var(--accent))]" /></Link>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

export function PublicNav() {
  return <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Logo /><div className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex"><a href="#how-it-works" data-testid="link-how-it-works">How it works</a><a href="#fairness" data-testid="link-fairness">Fair matching</a><a href="#support" data-testid="link-support">Support</a></div><div className="flex items-center gap-2 sm:gap-3"><Link href="/sign-in" data-testid="link-public-sign-in" className="hidden px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground sm:block">Sign in</Link><Link href="/sign-up" data-testid="link-public-sign-up" className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-soft hover:-translate-y-0.5 hover:bg-[hsl(var(--primary)/.9)]">Join the network <ArrowRight className="ml-1 inline" size={15} /></Link></div></header>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow mb-3 text-[hsl(var(--primary))]">{eyebrow}</div><h1 className="max-w-3xl text-3xl font-extrabold tracking-[-.045em] sm:text-[2.65rem]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = { available: 'bg-teal-50 text-teal-800 border-teal-200', claimed: 'bg-amber-50 text-amber-800 border-amber-200', submitted: 'bg-sky-50 text-sky-800 border-sky-200', approved: 'bg-emerald-50 text-emerald-800 border-emerald-200', rejected: 'bg-rose-50 text-rose-800 border-rose-200', pending: 'bg-amber-50 text-amber-800 border-amber-200', active: 'bg-emerald-50 text-emerald-800 border-emerald-200', away: 'bg-slate-100 text-slate-600 border-slate-200' };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${map[status] ?? 'bg-muted text-muted-foreground border-border'}`} data-testid={`status-${status}`}>{status.replace('_', ' ')}</span>;
}

export function LoadingBlock({ lines = 4 }: { lines?: number }) {
  return <div className="space-y-3 animate-pulse" data-testid="loading-state">{Array.from({ length: lines }).map((_, i) => <div key={i} className={`h-12 rounded-xl bg-muted ${i === 0 ? 'w-2/3' : i === lines - 1 ? 'w-1/2' : 'w-full'}`} />)}</div>;
}

export function ErrorBlock({ message = 'We could not load this view.' }: { message?: string }) {
  return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900" data-testid="error-state"><div className="mb-1 flex items-center gap-2 font-bold"><X size={16} /> Connection interrupted</div><p className="text-sm text-rose-800/80">{message} Try again in a moment.</p></div>;
}

export function EmptyBlock({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center" data-testid="empty-state"><div><div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><Sparkles size={18} /></div><h3 className="font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

export function StatCard({ label, value, detail, icon: Icon, tint = 'teal' }: { label: string; value: string | number; detail: string; icon: IconType; tint?: 'teal' | 'orange' | 'blue' | 'ink' }) {
  const colors = { teal: 'bg-teal-50 text-teal-800', orange: 'bg-orange-50 text-orange-800', blue: 'bg-sky-50 text-sky-800', ink: 'bg-slate-100 text-slate-700' };
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-soft" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><span className={`grid size-9 place-items-center rounded-xl ${colors[tint]}`}><Icon size={17} /></span><span className="eyebrow text-muted-foreground">live</span></div><div className="mt-6 text-3xl font-extrabold tracking-[-.05em]">{value}</div><div className="mt-1 text-sm font-bold">{label}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>;
}

export function TaskCard({ task, onClaim }: { task: { id: string; title: string; description: string; category: string; difficulty: string; estimatedMinutes: number; payout: number; requiredSkills: string[]; dueAt?: string | null; status: string }; onClaim?: () => void }) {
  return <div className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.45)] hover:shadow-lg" data-testid={`card-task-${task.id}`}><div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="eyebrow text-[hsl(var(--primary))]">{task.category}</span><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold capitalize text-muted-foreground">{task.difficulty}</span></div><span className="font-mono text-lg font-medium text-[hsl(var(--primary))]">${task.payout.toFixed(2)}</span></div><Link href={`/tasks/${task.id}`} data-testid={`link-task-${task.id}`} className="mt-4 block"><h3 className="text-lg font-extrabold tracking-[-.03em] group-hover:text-[hsl(var(--primary))]">{task.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{task.description}</p></Link><div className="mt-5 flex flex-wrap gap-1.5">{task.requiredSkills.slice(0, 3).map((skill) => <span key={skill} className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">{skill}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 size={14} />{task.estimatedMinutes} min</span>{onClaim ? <button onClick={onClaim} data-testid={`button-claim-${task.id}`} className="rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:-translate-y-0.5">Claim task <ArrowRight className="ml-1 inline" size={13} /></button> : <span className="font-semibold">{task.status}</span>}</div></div>;
}

export function CheckLine({ children, done }: { children: ReactNode; done?: boolean }) {
  return <div className="flex items-center gap-3 text-sm"><span className={`grid size-5 place-items-center rounded-full ${done ? 'bg-[hsl(var(--primary))] text-white' : 'border border-border text-transparent'}`}><Check size={12} strokeWidth={3} /></span><span className={done ? 'text-foreground' : 'text-muted-foreground'}>{children}</span></div>;
}

export function MiniIcon({ icon: Icon }: { icon: IconType }) {
  return <span className="grid size-8 place-items-center rounded-lg bg-muted text-[hsl(var(--primary))]"><Icon size={15} /></span>;
}