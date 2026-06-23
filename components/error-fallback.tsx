'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ErrorFallbackProps = {
  title?: string;
  description?: string;
  reset?: () => void;
  showHomeLink?: boolean;
};

export function ErrorFallback({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. You can try again or return to the home page.',
  reset,
  showHomeLink = false,
}: ErrorFallbackProps) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If the problem persists, check your environment configuration and try starting a new
            eval run.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {reset ? (
            <Button type="button" onClick={() => reset()}>
              Try again
            </Button>
          ) : null}
          {showHomeLink ? (
            <Link href="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          ) : null}
        </CardFooter>
      </Card>
    </main>
  );
}
