"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";

export type EmptyTokenAccount = {
  address: string;
  mint: string;
  lamports: number;
  programId: string;
  programLabel: "Token" | "Token-2022";
  closable: boolean;
};

const PROGRAMS = [
  { id: TOKEN_PROGRAM_ID, label: "Token" as const },
  { id: TOKEN_2022_PROGRAM_ID, label: "Token-2022" as const },
];

export function useEmptyTokenAccounts({
  hideNonClosable,
}: {
  hideNonClosable: boolean;
}) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EmptyTokenAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!publicKey) return;
    // autoscan quand on connecte / change de wallet
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, hideNonClosable]);

  const scan = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const all: EmptyTokenAccount[] = [];

      for (const p of PROGRAMS) {
        const res = await connection.getTokenAccountsByOwner(publicKey, {
          programId: p.id,
        });

        for (const it of res.value) {
          const accPubkey = it.pubkey;
          const info = it.account;

          const parsed = unpackAccount(accPubkey, info, p.id); // amount est un bigint :contentReference[oaicite:5]{index=5}
          const isEmpty = parsed.amount === 0n;

          if (!isEmpty) continue;

          const closeAuth = parsed.closeAuthority; // null => owner par défaut
          const closable = !closeAuth || closeAuth.equals(publicKey);

          const row: EmptyTokenAccount = {
            address: accPubkey.toBase58(),
            mint: parsed.mint.toBase58(),
            lamports: info.lamports,
            programId: p.id.toBase58(),
            programLabel: p.label,
            closable,
          };

          if (hideNonClosable && !closable) continue;
          all.push(row);
        }
      }

      all.sort((a, b) => b.lamports - a.lamports);
      setItems(all);

      // auto-select tout ce qui est closable
      setSelected(new Set(all.filter((x) => x.closable).map((x) => x.address)));
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, hideNonClosable]);

  const reload = useCallback(() => {
    void scan();
  }, [scan]);

  const { totalLamportsSelected, totalCountSelected } = useMemo(() => {
    let lamports = 0;
    let count = 0;
    for (const it of items) {
      if (selected.has(it.address)) {
        lamports += it.lamports;
        count += 1;
      }
    }
    return { totalLamportsSelected: lamports, totalCountSelected: count };
  }, [items, selected]);

  return {
    loading,
    items,
    reload,
    selected,
    setSelected,
    totalLamportsSelected,
    totalCountSelected,
  };
}
