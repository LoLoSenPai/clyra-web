"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";
import type { EmptyTokenAccount } from "@/hooks/use-empty-token-accounts";

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(
      () => rej(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([p, timeout]).finally(() => t && clearTimeout(t));
}

function isUserRejected(err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  const msg = (e.message ?? "").toLowerCase();

  const name =
    err &&
    typeof err === "object" &&
    "name" in err &&
    typeof (err as { name: unknown }).name === "string"
      ? (err as { name: string }).name.toLowerCase()
      : "";

  const combined = `${name} ${msg}`;

  return (
    combined.includes("walletsigntransactionerror") ||
    combined.includes("walletsendtransactionerror") ||
    combined.includes("user rejected") ||
    combined.includes("rejected") ||
    combined.includes("declined") ||
    combined.includes("denied") ||
    combined.includes("cancel")
  );
}

export function useCloseEmptyAccounts() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, signAllTransactions } =
    useWallet();
  const [closing, setClosing] = useState(false);

  // sécurité: change wallet / disconnect => unlock
  useEffect(() => {
    setClosing(false);
  }, [connected, publicKey?.toBase58()]);

  const closeSelected = useCallback(
    async (
      items: EmptyTokenAccount[],
      selected: Set<string>
    ): Promise<boolean> => {
      if (!publicKey) return false;

      const targets = items.filter(
        (x) => selected.has(x.address) && x.closable
      );
      if (targets.length === 0) return false;

      setClosing(true);

      try {
        const { blockhash, lastValidBlockHeight } = await withTimeout(
          connection.getLatestBlockhash("confirmed"),
          15_000,
          "getLatestBlockhash"
        );

        const instrs: TransactionInstruction[] = targets.map((a) =>
          createCloseAccountInstruction(
            new PublicKey(a.address),
            publicKey, // destination
            publicKey, // authority
            [],
            new PublicKey(a.programId) // Token / Token-2022
          )
        );

        const makeTx = (ixs: TransactionInstruction[]) => {
          const tx = new Transaction();
          tx.feePayer = publicKey;
          tx.recentBlockhash = blockhash;
          tx.add(...ixs);
          return tx;
        };

        const confirm = async (sig: string) => {
          await withTimeout(
            connection.confirmTransaction(
              { signature: sig, blockhash, lastValidBlockHeight },
              "confirmed"
            ),
            45_000,
            "confirmTransaction"
          );
        };

        // 1) Try single tx
        try {
          const tx = makeTx(instrs);
          const sig = await withTimeout(
            sendTransaction(tx, connection, { maxRetries: 3 }),
            60_000,
            "sendTransaction (single)"
          );
          await confirm(sig);
          return true;
        } catch (e) {
          // si user reject => stop direct (sinon on repart en fallback et ça peut rehanger)
          if (isUserRejected(e)) return false;
          console.warn("Single-tx close failed, fallback to chunking:", e);
        }

        // 2) Fallback chunking
        for (const size of [24, 16, 8, 4]) {
          try {
            const txs = chunk(instrs, size).map(makeTx);

            if (signAllTransactions) {
              const signed = await withTimeout(
                signAllTransactions(txs),
                60_000,
                "signAllTransactions"
              );

              for (const stx of signed) {
                const sig = await withTimeout(
                  connection.sendRawTransaction(stx.serialize(), {
                    skipPreflight: false,
                    maxRetries: 3,
                  }),
                  60_000,
                  "sendRawTransaction"
                );
                await confirm(sig);
              }
            } else {
              for (const tx of txs) {
                const sig = await withTimeout(
                  sendTransaction(tx, connection, { maxRetries: 3 }),
                  60_000,
                  "sendTransaction (chunk)"
                );
                await confirm(sig);
              }
            }

            return true;
          } catch (err) {
            if (isUserRejected(err)) return false;
            console.warn(`Chunk size ${size} failed, trying smaller…`, err);
          }
        }

        return false;
      } catch (err) {
        if (isUserRejected(err)) return false;
        console.warn(err);
        return false;
      } finally {
        setClosing(false);
      }
    },
    [connection, publicKey, sendTransaction, signAllTransactions]
  );

  return { closing, closeSelected };
}
