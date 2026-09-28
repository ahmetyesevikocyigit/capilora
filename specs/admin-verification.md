# Yönetim paneli doğrulaması

25 Eylül 2026 · Yalnızca yerel ortam

## Otomatik kontroller

- `node --import tsx --test tests/cms-store.test.ts`: **13/13 geçti**.
- `CMS_HTTP_PRODUCTION=1 node tests/cms-http.mjs`: **12/12 geçti**; üretim derlemesi yerel 3101 portunda, geçici SQLite diziniyle çalıştırıldı ve kapatıldı.
- ESLint: hatasız ve uyarısız.
- Next.js üretim derlemesi ve TypeScript: başarılı (`.next-build`).

Kapsam: şifre, yerel form POST gönderimi, Origin kontrolü, yetkisiz API, oturum süresi/iptali, hız sınırı; tüm mevcut sayfaların taslak düzenlemesi ve 26 yayın adresi; önizleme noindex/no-store, taslak gizliliği, bağımsız dil yayını, 308 yönlendirme, çakışma koruması, sürümden taslağa dönüş, çöp kutusu, medya erişimi/biçim/boyut/kullanım koruması, ZIP dışa aktarma, sunucu yeniden başlatıldıktan sonra kayıtların korunması.

## Arayüz

1280 px masaüstü, 820 px tablet ve 390 px mobil görünüm kontrol edildi. Yatay taşma görülmedi.

- Şifre göster/gizle ve giriş.
- Makale başlığı/konusu, Tiptap bölüm başlığı, paragraf, tablo ve medya seçimi; kaydetme ve yayınlama.
- Yazıda otomatik içindekiler, tablo ve görselin ziyaretçiye sunulması.
- Sayfa bölümü ekleme, çoğaltma, yukarı taşıma ve gizleme.
- Önizlemeye geçiş ve yayına dönüş.
- Mobil yönetim menüsü, Escape ile kapanma, erişilebilir medya seçimi.
- Mevcut ana sayfa tasarımı ve karşılaştırıcının klavyeyle 0/100 uçları.

Tarayıcı doğrulamasındaki içerikler yalnızca geçici test veritabanına yazıldı. Asıl yerel veritabanında 44 dil kaydı korunuyor; çöp veya deneme kaydı yok. Geçici sekmeler ve test sunucusu kapatıldı. Ana geliştirme sunucusu `127.0.0.1:3100` üzerinde açık bırakıldı.

## Kapsam sınırı

Canlıya dağıtım, bulut veritabanı veya nesne depolama kurulmadı. Yeni klinik/basın fotoğrafları eklenmedi. ZIP yedeği dışa aktarılır; ZIP içe aktarma arayüzü bu planın kapsamında değildir.
