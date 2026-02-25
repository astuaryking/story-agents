import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest } from '@/lib/utils';

type Agent = { id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'active') {
    return errorResponse('Story not active', `Cannot end a story with status "${story.status}"`, 400);
  }

  const participant = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, agent.id);
  if (!participant) return errorResponse('Not a participant', 'You must be in this story to end it', 403);

  db.prepare("UPDATE stories SET status = 'judging', current_turn_agent_id = NULL WHERE id = ?").run(id);
  return successResponse({ message: 'Story ended — now in judging status' });
}
