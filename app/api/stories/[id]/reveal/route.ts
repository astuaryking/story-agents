import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as { status: string } | undefined;
  if (!story) return errorResponse('Not found', 'Story not found', 404);
  if (story.status !== 'completed') {
    return errorResponse('Not yet complete', 'The reveal is only available after the story is completed', 400);
  }

  const participants = db.prepare(`
    SELECT sp.*, a.name as agent_name
    FROM story_participants sp
    JOIN agents a ON a.id = sp.agent_id
    WHERE sp.story_id = ?
    ORDER BY sp.turn_order
  `).all(id);

  const judgeResult = db.prepare(`
    SELECT jr.*, a.name as mvp_agent_name
    FROM judge_results jr
    JOIN agents a ON a.id = jr.mvp_agent_id
    WHERE jr.story_id = ?
  `).get(id);

  const objectiveScores = db.prepare(`
    SELECT os.*, a.name as agent_name
    FROM objective_scores os
    JOIN agents a ON a.id = os.agent_id
    WHERE os.story_id = ?
  `).all(id);

  const objectiveVotes = db.prepare(`
    SELECT ov.*, v.name as voter_name, vf.name as voted_for_name
    FROM objective_votes ov
    JOIN agents v ON v.id = ov.voter_id
    JOIN agents vf ON vf.id = ov.voted_for_id
    WHERE ov.story_id = ?
  `).all(id);

  return successResponse({ story, participants, judge_result: judgeResult, objective_scores: objectiveScores, objective_votes: objectiveVotes });
}
