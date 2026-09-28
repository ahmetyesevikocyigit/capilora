import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { copy, whatsapp, type Locale } from "@/content/site";
import { pagePath, routeNames, type PageKey } from "@/content/routes";

const relatedPages: PageKey[] = ["hair", "methods", "results"];
export function ArticleSidebar({ lang }: { lang: Locale }) {
  const t = copy[lang];
  return <aside className="article-sidebar" aria-label={lang === "tr" ? "Klinik ve ilgili sayfalar" : "Clinic and related pages"}>
    <div className="article-clinic-card">
      <Link className="reading-wordmark" href={pagePath(lang, "clinic")} aria-label={routeNames[lang].clinic}>capilora<span>HAIR CLINIC</span></Link>
      <p>{t.contact.footer}</p>
      <p className="reading-location">YDA Center<br/>Çankaya / Ankara</p>
      <a className="button button-petrol" href={whatsapp(lang)} target="_blank" rel="noopener noreferrer">{t.about.cta}<ArrowUpRight size={16}/></a>
      <Link className="reading-clinic-link" href={pagePath(lang, "clinic")}>{lang === "tr" ? "Kliniğimizi tanıyın" : "Meet our clinic"}<ArrowUpRight size={15}/></Link>
    </div>
    <nav className="article-related-links" aria-label={lang === "tr" ? "İlgili sayfalar" : "Related pages"}>
      <h2>{lang === "tr" ? "İlgili sayfalar" : "Related pages"}</h2>
      {relatedPages.map(key => <Link key={key} href={pagePath(lang, key)}>{routeNames[lang][key]}<ArrowUpRight size={16}/></Link>)}
    </nav>
  </aside>;
}
