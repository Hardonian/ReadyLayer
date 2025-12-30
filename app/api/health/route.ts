export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';

export async function GET() {
  const health = await healthChecker.checkHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
