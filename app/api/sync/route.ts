import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { syncAll } from '@/lib/sync';

export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAll();
    // `partial` still did useful work, so it is a 200; only a full failure is 500.
    return Response.json(result, { status: result.status === 'failed' ? 500 : 200 });
  } catch {
    // Reached only if sync_runs itself could not be written (e.g. DB down).
    // Do not leak connection details or error messages.
    return Response.json({ status: 'failed', error: 'Sync could not run' }, { status: 500 });
  }
}
