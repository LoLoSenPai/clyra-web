"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { X, List, RefreshCw, Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useEmptyTokenAccounts } from "@/hooks/use-empty-token-accounts";
import { useCloseEmptyAccounts } from "@/hooks/use-close-empty-accounts";
import { useJupTokenMeta } from "@/hooks/use-jup-token-meta";
import { lamportsToSol, shortPk } from "@/lib/format";
import LaserFrame from "@/components/effects/laser-frame";

type MintGroup = {
    mint: string;
    items: {
        address: string;
        mint: string;
        lamports: number;
        closable: boolean;
        programId: string;
        programLabel: string;
    }[];
    totalLamports: number;
    count: number;
};

function uniq<T>(arr: T[]) {
    return Array.from(new Set(arr));
}

async function copyToClipboard(text: string) {
    // navigator.clipboard marche sur https + localhost
    await navigator.clipboard.writeText(text);
}

export function EmptyAccounts() {
    const { publicKey, connected } = useWallet();
    const [showDetails, setShowDetails] = useState(false);
    const [copiedMint, setCopiedMint] = useState<string | null>(null);

    // ✅ On force hideNonClosable = true : on ne veut JAMAIS les voir.
    const {
        loading,
        items,
        reload,
        selected,
        setSelected,
        totalLamportsSelected,
        totalCountSelected,
    } = useEmptyTokenAccounts({ hideNonClosable: true });

    const { closing, closeSelected } = useCloseEmptyAccounts();

    const estSol = useMemo(
        () => lamportsToSol(totalLamportsSelected, 5),
        [totalLamportsSelected]
    );

    // Grouper par mint (et ne garder que les closable pour être sûr)
    const groups = useMemo<MintGroup[]>(() => {
        const closableItems = items.filter((x) => x.closable);
        const byMint = new Map<string, MintGroup>();

        for (const it of closableItems) {
            const g = byMint.get(it.mint);
            if (!g) {
                byMint.set(it.mint, {
                    mint: it.mint,
                    items: [it],
                    totalLamports: it.lamports,
                    count: 1,
                });
            } else {
                g.items.push(it);
                g.totalLamports += it.lamports;
                g.count += 1;
            }
        }

        return Array.from(byMint.values());
    }, [items]);

    const mints = useMemo(() => uniq(groups.map((g) => g.mint)), [groups]);

    const { tokensByMint: metaByMint, loading: metaLoading } = useJupTokenMeta(
        mints,
        connected && mints.length > 0
    );

    // Trier : known d'abord, unknown à la fin
    const sortedGroups = useMemo(() => {
        const getLabel = (mint: string) => {
            const m = metaByMint[mint];
            if (!m) return "";
            const sym = (m.symbol ?? "").trim();
            const name = (m.name ?? "").trim();
            return sym || name;
        };

        return [...groups].sort((a, b) => {
            const ma = metaByMint[a.mint];
            const mb = metaByMint[b.mint];
            const aKnown = !!ma?.symbol || !!ma?.name;
            const bKnown = !!mb?.symbol || !!mb?.name;

            if (aKnown !== bKnown) return aKnown ? -1 : 1;

            const la = getLabel(a.mint).toLowerCase();
            const lb = getLabel(b.mint).toLowerCase();
            return la.localeCompare(lb);
        });
    }, [groups, metaByMint]);

    const headline = useMemo(() => {
        if (!connected) return "Connect wallet";
        if (loading) return "Scanning…";
        if (groups.length === 0) return "No empty accounts found";
        return "Unclaimed SOL";
    }, [connected, loading, groups.length]);

    const subline = useMemo(() => {
        if (!connected) return "Close empty token accounts and recover rent.";
        if (loading) return "Fetching token accounts…";
        return `${totalCountSelected} account(s) selected · ${groups.length} token(s)`;
    }, [connected, loading, totalCountSelected, groups.length]);

    // Helpers selection "par mint"
    const groupCheckedState = (g: MintGroup) => {
        let checkedCount = 0;
        for (const it of g.items) if (selected.has(it.address)) checkedCount++;
        const all = checkedCount === g.items.length && g.items.length > 0;
        const none = checkedCount === 0;
        return { all, none, some: !all && !none };
    };

    const toggleGroup = (g: MintGroup) => {
        const { all } = groupCheckedState(g);
        const next = new Set(selected);

        if (all) {
            for (const it of g.items) next.delete(it.address);
        } else {
            for (const it of g.items) next.add(it.address);
        }
        setSelected(next);
    };

    const selectAll = () => {
        const next = new Set<string>();
        for (const g of groups) for (const it of g.items) next.add(it.address);
        setSelected(next);
    };

    const selectNone = () => setSelected(new Set());

    return (
        <div className="space-y-4">
            {/* Top bar */}
            {/* <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="text-lg font-semibold">Claim SOL</div>
                        <div className="text-sm text-neutral-300">{subline}</div>
                        {publicKey ? (
                            <div className="mt-1 text-xs text-neutral-400">
                                Wallet: {shortPk(publicKey.toBase58())}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={reload}
                            disabled={!connected || loading || closing}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                            title="Rescan"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Rescan
                        </button>
                    </div>
                </div> */}

            {/* Main card */}
            <div className="relative overflow-hidden rounded-4xl bg-white/5 p-8 ring-1 ring-white/10">
                <div className="pointer-events-none absolute -top-24 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-1/3 h-105 w-105 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative mx-auto grid max-w-2xl place-items-center gap-6 text-center">
                    <div className="text-sm tracking-[0.22em] text-emerald-300/90 uppercase">
                        {headline}
                    </div>

                    <button
                        onClick={reload}
                        disabled={!connected || loading || closing}
                        className=" absolute top-2 -right-35 inline-flex items-end gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                        title="Rescan"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Rescan
                    </button>

                    <div className="text-5xl md:text-6xl font-semibold tracking-tight tabular-nums">
                        {connected && !loading ? (
                            <>
                                <span className="text-neutral-100">+{estSol}</span>{" "}
                                <span className="text-neutral-300">SOL</span>
                            </>
                        ) : (
                            <span className="text-neutral-400">—</span>
                        )}
                    </div>

                    {/* Animated broom */}
                    <div className="relative">
                        <motion.div
                            className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl"
                            animate={closing ? { opacity: [0.35, 0.65, 0.35] } : { opacity: 0.35 }}
                            transition={closing ? { duration: 0.6, repeat: Infinity } : { duration: 0.6 }}
                        />
                        <div className="relative grid h-40 w-40 place-items-center rounded-3xl bg-white/5 ring-1 ring-white/10">
                            <motion.div
                                className="text-6xl select-none"
                                animate={
                                    closing
                                        ? { rotate: [0, -10, 10, -10, 0], y: [0, -3, 0] }
                                        : { y: [0, -6, 0] }
                                }
                                transition={
                                    closing
                                        ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
                                        : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                }
                            >
                                🧹
                            </motion.div>
                        </div>
                    </div>

                    <button
                        onClick={() => closeSelected(items, selected)}
                        disabled={!connected || loading || closing || totalCountSelected === 0}
                        className="w-full max-w-md rounded-2xl bg-emerald-400 px-5 py-3 text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.15)] hover:brightness-95 disabled:opacity-50 cursor-pointer"
                    >
                        {closing ? "Claiming…" : "Claim SOL"}
                    </button>

                    <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                        <button
                            onClick={() => setShowDetails(true)}
                            disabled={!connected || groups.length === 0}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                        >
                            <List className="h-4 w-4" />
                            Details
                        </button>

                        <div className="text-xs text-neutral-400">
                            Estimate excludes fees · selected {totalCountSelected}
                            {metaLoading ? " · loading token names…" : ""}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drawer */}
            {showDetails ? (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowDetails(false)} />

                    <div className="absolute right-0 top-0 h-dvh w-full max-w-lg bg-neutral-950/95 ring-1 ring-white/10 backdrop-blur flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <div className="text-sm font-semibold">Details</div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 hover:bg-white/10"
                            >
                                <X className="h-4 w-4" />
                                Close
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="px-4 py-3 space-y-2 border-b border-white/10">
                            <div className="text-xs text-neutral-300">
                                {groups.length} token(s) · {totalCountSelected} account(s) selected · +{estSol} SOL
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs text-neutral-400">
                                    Tip: deselect tokens you plan to reuse soon.
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={selectNone}
                                        disabled={groups.length === 0}
                                        className="text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                                    >
                                        Select none
                                    </button>
                                    <button
                                        onClick={selectAll}
                                        disabled={groups.length === 0}
                                        className="text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                                    >
                                        Select all
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Body scroll */}
                        <div className="flex-1 overflow-auto pb-24">
                            {sortedGroups.length === 0 ? (
                                <div className="p-6 text-sm text-neutral-300">No accounts.</div>
                            ) : (
                                <ul className="divide-y divide-white/10">
                                    {sortedGroups.map((g) => {
                                        const meta = metaByMint[g.mint];
                                        const symbol = (meta?.symbol ?? "").trim();
                                        const name = (meta?.name ?? "").trim();
                                        const icon = meta?.icon;

                                        const title = symbol ? `$${symbol}` : name || "Unknown token";
                                        const subtitle = symbol && name ? name : "";
                                        const isUnknown = !symbol && !name;

                                        const { all, some } = groupCheckedState(g);

                                        return (
                                            <li key={g.mint} className="flex items-center gap-3 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={all}
                                                    ref={(el) => {
                                                        if (el) el.indeterminate = some;
                                                    }}
                                                    onChange={() => toggleGroup(g)}
                                                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                                                />

                                                {/* Icon */}
                                                <div className="h-11 w-11 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10 grid place-items-center">
                                                    {icon ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={icon}
                                                            alt={meta?.symbol ?? meta?.name ?? "token"}
                                                            className="h-10 w-10 rounded-full"
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10" />
                                                    )}
                                                </div>

                                                {/* Text */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="truncate text-sm font-medium">{title}</div>
                                                        {g.count > 1 ? (
                                                            <span className="text-xs text-neutral-400">×{g.count}</span>
                                                        ) : null}
                                                    </div>

                                                    {subtitle ? (
                                                        <div className="truncate text-xs text-neutral-400">{subtitle}</div>
                                                    ) : null}

                                                    {isUnknown ? (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <code className="truncate text-[11px] text-neutral-400">
                                                                {g.mint}
                                                            </code>

                                                            <button
                                                                onClick={async () => {
                                                                    await copyToClipboard(g.mint);
                                                                    setCopiedMint(g.mint);
                                                                    window.setTimeout(() => {
                                                                        setCopiedMint((cur) => (cur === g.mint ? null : cur));
                                                                    }, 900);
                                                                }}
                                                                className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-neutral-200 ring-1 ring-white/10 hover:bg-white/10"
                                                                title="Copy mint"
                                                            >
                                                                {copiedMint === g.mint ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                )}
                                                                Copy
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/10 px-4 py-4">
                            <button
                                onClick={() => closeSelected(items, selected)}
                                disabled={!connected || loading || closing || totalCountSelected === 0}
                                className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-50"
                            >
                                {closing ? "Claiming…" : `Claim SOL · +${estSol} SOL`}
                            </button>

                            <div className="mt-2 text-xs text-neutral-400">
                                Non-closable accounts are hidden automatically.
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
