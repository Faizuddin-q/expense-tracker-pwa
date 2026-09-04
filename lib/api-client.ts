export type FetchTiming = {
  url: string;
  method: string;
  ms: number;
  serverMs: number | null;
  ok: boolean;
};

type FetchJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; message: string };

const recentTimings: FetchTiming[] = [];
const MAX_TIMINGS = 12;
const listeners = new Set<(timings: FetchTiming[]) => void>();

const notify = () => {
  const snapshot = recentTimings.slice();
  for (const listener of listeners) listener(snapshot);
};

export const subscribeFetchTimings = (
  listener: (timings: FetchTiming[]) => void
) => {
  listeners.add(listener);
  listener(recentTimings.slice());
  return () => {
    listeners.delete(listener);
  };
};

export const getRecentFetchTimings = (): FetchTiming[] => recentTimings.slice();

export const formatFetchMs = (ms: number): string =>
  ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

export const shortApiPath = (url: string): string => {
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url;
    return path;
  } catch {
    return url;
  }
};

export const clearFetchTimings = () => {
  recentTimings.length = 0;
  notify();
};

const parseServerMs = (header: string | null): number | null => {
  if (!header) return null;
  const handler = /(?:^|,)\s*handler;dur=([\d.]+)/i.exec(header);
  if (handler) return Number(handler[1]);
  const total = /(?:^|,)\s*total;dur=([\d.]+)/i.exec(header);
  if (total) return Number(total[1]);
  return null;
};

const recordTiming = (timing: FetchTiming) => {
  recentTimings.push(timing);
  if (recentTimings.length > MAX_TIMINGS) {
    recentTimings.splice(0, recentTimings.length - MAX_TIMINGS);
  }
  const server =
    timing.serverMs != null ? ` (server ${Math.round(timing.serverMs)}ms)` : '';
  console.info(
    `[pockett] ${timing.method} ${timing.url} ${Math.round(timing.ms)}ms${server}`
  );
  notify();
};

export async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const started = performance.now();
  try {
    const response = await fetch(input, init);
    const body = await response.json();
    const ms = performance.now() - started;
    recordTiming({
      url: input,
      method,
      ms,
      serverMs: parseServerMs(response.headers.get('Server-Timing')),
      ok: response.ok,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: body?.error?.message ?? 'Request failed',
      };
    }
    return { ok: true, status: response.status, data: body.data as T };
  } catch (error) {
    recordTiming({
      url: input,
      method,
      ms: performance.now() - started,
      serverMs: null,
      ok: false,
    });
    throw error;
  }
}
