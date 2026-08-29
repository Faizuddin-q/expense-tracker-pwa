import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit): NextResponse =>
  NextResponse.json({ data }, init);

export const fail = (
  message: string,
  status: number,
  extra?: Record<string, unknown>
): NextResponse =>
  NextResponse.json({ error: { message, ...extra } }, { status });
