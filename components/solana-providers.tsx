"use client";

import { useEffect, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
    createDefaultAuthorizationCache,
    createDefaultChainSelector,
    createDefaultWalletNotFoundHandler,
    registerMwa,
} from "@solana-mobile/wallet-standard-mobile";

export function SolanaProviders({ children }: { children: React.ReactNode }) {
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

    const wallets = useMemo(
        () => [],
        []
    );

    // Enregistre MWA (Android/Seeker) côté client uniquement (non-SSR).
    useEffect(() => {
        try {
            registerMwa({
                appIdentity: {
                    name: "Clyra Web",
                    uri: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                    icon: "clyra-icon.png", // place un fichier dans /public/clyra-icon.png
                },
                authorizationCache: createDefaultAuthorizationCache(),
                chains: ["solana:mainnet"],
                chainSelector: createDefaultChainSelector(),
                onWalletNotFound: createDefaultWalletNotFoundHandler(),
                // remoteHostAuthority: volontairement omis (endpoint “reflector” pas stable/standard partout)
            });
        } catch {
            // no-op
        }
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
