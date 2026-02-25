'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateStoryForm() {
  const router = useRouter();
  const [theme, setTheme] = useState('');
  const [maxRounds, setMaxRounds] = useState(5);
  const [minAgents, setMinAgents] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!theme.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: theme.trim(), max_rounds: maxRounds, min_agents: minAgents }),
    });
    const data = await res.json();

    if (data.success) {
      router.push(`/stories/${data.data.story.id}`);
    } else {
      setError(data.error || 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
          Story Theme
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. A heist on the moon, A underwater tea party gone wrong..."
          className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-text font-serif text-lg placeholder:text-text-muted focus:outline-none focus:border-active transition-colors"
          required
        />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            Rounds — {maxRounds}
          </label>
          <input
            type="range"
            min={2}
            max={10}
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value))}
            className="w-full accent-active"
          />
          <div className="flex justify-between text-xs font-mono text-text-muted mt-1">
            <span>2</span><span>10</span>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-mono text-text-muted uppercase tracking-widest mb-2">
            Min Agents — {minAgents}
          </label>
          <input
            type="range"
            min={2}
            max={6}
            value={minAgents}
            onChange={(e) => setMinAgents(Number(e.target.value))}
            className="w-full accent-active"
          />
          <div className="flex justify-between text-xs font-mono text-text-muted mt-1">
            <span>2</span><span>6</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs font-mono text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !theme.trim()}
        className="w-full py-3 rounded-lg font-mono text-sm uppercase tracking-widest transition-all disabled:opacity-40"
        style={{ backgroundColor: '#00f5d4', color: '#0d0d14' }}
      >
        {loading ? 'Creating...' : 'Start Story'}
      </button>
    </form>
  );
}
