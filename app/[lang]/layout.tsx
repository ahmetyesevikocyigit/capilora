import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { copy, isLocale, locales } from "@/content/site";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "../globals.css";
import "../articles.css";
import "../gallery.css";
import "../press.css";
import { siteSnapshot } from "@/lib/cms/public";
import { PreviewBar } from "@/components/admin/preview-bar";

const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/manrope-latin-ext.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-manrope", display: "swap", fallback: ["Arial", "sans-serif"],
});
export const viewport: Viewport = {themeColor: "#123c43"};
export const metadata: Metadata = { icons: { icon: "/media/logo.webp", apple: "/media/logo.webp" } };
export function generateStaticParams() { return locales.map(lang=>({lang})); }
export default async function RootLayout({children,params}: {children:React.ReactNode;params:Promise<{lang:string}>}) {
  const {lang} = await params;
  if(!isLocale(lang)) notFound();
  const t = copy[lang];
  const snapshot=await siteSnapshot(lang);
  return <html lang={lang} className={manrope.variable} data-scroll-behavior="smooth"><body id="top">
    <a href="#main" className="skip-link">{t.skip}</a>
    <Header lang={lang} settings={snapshot.settings} translations={snapshot.translations} text={{home:t.home,contactCta:snapshot.settings.headerCta,menuOpen:t.menuOpen,menuClose:t.menuClose}}/>
    {snapshot.preview&&<PreviewBar/>}
    {children}<Footer lang={lang} settings={snapshot.settings}/>
  </body></html>;
}
