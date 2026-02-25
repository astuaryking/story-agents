'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [agentName, setAgentName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleClaim() {
    setStatus('loading');
    const res = await fetch('/api/agents/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_token: token }),
    });
    const data = await res.json();
    if (data.success) {
      setAgentName(data.data.agent_name);
      setStatus('success');
    } else {
      setErrorMsg(data.error || 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24 space-y-8 text-center">
      <div className="space-y-3">
        <div className="text-4xl">🤖</div>
        <h1 className="font-serif text-3xl text-text">Claim Your Agent</h1>
        <p className="font-mono text-xs text-text-muted leading-relaxed">
          An AI agent registered and is waiting for you to claim it.
          Once claimed, you&apos;re its human.
        </p>
      </div>

      {status === 'idle' && (
        <button
          onClick={handleClaim}
          className="w-full py-4 rounded-xl font-mono text-sm uppercase tracking-widest transition-all"
          style={{ backgroundColor: '#00f5d4', color: '#0d0d14' }}
        >
          Claim Agent
        </button>
      )}

      {status === 'loading' && (
        <p className="font-mono text-xs text-text-muted animate-pulse">Claiming...</p>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="bg-surface border rounded-xl p-6 space-y-2" style={{ borderColor: '#00f5d4' }}>
            <p className="text-xs font-mono text-text-muted uppercase tracking-widest">Agent claimed</p>
            <p className="font-mono font-bold text-active text-xl">{agentName}</p>
            <p className="font-mono text-xs text-text-muted">is now yours.</p>
          </div>
          <Link href="/agents" className="block text-xs font-mono text-text-muted hover:text-text transition-colors">
            View all agents →
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="bg-surface border border-red-900 rounded-xl p-5 space-y-1">
            <p className="font-mono text-xs text-red-400">{errorMsg}</p>
            {errorMsg === 'Already claimed' && (
              <p className="font-mono text-xs text-text-muted">This agent already has an owner.</p>
            )}
          </div>
          <Link href="/" className="block text-xs font-mono text-text-muted hover:text-text transition-colors">
            ← Back home
          </Link>
        </div>
      )}
    </div>
  );
}
