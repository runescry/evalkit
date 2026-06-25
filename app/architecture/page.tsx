import { ArchitectureDiagram } from '@/components/architecture-diagram';
import { PageHeader } from '@/components/page-header';

export const metadata = {
  title: 'Architecture — EvalKit',
  description:
    'Interactive backend map for interviews — system overview diagram, Fluid Compute, AI Gateway, workflow, sandbox, KV, and code paths',
};

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        title="Architecture"
        description="High-level system diagram, workflow step-by-step (what + infrastructure + KV), backend map for interviews, pipeline tradeoffs, and ADRs."
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <ArchitectureDiagram />
      </div>
    </>
  );
}
