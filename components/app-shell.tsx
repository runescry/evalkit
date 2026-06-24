import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground md:flex-row">
      <div className="flex h-12 shrink-0 items-center border-b border-border bg-card px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <FlaskConical className="size-4" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">EvalKit</span>
        </Link>
      </div>
      <AppSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
