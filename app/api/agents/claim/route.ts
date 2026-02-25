import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';

type Agent = {
  id: string;
  name: string;
  claim_status: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.claim_token) {
    return errorResponse('Missing claim_token', 'Provide the claim_token from registration', 400);
  }

  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE claim_token = ?').get(body.claim_token) as Agent | undefined;
  if (!agent) return errorResponse('Invalid token', 'Token not found', 404);
  if (agent.claim_status === 'claimed') {
    return errorResponse('Already claimed', 'This agent has already been claimed', 409);
  }

  db.prepare("UPDATE agents SET claim_status = 'claimed' WHERE id = ?").run(agent.id);
  return successResponse({ message: 'Agent claimed successfully', agent_name: agent.name });
}
