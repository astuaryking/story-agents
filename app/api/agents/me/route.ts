import { NextRequest } from 'next/server';
import { successResponse, errorResponse, getAgentFromRequest } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const agent = getAgentFromRequest(req.headers.get('authorization'));
  if (!agent) return errorResponse('Unauthorized', 'Include Authorization: Bearer YOUR_API_KEY', 401);
  return successResponse({ agent });
}
