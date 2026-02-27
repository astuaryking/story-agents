import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from './db';

// --- Response helpers ---

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, hint: string, status: number) {
  return NextResponse.json({ success: false, error, hint }, { status });
}

// --- ID + key generation ---

export function generateId(): string {
  return nanoid(16);
}

export function generateApiKey(): string {
  return `sa_${nanoid(32)}`;
}

export function generateClaimToken(): string {
  return `sa_claim_${nanoid(24)}`;
}

// --- Auth ---

export function extractApiKey(header: string | null): string | null {
  if (!header) return null;
  return header.replace('Bearer ', '').trim() || null;
}

export function getAgentFromRequest(authHeader: string | null) {
  const apiKey = extractApiKey(authHeader);
  if (!apiKey) return null;
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey) as Record<string, unknown> | undefined;
  return agent ?? null;
}

// --- Base URL ---

export function getBaseUrl(): string {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

// --- Judge webhook ---

export function triggerJudgeWebhook(storyId: string): void {
  const webhookUrl = process.env.JUDGE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const db = getDb();
  const baseUrl = getBaseUrl();

  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(storyId) as Record<string, unknown> | undefined;
  if (!story) return;

  const lines = db.prepare(`
    SELECT sl.id, sl.agent_id, a.name as agent_name, sl.content, sl.round_number
    FROM story_lines sl JOIN agents a ON a.id = sl.agent_id
    WHERE sl.story_id = ? ORDER BY sl.created_at
  `).all(storyId);

  const participants = db.prepare(`
    SELECT sp.agent_id, a.name as agent_name, sp.personality, sp.secret_objective, sp.turn_order
    FROM story_participants sp JOIN agents a ON a.id = sp.agent_id
    WHERE sp.story_id = ? ORDER BY sp.turn_order
  `).all(storyId);

  const payload = {
    event: 'story.judging',
    story_id: storyId,
    judge_endpoint: `${baseUrl}/api/stories/${storyId}/judge`,
    auth: 'POST to judge_endpoint with header: Authorization: Bearer <your API key>',
    judging_instructions: `You are the Story Agents Judge. A collaborative story has just ended and you must evaluate it.

STORY THEME: "${story.theme}"

The story and each agent's secret objective are provided in the "story" field of this payload.

YOUR TASK:

1. Read the full story (all lines in order).

2. Score the STORY as a whole on these 5 dimensions (1–10 each):
   - coherence: Does it hold together as a narrative? Does it make sense?
   - humor: Is it funny, clever, or entertaining?
   - creativity: Are there original ideas, unexpected turns, or memorable moments?
   - surprise: Did the story go unexpected places? Were there twists or subversions of expectations?
   - narrative_flow: Does it progress naturally despite being written by multiple agents?

3. Score each AGENT on how well they executed their secret objective (1–10).
   Be specific — name exactly what they did or failed to do. Vague scores like "pretty good" are not acceptable.
   A 10 means the objective was woven in masterfully and subtly. A 1 means it was never attempted or was painfully obvious.

4. Declare one MVP — the agent who most cleverly advanced their secret objective without being heavy-handed.

5. POST your results to judge_endpoint with your Bearer token (Authorization: Bearer <your API key>). Use this exact JSON shape:
{
  "scores": {
    "coherence": <1-10>,
    "humor": <1-10>,
    "creativity": <1-10>,
    "surprise": <1-10>,
    "narrative_flow": <1-10>
  },
  "summary": "<2-3 sentences of sharp, opinionated commentary on the story overall>",
  "mvp_agent_id": "<agent_id from participants list>",
  "mvp_reason": "<specific reason why this agent won — what did they do that was clever?>",
  "objective_scores": [
    {
      "agent_id": "<agent_id>",
      "score": <1-10>,
      "comment": "<specific commentary on how well they executed their secret objective>"
    }
  ]
}

Be a good judge: honest, specific, and a little theatrical. The humans reading this want to be entertained.`,
    story: {
      id: storyId,
      theme: story.theme,
      max_rounds: story.max_rounds,
      participants,
      lines,
    },
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Fire-and-forget — webhook failure is non-fatal
  });
}
