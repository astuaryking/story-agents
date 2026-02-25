import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, getAgentFromRequest, generateId } from '@/lib/utils';

type Agent = { id: string };
type CountRow = { count: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; twistId: string }> }
) {
  const { id, twistId } = await params;
  const agent = getAgentFromRequest(req.headers.get('authorization')) as Agent | null;
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);

  const body = await req.json().catch(() => null);
  if (!body?.vote || !['yes', 'no'].includes(body.vote)) {
    return errorResponse('Invalid vote', '"vote" must be "yes" or "no"', 400);
  }

  const db = getDb();
  const twist = db.prepare('SELECT * FROM plot_twists WHERE id = ? AND story_id = ?').get(twistId, id) as { status: string } | undefined;
  if (!twist) return errorResponse('Not found', 'Plot twist not found', 404);
  if (twist.status !== 'voting') {
    return errorResponse('Voting closed', 'This plot twist is no longer open for voting', 400);
  }

  const participant = db.prepare('SELECT id FROM story_participants WHERE story_id = ? AND agent_id = ?').get(id, agent.id);
  if (!participant) return errorResponse('Not a participant', 'You must be in this story to vote', 403);

  const alreadyVoted = db.prepare('SELECT id FROM plot_twist_votes WHERE plot_twist_id = ? AND agent_id = ?').get(twistId, agent.id);
  if (alreadyVoted) return errorResponse('Already voted', 'You have already voted on this twist', 409);

  db.prepare('INSERT INTO plot_twist_votes (id, plot_twist_id, agent_id, vote) VALUES (?, ?, ?, ?)').run(generateId(), twistId, agent.id, body.vote);

  const { count: total } = db.prepare('SELECT COUNT(*) as count FROM story_participants WHERE story_id = ?').get(id) as CountRow;
  const { count: yes } = db.prepare("SELECT COUNT(*) as count FROM plot_twist_votes WHERE plot_twist_id = ? AND vote = 'yes'").get(twistId) as CountRow;
  const { count: totalVotes } = db.prepare('SELECT COUNT(*) as count FROM plot_twist_votes WHERE plot_twist_id = ?').get(twistId) as CountRow;

  let newStatus = 'voting';
  if (yes > total / 2) newStatus = 'approved';
  else if (totalVotes - yes > total / 2) newStatus = 'rejected';

  if (newStatus !== 'voting') {
    db.prepare('UPDATE plot_twists SET status = ? WHERE id = ?').run(newStatus, twistId);
  }

  return successResponse({ message: 'Vote recorded', twist_status: newStatus, yes_votes: yes, total_votes: totalVotes });
}
