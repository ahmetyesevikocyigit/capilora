import mediaSources from "../../content/media-sources.json";
import { randomUUID } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { client, migrate } from "./db";
import {
  emptyData,
  blockSchema,
  type Block,
  type ContentData,
  type Kind,
  type Locale,
} from "./types";
import { clinic, copy, results, reviews } from "../../content/site";
import {
  routes,
  routeNames,
  pageKeys,
  articleSlugs,
  navKeys,
  treatmentKeys,
} from "../../content/routes";
import { articles, categoryNames } from "../../content/articles";
import { treatmentDetails, pageIntros } from "../../content/details";
import { migrateGallery } from "./gallery-migration";
import { galleryPageData, galleryStripBlock } from "./gallery";
const block = (type: Block["type"], v: Partial<Block> = {}): Block =>
  blockSchema.parse({ id: randomUUID(), type, ...v });
const item = (title: string, text = "", image = "", href = "", alt = "") => ({
  id: randomUUID(),
  title,
  text,
  image,
  href,
  alt,
});
function pageBlocks(lang: Locale, key: string): Block[] {
  const t = copy[lang],
    tr = lang === "tr",
    url = (key: keyof typeof routes) => `/${lang}/${routes[key][lang]}`;
  const steps = block("steps", {
    title: tr ? "İLK GÖRÜŞMEDEN" : "FROM THE FIRST",
    light: tr ? "SONRAKİ ADIMA." : "CONVERSATION.",
    items: (tr
      ? [
          [
            "Tanışalım",
            "Sorularınızı ve beklentilerinizi ilk görüşmede dinliyoruz.",
          ],
          [
            "Birlikte planlayalım",
            "Muayene ve değerlendirme sonrasında uygulamanın kapsamını konuşuyoruz.",
          ],
          [
            "İletişimde kalalım",
            "İşlem sonrasındaki sorularınız ve takip görüşmeleri için buradayız.",
          ],
        ]
      : [
          [
            "Let’s meet",
            "We listen to your questions and expectations at your first visit.",
          ],
          [
            "Plan together",
            "After an examination and assessment, we discuss the scope of treatment.",
          ],
          [
            "Stay in touch",
            "We are here for your questions and follow-up appointments afterwards.",
          ],
        ]
    ).map(([a, b]) => item(a, b)),
  });
  const cards = (exclude = "") =>
    block("cards", {
      title: t.services.title,
      light: t.services.light,
      text: t.services.intro,
      anchor: "treatments",
      items: t.services.items.flatMap((s, i) =>
        treatmentKeys[i] === exclude
          ? []
          : [item(s.title, s.text, s.image, url(treatmentKeys[i]), s.alt)],
      ),
      buttonLabel: t.services.methodTitle,
      text2: t.services.methodText,
      href: url("methods"),
    });
  const resultBlock = block("results", {
    title: t.results.title,
    light: t.results.light,
    anchor: "results",
    text: t.results.disclaimer,
  });
  const about = block("imageText", {
    title: t.about.title,
    light: t.about.light,
    text: t.about.body,
    text2: t.about.second,
    image: "/media/team.webp",
    alt: t.about.team,
    href: url("clinic"),
    buttonLabel: tr ? "Kliniğimizi tanıyın" : "Meet our clinic",
    anchor: "clinic",
  });
  const address = block("address", {
    title: tr ? "Ankara’da buluşalım." : "Meet us in Ankara.",
    text: clinic.address,
    href: clinic.maps,
    buttonLabel: t.contact.directions,
  });
  const cta = block("cta", {
    title: tr
      ? "Seçenekleri birlikte konuşalım."
      : "Let’s discuss the options.",
    text: tr
      ? "Hangi uygulamanın sizin için uygun olduğunu muayenede değerlendirebiliriz."
      : "An in-person assessment helps us discuss what may be appropriate for you.",
    buttonLabel: t.about.cta,
    href: `https://wa.me/905335695670`,
  });
  if (key === "home")
    return [
      block("hero", {
        title: t.hero.strong,
        light: t.hero.light,
        text: t.hero.description,
        poster: "/media/hero-poster.webp",
        desktopVideo: "/media/hero-desktop.mp4",
        mobileVideo: "/media/hero-mobile.mp4",
        buttonLabel: t.hero.results,
        href: url("results"),
        secondaryLabel: t.hero.cta,
        secondaryHref: "https://wa.me/905335695670",
      }),
      cards(),
      resultBlock,
      about,
      galleryStripBlock(lang),
      block("reviews", {
        title: t.reviews.title,
        light: t.reviews.light,
        anchor: "reviews",
      }),
      block("articles", {
        title: tr ? "MAKALE" : "FROM OUR",
        light: tr ? "KÖŞESİNDEN." : "ARTICLES.",
        limit: 3,
        href: url("journal"),
        buttonLabel: tr ? "Tüm yazılar" : "All articles",
      }),
    ];
  if (["hair", "beard", "eyebrow"].includes(key)) {
    const d = treatmentDetails[lang][key as "hair"];
    return [
      block("text", {
        title: d.heading,
        text: d.body,
        items: d.focus.map((i) => item(i.title, i.text)),
      }),
      steps,
      ...(key === "hair" ? [resultBlock] : []),
      block("faq", {
        title: tr ? "AKLINIZDAKİ" : "YOUR",
        light: tr ? "SORULAR." : "QUESTIONS.",
        items: d.questions.map((i) => item(i.question, i.answer)),
      }),
      {
        ...cards(key),
        title: tr ? "DİĞER" : "OTHER",
        light: tr ? "UYGULAMALAR." : "TREATMENTS.",
        text: "",
        buttonLabel: "",
        href: "",
      },
    ];
  }
  if (key === "treatments") return [cards(), steps];
  if (key === "results") return [resultBlock, cta];
  if (key === "clinic") return [about, steps, address];
  if (key === "gallery") return galleryPageData(lang).blocks;
  if (key === "journal") return [block("articles")];
  if (key === "press") return [block("press")];
  if (key === "methods")
    return [
      block("methods", {
        items: (tr
          ? [
              [
                "FUE",
                "Köklerin alınması",
                "Saç kökü gruplarının donör bölgeden tek tek alınmasını ifade eder. Donör alan ve ekim planı muayenede birlikte değerlendirilir.",
              ],
              [
                "DHI",
                "Köklerin yerleştirilmesi",
                "DHI adı, köklerin implanter araçlarla yerleştirilmesi için kullanılır. Köklerin alınması ve yerleştirilmesi, planlamanın farklı aşamalarıdır.",
              ],
              [
                "PRP",
                "Kişisel değerlendirme",
                "Kişinin kanından hazırlanan, trombosit bakımından yoğun plazmanın kullanıldığı bir uygulamadır. Uygunluğu, beklenen yararı ve sınırları hekim değerlendirmesiyle ele alınır.",
              ],
            ]
          : [
              [
                "FUE",
                "Collecting follicles",
                "FUE refers to removing follicular units individually from the donor area. The donor area and transplant plan are assessed at a consultation.",
              ],
              [
                "DHI",
                "Placing follicles",
                "DHI is a name used for placing follicles with implanter tools. Collection and placement are different stages of the transplant plan.",
              ],
              [
                "PRP",
                "An individual assessment",
                "PRP uses platelet-rich plasma prepared from a person’s own blood. Suitability, expected benefits and limitations should be discussed with a clinician.",
              ],
            ]
        ).map(([a, b, c]) =>
          item(
            a,
            c,
            "",
            a === "PRP"
              ? "https://ishrs.org/patients/treatments-for-hair-loss/medications/platelet-rich-plasma/"
              : "https://ishrs.org/patients/treatments-for-hair-loss/surgical-treatments/",
            b,
          ),
        ),
      }),
      cta,
    ];
  return [];
}
async function baselineHistory() {
  if (
    !(
      await client.execute(
        "SELECT name FROM migrations WHERE name='media-sources-v1'",
      )
    ).rows.length
  ) {
    const updates = mediaSources.assets.flatMap((group) =>
      group.source.startsWith("https://")
        ? group.files.map((file) => ({
            sql: "UPDATE assets SET source_url=? WHERE url=? AND source_url='' AND version=1",
            args: [group.source, `/media/${file}`],
          }))
        : [],
    );
    await client.batch(
      [
        ...updates,
        {
          sql: "INSERT OR IGNORE INTO migrations VALUES(?,?)",
          args: ["media-sources-v1", new Date().toISOString()],
        },
      ],
      "write",
    );
  }

  const rows = (
    await client.execute(
      "SELECT e.* FROM editions e WHERE e.published IS NOT NULL AND NOT EXISTS(SELECT 1 FROM history h WHERE h.document_id=e.document_id AND h.locale=e.locale)",
    )
  ).rows;
  if (rows.length)
    await client.batch(
      rows.map((r) => ({
        sql: "INSERT INTO history VALUES(?,?,?,?,?)",
        args: [
          randomUUID(),
          r.document_id,
          r.locale,
          r.published,
          r.published_at,
        ],
      })),
      "write",
    );
}
let seeding: Promise<void> | undefined;
export function ensureSeed() {
  return (seeding ??= (async () => {
    await migrate();
    if (
      (
        await client.execute(
          "SELECT name FROM migrations WHERE name='initial-content-v1'",
        )
      ).rows.length
    )
      return;
    const tx = await client.transaction("write");
    try {
      if (
        (
          await tx.execute(
            "SELECT name FROM migrations WHERE name='initial-content-v1'",
          )
        ).rows.length
      ) {
        await tx.commit();
        return;
      }
      const now = new Date().toISOString();
      const add = async (
        id: string,
        kind: Kind,
        lang: Locale,
        data: ContentData,
      ) => {
        await tx.execute({
          sql: "INSERT OR IGNORE INTO documents(id,kind,created_at) VALUES(?,?,?)",
          args: [id, kind, now],
        });
        await tx.execute({
          sql: "INSERT OR IGNORE INTO editions(id,document_id,locale,version,draft,published,published_at,updated_at) VALUES(?,?,?,1,?,?,?,?)",
          args: [
            `${id}:${lang}`,
            id,
            lang,
            JSON.stringify(data),
            JSON.stringify(data),
            now,
            now,
          ],
        });
      };
      for (const lang of ["tr", "en"] as const) {
        const t = copy[lang];
        for (const key of pageKeys) {
          const treatment = ["hair", "beard", "eyebrow"].includes(key)
            ? treatmentDetails[lang][key as "hair"]
            : null;
          await add(
            key,
            "page",
            lang,
            emptyData({
              title: treatment?.strong || routeNames[lang][key],
              light: treatment?.light || "",
              slug: routes[key][lang],
              seoTitle: key === "home" ? t.title : key === "gallery" ? galleryPageData(lang).seoTitle : routeNames[lang][key],
              seoDescription:
                key === "home"
                  ? t.description
                  : key === "gallery" ? galleryPageData(lang).seoDescription : treatment?.intro || pageIntros[lang][key] || "",
              blocks: pageBlocks(lang, key),
            }),
          );
        }
        for (const a of articles)
          await add(
            a.id,
            "article",
            lang,
            emptyData({
              title: a.content[lang].title,
              slug: articleSlugs[a.id][lang],
              excerpt: a.content[lang].excerpt,
              image: a.image,
              categoryId: `category-${a.category}`,
              sources: [a.source],
              body: {
                type: "doc",
                content: a.content[lang].sections.flatMap((s) => [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: s.heading }],
                  },
                  ...s.paragraphs.map((text) => ({
                    type: "paragraph",
                    content: [{ type: "text", text }],
                  })),
                ]),
              },
            }),
          );
        for (const [key, title] of Object.entries(categoryNames[lang]))
          if (key !== "all")
            await add(
              `category-${key}`,
              "category",
              lang,
              emptyData({ title, slug: key }),
            );
        for (const [i, r] of results.entries())
          await add(
            r.id,
            "result",
            lang,
            emptyData({
              title: r.title[lang],
              excerpt: r.description[lang],
              before: r.before,
              after: r.after,
              sourceUrl: r.sourceUrl,
              publishedAt: r.sourceDate,
              beforePosition: r.position.before,
              afterPosition: r.position.after,
              order: i,
            }),
          );
        for (const [i, r] of reviews.entries())
          await add(
            `review-${i}`,
            "review",
            lang,
            emptyData({
              title: r.author,
              author: r.author,
              rating: r.rating,
              excerpt: r.excerpt[lang],
              sourceUrl: r.sourceUrl,
              checkedAt: r.checkedAt,
              translated: lang === "en",
              order: i,
            }),
          );
        await add(
          "site",
          "settings",
          lang,
          emptyData({
            title: "Site ayarları",
            name: clinic.name,
            phone: clinic.phone,
            whatsappNumber: "905335695670",
            whatsappText:
              lang === "tr"
                ? "Merhaba, Capilora’da saç ekimi hakkında bilgi almak istiyorum."
                : "Hello, I would like to learn more about hair transplantation at Capilora.",
            address: clinic.address,
            instagram: clinic.instagram,
            maps: clinic.maps,
            rating: clinic.rating,
            reviewCount: clinic.reviewCount,
            checkedAt: clinic.checkedAt,
            logo: "/media/logo.webp",
            wordmark: "capilora",
            brandSubtitle: "HAIR CLINIC",
            headerCta: t.contactCta,
            footerTitle: t.contact.title,
            footerLight: t.contact.light,
            footerBody: t.contact.body,
            footerCta: t.contact.cta,
            footerTagline: t.contact.footer,
            footerRights: t.contact.rights,
            creditLabel:
              lang === "tr"
                ? "Web tasarım, uygulama ve geliştirme"
                : "Web design, implementation & development",
            creditName: "kocyigityazilim.com",
            creditUrl: "https://kocyigityazilim.com",
            menu: navKeys.map((key) => ({
              id: key,
              label: routeNames[lang][key],
              href: `/${lang}/${routes[key][lang]}`,
              children:
                key === "treatments"
                  ? (["treatments", ...treatmentKeys, "methods"] as const).map(
                      (k) => ({
                        id: k,
                        label: routeNames[lang][k],
                        href: `/${lang}/${routes[k][lang]}`,
                      }),
                    )
                  : [],
            })),
          }),
        );
      }
      for (const filename of await readdir(
        path.join(process.cwd(), "public/media"),
      )) {
        const s = await stat(
          path.join(process.cwd(), "public/media", filename),
        );
        if (!s.isFile()) continue;
        const ext = filename.split(".").pop() || "";
        await tx.execute({
          sql: "INSERT OR IGNORE INTO assets(id,name,mime,size,url,created_at) VALUES(?,?,?,?,?,?)",
          args: [
            `seed-${filename.replace(/[^a-z0-9]/gi, "-")}`,
            filename,
            ext === "mp4"
              ? "video/mp4"
              : ext === "svg"
                ? "image/svg+xml"
                : ext === "png"
                  ? "image/png"
                  : "image/webp",
            s.size,
            `/media/${filename}`,
            now,
          ],
        });
      }
      await tx.execute({
        sql: "INSERT INTO migrations VALUES(?,?)",
        args: ["initial-content-v1", now],
      });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    } finally {
      tx.close();
    }
  })().then(async () => {
    await migrateGallery();
    await baselineHistory();
  }));
}
