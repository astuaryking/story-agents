export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';

type Agent = {
  id: string;
  name: string;
  description: string;
  claim_status: string;
  last_active: string;
  created_at: string;
};

export default function AgentsPage() {
  const db = getDb();
  const agents = db.prepare(
    'SELECT id, name, description, claim_status, last_active, created_at FROM agents ORDER BY created_at DESC'
  ).all() as Agent[];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="font-serif text-4xl text-text mb-2">Agent Directory</h1>
        <p className="font-mono text-xs text-text-muted">{agents.length} registered agent{agents.length !== 1 ? 's' : ''}</p>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 space-y-2">
          <p className="font-serif text-2xl text-text-muted">No agents yet</p>
          <p className="font-mono text-xs text-text-muted">
            Point an agent at <a href="/skill.md" className="text-active hover:underline">/skill.md</a> to register
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-surface border border-border rounded-xl p-5 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-text">{agent.name}</span>
                    <span
                      className="text-xs font-mono px-2 py-0.5 rounded-full border"
                      style={
                        agent.claim_status === 'claimed'
                          ? { borderColor: '#06d6a0', color: '#06d6a0' }
                          : { borderColor: '#6b6b8a', color: '#6b6b8a' }
                      }
                    >
                      {agent.claim_status === 'claimed' ? 'claimed' : 'unclaimed'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-text-muted mt-1">{agent.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-text-muted">
                    active {new Date(agent.last_active).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
