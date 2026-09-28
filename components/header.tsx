"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { type Locale, type PageCopy } from "@/content/site";
import type { ContentData } from "@/lib/cms/types";
import { pagePath } from "@/content/routes";

export function Header({ lang, text, settings, translations }: { lang: Locale; text: Pick<PageCopy, "home" | "contactCta" | "menuOpen" | "menuClose">; settings: ContentData; translations: Record<string,string> }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    const onHash = () => setHash(window.location.hash);
    onScroll(); onHash();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("hashchange", onHash); };
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const otherLang = lang === "tr" ? "en" : "tr";
  const closeMenu = () => setOpen(false);
  return <header className={`site-header ${pathname !== pagePath(lang, "home") ? "inner-header" : ""} ${scrolled ? "scrolled" : ""} ${open ? "menu-open" : ""}`}>
    <div className="header-inner">
      <Link href={pagePath(lang, "home")} className="brand" aria-label={`Capilora — ${text.home}`} onClick={closeMenu}>
        <Image src={settings.logo||"/media/logo.webp"} unoptimized={settings.logo.startsWith("/api/media/")} alt="" width={56} height={56} className="brand-emblem" />
        <span className="brand-name">{settings.wordmark}<span>{settings.brandSubtitle}</span></span>
      </Link>
      <div className="header-right">
        <nav className="desktop-nav" aria-label={lang === "tr" ? "Ana menü" : "Main navigation"}>
          {settings.menu.map(item => item.children.length ? <details key={item.id} className="nav-dropdown"><summary>{item.label}<ChevronDown size={13}/></summary><div className="nav-dropdown-panel">{item.children.map(child=><Link key={child.id} href={child.href} aria-current={pathname===child.href?'page':undefined} onClick={e=>{const el=e.currentTarget.closest('details');if(el)el.open=false;}}>{child.label}<ArrowUpRight size={15}/></Link>)}</div></details> : <Link key={item.id} href={item.href} aria-current={pathname===item.href?'page':undefined}>{item.label}</Link>)}
          <a className="nav-cta" href="#contact">{text.contactCta}</a>
        </nav>
      </div>
      <div className="header-tools">
        {translations[pathname] && <Link className="lang-switch" href={`${translations[pathname]}${hash}`} hrefLang={otherLang} lang={otherLang} onClick={closeMenu} aria-label={otherLang === "en" ? "View in English" : "Türkçe görüntüle"}><span>{lang.toUpperCase()}</span><span className="lang-divider">/</span>{otherLang.toUpperCase()}</Link>}
        <button ref={menuButton} className="menu-toggle" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? text.menuClose : text.menuOpen} onClick={()=>setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </div>
    <nav id="mobile-menu" className="mobile-nav" aria-label={lang === "tr" ? "Mobil menü" : "Mobile navigation"} hidden={!open}>
      {settings.menu.map(item => <Link key={item.id} href={item.href} aria-current={pathname===item.href ? "page" : undefined} onClick={closeMenu}>{item.label}<ArrowUpRight size={18}/></Link>)}
      <a href="#contact" className="mobile-cta" onClick={closeMenu}>{text.contactCta}</a>
    </nav>
  </header>;
}
