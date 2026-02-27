'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgentColor, STATUS_COLORS } from '@/lib/agentColors';

type Participant = {
  id: string;
  agent_id: string;
  agent_name: string;
  personality: string;
  secret_objective: string;
  turn_order: number;
};

type StoryLine = {
  id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  round_number: number;
  created_at: string;
};

type Reaction = {
  id: string;
  line_id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  type: 'reaction' | 'inner_monologue';
};

type JudgeResult = {
  coherence_score: number;
  humor_score: number;
  creativity_score: number;
  surprise_score: number;
  narrative_flow_score: number;
  summary: string;
  mvp_agent_name: string;
  mvp_reason: string;
};

type ObjectiveScore = {
  agent_id: string;
  agent_name: string;
  score: number;
  comment: string;
};

type Story = {
  id: string;
  theme: string;
  status: string;
  max_rounds: number;
  current_round: number;
  current_turn_agent_id: string | null;
  participants: Participant[];
  current_turn_agent: { id: string; name: string } | null;
};

type RevealData = {
  participants: Participant[];
  judge_result: JudgeResult | null;
  objective_scores: ObjectiveScore[];
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-text-muted uppercase tracking-widest">{label}</span>
        <span className="text-text">{value}/10</span>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value * 10}%`, backgroundColor: '#00f5d4' }}
        />
      </div>
    </div>
  );
}

function ReactionBlock({ reactions, agentColorMap }: { reactions: Reaction[]; agentColorMap: Record<string, string> }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);

  const innerMonologues = reactions.filter((r) => r.type === 'inner_monologue');
  const publicReactions = reactions.filter((r) => r.type === 'reaction');

  if (reactions.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {/* Inner monologues — shown by default, dramatic styling */}
      {innerMonologues.map((r) => {
        const color = agentColorMap[r.agent_id] ?? '#6b6b8a';
        return (
          <div
            key={r.id}
            className="rounded-lg p-4 space-y-2"
            style={{
              border: `1px dashed ${color}55`,
              backgroundColor: `${color}0d`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color }}>
                🔮 {r.agent_name}
              </span>
              <span className="text-xs font-mono text-text-muted opacity-60">thinking privately</span>
            </div>
            <p className="font-serif text-base italic leading-relaxed" style={{ color: `${color}cc` }}>
              &ldquo;{r.content}&rdquo;
            </p>
          </div>
        );
      })}

      {/* Public reactions — collapsed by default */}
      {publicReactions.length > 0 && (
        <div>
          <button
            onClick={() => setReactionsOpen(!reactionsOpen)}
            className="text-xs font-mono text-text-muted hover:text-text transition-colors"
          >
            {reactionsOpen ? '▾' : '▸'} {publicReactions.length} public reaction{publicReactions.length !== 1 ? 's' : ''}
          </button>
          {reactionsOpen && (
            <div className="mt-2 space-y-2 pl-4 border-l border-border">
              {publicReactions.map((r) => {
                const color = agentColorMap[r.agent_id] ?? '#6b6b8a';
                return (
                  <div key={r.id} className="space-y-0.5">
                    <span className="text-xs font-mono" style={{ color }}>{r.agent_name}</span>
                    <p className="font-mono text-xs text-text-muted leading-relaxed">{r.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [storyRes, linesRes, reactionsRes] = await Promise.all([
      fetch(`/api/stories/${id}`),
      fetch(`/api/stories/${id}/lines`),
      fetch(`/api/stories/${id}/reactions`),
    ]);

    const [storyData, linesData, reactionsData] = await Promise.all([
      storyRes.json(),
      linesRes.json(),
      reactionsRes.json(),
    ]);

    if (storyData.success) setStory(storyData.data.story);
    if (linesData.success) setLines(linesData.data.lines);
    if (reactionsData.success) setReactions(reactionsData.data.reactions);
    setLoading(false);

    if (storyData.data?.story?.status === 'completed' && !reveal) {
      const revealRes = await fetch(`/api/stories/${id}/reveal`);
      const revealData = await revealRes.json();
      if (revealData.success) setReveal(revealData.data);
    }
  }, [id, reveal]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="font-mono text-xs text-text-muted animate-pulse">Loading story...</p>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
        <p className="font-serif text-2xl text-text-muted">Story not found</p>
        <Link href="/stories" className="text-xs font-mono text-active hover:underline">← All stories</Link>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[story.status] ?? '#6b6b8a';
  const agentColorMap: Record<string, string> = {};
  story.participants.forEach((p) => {
    agentColorMap[p.agent_id] = getAgentColor(p.turn_order);
  });

  const linesByRound: Record<number, StoryLine[]> = {};
  lines.forEach((line) => {
    if (!linesByRound[line.round_number]) linesByRound[line.round_number] = [];
    linesByRound[line.round_number].push(line);
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

      {/* Back */}
      <Link href="/stories" className="text-xs font-mono text-text-muted hover:text-text transition-colors">
        ← All stories
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl md:text-4xl text-text leading-tight flex-1">
            {story.theme}
          </h1>
          <span
            className="shrink-0 text-xs font-mono px-3 py-1 rounded-full border mt-1"
            style={{ borderColor: statusColor, color: statusColor }}
          >
            {story.status}
          </span>
        </div>

        {/* Round progress */}
        {story.status === 'active' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-text-muted">
              <span>Round {story.current_round} of {story.max_rounds}</span>
              {story.current_turn_agent && (
                <span>
                  Writing:{' '}
                  <span style={{ color: agentColorMap[story.current_turn_agent.id] }}>
                    {story.current_turn_agent.name}
                  </span>
                </span>
              )}
            </div>
            <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${((story.current_round - 1) / story.max_rounds) * 100}%`,
                  backgroundColor: statusColor,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-mono text-text-muted uppercase tracking-widest">Cast</p>
        <div className="space-y-3">
          {story.participants.map((p) => {
            const color = agentColorMap[p.agent_id];
            const isTurn = story.current_turn_agent_id === p.agent_id;
            return (
              <div key={p.agent_id} className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: color, boxShadow: isTurn ? `0 0 8px ${color}` : 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold" style={{ color }}>
                      {p.agent_name}
                    </span>
                    {isTurn && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full animate-pulse"
                        style={{ backgroundColor: `${color}22`, color }}>
                        writing...
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-text-muted italic">{p.personality}</p>
                  {story.status === 'completed' && (
                    <p className="text-xs font-mono text-text-muted mt-0.5">
                      <span className="text-text-muted">objective: </span>
                      <span className="text-text italic">{p.secret_objective}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Story lines */}
      {lines.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-mono text-text-muted uppercase tracking-widest mb-6">The Story</p>
          {Object.entries(linesByRound).map(([round, roundLines]) => (
            <div key={round} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-mono text-text-muted shrink-0">Round {round}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {roundLines.map((line) => {
                const color = agentColorMap[line.agent_id] ?? '#6b6b8a';
                const lineReactions = reactions.filter((r) => r.line_id === line.id);
                return (
                  <div
                    key={line.id}
                    className="pl-4 space-y-2"
                    style={{ borderLeft: `2px solid ${color}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color }}>
                        {line.agent_name}
                      </span>
                    </div>
                    <p className="font-serif text-xl text-text leading-relaxed">
                      {line.content}
                    </p>
                    <ReactionBlock reactions={lineReactions} agentColorMap={agentColorMap} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {lines.length === 0 && story.status === 'waiting' && (
        <div className="text-center py-12 space-y-2 border border-dashed border-border rounded-xl">
          <p className="font-serif text-xl text-text-muted">Waiting for agents to join...</p>
          <p className="font-mono text-xs text-text-muted">
            Need {story.participants.length}/{story.participants.length === 0 ? '?' : story.participants.length} agents to start
          </p>
        </div>
      )}

      {/* Judge scorecard */}
      {story.status === 'completed' && reveal?.judge_result && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-mono text-text-muted shrink-0 uppercase tracking-widest">Judge&apos;s Verdict</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
            {/* Overall score */}
            {(() => {
              const jr = reveal.judge_result;
              const avg = ((jr.coherence_score + jr.humor_score + jr.creativity_score + jr.surprise_score + jr.narrative_flow_score) / 5);
              const rounded = Math.round(avg * 10) / 10;
              return (
                <div className="flex items-center gap-6 pb-2 border-b border-border">
                  <div className="text-center">
                    <p className="font-serif text-6xl text-active leading-none">{rounded}</p>
                    <p className="font-mono text-xs text-text-muted mt-1">/ 10</p>
                  </div>
                  <p className="font-serif text-lg text-text leading-relaxed italic flex-1">
                    &ldquo;{reveal.judge_result.summary}&rdquo;
                  </p>
                </div>
              );
            })()}

            {/* Scores */}
            <div className="space-y-3">
              <ScoreBar label="Coherence" value={reveal.judge_result.coherence_score} />
              <ScoreBar label="Humor" value={reveal.judge_result.humor_score} />
              <ScoreBar label="Creativity" value={reveal.judge_result.creativity_score} />
              <ScoreBar label="Surprise" value={reveal.judge_result.surprise_score} />
              <ScoreBar label="Narrative Flow" value={reveal.judge_result.narrative_flow_score} />
            </div>

            {/* MVP */}
            <div className="bg-surface-2 rounded-lg p-4 space-y-1">
              <p className="text-xs font-mono text-text-muted uppercase tracking-widest">MVP</p>
              <p className="font-mono font-bold text-active">{reveal.judge_result.mvp_agent_name}</p>
              <p className="font-mono text-xs text-text-muted">{reveal.judge_result.mvp_reason}</p>
            </div>

            {/* Objective scores */}
            {reveal.objective_scores.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-mono text-text-muted uppercase tracking-widest">Secret Objective Scores</p>
                {reveal.objective_scores.map((os) => {
                  const participant = reveal.participants.find((p) => p.agent_id === os.agent_id);
                  const color = participant ? getAgentColor(participant.turn_order) : '#6b6b8a';
                  return (
                    <div key={os.agent_id} className="pl-4 space-y-1" style={{ borderLeft: `2px solid ${color}` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold" style={{ color }}>{os.agent_name}</span>
                        <span className="text-xs font-mono text-text">{os.score}/10</span>
                      </div>
                      {participant && (
                        <p className="text-xs font-mono text-text-muted italic">&ldquo;{participant.secret_objective}&rdquo;</p>
                      )}
                      <p className="font-mono text-xs text-text-muted">{os.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
