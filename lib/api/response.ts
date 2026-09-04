import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit): NextResponse =>
  NextResponse.json({ data }, init);

export const fail = (
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse =>
  NextResponse.json({ error: { message, ...extra } }, { status });

export const stampServerTiming = (
  response: NextResponse,
  entries: Array<[name: string, ms: number]>
): NextResponse => {
  const parts = entries.map(
    ([name, ms]) => `${name};dur=${Math.max(0, ms).toFixed(1)}`
  );
  const existing = response.headers.get('Server-Timing');
  response.headers.set(
    'Server-Timing',
    existing ? `${existing}, ${parts.join(', ')}` : parts.join(', ')
  );
  return response;
};
