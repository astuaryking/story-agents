export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getDb } from '@/lib/db';
import { STATUS_COLORS, getAgentColor } from '@/lib/agentColors';

type Story = {
  id: string;
  theme: string;
  status: string;
  max_rounds: number;
  min_agents: number;
  current_round: number;
  created_at: string;
};

type ParticipantCount = { story_id: string; count: number };
type LineCount = { story_id: string; count: number };

const STATUSES = ['all', 'waiting', 'active', 'judging', 'completed'];

export default function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Next.js 15: searchParams is sync-accessible in server components via direct prop unwrapping
  // but must be awaited. Use a workaround by reading synchronously.
  const db = getDb();
  const stories = db.prepare(
    'SELECT * FROM stories ORDER BY created_at DESC'
  ).all() as Story[];

  const ids = stories.map((s) => s.id);

  const participantCounts: Record<string, number> = {};
  const lineCounts: Record<string, number> = {};

  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    const pRows = db.prepare(
      `SELECT story_id, COUNT(*) as count FROM story_participants WHERE story_id IN (${ph}) GROUP BY story_id`
    ).all(...ids) as ParticipantCount[];
    pRows.forEach((r) => { participantCounts[r.story_id] = r.count; });

    const lRows = db.prepare(
      `SELECT story_id, COUNT(*) as count FROM story_lines WHERE story_id IN (${ph}) GROUP BY story_id`
    ).all(...ids) as LineCount[];
    lRows.forEach((r) => { lineCounts[r.story_id] = r.count; });
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-4xl text-text mb-2">All Stories</h1>
        <p className="font-mono text-xs text-text-muted">{stories.length} total</p>
      </div>

      {/* Status filter links */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => {
          const count = s === 'all' ? stories.length : stories.filter((st) => st.status === s).length;
          const color = s === 'all' ? '#6b6b8a' : STATUS_COLORS[s];
          return (
            <Link
              key={s}
              href={s === 'all' ? '/stories' : `/stories?status=${s}`}
              className="text-xs font-mono px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: color, color }}
            >
              {s} ({count})
            </Link>
          );
        })}
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <p className="font-serif text-2xl text-text-muted">No stories yet</p>
          <p className="font-mono text-xs text-text-muted">
            <Link href="/" className="text-active hover:underline">Start one →</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stories.map((story) => {
            const agentCount = participantCounts[story.id] ?? 0;
            const lineCount = lineCounts[story.id] ?? 0;
            const color = STATUS_COLORS[story.status];
            return (
              <Link
                key={story.id}
                href={`/stories/${story.id}`}
                className="block bg-surface border border-border rounded-xl p-5 hover:border-active transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="font-serif text-xl text-text group-hover:text-active transition-colors leading-snug">
                      {story.theme}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-mono text-text-muted flex-wrap">
                      <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
                      <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
                      {story.status === 'active' && (
                        <span>Round {story.current_round} / {story.max_rounds}</span>
                      )}
                      <span>{new Date(story.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1 pt-0.5">
                      {Array.from({ length: agentCount }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: getAgentColor(i + 1) }} />
                      ))}
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-xs font-mono px-2 py-1 rounded-full border"
                    style={{ borderColor: color, color }}
                  >
                    {story.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
