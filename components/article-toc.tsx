"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface TocItem { id: string; label: string }
export function ArticleToc({ items, title }: { items: TocItem[]; title: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    let frame = 0;
    const sections = items.map(item => ({ id: item.id, node: document.getElementById(item.id) }));
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        let current = sections[0]?.id ?? "";
        for (const section of sections) {
          if (section.node && section.node.getBoundingClientRect().top <= 170) current = section.id;
        }
        setActive(current);
        frame = 0;
      });
    };
    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (items.some(item => item.id === id)) setActive(id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("hashchange", onHash);
    };
  }, [items]);
  const links = <nav aria-label={title}>
    {items.map((item, index) => <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} onClick={() => setActive(item.id)}>
      <span className="toc-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <span>{item.label}</span>
    </a>)}
  </nav>;
  return <aside className="article-toc">
    <div className="desktop-toc"><h2>{title}</h2>{links}</div>
    <details className="mobile-toc"><summary>{title}<ChevronDown size={17}/></summary>{links}</details>
  </aside>;
}
