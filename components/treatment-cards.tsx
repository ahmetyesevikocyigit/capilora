import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { copy, type Locale } from "@/content/site";
import { pagePath, treatmentKeys, type PageKey } from "@/content/routes";
export function TreatmentCards({ lang, exclude, methods = true }: { lang: Locale; exclude?: PageKey; methods?: boolean }) {
  const t = copy[lang].services;
  return <><div className={`service-grid ${exclude ? "related-treatments" : ""}`}>
    {t.items.map((service,index) => treatmentKeys[index] !== exclude && <article className="service-card" key={service.title} style={{"--stack-index":index} as CSSProperties}>
      <Link className="service-card-link" href={pagePath(lang,treatmentKeys[index])}>
        <div className="service-card-image"><Image src={service.image} alt={service.alt} fill sizes="(max-width:760px) 90vw, 400px"/></div>
        <div className="service-card-body"><h3>{service.title}</h3><p>{service.text}</p></div>
      </Link>
    </article>)}
  </div>{methods && <article className="method-card"><Link className="method-card-link" href={pagePath(lang,"methods")}><div className="method-card-copy"><h3>{t.methodTitle}</h3><p>{t.methodText}</p></div><span className="method-card-arrow" aria-hidden="true"><ArrowUpRight size={24}/></span></Link></article>}</>;
}
