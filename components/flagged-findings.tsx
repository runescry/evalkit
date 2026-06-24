import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TestCase, TestResult } from '@/lib/types';

type FlaggedFindingsProps = {
  testCases: TestCase[];
  results: TestResult[];
};

function findTestCase(testCases: TestCase[], testCaseId: string): TestCase | undefined {
  return testCases.find((testCase) => testCase.id === testCaseId);
}

function scoreLine(result: TestResult): string | null {
  if (!result.scores || result.total === null) {
    return null;
  }
  const { correctness, safety, scopeAdherence, confidenceCalibration } = result.scores;
  return `${correctness}/${safety}/${scopeAdherence}/${confidenceCalibration} · total ${result.total}/20`;
}

function truncate(text: string, max = 400): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}…`;
}

export function FlaggedFindings({ testCases, results }: FlaggedFindingsProps) {
  const flagged = results.filter((result) => result.flagged);

  if (flagged.length === 0) {
    return null;
  }

  return (
    <Card className="eval-card border-destructive/30 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-title text-destructive">
          Flagged findings ({flagged.length})
        </CardTitle>
        <CardDescription>
          Cases that scored below the rubric threshold. Approving below will ask the model to
          suggest prompt changes for these failures — you review diffs after generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flagged.map((result) => {
          const testCase = findTestCase(testCases, result.testCaseId);
          const scores = scoreLine(result);

          return (
            <div key={result.testCaseId} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Flagged</Badge>
                {testCase?.agentId ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {testCase.agentId}
                  </Badge>
                ) : null}
                {testCase ? (
                  <Badge variant="secondary" className="capitalize">
                    {testCase.category.replaceAll('_', ' ')}
                  </Badge>
                ) : null}
                {scores ? <span className="text-xs text-muted-foreground">{scores}</span> : null}
                {result.sandbox.statusCode ? (
                  <span className="text-xs text-muted-foreground">
                    HTTP {result.sandbox.statusCode}
                    {result.sandbox.scopeRejected ? ' · scope reject' : ''}
                  </span>
                ) : null}
              </div>

              {testCase ? (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Input:</span>{' '}
                    <span className="text-muted-foreground">{testCase.input}</span>
                  </p>
                  <p>
                    <span className="font-medium">Expected:</span>{' '}
                    <span className="text-muted-foreground">{testCase.expectedBehavior}</span>
                  </p>
                </div>
              ) : null}

              {result.sandbox.toolCalls && result.sandbox.toolCalls.length > 0 ? (
                <div className="text-sm">
                  <p className="font-medium">Tools called</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {result.sandbox.toolCalls.map((call) => call.name).join(', ')}
                  </p>
                </div>
              ) : null}

              {result.sandbox.validationOk === false &&
              (result.sandbox.validationErrors?.length ||
                result.sandbox.validationWarnings?.length) ? (
                <div className="text-sm">
                  <p className="font-medium">Harness validation</p>
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {result.sandbox.validationErrors?.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                    {result.sandbox.validationWarnings?.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Schema/tool checks — not the same as invented email content when gmail_read ran.
                  </p>
                </div>
              ) : null}

              {result.response ? (
                <div className="text-sm">
                  <p className="font-medium">Actual response</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {truncate(result.response)}
                  </pre>
                </div>
              ) : null}

              {result.reasoning ? (
                <div className="text-sm">
                  <p className="font-medium">Scorer notes</p>
                  <p className="text-muted-foreground">{result.reasoning}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
