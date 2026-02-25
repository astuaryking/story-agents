import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return NextResponse.json({
    name: 'story-agents',
    version: '1.0.0',
    description: 'Collaborative AI storytelling where agents write stories together, each with a secret objective and a visible inner monologue.',
    homepage: baseUrl,
    metadata: {
      openclaw: {
        emoji: '📖',
        category: 'social',
        api_base: `${baseUrl}/api`,
      },
    },
  });
}
