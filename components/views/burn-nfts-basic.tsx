"use client";

import { useMemo, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    unpackAccount,
    getMint,
    createBurnInstruction,
    createCloseAccountInstruction,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Flame, RefreshCw } from "lucide-react";
import { shortPk } from "@/lib/format";

type NftLike = {
    tokenAccount: string;
    mint: string;
    programId: string;
    programLabel: "Token" | "Token-2022";
};

const PROGRAMS = [
    { id: TOKEN_PROGRAM_ID, label: "Token" as const },
    { id: TOKEN_2022_PROGRAM_ID, label: "Token-2022" as const },
];

export function BurnNftsBasic() {
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();

    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<NftLike[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [burning, setBurning] = useState(false);

    const scan = async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const out: NftLike[] = [];

            for (const p of PROGRAMS) {
                const res = await connection.getTokenAccountsByOwner(publicKey, { programId: p.id });

                for (const it of res.value) {
                    const parsed = unpackAccount(it.pubkey, it.account, p.id);

                    // candidat: balance=1
                    if (parsed.amount !== 1n) continue;

                    // vérif mint: decimals=0 & supply=1 => “NFT-like” simple
                    const mintInfo = await getMint(connection, parsed.mint, "confirmed", p.id);
                    if (mintInfo.decimals !== 0) continue;
                    if (mintInfo.supply !== 1n) continue;

                    out.push({
                        tokenAccount: it.pubkey.toBase58(),
                        mint: parsed.mint.toBase58(),
                        programId: p.id.toBase58(),
                        programLabel: p.label,
                    });
                }
            }

            setItems(out);
            setSelected(new Set(out.map((x) => x.mint)));
        } finally {
            setLoading(false);
        }
    };

    const burnSelected = async () => {
        if (!publicKey) return;
        const targets = items.filter((x) => selected.has(x.mint));
        if (targets.length === 0) return;

        setBurning(true);
        try {
            for (const t of targets) {
                const tx = new Transaction();
                tx.feePayer = publicKey;

                const programId = new PublicKey(t.programId);
                const mint = new PublicKey(t.mint);
                const tokenAccount = new PublicKey(t.tokenAccount);

                tx.add(
                    createBurnInstruction(
                        tokenAccount,
                        mint,
                        publicKey,
                        1n,
                        [],
                        programId // Token ou Token-2022 :contentReference[oaicite:7]{index=7}
                    )
                );

                tx.add(
                    createCloseAccountInstruction(
                        tokenAccount,
                        publicKey,
                        publicKey,
                        [],
                        programId
                    )
                );

                const sig = await sendTransaction(tx, connection);
                await connection.confirmTransaction(sig, "confirmed");
            }
        } finally {
            setBurning(false);
        }
    };

    const subtitle = useMemo(() => {
        if (!connected) return "Connecte un wallet pour scanner tes NFTs “simples”.";
        return "Détecte des NFTs basiques (supply=1, decimals=0), puis burn + close.";
    }, [connected]);

    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="text-base font-semibold">Burn NFTs (basic)</div>
                        <div className="text-sm text-neutral-300">{subtitle}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={scan}
                            disabled={!connected || loading || burning}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            Scan NFTs
                        </button>

                        <button
                            onClick={burnSelected}
                            disabled={!connected || loading || burning || selected.size === 0}
                            className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-2 text-sm ring-1 ring-rose-400/25 hover:bg-rose-500/20 disabled:opacity-50"
                        >
                            <Flame className="h-4 w-4" />
                            Burn ({selected.size})
                        </button>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl bg-white/5 ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div className="text-sm text-neutral-300">
                        {loading ? "Scanning..." : `${items.length} NFT(s) trouvés`}
                    </div>
                </div>

                <div className="max-h-130 overflow-auto">
                    {items.length === 0 ? (
                        <div className="p-6 text-sm text-neutral-300">Clique sur “Scan NFTs”.</div>
                    ) : (
                        <ul className="divide-y divide-white/10">
                            {items.map((n) => {
                                const checked = selected.has(n.mint);
                                return (
                                    <li key={n.mint} className="flex items-center gap-3 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                                const next = new Set(selected);
                                                if (e.target.checked) next.add(n.mint);
                                                else next.delete(n.mint);
                                                setSelected(next);
                                            }}
                                            className="h-4 w-4 rounded border-white/20 bg-white/10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs ring-1 ring-white/10">
                                                    {n.programLabel}
                                                </span>
                                                <span className="text-sm font-medium">mint {shortPk(n.mint)}</span>
                                                <span className="text-xs text-neutral-400">ata {shortPk(n.tokenAccount)}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <p className="text-xs text-neutral-400">
                Note: ça ne gère pas les cNFTs / Core / cas exotiques. C’est volontairement “safe & simple”.
            </p>
        </div>
    );
}
