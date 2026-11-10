import { gzipSync } from 'node:zlib';
import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit): NextResponse =>
  NextResponse.json({ data }, init);

/**
 * Same `{ data }` JSON as `ok`. When the caller accepts gzip and the body
 * is large, the bytes on the wire are compressed. `fetch` decompresses
 * them, so the parsed object does not change.
 */
export const okFor = <T>(request: Request, data: T): NextResponse => {
  const json = JSON.stringify({ data });
  const accept = request.headers.get('accept-encoding') ?? '';
  if (json.length < 1024 || !/\bgzip\b/i.test(accept)) return ok(data);

  const gzipped = gzipSync(json, { level: 1 });
  return new NextResponse(gzipped, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-encoding': 'gzip',
      vary: 'accept-encoding',
    },
  });
};

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
