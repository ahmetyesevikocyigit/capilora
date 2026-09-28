"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function HeroVideo({desktop="/media/hero-desktop.mp4",mobile="/media/hero-mobile.mp4",poster="/media/hero-poster.webp"}: {desktop?:string;mobile?:string;poster?:string}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if(!video) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & {connection?: {saveData?:boolean}}).connection;
    const load = () => {
      if (!video.getAttribute("src")) video.src = window.matchMedia("(max-width: 700px)").matches ? mobile : desktop;
    };
    const update = () => {
      if(preference.matches || connection?.saveData) video.pause();
      else {load(); void video.play().catch(()=>setPlaying(false));}
    };
    update();
    preference.addEventListener("change", update);
    const visibility = () => { if(document.hidden) video.pause(); else update(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); };
  }, [desktop,mobile]);
  return <div className="hero-media" aria-hidden="true">
      <Image className="hero-poster" src={poster} unoptimized={poster.startsWith("/api/media/")} alt="" fill priority fetchPriority="high" sizes="100vw" />
      <video ref={ref} className={playing ? "is-playing" : ""} muted loop playsInline preload="none" onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setPlaying(false)} />
    </div>;
}
