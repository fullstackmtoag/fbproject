import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await query('SELECT 1');
    return Response.json({ ok: true, db: 'up' });
  } catch {
    // Do not leak connection details or error messages.
    return Response.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
