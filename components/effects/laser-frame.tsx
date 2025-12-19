"use client";

import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

// adapte le chemin vers ton composant LaserFlow
const LaserFlow = dynamic(() => import("./LaserFlow"), { ssr: false });

type Props = PropsWithChildren<{
    className?: string;
    // hauteur du “haut” du laser au-dessus du container (pour que ça parte d’en haut)
    overshootTopPx?: number;
}>;

export default function LaserFrame({
    children,
    className,
    overshootTopPx = 420,
}: Props) {
    return (
        <div className={`relative overflow-hidden ${className ?? ""}`}>
            {/* FX layer */}
            <div
                className="pointer-events-none absolute inset-x-0 bottom-0"
                style={{
                    top: -overshootTopPx,
                    height: `calc(100% + ${overshootTopPx}px)`,
                    zIndex: 0,
                }}
            >
                <LaserFlow
                    horizontalBeamOffset={0.1}
                    verticalBeamOffset={0.0}
                    color="#FF79C6"
                />
            </div>

            {/* Content layer */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
