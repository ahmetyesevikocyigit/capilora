import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import type { CmsEntry } from "@/lib/cms/types";

export function PageCards({ pages, entries }: { pages: CmsEntry[]; entries: CmsEntry[] }) {
  return (
    <div className="page-cards">
      {pages.map((entry) => {
        const title = [entry.draft.title, entry.draft.light].filter(Boolean).join(" ") || "Başlıksız sayfa";
        const en = entries.find(e => e.id === entry.id && e.locale === "en");
        return (
          <Link className="page-card" key={entry.id}
            href={`/admin/duzenle/${entry.id}`} prefetch={false}
            aria-label={`${title} içerik ve görsellerini düzenle`}>
            <FileText className="page-card-icon" size={26} aria-hidden="true" />
            <h2>{title}</h2>
            <p className="page-card-status">
              {entry.deletedAt ? "Çöp kutusunda" : `Türkçe: ${entry.published ? "Yayında" : "Taslak"} · English: ${en?.published ? "Yayında" : "Taslak"}`}
            </p>
            <span>İçerik ve görselleri düzenle<ArrowUpRight size={19} aria-hidden="true" /></span>
          </Link>
        );
      })}
    </div>
  );
}
