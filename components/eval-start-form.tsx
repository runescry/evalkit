'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Grid3x3, Loader2, Sparkles } from 'lucide-react';
import {
  createRunAction,
  startPresetRunAction,
  type CreateRunFormState,
} from '@/app/actions/create-run';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { AIDEA_AGENT_MATRIX_PILOT, AIDEA_CO_DEMO } from '@/lib/demo-presets';

const initialState: CreateRunFormState = {};

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export function EvalStartForm() {
  const [state, formAction, pending] = useActionState(createRunAction, initialState);
  const [presetState, presetAction, presetPending] = useActionState(
    startPresetRunAction,
    initialState,
  );
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [caseCount, setCaseCount] = useState(10);
  const [generationMode, setGenerationMode] = useState<'standard' | 'adversarial'>('standard');
  const [scoringMode, setScoringMode] = useState<'dual' | 'strong' | 'multi-vendor'>('dual');
  const [openaiHealthy, setOpenaiHealthy] = useState<boolean | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const caseCountRef = useRef<HTMLInputElement>(null);

  function syncCaseCountRef(next: number) {
    if (caseCountRef.current) {
      caseCountRef.current.value = String(next);
    }
  }

  function applyAideaDemo() {
    setUrl(AIDEA_CO_DEMO.url);
    setDescription(AIDEA_CO_DEMO.description);
    setCaseCount(AIDEA_CO_DEMO.caseCount);
    setGenerationMode(AIDEA_CO_DEMO.generationMode);
    setScoringMode(AIDEA_CO_DEMO.scoringMode);
    syncCaseCountRef(AIDEA_CO_DEMO.caseCount);
    urlRef.current?.focus();
  }

  function applyAgentMatrixPilot() {
    setCaseCount(AIDEA_AGENT_MATRIX_PILOT.defaultCaseCount);
    setGenerationMode('adversarial');
    setScoringMode('dual');
    syncCaseCountRef(AIDEA_AGENT_MATRIX_PILOT.defaultCaseCount);
  }

  useEffect(() => {
    void fetch('/api/health')
      .then((response) => response.json())
      .then((body: { tiers?: Array<{ tier: string; ok: boolean }> }) => {
        const openai = body.tiers?.find((tier) => tier.tier === 'openai');
        setOpenaiHealthy(openai?.ok ?? false);
      })
      .catch(() => setOpenaiHealthy(null));
  }, []);

  return (
    <Card className="eval-card w-full shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">Start eval</CardTitle>
        <CardDescription>
          Target chatbot URL and behavioral contract. Case count works without JavaScript; the
          slider syncs when available.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 sm:w-auto"
            onClick={applyAideaDemo}
          >
            <Sparkles className="size-4" aria-hidden />
            {AIDEA_CO_DEMO.label}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-2 sm:w-auto"
            onClick={applyAgentMatrixPilot}
          >
            <Grid3x3 className="size-4" aria-hidden />
            Prefill agent-matrix pilot
          </Button>
        </div>

        <div className="space-y-2">
          <label htmlFor="caseCount" className="text-sm font-medium">
            Test cases
          </label>
          <Slider
            className="hidden sm:block"
            min={1}
            max={50}
            value={[caseCount]}
            onValueChange={(values) => {
              const next = Array.isArray(values) ? values[0] : values;
              if (typeof next === 'number') {
                setCaseCount(next);
                syncCaseCountRef(next);
              }
            }}
            aria-label="Test case count"
          />
          <Input
            ref={caseCountRef}
            id="caseCount"
            type="number"
            min={1}
            max={50}
            value={caseCount}
            onChange={(event) => setCaseCount(Number(event.target.value))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="generationMode" className="text-[13px] font-medium">
              Case generation
            </label>
            <select
              id="generationMode"
              value={generationMode}
              onChange={(event) =>
                setGenerationMode(event.target.value as 'standard' | 'adversarial')
              }
              className={selectClassName}
            >
              <option value="standard">Standard (fast tier)</option>
              <option value="adversarial">Adversarial (strong red-team)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Adversarial uses Sonnet to craft harder social-engineering and jailbreak cases.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="scoringMode" className="text-[13px] font-medium">
              Scoring mode
            </label>
            <select
              id="scoringMode"
              value={scoringMode}
              onChange={(event) =>
                setScoringMode(event.target.value as 'dual' | 'strong' | 'multi-vendor')
              }
              className={selectClassName}
            >
              <option value="dual">Dual (Haiku + Sonnet)</option>
              <option value="multi-vendor">Multi-vendor (Sonnet + OpenAI)</option>
              <option value="strong">Strong only (Sonnet)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              {scoringMode === 'dual'
                ? 'Scores each case with fast and strong tiers; highlights tier disagreements.'
                : scoringMode === 'multi-vendor'
                  ? 'Cross-vendor review: Sonnet is primary; OpenAI is second judge via Gateway BYOK.'
                  : 'Single Sonnet judge; lowest scorer cost.'}
            </p>
            {scoringMode === 'multi-vendor' ? (
              <p className="text-[11px] text-muted-foreground">
                {openaiHealthy === true
                  ? 'OpenAI tier healthy (see /api/health).'
                  : openaiHealthy === false
                    ? 'OpenAI tier not healthy — check Gateway BYOK before running.'
                    : 'Requires OpenAI in Vercel AI Gateway (BYOK).'}
              </p>
            ) : null}
          </div>
        </div>

        <form action={presetAction} className="flex flex-col gap-2">
          <input type="hidden" name="presetId" value={AIDEA_AGENT_MATRIX_PILOT.id} readOnly />
          <input type="hidden" name="caseCount" value={caseCount} readOnly />
          <input type="hidden" name="generationMode" value={generationMode} readOnly />
          <input type="hidden" name="scoringMode" value={scoringMode} readOnly />
          <Button
            type="submit"
            variant="default"
            className="w-full justify-center gap-2 sm:w-auto"
            disabled={presetPending || pending}
          >
            {presetPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Grid3x3 className="size-4" aria-hidden />
            )}
            {AIDEA_AGENT_MATRIX_PILOT.label}
          </Button>
          <p className="text-[11px] text-muted-foreground">{AIDEA_AGENT_MATRIX_PILOT.hint}</p>
        </form>

        {presetState.error ? (
          <p className="text-sm text-destructive">{presetState.error}</p>
        ) : null}

        <form action={formAction} className="flex flex-col gap-4 border-t border-border/60 pt-4">
          <div className="space-y-2">
            <label htmlFor="url" className="text-[13px] font-medium text-foreground">
              Target URL
            </label>
            <Input
              ref={urlRef}
              id="url"
              name="url"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
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
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this bot do? What must it refuse?"
            />
          </div>

          <input type="hidden" name="caseCount" value={caseCount} readOnly />
          <input type="hidden" name="generationMode" value={generationMode} readOnly />
          <input type="hidden" name="scoringMode" value={scoringMode} readOnly />

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto" size="lg">
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Starting eval…
              </span>
            ) : (
              'Run eval'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
