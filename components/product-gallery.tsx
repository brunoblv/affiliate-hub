"use client";

import { useState } from "react";
import { Photo } from "./photo";
import { SafeImage } from "./safe-image";

/** Foto principal + miniaturas: clicar numa miniatura troca a foto principal, sem sair da página. */
export function ProductGallery({ name, images }: { name: string; images: { url: string; alt: string }[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {images.length > 1 ? (
        <ul className="flex flex-none gap-2.5 overflow-x-auto sm:flex-col sm:overflow-visible" aria-label="Miniaturas">
          {images.map((image, index) => (
            <li key={image.url} className="flex-none">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                aria-current={index === active ? "true" : undefined}
                className={`block h-16 w-16 overflow-hidden rounded-[9px] border bg-canvas ${
                  index === active ? "border-[1.5px] border-brand" : "border-line hover:border-muted"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex aspect-square flex-1 items-center justify-center rounded-[14px] border border-line bg-surface">
        {current ? (
          <SafeImage
            key={current.url}
            src={current.url}
            alt={current.alt || name}
            className="h-[78%] w-[78%]"
            rounded="rounded-xl"
            fallback={<Photo className="h-[78%] w-[78%]" rounded="rounded-xl" />}
          />
        ) : (
          <Photo className="h-[78%] w-[78%]" rounded="rounded-xl" />
        )}
      </div>
    </div>
  );
}
