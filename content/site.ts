export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const isLocale = (value: string): value is Locale => locales.includes(value as Locale);
export const clinic = {
  name: "Capilora Hair Clinic",
  phone: "+90 533 569 56 70",
  phoneHref: "tel:+905335695670",
  instagram: "https://www.instagram.com/capilora.hairtransplant/",
  maps: "https://www.google.com/maps?cid=417543237342101277",
  address: "YDA Center, Kızılırmak, Dumlupınar Bulvarı A1 Blok, Çankaya / Ankara",
  checkedAt: "2026-09-15",
  rating: 5,
  reviewCount: 64,
};
export function whatsapp(lang: Locale, subject?: string) {
  const text = lang === "tr"
    ? `Merhaba, Capilora'da ${subject || "saç ekimi"} hakkında bilgi almak istiyorum.`
    : `Hello, I would like to learn more about ${subject || "hair transplantation"} at Capilora.`;
  return `https://wa.me/905335695670?text=${encodeURIComponent(text)}`;
}
export interface ResultCase {
  id: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  before: string;
  after: string;
  sourceUrl: string;
  sourceDate: string;
  position: { before: string; after: string };
}
export const results: ResultCase[] = [
  {
    id: "hair-01", title: { tr: "Ön bölge saç ekimi", en: "Frontal hair transplant" },
    description: { tr: "Saç ekimi · Ön bölge", en: "Hair transplant · Frontal area" },
    before: "/media/result-01-before.webp", after: "/media/result-01-after.webp",
    sourceUrl: "https://www.instagram.com/capilora.hairtransplant/p/DdE5X-KjtfZ/", sourceDate: "2026-09-09",
    position: {before: "50% 50%", after: "50% 50%"},
  },
  {
    id: "hair-02", title: { tr: "Saç ekimi sonucu", en: "Hair transplant result" },
    description: { tr: "Saç ekimi · Genel görünüm", en: "Hair transplant · Overall view" },
    before: "/media/result-02-before.webp", after: "/media/result-02-after.webp",
    sourceUrl: "https://www.instagram.com/capilora.hairtransplant/p/Dc6FOGcCKoR/", sourceDate: "2026-09-05",
    position: {before: "50% 50%", after: "50% 50%"},
  },
];
export interface Review {
  author: string;
  rating: number;
  excerpt: Record<Locale, string>;
  sourceUrl: string;
  checkedAt: string;
}
export const reviews: Review[] = [
  { author: "turgay özmerd", rating: 5, excerpt: {tr: "…saç ekimi sürecinde ve sonrasında çok ilgili davrandılar…", en: "…they were very attentive during and after the hair transplant…"}, sourceUrl: clinic.maps, checkedAt: clinic.checkedAt },
  { author: "burak şimşek", rating: 5, excerpt: {tr: "Tüm ekip oldukça güler yüzlü ve ilgiliydi.", en: "The whole team was very friendly and attentive."}, sourceUrl: clinic.maps, checkedAt: clinic.checkedAt },
  { author: "ekrem dağdeviren", rating: 5, excerpt: {tr: "Saç ektireli 7 ay oldu sonuçlardan çok memnunum…", en: "It has been seven months since my hair transplant and I am very happy with the results…"}, sourceUrl: clinic.maps, checkedAt: clinic.checkedAt },
];
export const copy = {
  tr: {
    title: "Capilora Hair Clinic | Ankara Saç, Sakal ve Kaş Ekimi",
    description: "Ankara YDA Center’daki Capilora Hair Clinic’te saç, sakal ve kaş ekimi. Sonuçları inceleyin, bilgi ve randevu için kliniğimize ulaşın.",
    skip: "İçeriğe geç", home: "Ana sayfa", nav: ["Uygulamalar", "Sonuçlarımız", "Kliniğimiz", "Yorumlar", "İletişim"],
    contactCta: "Bize ulaşın", menuOpen: "Menüyü aç", menuClose: "Menüyü kapat",
    hero: { strong: "SAÇ EKİMİ.", light: "CAPILORA ANKARA.", description: "Saç, sakal ve kaş ekimi hakkında bilgi ve randevu için bize ulaşın.", results: "Sonuçları inceleyin", cta: "WhatsApp’tan bilgi alın" },
    services: { title: "SAÇ, SAKAL", light: "VE KAŞ EKİMİ.", intro: "Uygulama öncesinde saç yapınızı, ekim yapılacak bölgeyi ve beklentilerinizi değerlendiriyoruz.", items: [
      { title: "Saç Ekimi", text: "Donör bölgeyi ve saç çizgisini değerlendirerek ekim yapılacak alanı planlıyoruz.", image: "/media/service-hair.webp", alt: "Capilora kliniğinde saç çizgisi planlaması" },
      { title: "Sakal Ekimi", text: "Sakalınızdaki boşlukları ve çıkış yönlerini inceleyerek ekim planını hazırlıyoruz.", image: "/media/service-beard.webp", alt: "Capilora kliniğinde kişiye özel değerlendirme" },
      { title: "Kaş Ekimi", text: "Kaş ekimini, kaşlarınızın şekline ve kılların çıkış yönüne göre planlıyoruz.", image: "/media/service-eyebrow.webp", alt: "Capilora kaş ekimi paylaşımından kaş görünümü" },
    ], methodTitle: "FUE, DHI ve PRP", methodText: "Uygulamalar hakkında bilgi almak ve muayene için kliniğimizle iletişime geçebilirsiniz." },
    results: { title: "SAÇ EKİMİ", light: "ÖNCESİ VE SONRASI.", before: "Önce", after: "Sonra", hint: "Önce ve sonrayı görmek için çizgiyi kaydırın.", slider: "Önce ve sonra karşılaştırması", source: "Instagram’da görüntüle", disclaimer: "Sonuçlar kişiden kişiye değişir.", select: "Sonucu görüntüle", previous: "Önceki sonuç", next: "Sonraki sonuç" },
    about: { title: "CAPILORA", light: "ANKARA EKİBİ.", body: "Çankaya’daki YDA Center’da saç, sakal ve kaş ekimi hizmeti veriyoruz.", second: "İlk görüşmede sorularınızı yanıtlıyor, ekim planını sizinle birlikte hazırlıyoruz. İşlem sonrasında da iyileşme sürecinizi takip ediyoruz.", team: "Capilora ekibi", location: "Ankara · YDA Center", cta: "Randevu alın" },
    reviews: { title: "SİZDEN", light: "GELENLER.", count: "Google yorumu", excerpt: "Google’da oku", translated: "" },
    contact: { title: "Bize", light: "ulaşın.", body: "Bilgi ve randevu için bizi arayabilir veya WhatsApp’tan yazabilirsiniz.", cta: "WhatsApp’tan bize yazın", call: "Bizi arayın", visit: "Kliniğimizi ziyaret edin", directions: "Yol tarifi alın", social: "Bizi takip edin", footer: "Ankara’da saç, sakal ve kaş ekimi.", rights: "Tüm hakları saklıdır.", top: "Yukarı dön" },
  },
  en: {
    title: "Capilora Hair Clinic | Hair, Beard & Eyebrow Transplant in Ankara",
    description: "Hair, beard and eyebrow transplants at Capilora Hair Clinic, YDA Center, Ankara. View before-and-after photos and contact us for appointments.",
    skip: "Skip to content", home: "Home", nav: ["Treatments", "Our results", "Our clinic", "Reviews", "Contact"],
    contactCta: "Contact us", menuOpen: "Open menu", menuClose: "Close menu",
    hero: { strong: "HAIR TRANSPLANT.", light: "CAPILORA ANKARA.", description: "Contact us for information and appointments for hair, beard and eyebrow transplants.", results: "View results", cta: "Talk to us on WhatsApp" },
    services: { title: "HAIR, BEARD", light: "& EYEBROW TRANSPLANTS.", intro: "Before treatment, we assess your hair, the transplant area and your expectations.", items: [
      { title: "Hair Transplant", text: "We assess the donor area and hairline to plan the transplant.", image: "/media/service-hair.webp", alt: "Hairline planning at Capilora clinic" },
      { title: "Beard Transplant", text: "We examine gaps in your beard and the direction of growth to prepare a transplant plan.", image: "/media/service-beard.webp", alt: "Personalised assessment at Capilora clinic" },
      { title: "Eyebrow Transplant", text: "We plan the transplant around your eyebrow shape and the direction of hair growth.", image: "/media/service-eyebrow.webp", alt: "Eyebrow photograph from Capilora’s eyebrow transplant post" },
    ], methodTitle: "FUE, DHI and PRP", methodText: "Contact our clinic for information about these treatments or to book a consultation." },
    results: { title: "HAIR TRANSPLANT", light: "BEFORE & AFTER.", before: "Before", after: "After", hint: "Move the line to compare before and after.", slider: "Before and after comparison", source: "View on Instagram", disclaimer: "Individual results vary.", select: "View result", previous: "Previous result", next: "Next result" },
    about: { title: "CAPILORA", light: "OUR ANKARA TEAM.", body: "Our clinic at YDA Center in Çankaya, Ankara offers hair, beard and eyebrow transplants.", second: "At your first appointment, we answer your questions and discuss the transplant plan with you. After treatment, we follow your recovery.", team: "The Capilora team", location: "Ankara · YDA Center", cta: "Book an appointment" },
    reviews: { title: "IN YOUR", light: "WORDS.", count: "Google reviews", excerpt: "Read on Google", translated: "Translated from Turkish" },
    contact: { title: "Contact", light: "our clinic.", body: "Call or message us on WhatsApp for information and appointments.", cta: "Message us on WhatsApp", call: "Call our team", visit: "Visit our clinic", directions: "Get directions", social: "Instagram", footer: "Hair, beard and eyebrow transplants in Ankara.", rights: "All rights reserved.", top: "Back to top" },
  },
};
export type PageCopy = (typeof copy)[Locale];
