export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { healthChecker } from '../../../observability/health';

export async function GET() {
  const ready = await healthChecker.checkReady();
  const statusCode = ready.status === 'ready' ? 200 : 503;
  return NextResponse.json(ready, { status: statusCode });
}
