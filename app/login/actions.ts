'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  timingSafeEqualString,
} from '@/lib/session';

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');
  const expected = process.env.DASHBOARD_PASSWORD ?? '';
  const match = await timingSafeEqualString(password, expected);
  if (!expected || !match) return { error: 'Incorrect password' };

  let token: string;
  try {
    token = await signSession();
  } catch {
    return { error: 'Could not sign in' };
  }

  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  redirect('/');
}

export async function logout() {
  (await cookies()).set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  redirect('/login');
}
