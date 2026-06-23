import { EvalStartForm } from '@/components/eval-start-form';
import { RecentRuns } from '@/components/recent-runs';
import { listRuns } from '@/lib/store';

export default async function Home() {
  const runs = await listRuns(8);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">EvalKit</h1>
        <p className="text-muted-foreground">
          AI eval harness for deployed chatbots — targeted tests, sandbox execution, rubric scoring,
          and human-approved prompt fixes.
        </p>
      </header>

      <EvalStartForm />
      <RecentRuns runs={runs} />
    </main>
  );
}
