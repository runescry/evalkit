'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-full antialiased">
        <ErrorFallback
          title="EvalKit is unavailable"
          description="A critical error prevented the app from loading. Try refreshing the page."
          reset={reset}
        />
      </body>
    </html>
  );
}
