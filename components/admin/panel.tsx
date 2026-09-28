"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Newspaper,
  Images,
  Settings,
  Menu,
  X,
  LogOut,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { kindNames, type CmsEntry, type Kind } from "@/lib/cms/types";
import { api } from "./api";
import { Editor } from "./editor";
import { PageCards } from "./page-cards";
const sections = [
  ["genel", "Genel Bakış", LayoutDashboard],
  ["sayfalar", "Sayfalar", FileText],
  ["makaleler", "Makale Köşesi", BookOpen],
  ["basin", "Basında Biz", Newspaper],
  ["sonuclar", "Sonuçlar", Images],
  ["ayarlar", "Klinik Bilgileri", Settings],
] as const;
const kindMap: Record<string, Kind> = {
  sayfalar: "page",
  makaleler: "article",
  konular: "category",
  basin: "press",
  sonuclar: "result",
};
export function AdminPanel({
  view,
  entries,
}: {
  view: string[];
  entries: CmsEntry[];
}) {
  const router = useRouter(),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [trash, setTrash] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const sidebar = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    sidebar.current?.querySelector<HTMLElement>("a")?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobile(false);
        toggle.current?.focus();
      }
    };
    const resize = () => {
      if (innerWidth > 760) setMobile(false);
    };
    addEventListener("keydown", close);
    addEventListener("resize", resize);
    return () => {
      removeEventListener("keydown", close);
      removeEventListener("resize", resize);
    };
  }, [mobile]);
  const section = view[0],
    kind = kindMap[section],
    initial = entries.find(
      (e) =>
        e.id === (section === "duzenle" ? view[1] : "site") &&
        e.locale === "tr",
    );
  const activeSection = section === "duzenle"
    ? Object.entries(kindMap).find(([, value]) => value === initial?.kind)?.[0] || section
    : section;
  const visibleEntries = entries.filter(e =>
    e.kind === kind && e.locale === "tr" && !!e.deletedAt === trash &&
    `${e.draft.title} ${e.draft.light}`.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")),
  );
  const create = async (kind: Kind) => {
    setBusy(true);
    setError("");
    try {
      const { id } = await api<{ id: string }>("entries", { kind });
      router.push(`/admin/duzenle/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="admin-shell">
      <button
        ref={toggle}
        aria-expanded={mobile}
        aria-controls="admin-navigation"
        className="admin-mobile-menu"
        aria-label={mobile ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setMobile(!mobile)}
      >
        {mobile ? <X /> : <Menu />}
      </button>
      <aside
        id="admin-navigation"
        ref={sidebar}
        className={`admin-sidebar ${mobile ? "is-open" : ""}`}
      >
        <Link className="admin-brand" href="/admin/genel">
          capilora<span>HAIR CLINIC</span>
        </Link>
        <nav aria-label="Yönetim menüsü">
          {sections.map(([slug, label, Icon]) => (
            <Link
              className={activeSection === slug ? "active" : ""}
              aria-current={activeSection === slug ? "page" : undefined}
              key={slug}
              href={`/admin/${slug}`}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/tr" target="_blank" rel="noopener noreferrer">
            Siteyi görüntüle
            <ArrowUpRight size={17} />
          </a>
          <button
            onClick={async () => {
              try {
                if (
                  !window.dispatchEvent(
                    new Event("admin:leave", { cancelable: true }),
                  )
                )
                  return;
                await api("logout", {});
                router.replace("/admin");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={17} />
            Çıkış yap
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="admin-menu-shade"
          aria-label="Menüyü kapat"
          onClick={() => setMobile(false)}
        />
      )}
      <main className="admin-main" inert={mobile}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {section === "genel" && (
          <>
            <div className="admin-page-heading">
              <div>
                <h1>Genel Bakış</h1>
                <p>İçeriklerinizi buradan yönetin.</p>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() => create("article")}
              >
                <Plus size={17} />
                Makale yaz
              </button>
            </div>
            <div className="dashboard-grid">
              {(["page", "article", "press", "result"] as Kind[]).map((k) => (
                <Link
                  key={k}
                  href={`/admin/${Object.entries(kindMap).find(([, kind]) => kind === k)?.[0]}`}
                >
                  <span>{kindNames[k]}</span>
                  <strong>
                    {
                      entries.filter(
                        (e) =>
                          e.kind === k && e.locale === "tr" && !e.deletedAt,
                      ).length
                    }
                  </strong>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </div>
            <section className="dashboard-recent">
              <h2>Son düzenlenenler</h2>
              {entries
                .filter((e) => !e.deletedAt && e.kind !== "review")
                .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                .slice(0, 8)
                .map((e) => (
                  <Link
                    key={`${e.id}:${e.locale}`}
                    href={
                      e.kind === "settings"
                        ? "/admin/ayarlar"
                        : `/admin/duzenle/${e.id}`
                    }
                  >
                    <div>
                      <strong>{e.draft.title || "Başlıksız"}</strong>
                      <span>
                        {kindNames[e.kind]} · {e.locale.toUpperCase()}
                      </span>
                    </div>
                    <time>
                      {new Date(e.updatedAt).toLocaleDateString("tr-TR")}
                    </time>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
            </section>
          </>
        )}
        {kind && (
          <>
            <div className="admin-page-heading">
              <h1>{kindNames[kind]}</h1>
              <div className="row-actions">
                {kind === "article" && (
                  <Link className="admin-button" href="/admin/konular">
                    Konular
                  </Link>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => create(kind)}
                >
                  <Plus size={17} />
                  {kind === "page" ? "Yeni sayfa" : "Yeni ekle"}
                </button>
              </div>
            </div>
            <div className="list-toolbar">
              <input
                placeholder="İçerik ara"
                aria-label="İçerik ara"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button aria-pressed={trash} onClick={() => setTrash(!trash)}>
                {trash ? "Tüm içeriklere dön" : "Çöp kutusu"}
              </button>
            </div>
            {kind === "page" ? <PageCards pages={visibleEntries} entries={entries} /> : <div className="content-table">
              <div className="table-heading">
                <span>Başlık</span>
                <span>Türkçe</span>
                <span>English</span>
                <span>Son değişiklik</span>
              </div>
              {visibleEntries.map((e) => {
                  const en = entries.find(
                    (i) => i.id === e.id && i.locale === "en",
                  );
                  return (
                    <Link key={e.id} href={`/admin/duzenle/${e.id}`}>
                      <strong>{e.draft.title || "Başlıksız"}</strong>
                      <span>{e.published ? "Yayında" : "Taslak"}</span>
                      <span>{en?.published ? "Yayında" : "Taslak"}</span>
                      <time>
                        {new Date(e.updatedAt).toLocaleDateString("tr-TR")}
                      </time>
                    </Link>
                  );
                })}
            </div>}
            {!visibleEntries.length && <p className="empty">{search ? "Aramanıza uygun içerik bulunamadı." : "Burada henüz içerik yok."}</p>}
          </>
        )}
        {["duzenle", "ayarlar"].includes(section) &&
          (initial ? (
            <Editor
              key={`${initial.id}:${section}`}
              initial={initial}
              entries={entries}
              mode={initial.kind === "settings" ? "settings" : undefined}
            />
          ) : (
            <p>İçerik bulunamadı.</p>
          ))}
        {!sections.some((s) => s[0] === section) &&
          !["duzenle", "konular"].includes(section) && (
            <h1>Sayfa bulunamadı.</h1>
          )}
      </main>
    </div>
  );
}
