import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowUp, Instagram, Phone } from "lucide-react";
import { copy, type Locale } from "@/content/site";
import { wa, type ContentData } from "@/lib/cms/types";
import styles from "./footer.module.css";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export function Footer({ lang, settings: s }: { lang: Locale; settings: ContentData }) {
  const phoneHref=`tel:${s.phone.replace(/[^+\d]/g, "")}`;
  const t = copy[lang];
  const pagesLabel = lang === "tr" ? "Keşfedin" : "Explore";

  return <>
    <footer id="contact" className={styles.footer} aria-labelledby="contact-title">
      <div className={styles.inner}>
        <div className={styles.headingRow}>
          <div>
            <h2 id="contact-title"><strong>{s.footerTitle}</strong> <span>{s.footerLight}</span></h2>
            <p>{s.footerBody}</p>
          </div>
          <a className="button button-teal" href={wa(s)} {...external}>
            {s.footerCta}
          </a>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.brand}>
            <Link href={`/${lang}`} className={styles.wordmark} aria-label={`Capilora — ${t.home}`}>
              {s.wordmark}<span>{s.brandSubtitle}</span>
            </Link>
            <p>{s.footerTagline}</p>
            <a className={styles.phone} href={phoneHref}>
              {s.phone}<ArrowUpRight size={18} aria-hidden="true"/>
            </a>
            <a className={styles.social} href={s.instagram} {...external}>
              <Instagram size={17} aria-hidden="true"/>Instagram<ArrowUpRight size={14} aria-hidden="true"/>
            </a>
          </div>

          <nav className={styles.navigation} aria-label={pagesLabel}>
            <h3>{pagesLabel}</h3>
            {s.menu.map(item => <Link key={item.id} href={item.href}>{item.label}</Link>)}
          </nav>

          <div className={styles.location}>
            <h3>{t.contact.visit}</h3>
            <address>{s.address}</address>
            <a className={styles.directions} href={s.maps} {...external}>
              {t.contact.directions}<ArrowUpRight size={16} aria-hidden="true"/>
            </a>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>© {new Date().getFullYear()} {s.name}.<span>{s.footerRights}</span></p>
          <a className={styles.credit} href={s.creditUrl} {...external}>
            <span>{s.creditLabel}</span>
            <strong>{s.creditName}<ArrowUpRight size={13} aria-hidden="true"/></strong>
          </a>
          <a href="#top" className={styles.backTop} aria-label={t.contact.top}><ArrowUp size={19} aria-hidden="true"/></a>
        </div>
      </div>
    </footer>
    <a className="floating-contact floating-phone" href={phoneHref} aria-label={t.contact.call}><Phone size={23}/></a>
    <a className="floating-contact floating-whatsapp" href={wa(s)} {...external} aria-label={s.footerCta}><Image src="/media/whatsapp.svg" alt="" width={28} height={28}/></a>
  </>;
}
