'use client';

import { useEffect, useState } from 'react';

/** Red banner when the Page token health check fails (including Meta code 190). */
export function TokenBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health/token')
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { ok?: boolean; code?: number };
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data.ok === false || data.code === 190) setShow(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div role="alert" className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
      Meta token invalid, regenerate token
    </div>
  );
}
