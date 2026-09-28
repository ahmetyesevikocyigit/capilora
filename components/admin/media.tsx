"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { X, Upload, ImageIcon } from "lucide-react";
import { Modal } from "./modal";
import { api } from "./api";
export interface Asset {
  id: string;
  version: number;
  name: string;
  url: string;
  mime: string;
  size: number;
  alt: string;
  source_url: string;
  usage: { id: string; locale: string; title: string; published: boolean }[];
}
const siteAssets = new Set([
  "/media/hero-poster.webp", "/media/hero-desktop.mp4", "/media/hero-mobile.mp4",
  "/media/logo.webp", "/media/google.png", "/media/whatsapp.svg",
]);
const photoNames: Record<string, string> = {
  "/media/team.webp": "Klinik ekibi",
  "/media/service-hair.webp": "Saç ekimi",
  "/media/service-beard.webp": "Sakal ekimi",
  "/media/service-eyebrow.webp": "Kaş ekimi",
  "/media/result-01-before.webp": "İlk sonuç · Öncesi",
  "/media/result-01-after.webp": "İlk sonuç · Sonrası",
  "/media/result-02-before.webp": "İkinci sonuç · Öncesi",
  "/media/result-02-after.webp": "İkinci sonuç · Sonrası",
};
export async function uploadFile(file: File): Promise<Asset> {
  if (file.size > (file.type.startsWith("video/") ? 100 : 20) * 1024 * 1024)
    throw new Error(file.type.startsWith("video/") ? "Video en fazla 100 MB olabilir." : "Fotoğraf en fazla 20 MB olabilir.");
  const config = await api<{ direct: boolean }>("upload-config");
  if (config.direct) {
    const { upload } = await import("@vercel/blob/client");
    const { id, pathname } = await api<{ id: string; pathname: string }>("upload-start", {
      name: file.name, mime: file.type, size: file.size,
    });
    await upload(pathname, file, {
      access: "private", handleUploadUrl: "/api/admin/upload-token",
      multipart: file.size > 4 * 1024 * 1024,
    });
    const result = await api<Asset>("upload-finish", { id });
    return { ...result, version: 1, alt: "", source_url: "", usage: [] };
  }
  const form = new FormData();
  form.set("file", file);
  const response = await fetch("/api/admin/media", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Dosya yüklenemedi.");
  return { ...result, version: 1, alt: "", source_url: "", usage: [] };
}
export function MediaLibrary({
  onSelect,
  accept,
  onClose,
  selectedUrl,
}: {
  onSelect?: (asset: Asset) => void;
  accept?: "image" | "video";
  onClose?: () => void;
  selectedUrl?: string;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const load = () =>
    api<{ assets: Asset[] }>("media")
      .then((r) => setAssets(r.assets))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const visibleAssets = assets.filter(a =>
    (accept === "video" ? a.mime.startsWith("video/") : a.mime.startsWith("image/") && a.mime !== "image/svg+xml") &&
    (!siteAssets.has(a.url) || a.url === selectedUrl || accept === "video") &&
    (photoNames[a.url] || a.alt || a.name).toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")),
  );
  return (
    <div className="media-library">
      <div className="media-toolbar">
        <h2>{accept === "video" ? "Videolar" : "Fotoğraflar"}</h2>
        {onClose && (
          <button aria-label="Kapat" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>
      <div className="list-toolbar">
        <input
          aria-label={accept === "video" ? "Video ara" : "Fotoğraf ara"}
          placeholder={accept === "video" ? "Video ara" : "Fotoğraf ara"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="upload-button">
          <Upload size={16} />
          {busy ? "Yükleniyor…" : accept === "video" ? "Video yükle" : "Fotoğraf yükle"}
          <input
            type="file"
            className="gallery-file-input"
            aria-label={accept === "video" ? "Video yükle" : "Fotoğraf yükle"}
            disabled={busy}
            accept={
              accept === "video"
                ? "video/mp4,video/webm"
                : "image/jpeg,image/png,image/webp,image/avif"
            }
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (
                file.size >
                (file.type.startsWith("video/") ? 100 : 20) * 1024 * 1024
              ) {
                setError("Dosya boyutu sınırı aşıldı.");
                return;
              }
              const input = e.currentTarget;
              setBusy(true);
              setError("");
              try {
                const asset = await uploadFile(file);
                await load();
                onSelect?.(asset);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
                input.value = "";
              }
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="media-grid">
        {visibleAssets
          .map((a) => (
            <div className="media-tile" key={`${a.id}:${a.version}`}>
              <button
                className="media-thumb"
                onClick={() => onSelect?.(a)}
                disabled={!onSelect}
                aria-label={`${photoNames[a.url] || a.alt || a.name} seç`}
              >
                {a.mime.startsWith("image") ? (
                  <Image
                    src={a.url}
                    alt={a.alt || photoNames[a.url] || a.name}
                    width={300}
                    height={200}
                    unoptimized
                  />
                ) : (
                  <video src={a.url} preload="metadata" muted />
                )}
              </button>
              <p>{photoNames[a.url] || a.alt || a.name}</p>
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                Önizle
              </a>
              {!onSelect && <span>
                {(a.size / 1024 / 1024).toFixed(1)} MB · {a.usage.length}{" "}
                kullanım
              </span>}
              {onSelect ? (
                <button className="small" onClick={() => onSelect(a)}>
                  Seç
                </button>
              ) : (
                <details>
                  <summary>Dosya bilgileri</summary>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      try {
                        await api(`media/${a.id}`, {
                          action: "update",
                          version: a.version,
                          alt: f.get("alt"),
                          sourceUrl: f.get("sourceUrl"),
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <label>
                      Alternatif metin
                      <input name="alt" defaultValue={a.alt} />
                    </label>
                    <label>
                      Kaynak bağlantısı
                      <input name="sourceUrl" defaultValue={a.source_url} />
                    </label>
                    <button className="small">Kaydet</button>
                  </form>
                  {a.usage.map((u, n) => (
                    <a
                      key={n}
                      className="media-usage"
                      href={`/admin/duzenle/${u.id}`}
                    >
                      {u.title || "Başlıksız"} ({u.locale.toUpperCase()})
                    </a>
                  ))}
                  <button
                    className="danger small"
                    disabled={!!a.usage.length || a.id.startsWith("seed-")}
                    onClick={async () => {
                      if (!confirm("Bu dosya kalıcı olarak silinsin mi?"))
                        return;
                      try {
                        await api(`media/${a.id}`, { action: "delete" });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Dosyayı sil
                  </button>
                </details>
              )}
            </div>
          ))}
      </div>
      {loading && <p role="status">Dosyalar yükleniyor…</p>}
      {!loading && !visibleAssets.length && <p className="empty">{search ? "Aramanıza uygun dosya bulunamadı." : accept === "video" ? "Henüz video eklenmemiş." : "Henüz fotoğraf eklenmemiş."}</p>}
    </div>
  );
}
export function MediaField({
  label,
  value,
  onChange,
  accept = "image",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: "image" | "video";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <span>{label}</span>
      <div className="media-field">
        {value && accept === "image" ? (
          <Image
            src={value}
            alt="Seçilen görsel"
            width={64}
            height={48}
            unoptimized
          />
        ) : (
          <ImageIcon size={22} />
        )}
        <span>{value ? accept === "video" ? "Video seçildi" : "Görsel seçildi" : "Henüz seçilmedi"}</span>
        <button type="button" onClick={() => setOpen(true)}>
          Seç
        </button>
        {value && (
          <button
            type="button"
            aria-label={`${label} kaldır`}
            onClick={() => onChange("")}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <Modal title={accept === "video" ? "Video seç" : "Fotoğraf seç"} onClose={() => setOpen(false)}>
          <MediaLibrary
            accept={accept}
            selectedUrl={value}
            onClose={() => setOpen(false)}
            onSelect={(a) => {
              onChange(a.url);
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
