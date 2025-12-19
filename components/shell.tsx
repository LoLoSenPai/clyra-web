"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Brush, Flame } from "lucide-react";
import { EmptyAccounts } from "@/components/views/empty-accounts";
import { BurnNftsBasic } from "@/components/views/burn-nfts-basic";
import dynamic from "next/dynamic";

type Tab = "close" | "burn";

const WalletMultiButton = dynamic(
    () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
    { ssr: false }
);

export function Shell() {
    const [tab, setTab] = useState<Tab>("close");

    const tabs = useMemo(
        () => [
            { id: "close" as const, label: "Close empty accounts", icon: Brush },
            { id: "burn" as const, label: "Burn NFTs (basic)", icon: Flame },
        ],
        []
    );

    return (
        <div className="relative min-h-dvh overflow-hidden">
            {/* Background */}
            <div className="pointer-events-none absolute inset-0 opacity-60">
                <div className="absolute -top-40 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-600/25 blur-3xl" />
                <div className="absolute -bottom-40 left-1/3 h-130 w-130 rounded-full bg-cyan-500/20 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.08)_1px,transparent_0)] bg-size:[22px_22px]" />
            </div>

            <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                        <Image src="/icon.png" alt="Clyra Logo" width={40} height={40} />
                    </div>
                    <div className="leading-tight">
                        <div className="text-lg font-semibold">Clyra Web</div>
                        <div className="text-xs text-neutral-300">Clean your Solana wallet, fast.</div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <WalletMultiButton className="rounded-2xl bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15" />
                </div>
            </header>

            <main className="relative z-20 mx-auto w-full max-w-6xl px-4 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-3xl bg-white/5 mt-7 ring-1 ring-white/10 backdrop-blur"
                >
                    {/* <div className="flex flex-wrap items-center gap-2">
                        {tabs.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={[
                                        "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ring-1 transition",
                                        active
                                            ? "bg-white/15 ring-white/20"
                                            : "bg-white/5 ring-white/10 hover:bg-white/10",
                                    ].join(" ")}
                                >
                                    <Icon className="h-4 w-4" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div> */}

                    <div className="">
                        {tab === "close" ? <EmptyAccounts /> : <BurnNftsBasic />}
                    </div>
                </motion.div>
            </main>

            <footer className="relative z-10 border-t border-white/10">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-neutral-300">
                        Complete app available on mobile
                    </div>

                    {/* Badge “Available on Seeker” (custom simple SVG local) */}
                    <Image
                        src="/solana-dapp-store-badge.png"
                        alt="Available on Seeker"
                        width={170}
                        height={20}
                        className="relative cursor-pointer"
                    />
                </div>
            </footer>
        </div>
    );
}
