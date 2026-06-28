import { cache } from 'react';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { RunReportView } from '@/components/run-report-view';
import { RunReportSkeleton } from '@/components/run-report-skeleton';
import { getRun } from '@/lib/store';

// export const experimental_ppr = true;  // enable with next.config ppr: 'incremental'

// Deduplicate KV fetch across the existence check and the Suspense boundary
const getCachedRun = cache(getRun);

type RunPageProps = {
  params: Promise<{ id: string }>;
};

async function RunData({ id }: { id: string }) {
  const run = await getCachedRun(id);
  if (!run) notFound();
  return <RunReportView initialRun={run} />;
}

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;
  // Check existence before streaming begins so notFound() sets a 404 status
  // before response headers are flushed.
  const run = await getCachedRun(id);
  if (!run) notFound();

  return (
    <Suspense fallback={<RunReportSkeleton />}>
      <RunData id={id} />
    </Suspense>
  );
}
