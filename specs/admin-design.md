# Capilora admin implementation

Local-only content management with a Turkish password-only admin, authenticated preview, independent TR/EN draft and published revisions, and a themed block renderer. Preserve existing URLs and import existing content idempotently. No deployment or cloud provisioning.

SQLite/libSQL with Drizzle stores documents, language editions, publication history, media metadata, redirects, sessions and rate-limit attempts. File uploads remain outside public. Public readers receive only published editions and referenced assets; admin operations check the session and same-origin requests on the server. Passwords are scrypt hashes stored in an ignored local secret file, never sent to clients. Sessions expire after eight hours.

Content editing uses explicit typed forms, reusable blocks and a Tiptap rich-text editor. Input is validated with Zod, rich text uses an allowlisted renderer, and writes use transactions with optimistic concurrency. Publishing retains the previous revision and invalidates public caches; restoring a revision only changes the draft. Deleted records are recoverable. Local export contains content and media, not authentication data.

Acceptance: authentication/expiry/CSRF/rate limits; unpublished data and media isolation; per-language publish; new URLs without rebuild; old URL redirects; conflicting saves; restore/trash; upload MIME and size checks; export; restart persistence; mobile/keyboard UI; lint/typecheck/build.
# Kullanım düzenlemesi — 25 Eylül 2026

- Menü ve Footer düzenleme bölümü kaldırıldı. Menü ve alt bağlantılar, marka ve geliştirici bilgileri mevcut haliyle korunur. Klinik Bilgileri ekranında iletişim bilgileri ve sayfanın altındaki metinler düzenlenir.
- Google yorumları, genel puan ve yorum sayısı panelden elle değiştirilemez. Mevcut yayın kayıtları korunur; otomatik veri bağlantısı ayrı çalışmada kurulacaktır.
- Medya menüsü yerine Galeri kullanılır. Galeri girişinde sayfalar ayrı kartlar halinde gösterilir. Kullanıcı kartı açarak o sayfanın fotoğraflarını yükler, açıklama ekler, sıralar ve taslak/önizleme/yayın akışını kullanır. Tüm sayfalar bağlantısıyla kartlara döner.
- Galeri ve fotoğraf seçicisi logo, WhatsApp/Google ikonları ve ana sayfanın açılış dosyalarını listelemez. Açılış ve logo dosyaları yalnızca ilgili alanın seçicisinde kullanılabilir.
- Galeri fotoğrafları sayfanın mevcut galeri bloklarına kaydedilir. Ayrı bir galeri sayfası veya yeni fotoğraf içeriği kendiliğinden eklenmez.
- Çalışma localdir; yayın düğmesi yalnızca local veritabanını günceller.
