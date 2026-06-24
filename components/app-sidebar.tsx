'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, Home, Network } from 'lucide-react';
import { SidebarRunsList } from '@/components/sidebar-runs-list';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'New eval', icon: Home },
  { href: '/architecture', label: 'Architecture', icon: Network },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <FlaskConical className="size-4" aria-hidden />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-tight">EvalKit</span>
        </Link>
      </div>

      <nav className="shrink-0 space-y-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                active
                  ? 'bg-primary/12 font-medium text-foreground ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <SidebarRunsList />

      <div className="shrink-0 border-t border-border p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pipeline
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Generate → sandbox → score → report → fixes
        </p>
      </div>
    </aside>
  );
}
