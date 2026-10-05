import { timingSafeEqualString } from '@/lib/session';
import { syncAll } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const match = await timingSafeEqualString(provided, secret);
  if (!secret || !match) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAll();
    return Response.json(result, { status: result.status === 'failed' ? 500 : 200 });
  } catch {
    return Response.json({ status: 'failed', error: 'Sync could not run' }, { status: 500 });
  }
}
