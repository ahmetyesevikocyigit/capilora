import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { articles, categoryNames } from "@/content/articles";
import { articlePath, pagePath } from "@/content/routes";
import type { Locale } from "@/content/site";
import { ArticleCard } from "./article-card";
export function JournalTeaser({ lang }: {lang: Locale}) {
  return <section className="section journal-teaser" aria-labelledby="journal-title">
    <div className="section-heading heading-row"><h2 id="journal-title"><strong>{lang === "tr" ? "MAKALE" : "FROM OUR"}</strong><br/><span>{lang === "tr" ? "KÖŞESİ." : "ARTICLES."}</span></h2><Link className="text-link" href={pagePath(lang,"journal")}>{lang === "tr" ? "Tüm yazılar" : "All articles"}<ArrowUpRight size={19}/></Link></div>
    <div className="journal-preview-grid">{articles.map(article => <ArticleCard key={article.id} article={{id:article.id, href:articlePath(lang,article.id), title:article.content[lang].title, excerpt:article.content[lang].excerpt, image:article.image, category:categoryNames[lang][article.category], categoryId:article.category}}/>)}</div>
  </section>;
}
