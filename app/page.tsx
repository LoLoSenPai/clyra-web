import { SolanaProviders } from "@/components/solana-providers";
import { Shell } from "@/components/shell";

export default function Page() {
  return (
    <SolanaProviders>
      <Shell />
    </SolanaProviders>
  );
}
