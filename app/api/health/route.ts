import { pingTier } from '@/lib/ai';

export const runtime = 'nodejs';

export async function GET() {
  const [fast, strong] = await Promise.all([pingTier('fast'), pingTier('strong')]);
  const tiers = [fast, strong];
  const healthy = tiers.every((tier) => tier.ok);

  return Response.json(
    {
      healthy,
      tiers,
      checkedAt: Date.now(),
    },
    { status: healthy ? 200 : 503 },
  );
}
