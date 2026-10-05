import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface GraphBody {
  id?: string;
  error?: { code?: unknown };
}

function numericCode(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pageId = process.env.PAGE_ID;
  const pageToken = process.env.PAGE_ACCESS_TOKEN;
  const version = process.env.GRAPH_VERSION || 'v24.0';
  if (!pageId || !pageToken) {
    return Response.json({ ok: false, code: 190 });
  }

  try {
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}?fields=id,name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${pageToken}` },
      cache: 'no-store',
    });

    let body: GraphBody | null = null;
    try {
      body = (await res.json()) as GraphBody;
    } catch {
      body = null;
    }

    if (body?.error) {
      return Response.json({ ok: false, code: numericCode(body.error.code, res.status) });
    }
    if (!res.ok || !body?.id) {
      return Response.json({ ok: false, code: res.status || 0 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, code: 0 });
  }
}
