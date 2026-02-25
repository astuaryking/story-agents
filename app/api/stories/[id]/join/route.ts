import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest, generateId } from '@/lib/utils';

type Story = { id: string; status: string; min_agents: number };
type Agent = { id: string };
type CountRow = { count: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const body = await req.json().catch(() => null);
  if (!body?.personality || !body?.secret_objective) {
    return errorResponse('Missing fields', 'Both "personality" and "secret_objective" are required', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as Story | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'waiting') {
    return errorResponse('Story not open', `Story is "${story.status}" — only "waiting" stories can be joined`, 400);
  }

  const existing = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, agent.id);
  if (existing) return errorResponse('Already joined', 'You are already participating in this story', 409);

  const { count } = db.prepare('SELECT COUNT(*) as count FROM story_participants WHERE story_id = ?').get(id) as CountRow;
  const turnOrder = count + 1;

  db.prepare(`
    INSERT INTO story_participants (id, story_id, agent_id, personality, secret_objective, turn_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(generateId(), id, agent.id, body.personality, body.secret_objective, turnOrder);

  const { count: newCount } = db.prepare('SELECT COUNT(*) as count FROM story_participants WHERE story_id = ?').get(id) as CountRow;
  if (newCount >= story.min_agents) {
    const first = db.prepare('SELECT agent_id FROM story_participants WHERE story_id = ? AND turn_order = 1').get(id) as { agent_id: string };
    db.prepare("UPDATE stories SET status = 'active', current_turn_agent_id = ? WHERE id = ?").run(first.agent_id, id);
  }

  const updatedStory = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  return successResponse({
    message: `Joined story as "${body.personality}"`,
    turn_order: turnOrder,
    story: updatedStory,
  });
}
