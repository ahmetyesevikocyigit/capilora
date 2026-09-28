import type { Locale } from "./site";
import type { ArticleKey } from "./routes";
export type ArticleCategory = "consultation" | "planning" | "followup";
export interface ArticleContent {
  title: string; excerpt: string; sections: { heading: string; paragraphs: string[] }[];
}
export interface Article {
  id: ArticleKey; category: ArticleCategory; image: string;
  source: { name: string; url: string };
  content: Record<Locale, ArticleContent>;
}
export const categoryNames: Record<Locale, Record<ArticleCategory | "all", string>> = {
  tr: { all: "Tüm yazılar", consultation: "İlk görüşme", planning: "Planlama", followup: "İşlem sonrası" },
  en: { all: "All articles", consultation: "Consultation", planning: "Planning", followup: "After treatment" },
};
export const articles: Article[] = [
  {
    id: "consultation", category: "consultation", image: "/media/team.webp",
    source: { name: "NHS · Before you have a cosmetic procedure", url: "https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/advice/before-you-have-a-cosmetic-procedure/" },
    content: {
      tr: { title: "İlk görüşmeye gelirken", excerpt: "Beklentilerinizi anlatmak ve aklınızdaki soruları unutmamak için küçük bir hazırlık.", sections: [
        { heading: "Beklentilerinizi not edin", paragraphs: ["Görünümünüzde neyin değişmesini istediğinizi ve bu değişimden ne beklediğinizi düşünün. İlk görüşme, bu beklentileri açıkça konuşmak için bir fırsattır."] },
        { heading: "Sorularınıza yer açın", paragraphs: ["Uygulamayı kimin yapacağını, seçenekleri, olası riskleri, takip sürecini ve ücretin neleri kapsadığını sorun. Karar vermek için kendinize zaman tanıyın."] },
        { heading: "Bize ulaşın", paragraphs: ["Capilora’daki görüşmeniz için telefonla veya WhatsApp üzerinden randevu alabilirsiniz. Kliniğimiz YDA Center, A1 Blok, Çankaya / Ankara’da."] },
      ] },
      en: { title: "Before your first consultation", excerpt: "A little preparation to help you share your expectations and remember your questions.", sections: [
        { heading: "Write down your expectations", paragraphs: ["Think about what you would like to change and what you expect from that change. Your first consultation is a chance to discuss those expectations openly."] },
        { heading: "Make room for questions", paragraphs: ["Ask who will perform the procedure, what options and risks there are, how follow-up works and what the price includes. Give yourself time to decide."] },
        { heading: "Get in touch", paragraphs: ["Call or message Capilora on WhatsApp to arrange your visit. You can find us at YDA Center, Block A1, Çankaya, Ankara."] },
      ] },
    },
  },
  {
    id: "planning", category: "planning", image: "/media/service-hair.webp",
    source: { name: "American Academy of Dermatology · Hair loss: Diagnosis and treatment", url: "https://www.aad.org/public/diseases/hair-loss/treatment/diagnosis-treat" },
    content: {
      tr: { title: "Saç ekiminde kişisel planlama", excerpt: "Saç kaybının öyküsü ve beklentileriniz neden aynı görüşmenin parçası?", sections: [
        { heading: "Önce nedeni anlamak", paragraphs: ["Saç kaybının farklı nedenleri olabilir. Tedavi seçenekleri değerlendirilmeden önce bu nedeni anlamak gerekir. Hekim, öykünüzü dinler ve gerekli gördüğü incelemeleri belirler."] },
        { heading: "Tek bir seçenek yok", paragraphs: ["Saç ekimi, bazı saç kaybı türlerinde değerlendirilebilen seçeneklerden biridir. Herkes için aynı yaklaşım uygun olmayabilir; kişisel değerlendirme bu yüzden önemlidir."] },
        { heading: "Görüşmede neler konuşuyoruz?", paragraphs: ["Capilora’da ilk görüşmede beklentilerinizi, donör bölgeyi ve ekim yapılmasını istediğiniz alanı ele alıyoruz. Saç çizgisine dair sorularınızı da bu görüşmeye getirebilirsiniz."] },
      ] },
      en: { title: "Planning a hair transplant", excerpt: "Why your history of hair loss and your expectations belong in the same conversation.", sections: [
        { heading: "Understand the cause first", paragraphs: ["Hair loss can have different causes. Understanding the cause comes before considering treatment. A clinician reviews your history and decides which examinations are needed."] },
        { heading: "More than one option", paragraphs: ["A hair transplant may be an option for some types of hair loss. The same approach will not suit everyone, which makes an individual assessment important."] },
        { heading: "What do we discuss?", paragraphs: ["At Capilora, we discuss your expectations, donor area and the areas you would like to address. Bring your questions about hairline planning to the consultation too."] },
      ] },
    },
  },
  {
    id: "followup", category: "followup", image: "/media/result-02-after.webp",
    source: { name: "NHS · Hair transplant", url: "https://www.nhs.uk/tests-and-treatments/cosmetic-procedures/cosmetic-surgery/hair-transplant/" },
    content: {
      tr: { title: "Saç ekimi sonrası iletişim ve takip", excerpt: "Bakım talimatları, kontrol görüşmeleri ve sorularınız için iletişim.", sections: [
        { heading: "Bakım planınızı öğrenin", paragraphs: ["İşlem sonrasında ekim alanına nasıl bakım yapacağınızı uygulamayı yapan hekimden öğrenin. Yıkama, günlük yaşama dönüş ve egzersiz konusunda size verilen talimatları izleyin."] },
        { heading: "Değişim zaman alır", paragraphs: ["Saç ekiminin sonucu hemen görülmez. İlk haftalarda ekilen saçlar dökülebilir ve büyüme daha sonra başlayabilir. Süreci, size verilen takip planıyla değerlendirin."] },
        { heading: "Sorularınızı ertelemeyin", paragraphs: ["Şiddetli ağrı veya beklenmedik belirtiler olduğunda işlemin yapıldığı klinikle gecikmeden iletişime geçin. Capilora’ya telefonla veya WhatsApp üzerinden ulaşabilirsiniz."] },
      ] },
      en: { title: "Staying in touch after a hair transplant", excerpt: "Care instructions, follow-up appointments and a way to ask your questions.", sections: [
        { heading: "Understand your care plan", paragraphs: ["Ask your treating clinician how to care for the transplant area. Follow their instructions on washing, daily activities and exercise."] },
        { heading: "Change takes time", paragraphs: ["Results are not immediate. Transplanted hairs may shed in the first weeks before growth begins later. Review progress through your individual follow-up plan."] },
        { heading: "Stay in contact", paragraphs: ["Contact the clinic promptly if you experience severe pain or unexpected symptoms. You can reach Capilora by phone or WhatsApp."] },
      ] },
    },
  },
];
