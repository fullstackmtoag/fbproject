import { loadEnvConfig } from '@next/env';

// Load .env.local / .env the same way Next.js does (before lib/db reads env).
loadEnvConfig(process.cwd());

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function num(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? 'null' : value.toFixed(digits);
}

function pct(value: number | null): string {
  return value === null ? 'n/a' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

async function run(label: string, fn: () => Promise<void>) {
  section(label);
  try {
    await fn();
  } catch (err) {
    console.error('ERROR:', err instanceof Error ? err.message : err);
  }
}

async function main() {
  // Imported after env is loaded. Run with `tsx --conditions=react-server` so
  // `import 'server-only'` resolves to its no-op build (see "test:queries").
  const q = await import('../lib/queries');
  const { pool } = await import('../lib/db');

  const filters = q.normalizeFilters({ platform: 'all', days: 30 });
  console.log('filters:', filters);

  await run('getAccounts', async () => {
    const accounts = await q.getAccounts();
    for (const a of accounts) {
      console.log(
        `${a.platform.padEnd(9)} ${a.name ?? a.username}  followers=${a.followers}  updated=${a.updatedAt}`,
      );
    }
  });

  await run('getLastSync', async () => {
    const run = await q.getLastSync();
    console.log(run ? `#${run.id} ${run.status} started=${run.startedAt} finished=${run.finishedAt}` : 'none');
  });

  await run('getOverview', async () => {
    const o = await q.getOverview(filters);
    console.log('current :', o.current);
    console.log('previous:', o.previous);
    console.log(
      `change  : posts ${pct(o.change.totalPosts)}, engagement ${pct(o.change.totalEngagement)}, avg ${pct(o.change.avgEngagement)}`,
    );
  });

  await run('getTrend', async () => {
    const trend = await q.getTrend(filters);
    console.log(`days with posts: ${trend.length}`);
    console.table(trend.slice(-5));
  });

  await run('getTopPosts (limit 3)', async () => {
    const top = await q.getTopPosts(filters, 3);
    for (const p of top) {
      console.log(
        `${p.platform.padEnd(9)} eng=${p.engagement}  ${p.contentType}  ${p.createdTime.slice(0, 10)}  ${(p.content ?? '').slice(0, 50).replace(/\s+/g, ' ')}`,
      );
    }
  });

  await run('getPosts', async () => {
    const posts = await q.getPosts(filters);
    console.log(`count: ${posts.length}`);
    console.log(
      `newest: ${posts[0]?.createdTime ?? 'n/a'}   oldest: ${posts.at(-1)?.createdTime ?? 'n/a'}`,
    );
    console.log(`with engagement: ${posts.filter((p) => p.engagement !== null).length}`);
  });

  await run('getContentTypeStats', async () => {
    const stats = await q.getContentTypeStats(filters);
    console.table(
      stats.map((s) => ({
        type: s.contentType,
        posts: s.posts,
        avgEng: num(s.avgEngagement),
        avgLikes: num(s.avgLikes),
        avgComments: num(s.avgComments),
      })),
    );
  });

  await run('getBestTimeStats', async () => {
    const s = await q.getBestTimeStats(filters);
    console.log(`totalPosts=${s.totalPosts}  cells=${s.cells.length}`);
    console.log(
      'byWeekday:',
      s.byWeekday.map((w) => `${WEEKDAYS[w.weekday]}=${w.posts}p/${num(w.avgEngagement)}`).join('  '),
    );
    console.log(
      'byHour (non-empty):',
      s.byHour
        .filter((h) => h.posts > 0)
        .map((h) => `${h.hour}h=${h.posts}p/${num(h.avgEngagement)}`)
        .join('  '),
    );
    console.log(`bestWeekday: ${s.bestWeekday === null ? 'null' : WEEKDAYS[s.bestWeekday]}`);
    console.log(
      'bestWindow :',
      s.bestWindow
        ? `${s.bestWindow.startHour}:00-${s.bestWindow.endHour}:00  posts=${s.bestWindow.posts}  avgEng=${num(s.bestWindow.avgEngagement)}`
        : 'null',
    );
  });

  await run('getCaptionStats', async () => {
    const s = await q.getCaptionStats(filters);
    console.log('byLength  :', s.byLength.map((b) => `${b.bucket}=${b.posts}p/${num(b.avgEngagement)}`).join('  '));
    console.log('byHashtags:', s.byHashtags.map((b) => `${b.bucket}=${b.posts}p/${num(b.avgEngagement)}`).join('  '));
  });

  await run('getAudience', async () => {
    const a = await q.getAudience();
    for (const key of ['age', 'gender', 'city', 'country'] as const) {
      const top = a[key].slice(0, 3).map((s) => `${s.label}:${s.value}`).join(', ');
      console.log(`${key.padEnd(8)} ${a[key].length} slices  top: ${top || '(none)'}`);
    }
  });

  await run('getAccountSeries (instagram, 30d)', async () => {
    const series = await q.getAccountSeries('instagram', 30);
    console.log(`points: ${series.length}`);
    console.table(series.slice(-5));
  });

  await run('getAccountSeries (facebook, 0 = all)', async () => {
    const series = await q.getAccountSeries('facebook', 0);
    console.log(`points: ${series.length}`);
    console.table(series.slice(-3));
  });

  // All-time sanity check: previous must be null and counts must be >= 30d counts.
  await run('getOverview (all time)', async () => {
    const o = await q.getOverview(q.normalizeFilters({ platform: 'all', days: 0 }));
    console.log(`totalPosts=${o.current.totalPosts}  previous=${o.previous}  change.posts=${o.change.totalPosts}`);
  });

  await pool.end();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('test-queries failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
