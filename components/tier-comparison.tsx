'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TestResult } from '@/lib/types';

type TierComparisonProps = {
  results: TestResult[];
};

export function TierComparison({ results }: TierComparisonProps) {
  const stats = useMemo(() => {
    const scored = results.filter((r) => r.multiModelScore);
    if (scored.length === 0) {
      return null;
    }

    const multiVendor = scored.some((r) => r.multiModelScore?.openai != null);
    const agreements = scored.filter((r) => r.multiModelScore?.flagAgreement).length;
    const primaryFlagged = scored.filter((r) => r.multiModelScore?.strong.flagged).length;
    const secondaryFlagged = multiVendor
      ? scored.filter((r) => r.multiModelScore?.openai?.flagged).length
      : scored.filter((r) => r.multiModelScore?.fast?.flagged).length;
    const disagreements = scored.filter((r) => !r.multiModelScore?.flagAgreement);

    return {
      multiVendor,
      total: scored.length,
      agreements,
      agreementRate: agreements / scored.length,
      primaryFlagged,
      secondaryFlagged,
      disagreements,
    };
  }, [results]);

  if (!stats) {
    return null;
  }

  return (
    <Card className="eval-card shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title">Multi-model scoring</CardTitle>
        <CardDescription>
          {stats.multiVendor
            ? 'Each case scored by Anthropic Sonnet (primary) and OpenAI (second judge). Disagreements highlight cross-vendor drift.'
            : 'Each case scored by fast (Haiku) and strong (Sonnet) tiers. Primary report uses strong scores.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap gap-2">
          <span className="stat-pill">
            {stats.agreements}/{stats.total} flag agreement (
            {Math.round(stats.agreementRate * 100)}%)
          </span>
          <span className="stat-pill">
            {stats.multiVendor ? 'Sonnet' : 'Strong'} flagged: {stats.primaryFlagged}
          </span>
          <span className="stat-pill">
            {stats.multiVendor ? 'OpenAI' : 'Fast'} flagged: {stats.secondaryFlagged}
          </span>
        </div>

        {stats.disagreements.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">
              {stats.multiVendor ? 'Vendor disagreements' : 'Tier disagreements'}
            </p>
            {stats.disagreements.map((result) => {
              const multi = result.multiModelScore!;
              return (
                <div
                  key={result.testCaseId}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/40">
                      {result.testCaseId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {stats.multiVendor ? (
                        <>
                          sonnet {multi.strong.total}/20 {multi.strong.flagged ? '(flagged)' : ''} ·
                          openai {multi.openai?.total ?? '—'}/20{' '}
                          {multi.openai?.flagged ? '(flagged)' : ''}
                        </>
                      ) : (
                        <>
                          fast {multi.fast?.total ?? '—'}/20 {multi.fast?.flagged ? '(flagged)' : ''}{' '}
                          · strong {multi.strong.total}/20{' '}
                          {multi.strong.flagged ? '(flagged)' : ''}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {stats.multiVendor
              ? 'Sonnet and OpenAI agreed on all flag decisions.'
              : 'Fast and strong tiers agreed on all flag decisions.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
