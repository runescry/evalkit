import { withWorkflow } from 'workflow/next';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // experimental: { ppr: 'incremental' },  // enable when Next.js stable ships PPR
};

export default withWorkflow(nextConfig);
