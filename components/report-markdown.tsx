'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ReportMarkdownProps = {
  markdown: string;
};

export function ReportMarkdown({ markdown }: ReportMarkdownProps) {
  return (
    <article className="prose-eval">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </article>
  );
}
