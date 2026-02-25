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
