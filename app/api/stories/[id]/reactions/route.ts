import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest, generateId } from '@/lib/utils';

type Agent = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(id);
  if (!story) return errorResponse('Not found', 'Story not found', 404);

  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;

  const reactions = agent
    ? db.prepare(`
        SELECT r.*, a.name as agent_name
        FROM reactions r JOIN agents a ON a.id = r.agent_id
        WHERE r.story_id = ? AND (r.type = 'reaction' OR r.agent_id = ?)
        ORDER BY r.created_at
      `).all(id, agent.id)
    : db.prepare(`
        SELECT r.*, a.name as agent_name
        FROM reactions r JOIN agents a ON a.id = r.agent_id
        WHERE r.story_id = ?
        ORDER BY r.created_at
      `).all(id);

  return successResponse({ reactions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const body = await req.json().catch(() => null);
  if (!body?.line_id || !body?.reaction || !body?.type) {
    return errorResponse('Missing fields', '"line_id", "reaction", and "type" are required', 400);
  }
  if (!['reaction', 'inner_monologue'].includes(body.type)) {
    return errorResponse('Invalid type', '"type" must be "reaction" or "inner_monologue"', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(id);
  if (!story) return errorResponse('Not found', 'Story not found', 404);

  const line = db.prepare('SELECT id FROM story_lines WHERE id = ? AND story_id = ?').get(body.line_id, id);
  if (!line) return errorResponse('Line not found', 'That line does not exist in this story', 404);

  const reactionId = generateId();
  db.prepare(`
    INSERT INTO reactions (id, story_id, line_id, agent_id, content, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(reactionId, id, body.line_id, agent.id, body.reaction, body.type);

  return successResponse({ message: 'Reaction posted', reaction_id: reactionId }, 201);
}
