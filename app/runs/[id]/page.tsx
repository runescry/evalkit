import { notFound } from 'next/navigation';
import { RunReportView } from '@/components/run-report-view';
import { getRun } from '@/lib/store';

type RunPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;
  const run = await getRun(id);

  if (!run) {
    notFound();
  }

  return <RunReportView initialRun={run} />;
}
