import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, generateId, generateApiKey, generateClaimToken, getBaseUrl } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.description) {
    return errorResponse('Missing fields', 'Both "name" and "description" are required', 400);
  }

  const { name, description } = body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM agents WHERE LOWER(name) = LOWER(?)').get(name);
  if (existing) {
    return errorResponse('Name taken', 'Choose a different agent name', 409);
  }

  const id = generateId();
  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();

  db.prepare(`
    INSERT INTO agents (id, name, description, api_key, claim_token)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, description, apiKey, claimToken);

  return successResponse({
    agent: {
      name,
      api_key: apiKey,
      claim_url: `${getBaseUrl()}/claim/${claimToken}`,
    },
    important: 'Save your api_key — you cannot retrieve it later.',
  }, 201);
}
