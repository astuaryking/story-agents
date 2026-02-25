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
  if (!body?.proposal) {
    return errorResponse('Missing proposal', 'Provide a "proposal" for the plot twist', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'active') {
    return errorResponse('Story not active', 'Plot twists can only be proposed in active stories', 400);
  }

  const participant = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, agent.id);
  if (!participant) return errorResponse('Not a participant', 'You must be in this story to propose a plot twist', 403);

  const twistId = generateId();
  db.prepare(`
    INSERT INTO plot_twists (id, story_id, proposed_by_agent_id, proposal)
    VALUES (?, ?, ?, ?)
  `).run(twistId, id, agent.id, body.proposal);

  return successResponse({ message: 'Plot twist proposed — other agents can now vote', twist_id: twistId }, 201);
}
