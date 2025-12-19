import { NextResponse } from "next/server";

type JupToken = {
  id: string; // mint
  name?: string;
  symbol?: string;
  icon?: string;
};

type TokenMeta = { name: string; symbol: string; icon?: string };

// mini cache mémoire (ok en dev / serveur long-lived)
const g = globalThis as unknown as {
  __JUP_CACHE__?: Map<string, { at: number; data: TokenMeta }>;
};
g.__JUP_CACHE__ ??= new Map();
const CACHE = g.__JUP_CACHE__;
const TTL_MS = 1000 * 60 * 30; // 30 min

export async function POST(req: Request) {
  const apiKey = process.env.JUP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing JUP_API_KEY" }, { status: 500 });
  }

  const body = (await req.json()) as { mints?: string[] };
  const mintsRaw = (body.mints ?? []).filter(Boolean);

  // unique + garde l'ordre stable
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const m of mintsRaw) {
    if (!seen.has(m)) {
      seen.add(m);
      mints.push(m);
    }
  }

  if (mints.length === 0) return NextResponse.json({ tokensByMint: {} });

  // pour rester sur “1 requête”, on prend max 100
  const slice = mints.slice(0, 100);

  // répond depuis cache si possible
  const now = Date.now();
  const tokensByMint: Record<string, TokenMeta> = {};
  const toFetch: string[] = [];

  for (const mint of slice) {
    const hit = CACHE.get(mint);
    if (hit && now - hit.at < TTL_MS) tokensByMint[mint] = hit.data;
    else toFetch.push(mint);
  }

  if (toFetch.length > 0) {
    const query = encodeURIComponent(toFetch.join(","));
    const url = `https://api.jup.ag/tokens/v2/search?query=${query}`;

    const res = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Jupiter error ${res.status}`, details: text },
        { status: 502 }
      );
    }

    const arr = (await res.json()) as JupToken[];

    for (const t of arr) {
      if (!t?.id) continue;
      const meta: TokenMeta = {
        name: t.name ?? "Unknown token",
        symbol: t.symbol ?? "",
        icon: t.icon,
      };
      tokensByMint[t.id] = meta;
      CACHE.set(t.id, { at: now, data: meta });
    }
  }

  return NextResponse.json({
    tokensByMint,
    limitedTo100: mints.length > 100,
    totalRequested: mints.length,
    totalReturned: Object.keys(tokensByMint).length,
  });
}
