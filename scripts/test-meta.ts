import { loadEnvConfig } from '@next/env';

// Load .env.local / .env the same way Next.js does (before lib/meta reads env).
loadEnvConfig(process.cwd());

const DAY = 24 * 60 * 60 * 1000;

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

// Print only the first 2 items; drop the bulky `raw` object for readability.
function preview<T extends object>(items: T[]) {
  const first = items.slice(0, 2).map((item) => {
    const copy: Record<string, unknown> = { ...item };
    delete copy.raw;
    return copy;
  });
  console.log(`count: ${items.length}`);
  console.dir(first, { depth: null });
}

async function run<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  section(label);
  try {
    return await fn();
  } catch (err) {
    console.error('ERROR:', err instanceof Error ? err.message : err);
    return undefined;
  }
}

async function main() {
  // Imported after env is loaded. Run with `tsx --conditions=react-server` so
  // `import 'server-only'` resolves to its no-op build instead of throwing
  // (see "test:meta" in package.json).
  const meta = await import('../lib/meta');

  // ---- Facebook --------------------------------------------------------
  await run('getFbPage', async () => {
    const page = await meta.getFbPage();
    console.dir(page, { depth: null });
  });

  await run('getFbPosts', async () => {
    const posts = await meta.getFbPosts();
    preview(posts);
  });

  // ---- Instagram -------------------------------------------------------
  await run('getIgProfile', async () => {
    const profile = await meta.getIgProfile();
    console.dir(profile, { depth: null });
  });

  const media = await run('getIgMedia', async () => {
    const items = await meta.getIgMedia();
    preview(items);
    return items;
  });

  await run('getIgMediaInsights (first 2 media)', async () => {
    const ids = (media ?? []).slice(0, 2).map((m) => m.id);
    console.log(`count: ${ids.length}`);
    for (const id of ids) {
      const insights = await meta.getIgMediaInsights(id);
      console.log(id, insights);
    }
  });

  const until = new Date();
  const since = new Date(until.getTime() - 7 * DAY);

  await run('getIgAccountInsights (last 7 days)', async () => {
    const insights = await meta.getIgAccountInsights(since, until);
    console.dir(insights, { depth: null });
  });

  await run("getIgDailySeries('reach', last 7 days)", async () => {
    const series = await meta.getIgDailySeries('reach', since, until);
    preview(series);
  });

  for (const breakdown of ['age', 'gender', 'city', 'country'] as const) {
    await run(`getIgAudience('${breakdown}')`, async () => {
      const slices = await meta.getIgAudience(breakdown);
      preview(slices);
    });
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('test-meta failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
