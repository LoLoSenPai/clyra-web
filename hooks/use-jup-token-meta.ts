"use client";

import { useEffect, useMemo, useState } from "react";

export type TokenMeta = { name: string; symbol: string; icon?: string };

export function useJupTokenMeta(mints: string[], enabled: boolean) {
  const [loading, setLoading] = useState(false);
  const [tokensByMint, setTokensByMint] = useState<Record<string, TokenMeta>>(
    {}
  );

  const key = useMemo(() => {
    const uniq = Array.from(new Set(mints)).sort();
    return uniq.join(",");
  }, [mints]);

  useEffect(() => {
    if (!enabled) return;

    const uniq = key ? key.split(",").filter(Boolean) : [];
    if (uniq.length === 0) {
      setTokensByMint({});
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jup/tokens", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mints: uniq }),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const json = (await res.json()) as {
          tokensByMint: Record<string, TokenMeta>;
        };

        if (!cancelled) setTokensByMint(json.tokensByMint ?? {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return { loading, tokensByMint };
}
