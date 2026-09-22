"use client";

import { useState, type ReactNode } from "react";

/**
 * Foto real com plano B: se o navegador não conseguir carregar (URL expirada, bloqueio),
 * aparece o placeholder em vez de uma imagem quebrada. A página nunca depende da foto (RF-14).
 */
export function SafeImage({
  src,
  alt,
  className = "",
  rounded = "rounded-[10px]",
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  rounded?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-canvas ${rounded} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
