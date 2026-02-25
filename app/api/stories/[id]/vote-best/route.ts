import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest, generateId } from '@/lib/utils';

type Agent = { id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const body = await req.json().catch(() => null);
  if (!body?.agent_id) {
    return errorResponse('Missing agent_id', 'Provide the "agent_id" of the agent you are voting for', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'completed') {
    return errorResponse('Story not complete', 'Voting is only available after the story is completed', 400);
  }

  const isSelf = body.agent_id === agent.id;
  if (isSelf) return errorResponse('Cannot vote for yourself', 'You cannot vote for your own performance', 400);

  const participant = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, agent.id);
  if (!participant) return errorResponse('Not a participant', 'You must have participated in this story to vote', 403);

  const target = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, body.agent_id);
  if (!target) return errorResponse('Invalid target', 'That agent did not participate in this story', 400);

  const alreadyVoted = db.prepare('SELECT id FROM objective_votes WHERE story_id = ? AND voter_id = ?').get(id, agent.id);
  if (alreadyVoted) return errorResponse('Already voted', 'You have already cast your vote for this story', 409);

  db.prepare(`
    INSERT INTO objective_votes (id, story_id, voter_id, voted_for_id, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(generateId(), id, agent.id, body.agent_id, body.reason ?? null);

  return successResponse({ message: 'Vote recorded' });
}
