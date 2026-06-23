'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

export default function RunError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorFallback
      title="Could not load this run"
      description="The report may still be processing, or the run ID may be invalid. Try again or start a new eval."
      reset={reset}
      showHomeLink
    />
  );
}
