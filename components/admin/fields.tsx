"use client";
import { ArrowUp, ArrowDown, Copy, Trash2, GripVertical, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  blockNames,
  newBlock,
  type Block,
  type BlockType,
} from "@/lib/cms/types";
import { MediaField } from "./media";
import { GalleryPhotos } from "./gallery-photos";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function BlockEditor({
  blocks,
  onChange,
  home,
  disabled,
  onUploadingChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  home: boolean;
  disabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [type, setType] = useState<BlockType>("text"),
    [drag, setDrag] = useState<number | null>(null);
  const update = (index: number, data: Partial<Block>) =>
    onChange(blocks.map((b, i) => (i === index ? { ...b, ...data } : b)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  return (
    <section className="block-editor">
      <h2>Sayfa bölümleri</h2>
      {blocks.map((b, index) => (
        <details
          className="block-row"
          key={b.id}
          open={index === 0 || b.type === "gallery"}
          draggable={!disabled}
          onDragStart={(e) => {
            if ((e.target as HTMLElement).closest("input,textarea,button")) {
              e.preventDefault();
              return;
            }
            setDrag(index);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled && drag !== null) move(drag, index);
            setDrag(null);
          }}
        >
          <summary>
            <GripVertical size={16} />
            <span>
              {blockNames[b.type]}
              {b.title ? ` · ${b.title}` : ""}
              {!b.enabled ? " · Gizli" : ""}
            </span>
            <ChevronDown className="block-chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="block-actions">
            <label>
              <input
                type="checkbox"
                checked={b.enabled}
                onChange={(e) => update(index, { enabled: e.target.checked })}
              />{" "}
              Görünür
            </label>
            <button
              type="button"
              aria-label="Bölümü yukarı taşı"
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              aria-label="Bölümü aşağı taşı"
              disabled={index === blocks.length - 1}
              onClick={() => move(index, index + 1)}
            >
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              aria-label="Bölümü çoğalt"
              onClick={() =>
                onChange([
                  ...blocks.slice(0, index + 1),
                  { ...structuredClone(b), id: crypto.randomUUID() },
                  ...blocks.slice(index + 1),
                ])
              }
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              aria-label="Bölümü kaldır"
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="block-fields">
            <div className="form-grid">
              <Field
                label="Başlık"
                value={b.title}
                onChange={(title) => update(index, { title })}
              />
              <Field
                label="Başlığın devamı"
                value={b.light}
                onChange={(light) => update(index, { light })}
              />
            </div>
            {!["gallery", "galleryStrip", "faq", "reviews", "press", "articles"].includes(
              b.type,
            ) && (
              <>
                <Field
                  label="Metin"
                  multiline
                  value={b.text}
                  onChange={(text) => update(index, { text })}
                />
                {["text", "imageText", "cards", "cta"].includes(b.type) && (
                  <Field
                    label="İkinci metin"
                    multiline
                    value={b.text2}
                    onChange={(text2) => update(index, { text2 })}
                  />
                )}
              </>
            )}
            {b.type === "imageText" && (
              <>
                <MediaField
                  label="Görsel"
                  value={b.image}
                  onChange={(image) => update(index, { image })}
                />
                <Field
                  label="Alternatif metin"
                  value={b.alt}
                  onChange={(alt) => update(index, { alt })}
                />
              </>
            )}
            {b.type === "hero" && (
              <>
                <MediaField
                  label="Kapak görseli"
                  value={b.poster}
                  onChange={(poster) => update(index, { poster })}
                />
                <MediaField
                  label="Masaüstü videosu"
                  accept="video"
                  value={b.desktopVideo}
                  onChange={(desktopVideo) => update(index, { desktopVideo })}
                />
                <MediaField
                  label="Mobil videosu"
                  accept="video"
                  value={b.mobileVideo}
                  onChange={(mobileVideo) => update(index, { mobileVideo })}
                />
                <div className="form-grid">
                  <Field
                    label="İkinci buton"
                    value={b.secondaryLabel}
                    onChange={(secondaryLabel) =>
                      update(index, { secondaryLabel })
                    }
                  />
                  <Field
                    label="İkinci bağlantı"
                    value={b.secondaryHref}
                    onChange={(secondaryHref) =>
                      update(index, { secondaryHref })
                    }
                  />
                </div>
              </>
            )}
            {[
              "hero",
              "imageText",
              "cards",
              "cta",
              "address",
              "articles",
            ].includes(b.type) && (
              <div className="form-grid">
                <Field
                  label="Buton metni"
                  value={b.buttonLabel}
                  onChange={(buttonLabel) => update(index, { buttonLabel })}
                />
                <Field
                  label="Bağlantı"
                  value={b.href}
                  onChange={(href) => update(index, { href })}
                />
              </div>
            )}
            {b.type === "articles" && (
              <Field
                label="Gösterilecek yazı sayısı (0 = tümü)"
                type="number"
                value={b.limit}
                onChange={(v) => update(index, { limit: Number(v) })}
              />
            )}
            {b.type === "gallery" && <GalleryPhotos
              blocks={blocks} galleryId={b.id} onChange={onChange}
              disabled={disabled} onUploadingChange={onUploadingChange}
            />}
            {b.type === "galleryStrip" && <Link className="admin-button" href="/admin/duzenle/gallery">
              Galeri fotoğraflarını düzenle
            </Link>}
            {["articles", "press", "results"].includes(b.type) && (
              <Link className="admin-button" href={b.type === "articles" ? "/admin/makaleler" : b.type === "press" ? "/admin/basin" : "/admin/sonuclar"}>
                {b.type === "articles" ? "Makaleleri düzenle" : b.type === "press" ? "Basın içeriklerini düzenle" : "Sonuç fotoğraflarını düzenle"}
              </Link>
            )}
            {["cards", "steps", "faq", "text", "methods"].includes(
              b.type,
            ) && (
              <div className="repeater">
                <h3>{b.type === "faq" ? "Sorular" : b.type === "cards" ? "Kartlar" : "İçerikler"}</h3>
                {b.items.map((item, n) => (
                  <div className="repeater-item" key={item.id}>
                    <div className="item-heading">
                      <span>
                        {n + 1}. {item.title || "Yeni öğe"}
                      </span>
                      <button
                        type="button"
                        aria-label="Öğeyi kaldır"
                        onClick={() =>
                          update(index, {
                            items: b.items.filter((_, i) => i !== n),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <Field
                      label={b.type === "faq" ? "Soru" : "Başlık"}
                      value={item.title}
                      onChange={(title) =>
                        update(index, {
                          items: b.items.map((it, i) =>
                            i === n ? { ...it, title } : it,
                          ),
                        })
                      }
                    />
                    <Field
                      label={b.type === "faq" ? "Yanıt" : "Metin"}
                      value={item.text}
                      multiline
                      onChange={(text) =>
                        update(index, {
                          items: b.items.map((it, i) =>
                            i === n ? { ...it, text } : it,
                          ),
                        })
                      }
                    />
                    {b.type === "cards" && (
                      <MediaField
                        label="Görsel"
                        value={item.image}
                        onChange={(image) =>
                          update(index, {
                            items: b.items.map((it, i) =>
                              i === n ? { ...it, image } : it,
                            ),
                          })
                        }
                      />
                    )}
                    <div className="form-grid">
                      <Field
                        label={
                          b.type === "methods"
                            ? "Alt başlık"
                            : "Alternatif metin"
                        }
                        value={item.alt}
                        onChange={(alt) =>
                          update(index, {
                            items: b.items.map((it, i) =>
                              i === n ? { ...it, alt } : it,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Bağlantı"
                        value={item.href}
                        onChange={(href) =>
                          update(index, {
                            items: b.items.map((it, i) =>
                              i === n ? { ...it, href } : it,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="row-actions">
                      <button
                        type="button"
                        disabled={n === 0}
                        onClick={() => {
                          const list = [...b.items];
                          [list[n - 1], list[n]] = [list[n], list[n - 1]];
                          update(index, { items: list });
                        }}
                      >
                        Yukarı
                      </button>
                      <button
                        type="button"
                        disabled={n === b.items.length - 1}
                        onClick={() => {
                          const list = [...b.items];
                          [list[n + 1], list[n]] = [list[n], list[n + 1]];
                          update(index, { items: list });
                        }}
                      >
                        Aşağı
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update(index, {
                      items: [
                        ...b.items,
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          text: "",
                          image: "",
                          alt: "",
                          href: "",
                        },
                      ],
                    })
                  }
                >
                  Öğe ekle
                </button>
              </div>
            )}
          </div>
        </details>
      ))}
      <div className="add-block">
        <select
          aria-label="Yeni bölüm türü"
          value={type}
          onChange={(e) => setType(e.target.value as BlockType)}
        >
          {Object.entries(blockNames)
            .filter(([key]) => home || !["hero", "galleryStrip"].includes(key))
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => onChange([...blocks, newBlock(type)])}
        >
          Bölüm ekle
        </button>
      </div>
      {!blocks.some(b => b.type === "gallery") && <section className="page-photo-section" aria-label="Sayfa fotoğrafları">
        <h2>Sayfa fotoğrafları</h2>
        <GalleryPhotos blocks={blocks} onChange={onChange} disabled={disabled} onUploadingChange={onUploadingChange} />
      </section>}
    </section>
  );
}
