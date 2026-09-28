"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import {
  contentPath,
  dataSchema,
  type CmsEntry,
  type ContentData,
  type Locale,
} from "@/lib/cms/types";
import { Field, BlockEditor } from "./fields";
import { MediaField } from "./media";
import { api } from "./api";
import { PasswordChange } from "./password-change";
import { GalleryPhotos } from "./gallery-photos";
const RichEditor = dynamic(
  () => import("./rich-editor").then((m) => m.RichEditor),
  { ssr: false, loading: () => <p>Editör yükleniyor…</p> },
);
export function Editor({
  initial,
  entries,
  mode,
}: {
  initial: CmsEntry;
  entries: CmsEntry[];
  mode?: "settings";
}) {
  const router=useRouter();
  const [entry, setEntry] = useState(initial),
    [data, setData] = useState(initial.draft),
    [lang, setLang] = useState<Locale>(initial.locale),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [changingPassword, setChangingPassword] = useState(false),
    [history, setHistory] = useState<
      { id: string; createdAt: string; title: string }[]
    >([]);
  const dirty = JSON.stringify(data) !== JSON.stringify(entry.draft);
  const set = <K extends keyof ContentData>(key: K, value: ContentData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setNotice("");
  };
  useEffect(() => {
    if (!dirty && !uploading && !changingPassword) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const leave = (e: Event) => {
      if (
        !confirm(
          "Kaydedilmemiş değişiklikler var. Çıkış yapmak istiyor musunuz?",
        )
      )
        e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (
        anchor &&
        !anchor.target &&
        !anchor.href.startsWith("javascript:") &&
        !confirm(
          "Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const navigation=(window as Window & {navigation?:EventTarget}).navigation;
    const traverse=(event:Event)=>{if((event as Event & {navigationType?:string}).navigationType==='traverse'&&event.cancelable&&!confirm('Kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?'))event.preventDefault()};
    navigation?.addEventListener('navigate',traverse);
    addEventListener("beforeunload", unload);
    addEventListener("admin:leave", leave);
    document.addEventListener("click", click, true);
    return () => {
      navigation?.removeEventListener("navigate",traverse);
      removeEventListener("beforeunload", unload);
      removeEventListener("admin:leave", leave);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, uploading, changingPassword]);
  const act = async (action: string, historyId?: string) => {
    if (
      action === "restoreVersion" &&
      dirty &&
      !confirm("Kaydedilmemiş değişikliklerin yerine seçilen sürüm alınsın mı?")
    )
      return null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action !== "restoreVersion") {
        const valid = dataSchema.safeParse(data);
        if (!valid.success)
          throw new Error(valid.error.issues.map((i) => i.message).join("\n"));
        if (action === "publish" && !data.title.trim())
          throw new Error("Başlık girin.");
      }
      const res = await api<{ entry: CmsEntry }>(`entries/${entry.id}`, {
        locale: lang,
        version: entry.version,
        action,
        data: action === "restoreVersion" ? undefined : data,
        historyId,
      });
      setEntry(res.entry);
      setData(res.entry.draft);
      setNotice(
        action === "publish"
          ? "Yayınlandı."
          : action === "save"
            ? "Taslak kaydedildi."
            : action === "restoreVersion"
              ? "Sürüm taslağa alındı. Yayınlamak için Yayınla’yı kullanın."
              : action === "recover"
                ? "İçerik taslak olarak geri alındı. Her dili ayrıca yayınlayabilirsiniz."
                : "İşlem tamamlandı.",
      );
      return res.entry;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  const changeLang = async (locale: Locale) => {
    if (
      dirty &&
      !confirm("Kaydedilmemiş değişiklikler kaybolacak. Dil değiştirilsin mi?")
    )
      return;
    try {
      const res = await api<{ entries: CmsEntry[] }>("entries");
      const next = res.entries.find(
        (e) => e.id === entry.id && e.locale === locale,
      );
      if (next) {
        setLang(locale);
        setEntry(next);
        setData(next.draft);
        setError("");
        setNotice("");
        setHistory([]);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const field = (
    key: keyof ContentData,
    label: string,
    multiline = false,
    type = "text",
  ) => (
    <Field
      key={key}
      label={label}
      multiline={multiline}
      type={type}
      value={String(data[key] ?? "")}
      onChange={(v) => set(key, (type === "number" ? Number(v) : v) as never)}
    />
  );
  const photo = (key: "image" | "before" | "after" | "logo", label: string) => (
    <MediaField label={label} value={data[key]} onChange={(v) => set(key, v)} />
  );
  return (
    <div className="entry-editor">
      {entry.kind === "page" && <Link className="pages-back" href="/admin/sayfalar" prefetch={false}>
        <ArrowLeft size={17} aria-hidden="true" />Tüm sayfalar
      </Link>}
      <div className="editor-header">
        <div>
          <h1>
            {mode === "settings"
                ? "Klinik Bilgileri"
                : [data.title, entry.kind === "page" ? data.light : ""].filter(Boolean).join(" ") || "Yeni içerik"}
          </h1>
          <p>
            {entry.published ? "Yayında" : "Henüz yayınlanmadı"}
            {dirty ? " · Kaydedilmemiş değişiklikler" : ""}
            {entry.deletedAt ? " · Çöp kutusunda" : ""}
          </p>
        </div>
        <div className="language-tabs" role="group" aria-label="İçerik dili">
          {(["tr", "en"] as const).map((l) => (
            <button
              key={l}
              aria-pressed={lang === l}
              disabled={busy || uploading || changingPassword}
              onClick={() => changeLang(l)}
            >
              {l === "tr" ? "Türkçe" : "English"}
            </button>
          ))}
        </div>
      </div>
      <div className="save-toolbar">
        <button
          disabled={busy || uploading || changingPassword || !!entry.deletedAt}
          onClick={() => act("save")}
        >
          {busy ? "Kaydediliyor…" : "Taslağı kaydet"}
        </button>
        <button
          disabled={busy || uploading || changingPassword || !!entry.deletedAt}
          onClick={async () => {
            const saved = dirty ? await act("save") : entry;
            if (!saved) {
              return;
            }
            try {
              await api("preview", { enabled: true });
              const target = ["page", "article"].includes(saved.kind)
                ? contentPath(saved.kind, lang, saved.draft)
                : `/${lang}`;
              router.push(target);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Önizle
          <Eye size={15} />
        </button>
        <button
          className="primary"
          disabled={busy || uploading || changingPassword || !!entry.deletedAt}
          onClick={() => act("publish")}
        >
          Yayınla
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      <fieldset className="editor-paper" disabled={busy || uploading || changingPassword || !!entry.deletedAt} aria-label="İçerik düzenleyici">
        {entry.kind !== "settings" && (
          <>
            <div className="form-grid">
              {field("title", entry.kind === "review" ? "Kayıt adı" : "Başlık")}
              {entry.kind === "page" && field("light", "Başlığın devamı")}
            </div>
          </>
        )}
        {entry.kind === "page" && (
          <BlockEditor
            key={`${entry.id}:${lang}`}
            home={entry.id === "home"}
            blocks={data.blocks}
            disabled={busy || uploading || changingPassword || !!entry.deletedAt}
            onUploadingChange={setUploading}
            onChange={(v) => set("blocks", v)}
          />
        )}
        {entry.kind === "article" && (
          <>
            {field("excerpt", "Kısa özet", true)}
            <label className="field">
              <span>Konu</span>
              <select
                value={entries.find(e=>e.kind==="category"&&e.locale===lang&&(e.id===data.categoryId||e.draft.slug===data.categoryId))?.id||data.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">Konu seçin</option>
                {entries
                  .filter(
                    (e) =>
                      e.kind === "category" &&
                      e.locale === lang &&
                      !e.deletedAt,
                  )
                  .map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.draft.title}
                    </option>
                  ))}
              </select>
            </label>
            {photo("image", "Kapak görseli")}
            {field("alt", "Kapak alternatif metni")}
            <h2>Yazı içeriği</h2>
            <RichEditor
              key={`${entry.id}:${lang}:${entry.version}`}
              value={data.body}
              onChange={(v) => set("body", v)}
            />
            <h2>Kaynaklar</h2>
            {data.sources.map((s, i) => (
              <div className="source-row" key={i}>
                <Field
                  label="Kaynak adı"
                  value={s.name}
                  onChange={(name) =>
                    set(
                      "sources",
                      data.sources.map((v, n) =>
                        n === i ? { ...v, name } : v,
                      ),
                    )
                  }
                />
                <Field
                  label="Kaynak adresi"
                  value={s.url}
                  onChange={(url) =>
                    set(
                      "sources",
                      data.sources.map((v, n) => (n === i ? { ...v, url } : v)),
                    )
                  }
                />
                <button
                  aria-label="Kaynağı kaldır"
                  onClick={() =>
                    set(
                      "sources",
                      data.sources.filter((_, n) => n !== i),
                    )
                  }
                >
                  Kaldır
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                set("sources", [...data.sources, { name: "", url: "" }])
              }
            >
              Kaynak ekle
            </button>
          </>
        )}
        {entry.kind === "press" && (
          <>
            {field("publication", "Yayın adı")}
            {field("publishedAt", "Yayın tarihi (isteğe bağlı)", false, "date")}
            {field("excerpt", "Açıklama", true)}
            {photo("image", "Görsel")}
            {field("alt", "Alternatif metin")}
            {field("sourceUrl", "Haber bağlantısı (isteğe bağlı)")}
            {field("order", "Sıra", false, "number")}
            <details>
              <summary>Habere ait diğer görüntüler</summary>
              <GalleryPhotos blocks={data.blocks} onChange={blocks => set("blocks", blocks)}
                disabled={busy || uploading || changingPassword || !!entry.deletedAt}
                onUploadingChange={setUploading}
                emptyText="Aynı habere ait başka görüntüler varsa buraya ekleyebilirsiniz." />
            </details>
          </>
        )}
        {entry.kind === "result" && (
          <>
            {field("excerpt", "Açıklama", true)}
            <div className="form-grid">
              {photo("before", "Önce fotoğrafı")}
              {photo("after", "Sonra fotoğrafı")}
              {field("beforePosition", "Önce kadrajı (ör. 50% 50%)")}
              {field("afterPosition", "Sonra kadrajı (ör. 50% 50%)")}
            </div>
            {field("sourceUrl", "Kaynak bağlantısı")}
            {field("publishedAt", "Kaynak tarihi", false, "date")}
            {field("order", "Sıra", false, "number")}
          </>
        )}
        {entry.kind === "settings" && (
          <>
            {field("name", "Klinik adı")}
            {field("phone", "Telefon")}
            {field(
              "whatsappNumber",
              "WhatsApp numarası (ülke koduyla, yalnızca rakam)",
            )}
            {field("whatsappText", "WhatsApp başlangıç mesajı", true)}
            {field("address", "Adres", true)}
            {field("instagram", "Instagram bağlantısı")}
            {field("maps", "Google Maps bağlantısı")}
            <h2>Sayfanın altındaki metinler</h2>
            <div className="form-grid">
              {field("footerTitle", "İletişim başlığı")}
              {field("footerLight", "Başlığın devamı")}
            </div>
            {field("footerBody", "İletişim metni", true)}
            {field("footerTagline", "Kısa klinik tanıtımı")}
            <h2>Yedek</h2>
            <a className="admin-button" href="/api/admin/export" download>
              İçerik ve medya yedeğini indir
            </a>
          </>
        )}
      </fieldset>
      {entry.kind === "settings" && <PasswordChange
        disabled={busy || uploading}
        unsaved={dirty}
        onBusyChange={setChangingPassword}
      />}
      <div className="entry-management">
        <button
          disabled={busy || uploading || changingPassword}
          onClick={async () => {
            try {
              const r = await api<{ history: typeof history }>(
                `history/${entry.id}?lang=${lang}`,
              );
              setHistory(r.history);
              if (!r.history.length) setNotice("Henüz yayınlanmış sürüm yok.");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Sürüm geçmişi
        </button>
        {!["home", "site", "journal"].includes(entry.id) && (
          <>
            {entry.published && !entry.deletedAt && (
              <button
                disabled={busy || uploading || changingPassword}
                onClick={() => {
                  if (confirm("Bu dildeki içerik yayından kaldırılsın mı?"))
                    void act("unpublish");
                }}
              >
                Yayından kaldır
              </button>
            )}
            <button
              className="danger"
              disabled={busy || uploading || changingPassword}
              onClick={() => {
                if (
                  confirm(
                    entry.deletedAt
                      ? "İçerik geri alınsın mı?"
                      : "İçerik her iki dilde çöp kutusuna taşınsın mı?",
                  )
                )
                  void act(entry.deletedAt ? "recover" : "trash");
              }}
            >
              {entry.deletedAt ? "Geri al" : "Çöp kutusuna taşı"}
            </button>
          </>
        )}
      </div>
      {history.length > 0 && (
        <section className="history-panel">
          <h2>Yayınlanmış sürümler</h2>
          {history.map((h) => (
            <div key={h.id}>
              <span>
                {new Date(h.createdAt).toLocaleString("tr-TR")} · {h.title}
              </span>
              <button
                disabled={busy || uploading || changingPassword}
                onClick={() => act("restoreVersion", h.id)}
              >
                Taslağa geri al
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
