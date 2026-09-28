"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

export type ClippingImage = { src: string; alt: string };

export function PressClipping({ images, title, lang, eager = false }: {
  images: ClippingImage[];
  title: string;
  lang: "tr" | "en";
  eager?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const cover = images[0];
  if (!cover) return null;

  return <>
    <button ref={trigger} type="button" className="press-clipping"
      aria-haspopup="dialog"
      aria-label={lang === "tr" ? `${title} — haber görselini büyüt` : `${title} — enlarge clipping`}
      onClick={() => setOpen(true)}>
      <Image src={cover.src} alt={cover.alt} width={2458} height={3072}
        loading={eager ? "eager" : "lazy"}
        sizes="(max-width: 760px) 90vw, 560px"
        unoptimized={cover.src.startsWith("/api/media/")} />
    </button>
    <dialog ref={dialog} className="press-reader" aria-labelledby={headingId}
      onClose={() => { setOpen(false); setZoomed(null); trigger.current?.focus({ preventScroll: true }); }}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {open && <div className="press-reader-content">
        <div className="press-reader-header">
          <h2 id={headingId}>{title}</h2>
          <button type="button" autoFocus onClick={() => dialog.current?.close()}>
            {lang === "tr" ? "Kapat" : "Close"}
          </button>
        </div>
        <div className="press-reader-images">
          {images.map((item, index) => <div className="press-reader-image" key={`${item.src}-${index}`}>
            <button type="button" className={`press-reader-zoom${zoomed === index ? " is-zoomed" : ""}`}
              aria-pressed={zoomed === index}
              aria-label={lang === "tr"
                ? `${index + 1}. görseli ${zoomed === index ? "küçült" : "yakınlaştır"}`
                : `${zoomed === index ? "Zoom out" : "Zoom in"} image ${index + 1}`}
              onClick={() => setZoomed(zoomed === index ? null : index)}>
              <Image src={item.src} alt={item.alt} width={2458} height={3072}
                sizes="(max-width: 760px) 100vw, 1100px" unoptimized />
            </button>
          </div>)}
        </div>
      </div>}
    </dialog>
  </>;
}
