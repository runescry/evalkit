import { EvalStartForm } from '@/components/eval-start-form';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <>
      <PageHeader
        title="Run an eval"
        description="Paste a chatbot URL and description — EvalKit generates adversarial cases, runs them in sandbox isolation, scores against a rubric, and streams a report."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <EvalStartForm />
      </div>
    </>
  );
}
