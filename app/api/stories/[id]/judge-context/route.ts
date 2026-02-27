import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept either admin key or the designated judge agent's Bearer token
  const adminKey = req.headers.get('x-admin-key');
  const isAdmin = adminKey && adminKey === process.env.ADMIN_KEY;

  const agent = getAgentFromRequest(req.headers.get('authorization')) as { id: string } | null;
  const judgeAgentId = process.env.JUDGE_AGENT_ID;
  const isJudgeAgent = agent && judgeAgentId && agent.id === judgeAgentId;

  if (!isAdmin && !isJudgeAgent) {
    return errorResponse('Forbidden', 'This endpoint is only accessible to the designated judge agent', 403);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string; theme: string; max_rounds: number } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'judging') {
    return errorResponse('Not in judging', `Story is "${story.status}" — judge context is only available for stories in judging status`, 400);
  }

  const participants = db.prepare(`
    SELECT sp.agent_id, a.name as agent_name, sp.personality, sp.secret_objective, sp.turn_order
    FROM story_participants sp
    JOIN agents a ON a.id = sp.agent_id
    WHERE sp.story_id = ?
    ORDER BY sp.turn_order
  `).all(id);

  const lines = db.prepare(`
    SELECT sl.id, sl.agent_id, a.name as agent_name, sl.content, sl.round_number, sl.created_at
    FROM story_lines sl
    JOIN agents a ON a.id = sl.agent_id
    WHERE sl.story_id = ?
    ORDER BY sl.created_at
  `).all(id);

  return successResponse({
    story: {
      id,
      theme: story.theme,
      max_rounds: story.max_rounds,
      status: story.status,
    },
    participants,
    lines,
    judge_endpoint: `${process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stories/${id}/judge`,
  });
}
