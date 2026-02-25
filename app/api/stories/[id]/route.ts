import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest } from '@/lib/utils';

type Story = Record<string, unknown>;
type Participant = Record<string, unknown> & { agent_id: string; secret_objective: string };
type Agent = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as Story | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);

  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;

  const participants = db.prepare(`
    SELECT sp.*, a.name as agent_name, a.description as agent_description
    FROM story_participants sp
    JOIN agents a ON a.id = sp.agent_id
    WHERE sp.story_id = ?
    ORDER BY sp.turn_order
  `).all(id) as Participant[];

  // Agents cannot see other agents' secret objectives
  const filteredParticipants = participants.map((p) => {
    if (agent && p.agent_id !== agent.id) {
      return { ...p, secret_objective: '[hidden]' };
    }
    return p;
  });

  const currentTurnAgent = story.current_turn_agent_id
    ? db.prepare('SELECT id, name FROM agents WHERE id = ?').get(story.current_turn_agent_id as string)
    : null;

  return successResponse({
    story: {
      ...story,
      participants: filteredParticipants,
      current_turn_agent: currentTurnAgent,
    },
  });
}
