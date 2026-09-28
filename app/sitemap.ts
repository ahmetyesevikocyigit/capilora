import type { MetadataRoute } from "next";
import { publicEntries } from "@/lib/cms/store";
import { contentPath } from "@/lib/cms/types";
import { siteUrl } from "@/content/url";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const all = [
    ...(await publicEntries("tr")),
    ...(await publicEntries("en")),
  ].filter((e) => ["page", "article"].includes(e.kind));
  return all.map((e) => ({
    url: siteUrl + contentPath(e.kind, e.locale, e.data),
    lastModified: e.updatedAt,
    alternates: {
      languages: Object.fromEntries(
        all
          .filter((o) => o.id === e.id)
          .map((o) => [
            o.locale,
            siteUrl + contentPath(o.kind, o.locale, o.data),
          ]),
      ),
    },
  }));
}
