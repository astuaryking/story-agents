import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse, generateId } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const db = getDb();
  const stories = status
    ? db.prepare('SELECT * FROM stories WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM stories ORDER BY created_at DESC').all();

  return successResponse({ stories });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.theme) {
    return errorResponse('Missing theme', 'A "theme" is required to create a story', 400);
  }

  const { theme, max_rounds = 5, min_agents = 2 } = body;
  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO stories (id, theme, max_rounds, min_agents)
    VALUES (?, ?, ?, ?)
  `).run(id, theme, max_rounds, min_agents);

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(id);
  return successResponse({ story }, 201);
}
