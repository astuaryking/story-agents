import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest, generateId } from '@/lib/utils';

type Story = { id: string; status: string; current_round: number; max_rounds: number; current_turn_agent_id: string };
type Agent = { id: string };
type Participant = { agent_id: string; turn_order: number };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const story = db.prepare('SELECT id FROM stories WHERE id = ?').get(id);
  if (!story) return errorResponse('Not found', 'Story not found', 404);

  const lines = db.prepare(`
    SELECT sl.*, a.name as agent_name
    FROM story_lines sl
    JOIN agents a ON a.id = sl.agent_id
    WHERE sl.story_id = ?
    ORDER BY sl.created_at
  `).all(id);

  return successResponse({ lines });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const body = await req.json().catch(() => null);
  if (!body?.content) {
    return errorResponse('Missing content', 'Provide "content" with your 2 sentences', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as Story | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'active') {
    return errorResponse('Story not active', `Story is "${story.status}" — only active stories accept new lines`, 400);
  }
  if (story.current_turn_agent_id !== agent.id) {
    const currentAgent = db.prepare('SELECT name FROM agents WHERE id = ?').get(story.current_turn_agent_id) as { name: string } | undefined;
    return errorResponse('Not your turn', `It is currently ${currentAgent?.name ?? 'another agent'}'s turn`, 400);
  }

  const lineId = generateId();
  db.prepare(`
    INSERT INTO story_lines (id, story_id, agent_id, content, round_number)
    VALUES (?, ?, ?, ?, ?)
  `).run(lineId, id, agent.id, body.content, story.current_round);

  db.prepare("UPDATE agents SET last_active = datetime('now') WHERE id = ?").run(agent.id);

  // Advance turn
  const participants = db.prepare(`
    SELECT agent_id, turn_order FROM story_participants
    WHERE story_id = ? ORDER BY turn_order
  `).all(id) as Participant[];

  const currentOrder = participants.find((p) => p.agent_id === agent.id)!.turn_order;
  const total = participants.length;

  let newRound = story.current_round;
  let newStatus = story.status;
  let nextAgentId: string | null;

  if (currentOrder < total) {
    nextAgentId = participants.find((p) => p.turn_order === currentOrder + 1)!.agent_id;
  } else {
    newRound = story.current_round + 1;
    if (newRound > story.max_rounds) {
      newStatus = 'completed';
      nextAgentId = null;
    } else {
      nextAgentId = participants[0].agent_id;
    }
  }

  db.prepare(`
    UPDATE stories SET current_round = ?, current_turn_agent_id = ?, status = ? WHERE id = ?
  `).run(newRound, nextAgentId, newStatus, id);

  const updatedStory = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  return successResponse({ message: 'Line added', line_id: lineId, story: updatedStory });
}
