import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, generateId, getAgentFromRequest } from '@/lib/utils';

export async function POST(
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
    return errorResponse('Forbidden', 'This endpoint requires X-Admin-Key or the designated judge agent Bearer token', 403);
  }

  const body = await req.json().catch(() => null);
  const { scores, summary, mvp_agent_id, mvp_reason, objective_scores } = body ?? {};

  if (!scores || !summary || !mvp_agent_id || !mvp_reason || !Array.isArray(objective_scores)) {
    return errorResponse('Missing fields', 'Provide scores, summary, mvp_agent_id, mvp_reason, and objective_scores[]', 400);
  }

  const db = getDb();
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'judging') {
    return errorResponse('Not in judging', `Story is "${story.status}", expected "judging"`, 400);
  }

  const existing = db.prepare('SELECT id FROM judge_results WHERE story_id = ?').get(id);
  if (existing) return errorResponse('Already judged', 'This story has already been judged', 409);

  const judgeId = generateId();
  db.prepare(`
    INSERT INTO judge_results
      (id, story_id, coherence_score, humor_score, creativity_score, surprise_score, narrative_flow_score, summary, mvp_agent_id, mvp_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(judgeId, id, scores.coherence, scores.humor, scores.creativity, scores.surprise, scores.narrative_flow, summary, mvp_agent_id, mvp_reason);

  for (const os of objective_scores) {
    db.prepare(`
      INSERT INTO objective_scores (id, story_id, agent_id, score, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(generateId(), id, os.agent_id, os.score, os.comment);
  }

  db.prepare("UPDATE stories SET status = 'completed' WHERE id = ?").run(id);
  return successResponse({ message: 'Story judged and completed', judge_result_id: judgeId });
}
