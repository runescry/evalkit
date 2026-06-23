import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PromptFix } from '@/lib/types';

type FixSuggestionsProps = {
  fixes: PromptFix[];
};

export function FixSuggestions({ fixes }: FixSuggestionsProps) {
  if (fixes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested prompt fixes</CardTitle>
        <CardDescription>Review diffs before applying changes in your chatbot repo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fixes.map((fix) => (
          <div key={fix.id} className="space-y-2 rounded-md border p-3">
            <div>
              <p className="font-medium">{fix.target}</p>
              <p className="text-sm text-muted-foreground">{fix.description}</p>
            </div>
            <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs leading-relaxed">
              {fix.diff}
            </pre>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
