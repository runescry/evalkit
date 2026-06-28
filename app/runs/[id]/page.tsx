import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { RunReportView } from '@/components/run-report-view';
import { RunReportSkeleton } from '@/components/run-report-skeleton';
import { getRun } from '@/lib/store';

// export const experimental_ppr = true;  // enable with next.config ppr: 'incremental'

type RunPageProps = {
  params: Promise<{ id: string }>;
};

async function RunData({ id }: { id: string }) {
  const run = await getRun(id);
  if (!run) notFound();
  return <RunReportView initialRun={run} />;
}

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<RunReportSkeleton />}>
      <RunData id={id} />
    </Suspense>
  );
}
