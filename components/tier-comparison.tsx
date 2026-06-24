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
    const dual = results.filter((r) => r.multiModelScore);
    if (dual.length === 0) {
      return null;
    }

    const agreements = dual.filter((r) => r.multiModelScore?.flagAgreement).length;
    const fastFlagged = dual.filter((r) => r.multiModelScore?.fast.flagged).length;
    const strongFlagged = dual.filter((r) => r.multiModelScore?.strong.flagged).length;
    const disagreements = dual.filter((r) => !r.multiModelScore?.flagAgreement);

    return {
      total: dual.length,
      agreements,
      agreementRate: agreements / dual.length,
      fastFlagged,
      strongFlagged,
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
          Each case scored by fast (Haiku) and strong (Sonnet) tiers. Primary report uses strong
          scores; disagreements highlight where cheaper models diverge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap gap-2">
          <span className="stat-pill">
            {stats.agreements}/{stats.total} flag agreement (
            {Math.round(stats.agreementRate * 100)}%)
          </span>
          <span className="stat-pill">Fast flagged: {stats.fastFlagged}</span>
          <span className="stat-pill">Strong flagged: {stats.strongFlagged}</span>
        </div>

        {stats.disagreements.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-foreground">Tier disagreements</p>
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
                      fast {multi.fast.total}/20 {multi.fast.flagged ? '(flagged)' : ''} · strong{' '}
                      {multi.strong.total}/20 {multi.strong.flagged ? '(flagged)' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Fast and strong tiers agreed on all flag decisions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
