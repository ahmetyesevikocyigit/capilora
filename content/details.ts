import type { Locale } from "./site";
import type { PageKey } from "./routes";
export interface DetailCopy {
  strong: string; light: string; intro: string;
  heading: string; body: string; focus: { title: string; text: string }[];
  questions: { question: string; answer: string }[];
}
export type TreatmentKey = "hair" | "beard" | "eyebrow";
export const treatmentDetails: Record<Locale, Record<TreatmentKey, DetailCopy>> = {
  tr: {
    hair: {
      strong: "SAÇ", light: "EKİMİ.", intro: "İlk adım, saçınızı ve beklentilerinizi birlikte değerlendirmek.",
      heading: "Plan, sizinle başlar.", body: "Saç çizginizi, ekim yapılacak alanı ve donör bölgeyi ilk görüşmede ele alıyoruz. Nasıl bir görünüm istediğinizi dinliyor, sorularınızı yanıtlıyor ve süreci sizinle birlikte planlıyoruz.",
      focus: [{ title: "Saç çizgisi", text: "Ön bölgedeki görünümü ve saç çizgisine ilişkin beklentilerinizi görüşüyoruz." }, { title: "Donör bölge", text: "Ekim planını hazırlarken köklerin alınacağı bölgeyi değerlendiriyoruz." }, { title: "Süreç ve takip", text: "İşlem öncesindeki hazırlığı ve işlem sonrasındaki görüşmeleri birlikte planlıyoruz." }],
      questions: [{ question: "İlk görüşmede neler konuşulur?", answer: "Saç kaybının öyküsü, beklentileriniz, donör bölge ve ekim alanı ele alınır. Uygunluk ve seçenekler muayenede değerlendirilir." }, { question: "Fotoğraf göndererek bilgi alabilir miyim?", answer: "WhatsApp üzerinden ilk iletişimi kurabilirsiniz. Fotoğraflarla yapılan ön görüşme, yüz yüze muayenenin yerini tutmaz." }, { question: "Sonuçları nerede inceleyebilirim?", answer: "Sonuçlarımız sayfasında kliniğimizin paylaşımlarındaki önce ve sonra fotoğraflarını karşılaştırabilirsiniz. Her kişinin sonucu farklıdır." }],
    },
    beard: {
      strong: "SAKAL", light: "EKİMİ.", intro: "Sakalınızın mevcut yapısı ve istediğiniz görünüm üzerinden birlikte bir plan hazırlıyoruz.",
      heading: "Her ayrıntıyı konuşalım.", body: "Sakalınızdaki boşlukları, mevcut kılların yönünü ve yüzünüzdeki dağılımı inceliyoruz. Ekim yapılmasını istediğiniz alanları ilk görüşmede sizinle birlikte belirliyoruz.",
      focus: [{ title: "Bölgesel değerlendirme", text: "Yanaktaki, çenedeki veya bıyık çevresindeki beklentilerinizi ayrı ayrı dinliyoruz." }, { title: "Şekil ve yön", text: "Mevcut sakal çizginiz ve kılların çıkış yönü, planlamanın bir parçasıdır." }, { title: "Size uygun plan", text: "Muayenede ekim alanını, donör bölgeyi ve takip sürecini birlikte ele alıyoruz." }],
      questions: [{ question: "Yalnızca boşluklar için görüşebilir miyim?", answer: "Bölgesel boşluklar veya sakalın genel görünümü için randevu alabilirsiniz. Yapılabilecek uygulama muayenede netleşir." }, { question: "Sakal şekline nasıl karar veriliyor?", answer: "İstediğiniz görünümü dinliyor, mevcut sakal yapınız ve çıkış yönleriyle birlikte değerlendiriyoruz." }, { question: "Ücret bilgisi nasıl alabilirim?", answer: "Uygulamanın kapsamını konuşmak ve ücret bilgisi almak için telefonla veya WhatsApp üzerinden bize ulaşabilirsiniz." }],
    },
    eyebrow: {
      strong: "KAŞ", light: "EKİMİ.", intro: "Kaşınızın şekli, mevcut kılların yönü ve beklentileriniz aynı planın parçası.",
      heading: "Küçük alan, özenli planlama.", body: "Kaşınızdaki seyrek alanları ve mevcut şekli görüşmede birlikte inceliyoruz. Nasıl bir görünüm istediğinizi konuşarak ekim planının ayrıntılarını netleştiriyoruz.",
      focus: [{ title: "Mevcut kaş yapısı", text: "Seyrek alanları, kaşın başlangıç noktasını ve genel çizgisini değerlendiriyoruz." }, { title: "Çıkış yönü", text: "Mevcut kılların yönünü ekim planında dikkate alıyoruz." }, { title: "Karşılıklı görüşme", text: "Beklentilerinizi ve işlemle ilgili sorularınızı randevunuzda birlikte ele alıyoruz." }],
      questions: [{ question: "Kaş şekli görüşmede belirlenebilir mi?", answer: "Evet. Mevcut kaşınızın şekli ve beklentileriniz ilk görüşmede ele alınır; uygulanabilecek plan muayeneyle belirlenir." }, { question: "Randevuya nasıl hazırlanmalıyım?", answer: "Daha önce kaş bölgesine yaptırdığınız işlemleri ve kullandığınız ürünleri görüşmede paylaşabilirsiniz. Size özel hazırlık bilgisi için ekibimizle iletişime geçin." }, { question: "İşlem sonrası iletişim devam ediyor mu?", answer: "İşlem sonrası takip görüşmelerini ekibimizle planlayabilir, sorularınız için kliniğimize ulaşabilirsiniz." }],
    },
  },
  en: {
    hair: {
      strong: "HAIR", light: "TRANSPLANT.", intro: "We begin with your hair, your expectations and a conversation.",
      heading: "A plan that starts with you.", body: "At your first visit, we discuss your hairline, the transplant area and the donor area. We listen to the look you have in mind, answer your questions and plan the next steps with you.",
      focus: [{ title: "Your hairline", text: "We discuss the frontal area and your expectations for your hairline." }, { title: "The donor area", text: "We assess the area from which follicles would be taken as part of planning." }, { title: "Follow-up", text: "We discuss preparation and arrange follow-up conversations after the procedure." }],
      questions: [{ question: "What happens at the first consultation?", answer: "We discuss your history of hair loss, expectations, donor area and transplant area. Suitability and options are assessed in person." }, { question: "Can I send photographs first?", answer: "You can contact us on WhatsApp. An initial conversation based on photographs does not replace an in-person examination." }, { question: "Where can I see results?", answer: "Our results page includes before-and-after photographs from the clinic’s posts. Individual results vary." }],
    },
    beard: {
      strong: "BEARD", light: "TRANSPLANT.", intro: "We look at your existing beard and discuss the appearance you have in mind.",
      heading: "Let’s talk through the details.", body: "We assess gaps, growth direction and the distribution of your beard. At your first visit, we discuss the areas you would like to address.",
      focus: [{ title: "Areas to address", text: "We listen to your expectations for your cheeks, chin and moustache area." }, { title: "Shape and direction", text: "Your existing beard line and growth direction are part of the planning process." }, { title: "Your consultation", text: "We discuss the transplant area, donor area and follow-up during your visit." }],
      questions: [{ question: "Can I ask about individual gaps?", answer: "You can book a visit for localised gaps or your overall beard appearance. The available options are assessed at the consultation." }, { question: "How is the shape planned?", answer: "We discuss your preferred appearance alongside your existing beard structure and growth direction." }, { question: "How can I find out about pricing?", answer: "Call or message us on WhatsApp to discuss the scope of the procedure and pricing." }],
    },
    eyebrow: {
      strong: "EYEBROW", light: "TRANSPLANT.", intro: "Your eyebrow shape, growth direction and expectations all inform the plan.",
      heading: "Attention to the smaller details.", body: "We look at sparse areas and your existing eyebrow shape together. We discuss the appearance you would like and the details of a possible transplant plan.",
      focus: [{ title: "Existing shape", text: "We assess sparse areas, the starting point and the overall eyebrow line." }, { title: "Growth direction", text: "The direction of existing hairs is considered in the plan." }, { title: "A conversation", text: "Your appointment gives us time to discuss expectations and answer your questions." }],
      questions: [{ question: "Can we discuss shape at my appointment?", answer: "Yes. We discuss your existing eyebrow shape and expectations. An examination helps determine the appropriate plan." }, { question: "How should I prepare for the consultation?", answer: "Tell us about previous procedures in the eyebrow area and products you use. Contact the team for any individual preparation instructions." }, { question: "Can I contact the team afterwards?", answer: "You can arrange follow-up appointments with the team and contact the clinic with questions." }],
    },
  },
};
export const pageIntros: Record<Locale, Partial<Record<PageKey, string>>> = {
  tr: { treatments: "Saç, sakal ve kaş ekimi. Uygulamaları inceleyin, aklınızdaki soruları birlikte konuşalım.", methods: "Uygulama seçeneklerini, muayene ve kişisel değerlendirme üzerinden ele alıyoruz.", results: "Kliniğimizin paylaşımlarından önce ve sonra fotoğrafları.", clinic: "Ankara, Çankaya’daki YDA Center’da tanışalım.", journal: "İlk görüşmeden sonraki adımlara: merak ettikleriniz üzerine kısa okumalar.", press: "Capilora’dan haberler, röportajlar ve basın iletişimi." },
  en: { treatments: "Hair, beard and eyebrow transplants. Explore the treatments and talk through your questions with us.", methods: "We discuss treatment options through an examination and individual assessment.", results: "Before-and-after photographs from the clinic’s own posts.", clinic: "Meet us at YDA Center in Çankaya, Ankara.", journal: "From the first consultation to the next steps: a place for your questions.", press: "Capilora news, interviews and press enquiries." },
};
