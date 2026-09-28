import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus, MapPin } from "lucide-react";
import { clinic, copy, whatsapp, type Locale } from "@/content/site";
import { pagePath, routeNames, articlePath, type PageKey } from "@/content/routes";
import { treatmentDetails, type TreatmentKey } from "@/content/details";
import { articles, categoryNames } from "@/content/articles";
import { pressCoverage } from "@/content/press";
import { PageHeading } from "./page-heading";
import { TreatmentCards } from "./treatment-cards";
import { Results } from "./results";
import { ArticleList } from "./article-list";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
function Faq({ lang, items }: {lang: Locale; items: {question:string;answer:string}[]}) {
  return <section className="section faq-section" data-reveal><div><h2><strong>{lang === "tr" ? "AKLINIZDAKİ" : "YOUR"}</strong><br/><span>{lang === "tr" ? "SORULAR." : "QUESTIONS."}</span></h2></div><div className="faq-list">{items.map(item => <details key={item.question} name="questions"><summary>{item.question}<Plus size={20}/></summary><p>{item.answer}</p></details>)}</div></section>;
}
function Process({lang}: {lang:Locale}) {
  const steps = lang === "tr" ? [
    ["Tanışalım", "Sorularınızı ve beklentilerinizi ilk görüşmede dinliyoruz."],
    ["Birlikte planlayalım", "Muayene ve değerlendirme sonrasında uygulamanın kapsamını konuşuyoruz."],
    ["İletişimde kalalım", "İşlem sonrasındaki sorularınız ve takip görüşmeleri için buradayız."],
  ] : [
    ["Let’s meet", "We listen to your questions and expectations at your first visit."],
    ["Plan together", "After an examination and assessment, we discuss the scope of treatment."],
    ["Stay in touch", "We are here for your questions and follow-up appointments afterwards."],
  ];
  return <section className="process-section"><div className="section"><div className="section-heading" data-reveal><h2><strong>{lang === "tr" ? "İLK GÖRÜŞMEDEN" : "FROM THE FIRST"}</strong><br/><span>{lang === "tr" ? "SONRAKİ ADIMA." : "CONVERSATION."}</span></h2></div><div className="process-grid">{steps.map(([title,text],index) => <article key={title} data-reveal><span className="process-number" aria-hidden="true">0{index+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>;
}
export function TreatmentPage({ lang, treatment }: {lang:Locale;treatment:TreatmentKey}) {
  const t = treatmentDetails[lang][treatment];
  return <><PageHeading title={t.strong} light={t.light}/>
    <section className="section detail-intro" data-reveal><h2>{t.heading}</h2><div><p className="lead-paragraph">{t.body}</p><div className="focus-list">{t.focus.map(item => <div key={item.title}><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></div></section>
    <Process lang={lang}/>
    {treatment === "hair" && <section className="results-section"><div className="section"><div className="section-heading heading-row" data-reveal><h2><strong>{copy[lang].results.title}</strong><br/><span>{copy[lang].results.light}</span></h2><Link href={pagePath(lang,"results")} className="text-link">{routeNames[lang].results}<ArrowUpRight size={18}/></Link></div><Results lang={lang} text={copy[lang].results}/></div></section>}
    <Faq lang={lang} items={t.questions}/>
    <section className="section related-section"><div className="section-heading" data-reveal><h2><strong>{lang === "tr" ? "DİĞER" : "OTHER"}</strong><br/><span>{lang === "tr" ? "UYGULAMALAR." : "TREATMENTS."}</span></h2></div><TreatmentCards lang={lang} exclude={treatment} methods={false}/></section>
  </>;
}
export function TreatmentsPage({lang}: {lang:Locale}) {
  return <><PageHeading title={lang === "tr" ? "UYGULAMALARIMIZ." : "OUR TREATMENTS."}/>
    <section className="section"><TreatmentCards lang={lang}/></section><Process lang={lang}/></>;
}
export function ResultsPage({lang}: {lang:Locale}) {
  return <><PageHeading title={lang === "tr" ? "ÖNCESİ" : "BEFORE"} light={lang === "tr" ? "VE SONRASI." : "& AFTER."}/>
    <section className="results-section"><div className="section"><Results lang={lang} text={copy[lang].results}/></div></section>
    <section className="section next-step" data-reveal><h2>{lang === "tr" ? "Sizin için neler yapılabilir?" : "What could work for you?"}</h2><p>{lang === "tr" ? "Beklentilerinizi ve uygulama seçeneklerini bir görüşmede birlikte ele alalım." : "Let’s discuss your expectations and treatment options at a consultation."}</p><Link href={pagePath(lang,"treatments")} className="button button-petrol">{routeNames[lang].treatments}<ArrowUpRight size={18}/></Link></section>
  </>;
}
export function ClinicPage({lang}: {lang:Locale}) {
  const t=copy[lang];
  return <><PageHeading title={lang === "tr" ? "KLİNİĞİMİZ." : "OUR CLINIC."}/>
    <section className="section clinic-story" data-reveal><div className="clinic-story-photo"><Image src="/media/team.webp" alt={t.about.team} fill sizes="(max-width:760px) 90vw, 650px"/></div><div><h2><strong>{lang === "tr" ? "TANIŞMAKLA" : "IT STARTS WITH"}</strong><br/><span>{lang === "tr" ? "BAŞLAYALIM." : "A CONVERSATION."}</span></h2><p className="lead-paragraph">{t.about.body}</p><p>{t.about.second}</p><a className="text-link" href={whatsapp(lang)} {...external}>{t.about.cta}<ArrowUpRight size={19}/></a></div></section>
    <Process lang={lang}/>
    <section className="section" data-reveal><div className="visit-card"><div><MapPin size={30}/><h2>{lang === "tr" ? "Ankara’da buluşalım." : "Meet us in Ankara."}</h2><address>{clinic.address}</address><a className="button button-petrol" href={clinic.maps} {...external}>{t.contact.directions}<ArrowUpRight size={19}/></a></div><div className="visit-card-aside"><span>YDA</span><span>CENTER</span><p>Çankaya / Ankara</p></div></div></section>
  </>;
}
export function MethodsPage({lang}: {lang:Locale}) {
  const entries = lang === "tr" ? [
    ["FUE", "Köklerin alınması", "Saç kökü gruplarının donör bölgeden tek tek alınmasını ifade eder. Donör alan ve ekim planı muayenede birlikte değerlendirilir."],
    ["DHI", "Köklerin yerleştirilmesi", "DHI adı, köklerin implanter araçlarla yerleştirilmesi için kullanılır. Köklerin alınması ve yerleştirilmesi, planlamanın farklı aşamalarıdır."],
    ["PRP", "Kişisel değerlendirme", "Kişinin kanından hazırlanan, trombosit bakımından yoğun plazmanın kullanıldığı bir uygulamadır. Uygunluğu, beklenen yararı ve sınırları hekim değerlendirmesiyle ele alınır."],
  ] : [
    ["FUE", "Collecting follicles", "FUE refers to removing follicular units individually from the donor area. The donor area and transplant plan are assessed at a consultation."],
    ["DHI", "Placing follicles", "DHI is a name used for placing follicles with implanter tools. Collection and placement are different stages of the transplant plan."],
    ["PRP", "An individual assessment", "PRP uses platelet-rich plasma prepared from a person’s own blood. Suitability, expected benefits and limitations should be discussed with a clinician."],
  ];
  return <><PageHeading title="FUE, DHI" light={lang === "tr" ? "VE PRP." : "& PRP."}/>
    <section className="section method-details">{entries.map(([name,title,body]) => <article className="method-detail-card" key={name} data-reveal><span>{name}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}<p className="content-source">{lang === "tr" ? "Daha fazla bilgi:" : "Further reading:"} <a href="https://ishrs.org/patients/treatments-for-hair-loss/surgical-treatments/" {...external}>ISHRS · FUE & DHI<ArrowUpRight size={12}/></a><a href="https://ishrs.org/patients/treatments-for-hair-loss/medications/platelet-rich-plasma/" {...external}>ISHRS · PRP<ArrowUpRight size={12}/></a></p></section>
    <section className="process-section"><div className="section next-step" data-reveal><h2>{lang === "tr" ? "Seçenekleri birlikte konuşalım." : "Let’s discuss the options."}</h2><p>{lang === "tr" ? "Hangi uygulamanın sizin için uygun olduğunu muayenede değerlendirebiliriz." : "An in-person assessment helps us discuss what may be appropriate for you."}</p><a className="button button-teal" href={whatsapp(lang)} {...external}>{copy[lang].about.cta}<ArrowUpRight size={18}/></a></div></section>
  </>;
}
export function JournalPage({lang}: {lang:Locale}) {
  const teasers=articles.map(article=>({id:article.id, href:articlePath(lang,article.id), title:article.content[lang].title, excerpt:article.content[lang].excerpt, image:article.image, category:categoryNames[lang][article.category], categoryId:article.category}));
  return <><PageHeading title={lang === "tr" ? "MAKALE" : "OUR"} light={lang === "tr" ? "KÖŞESİ." : "ARTICLES."}/>
    <section className="section journal-list"><ArticleList topicsTitle={lang === "tr" ? "Konular" : "Topics"} articles={teasers} filters={Object.entries(categoryNames[lang]).map(([id,label])=>({id,label}))} label={lang === "tr" ? "Yazıları konuya göre filtrele" : "Filter articles by topic"}/></section></>;
}
export function PressPage({lang}: {lang:Locale}) {
  return <><PageHeading title={lang === "tr" ? "BASINDA" : "IN THE"} light={lang === "tr" ? "BİZ." : "PRESS."}/>
    {pressCoverage.length > 0 && <section className="section press-list">{pressCoverage.map(item => <a key={item.id} href={item.sourceUrl} {...external} className="press-item" data-reveal><span>{item.publication}<time dateTime={item.publishedAt}>{new Date(item.publishedAt).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", {year:"numeric",month:"long",day:"numeric",timeZone:"UTC"})}</time></span><div><h2>{item.title[lang]}</h2><p>{item.excerpt[lang]}</p></div><ArrowUpRight size={25}/></a>)}</section>}
    <section className="section press-contact" data-reveal><div><h2><strong>{lang === "tr" ? "BASIN" : "PRESS"}</strong><br/><span>{lang === "tr" ? "İLETİŞİMİ." : "ENQUIRIES."}</span></h2><p className="lead-paragraph">{lang === "tr" ? "Bir haber veya röportaj için görüşmek ister misiniz?" : "Working on a story or an interview?"}</p><p>{lang === "tr" ? "Yayın talepleriniz ve kliniğimiz hakkında bilgi almak için ekibimize ulaşabilirsiniz." : "Contact our team for publication enquiries and information about the clinic."}</p><a href={whatsapp(lang,lang === "tr" ? "basın ve röportaj talepleri" : "press and interview enquiries")} {...external} className="button button-petrol">{lang === "tr" ? "Ekibimize ulaşın" : "Contact our team"}<ArrowUpRight size={18}/></a></div><Link href={pagePath(lang,"clinic")} className="press-clinic-card"><Image src="/media/team.webp" alt={copy[lang].about.team} fill sizes="(max-width:760px) 90vw, 550px"/><div><h3>Capilora Hair Clinic</h3><span>{lang === "tr" ? "Kliniğimizi tanıyın" : "Meet our clinic"}<ArrowUpRight size={20}/></span></div></Link></section>
  </>;
}
export function DetailPage({lang,page}: {lang:Locale;page:PageKey}) {
  switch (page) {
    case "hair": case "beard": case "eyebrow": return <TreatmentPage lang={lang} treatment={page}/>;
    case "treatments": return <TreatmentsPage lang={lang}/>;
    case "results": return <ResultsPage lang={lang}/>;
    case "clinic": return <ClinicPage lang={lang}/>;
    case "methods": return <MethodsPage lang={lang}/>;
    case "journal": return <JournalPage lang={lang}/>;
    case "press": return <PressPage lang={lang}/>;
    default: return null;
  }
}
