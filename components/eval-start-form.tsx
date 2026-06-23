'use client';

import { useActionState, useRef } from 'react';
import { createRunAction, type CreateRunFormState } from '@/app/actions/create-run';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

const initialState: CreateRunFormState = {};

export function EvalStartForm() {
  const [state, formAction, pending] = useActionState(createRunAction, initialState);
  const caseCountRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Start eval</CardTitle>
        <CardDescription>
          Paste your chatbot URL and a short description. The case count field works without
          JavaScript; the slider enhances it when available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Target URL
            </label>
            <Input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://your-app.com/chat"
              autoComplete="url"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              App description
            </label>
            <Textarea
              id="description"
              name="description"
              required
              rows={4}
              placeholder="What should this bot do? What must it refuse?"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="caseCount" className="text-sm font-medium">
              Test cases
            </label>
            <Slider
              className="hidden sm:block"
              min={1}
              max={50}
              defaultValue={[10]}
              onValueChange={(values) => {
                const next = Array.isArray(values) ? values[0] : values;
                if (caseCountRef.current && typeof next === 'number') {
                  caseCountRef.current.value = String(next);
                }
              }}
              aria-label="Test case count"
            />
            <Input
              ref={caseCountRef}
              id="caseCount"
              name="caseCount"
              type="number"
              min={1}
              max={50}
              defaultValue={10}
              required
            />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? 'Starting…' : 'Run eval'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
