"use client";
import Image from "next/image";
import { useState } from "react";
import { ArrowUp, ArrowDown, X, Upload, Images } from "lucide-react";
import { newBlock, type Block } from "@/lib/cms/types";
import { MediaLibrary, uploadFile, type Asset } from "./media";
import { Modal } from "./modal";

export function GalleryPhotos({ blocks, galleryId, onChange, disabled, onUploadingChange, emptyText = "Bu sayfaya henüz galeri fotoğrafı eklenmemiş." }: {
  blocks: Block[];
  galleryId?: string;
  onChange: (blocks: Block[]) => void;
  disabled: boolean;
  onUploadingChange: (busy: boolean) => void;
  emptyText?: string;
}) {
  const [picker, setPicker] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const galleries = blocks.filter(b => b.type === "gallery" && (!galleryId || b.id === galleryId));
  const update = (id: string, items: Block["items"]) =>
    onChange(blocks.map(b => b.id === id ? { ...b, items } : b));
  const add = (id: string, assets: Pick<Asset, "url" | "alt">[]) => {
    const gallery = blocks.find(b => b.id === id) || newBlock("gallery");
    const next = { ...gallery, items: [...gallery.items, ...assets.map(a => ({
      id: crypto.randomUUID(), image: a.url, alt: a.alt || "", title: "", text: "", href: "",
    }))] };
    if (blocks.some(b => b.id === id)) onChange(blocks.map(b => b.id === id ? next : b));
    else {
      const position = blocks.findIndex(b => b.type === "cta");
      const list = [...blocks];
      list.splice(position < 0 ? list.length : position, 0, next);
      onChange(list);
    }
  };
  const controls = (id: string, count: number) => (
    <div className="gallery-photo-actions">
      <label className={`upload-button ${disabled || uploading ? "is-disabled" : ""}`}>
        <Upload size={17} />{uploading ? "Fotoğraflar yükleniyor…" : "Fotoğraf ekle"}
        <input className="gallery-file-input" type="file" multiple
          aria-label="Fotoğraf ekle" disabled={disabled || uploading}
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={async e => {
            const input = e.currentTarget;
            const files = Array.from(input.files || []);
            if (!files.length) return;
            setError("");
            if (count + files.length > 100) { setError("Bir galeriye en fazla 100 fotoğraf eklenebilir."); input.value = ""; return; }
            setUploading(true); onUploadingChange(true);
            const uploaded: Pick<Asset, "url" | "alt">[] = [];
            try {
              for (const file of files) {
                if (!file.type.startsWith("image/")) throw new Error("Lütfen fotoğraf seçin.");
                const asset = await uploadFile(file);
                uploaded.push({ url: asset.url, alt: "" });
              }
            } catch (e) { setError((e as Error).message); }
            finally {
              if (uploaded.length) add(id, uploaded);
              setUploading(false); onUploadingChange(false); input.value = "";
            }
          }} />
      </label>
      <button type="button" disabled={disabled || uploading || count >= 100} onClick={() => setPicker(id)}>
        <Images size={17} />Yüklü fotoğraflardan seç
      </button>
    </div>
  );
  return (
    <div className="gallery-photos">
      {error && <p className="form-error" role="alert">{error}</p>}
      {!galleries.length && <><p className="empty">{emptyText}</p>{controls("new", 0)}</>}
      {galleries.map((b, index) => (
        <section key={b.id} className="gallery-group" aria-label={b.title || `Fotoğraflar ${index + 1}`}>
          {galleries.length > 1 && <h3>{b.title || `Fotoğraflar ${index + 1}`}</h3>}
          {!b.enabled && <label className="checkbox"><input type="checkbox" checked={false} disabled={disabled || uploading}
            onChange={() => onChange(blocks.map(item => item.id === b.id ? { ...item, enabled: true } : item))} />Bu galeriyi sitede göster</label>}
          <div className="media-grid">
            {b.items.map((item, i) => (
              <div className="media-tile gallery-photo" key={item.id}>
                {item.image && <Image src={item.image} alt={item.alt || item.title || `Fotoğraf ${i + 1}`} width={480} height={320} unoptimized />}
                <label className="field"><span>Fotoğraf açıklaması (isteğe bağlı)</span>
                  <input value={item.title} disabled={disabled || uploading} onChange={e => update(b.id, b.items.map(photo => photo.id === item.id ? { ...photo, title: e.target.value, alt: e.target.value } : photo))} />
                </label>
                <div className="row-actions">
                  <button type="button" aria-label={`${i + 1}. fotoğrafı öne taşı`} disabled={disabled || uploading || i === 0} onClick={() => {
                    const items = [...b.items]; [items[i - 1], items[i]] = [items[i], items[i - 1]]; update(b.id, items);
                  }}><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`${i + 1}. fotoğrafı geriye taşı`} disabled={disabled || uploading || i === b.items.length - 1} onClick={() => {
                    const items = [...b.items]; [items[i + 1], items[i]] = [items[i], items[i + 1]]; update(b.id, items);
                  }}><ArrowDown size={16} /></button>
                  <button type="button" disabled={disabled || uploading} onClick={() => update(b.id, b.items.filter(photo => photo.id !== item.id))}><X size={16} />Kaldır</button>
                </div>
              </div>
            ))}
          </div>
          {controls(b.id, b.items.length)}
        </section>
      ))}
      {picker !== null && <Modal title="Fotoğraf seç" onClose={() => setPicker(null)}>
        <MediaLibrary accept="image" onClose={() => setPicker(null)} onSelect={a => { add(picker, [a]); setPicker(null); }} />
      </Modal>}
    </div>
  );
}
