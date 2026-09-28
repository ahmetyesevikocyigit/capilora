<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Publishing preference — 25 September 2026

Work locally only. Do not deploy, promote, or publish changes to the live site until the user explicitly asks to take the changes live. Earlier deployment authorization has been withdrawn.

On 27 September 2026 the user explicitly requested “verceli güncelle”, authorizing deployment of the current changes. That release was deployed successfully on 27 September 2026 to https://capilora-hair-clinic.vercel.app with persistent Turso and private Blob storage. Keep local development data separate from production; do not rerun imports over cloud edits. This does not authorize automatic deployment of future unrelated changes.

On 28 September 2026 the user explicitly requested “al baba”, authorizing the section alignment, spacing, CTA arrow and results text changes. Deployment `dpl_GHp4bGG3qPuYz2Rn1PqJ87v9jP1M` was verified and promoted to the same production site in the Güncel Yayın team. Details: `.data/deploy-2026-09-28/status.md`. Future unrelated changes still require an explicit publish request.

## Pending photographs — 25 September 2026

The user will supply photographs for the press and clinic pages tomorrow. Do not add new photographs to those pages before the supplied images arrive. Other requested editing can continue locally.

Press screenshots arrived on 27 September 2026: 11 images representing 10 stories (Star Haber 365 has two clippings). They are imported into the local CMS as WebP assets using `scripts/import-press-clippings.ts <source-directory>`, with an idempotent ledger and content-only backup under `.data/imports`. Preserve these editable records. The press archive uses plain publication names, titles and clickable clippings, without decorative labels or extra action buttons. Do not invent publication dates or source URLs. Clinic photographs are still pending.

## Inner page design preference — 25 September 2026

Only the home page uses a video hero. Inner pages, including individual articles, use a plain centered heading without hero media, animation, description, breadcrumb labels, or call-to-action buttons. Retain the existing typography and palette.

## Article design reference — 25 September 2026

Use the supplied Koçyiğit Yazılım screenshots as a layout reference only: a text-based article archive with topics to the side, and article pages with contents on the left, text in the center and clinic/related links on the right. Keep Capilora’s colors and simple centered page titles. Do not add AI summary/editing buttons or invent author identities, qualifications or publication dates.

## Unified page editing — 25 September 2026

Show pages as cards in the admin's Sayfalar section. Edit each page's text, section images and gallery photos in one editor with a shared draft/save/preview/publish flow. Do not restore a separate Gallery navigation item; old gallery links should open the corresponding page editor.

## Public gallery — 25 September 2026

The public Gallery page has a centered title and photo grid, linked in the website navigation. Its photos are managed in Sayfalar → Galeri. The homepage gallery strip reads those same published photos in their saved order, independently for each language. Keep drafts private and hide the strip when the gallery is unpublished or has no visible photos. Do not fill the gallery with sample photos.

## Photo uploads — 25 September 2026

Convert all admin photo uploads (JPEG, PNG, AVIF and WebP inputs) to WebP on the server. Preserve dimensions, orientation and transparency; store accurate WebP filenames, MIME types and sizes. Keep media IDs/URLs stable when converting existing uploads. Videos are unchanged. Existing upload conversion uses the repeatable `media:webp` maintenance command with private original-file backups.

## Simple content forms — 25 September 2026

Do not show page/article addresses, SEO fields or a separate sharing-image control in the admin editor. Generate missing addresses from titles on the server, avoid conflicts, and retain existing addresses when titles change. Preserve stored SEO values and derive missing metadata from the visible content and its photos. Article cover images remain part of article content editing.
