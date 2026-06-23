'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

export default function Error({
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
      title="EvalKit hit a snag"
      description="We could not load this page. Your eval runs are still stored — try again in a moment."
      reset={reset}
      showHomeLink
    />
  );
}
