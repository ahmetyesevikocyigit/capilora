# Capilora Hair Clinic

Türkçe/İngilizce çok sayfalı Next.js sitesi ve Türkçe içerik yönetim paneli. Next.js 16.3.5, React 19.3, TypeScript, Drizzle ve yerel SQLite kullanır.

## Güncel kurulum ve tam yedek

Canlı adres: https://capilora-hair-clinic.vercel.app/tr. Vercel projesi `capilora-hair-clinic`, ekip `guncel-yayin` (Güncel Yayın). Canlı içerikler kalıcı Turso ve özel Vercel Blob depolamasındadır; yerel geliştirme kendi SQLite dosyasını kullanır.

28 Eylül 2026 tarihli kaynak kodları ve statik medya bu depodadır. Yerel ve canlı içeriklerin, yüklemelerin ve özel ayarların tam şifreli yedeği ile geri açma adımları [backups/README.md](backups/README.md) dosyasındadır. Şifre çözme anahtarı yalnızca proje sahibindedir.

Güncel panelde metin ve görseller **Sayfalar** altında birlikte düzenlenir; **Klinik Bilgileri** iletişim bilgilerini ve şifre değiştirmeyi içerir. Google yorumları, teknik SEO alanları ve menü adresleri kullanıcı düzenleme ekranlarında gösterilmez. Aşağıdaki mimari açıklamalarda geçen bu veri alanları eski içerik ve altyapı uyumluluğu için saklanır.

**Çalışma localdir. Kullanıcı açıkça istemeden canlıya yayın yapılmaz.** Paneldeki “Yayınla” yalnızca çalıştırıldığı yerel sitenin içeriğini değiştirir; Vercel'e dağıtım yapmaz.

## Çalıştırma

Node.js 24 ve pnpm 11:

```sh
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1 --port 3100
```

Site: `http://127.0.0.1:3100/tr` · Panel: `http://127.0.0.1:3100/admin`

Mevcut kurulumun şifresi yerel olarak ayarlanmıştır. Panelde **Klinik Bilgileri → Şifre değiştir** alanında mevcut şifre ve yeni şifre iki kez girilir. Yeni şifre en az 12, en fazla 200 karakter olmalıdır. İşlem tüm oturumları kapatır; yeni şifreyle tekrar giriş gerekir. Bu işlem taslak/yayın akışından ayrıdır.

Yeni kurulumda veya şifre unutulduğunda kendi terminalinizde:

```sh
pnpm admin:password
```

Şifre ekranda gösterilmez. Yeni şifrelerin tuzlanmış Argon2id hash'i veritabanının içeriklerden ayrı `credentials` tablosuna yazılır. Panel ve terminal aynı kaydı günceller ve mevcut oturumları iptal eder. Bu kayıt yoksa eski kurulumlarla uyumluluk için önce `ADMIN_PASSWORD_HASH`, ardından `.data/admin-secret` okunur. Veritabanındaki şifre kaydı, ilk kurulumdaki bu değerlerden önceliklidir ve içerik yedeğine dahil edilmez.

## İçerik yönetimi

- **Sayfalar:** Mevcut sayfalar ve yeni sayfalar; başlık, SEO, görseller, videolar, metinler ve hazır bloklar. Bloklar eklenebilir, çoğaltılabilir, gizlenebilir, sürüklenebilir veya yukarı/aşağı taşınabilir. Yalnızca ana sayfada video hero vardır.
- **Makale Köşesi:** Tiptap editörü; paragraf, başlık, kalın/italik, liste, alıntı, bağlantı, görsel ve tablo. Konular ayrı yönetilir. İçindekiler bölüm başlıklarından oluşur.
- **Basında Biz:** Yayın adı, tarih, metin, kaynak ve görsel. Başlangıçta uydurma basın içerikleri yoktur.
- **Sonuçlar:** Önce/sonra fotoğrafları, kadraj, kaynak ve sıralama. Fotoğraflara sonuç değiştiren işlem uygulanmaz.
- **Google Yorumları:** Gerçek alıntılar, yazar, yıldız, çeviri bilgisi, kaynak ve kontrol tarihi. Puan ve yorum sayısı Ayarlar'dan elle güncellenir; Google API bağlantısı yoktur.
- **Medya:** JPEG, PNG, WebP, AVIF (20 MB); MP4, WebM (100 MB). Önizleme, alternatif metin, kaynak ve kullanım bilgileri.
- **Menü ve Footer / Ayarlar:** Menü sıralaması, alt bağlantılar, logo, iletişim bilgileri, footer ve geliştirici bağlantısı. Yeni sayfalar kendiliğinden menüye eklenmez.

### Taslak ve yayın

1. Türkçe veya English sekmesinde düzenleyin.
2. **Taslağı kaydet** ile kayıt alın.
3. **Önizle** kayıtlı taslakları açar; yalnızca geçerli yönetici oturumunda çalışır. Önizleme açıkken aynı tarayıcıdaki site taslakları gösterir. Üstteki **Önizlemeyi kapat** düğmesi yayına döndürür.
4. **Yayınla** seçili dilin sürümünü günceller. Diğer dilin yayını bağımsızdır.

Sürüm geçmişinden geri alınan içerik önce taslak olur. Çöp kutusundan geri alınan kayıtlar da iki dilde taslak olarak döner; yeniden yayınlamak gerekir. Aynı kaydı iki sekmede kaydederken eski sürümün üzerine yazılmaz. Çakışmada değişikliklerinizi kopyalayın ve güncel kaydı açın.

Eski sayfa adresleri yayın sırasında yeni adrese 308 yönlendirilir. Yeni içerikler yeniden derleme gerektirmez. Canonical, dil eşleri ve sitemap yalnızca yayınlanmış kayıtlardan oluşur.

## Kalıcı veriler ve yedek

- `.data/content.db`: SQLite içerikleri, sürümler, yönlendirmeler, şifre hash'i ve oturumlar.
- `.data/uploads/`: Yüklenen medya; `public` dışında saklanır.
- `.data/admin-secret`: Eski kurulumların başlangıç şifre hash'i; panelden değişiklikten sonra kullanılmaz. Kaynak kontrolüne veya dışa aktarıma dahil edilmez.
- `CMS_DATA_DIR`: İstenirse veri dizinini değiştirir; varsayılan proje altındaki `.data`.
- `CMS_DATABASE_URL`: Localde varsayılan `file:<CMS_DATA_DIR>/content.db`; bulutta Turso bağlantısı kullanılır. Alternatif değişken adı `TURSO_DATABASE_URL`.

İlk açılışta `content/` ve `public/media/` içindeki mevcut içerikler bir kez aktarılır. Yeniden açılış düzenlenmiş kayıtları ezmez. Bundan sonra içerik değişiklikleri panelden yapılır; eski içerik dosyaları aktarım kaynağıdır.

**Ayarlar → İçerik ve medya yedeğini indir**, `content.json` ve medya dosyalarından oluşan ZIP üretir. Şifre ve oturum kayıtları dahil edilmez. JSON; taslakları, yayınları, sürümleri ve yönlendirmeleri içerir. Yedek içerikler hassas olabilir; güvenli bir yerde saklayın. Bu sürümde ZIP içe aktarma arayüzü yoktur. Makine taşımasında uygulama kapalıyken `.data` dizininin tamamı güvenli biçimde kopyalanabilir; hash ve oturumlar içeren bu tam dizin herkese açık paylaşılmamalıdır.

Taslak medya yalnızca yöneticiye sunulur. Bir dosya yayınlanmış içerikte kullanıldığında ziyaretçi erişimi açılır. Güncel kayıt, çöp kutusu veya geçmiş sürümde kullanılan medya silinemez. Başlangıç dosyaları ayrıca korunur.

## Kontroller

```sh
pnpm test          # İzole SQLite ile içerik/medya regresyonları
pnpm test:http     # 3101 portunda geçici sunucu, şifre/oturum/yayın API testleri
pnpm lint
pnpm typecheck
pnpm build
```

Geliştirme sunucusunu etkilemeden üretim kontrolü:

```sh
NEXT_DIST_DIR=.next-build pnpm build
CMS_HTTP_PRODUCTION=1 pnpm test:http
```

HTTP testleri geçici bir dizinde kendi şifre hash'i ve veritabanını oluşturur; gerçek yerel kayıtları değiştirmez. Test sunucusu sonunda kapanır. `CMS_QA_KEEP=1` yalnızca görsel QA için geçici sunucuyu açık bırakır; Ctrl+C kapatıp temizler.

Yönetim işlemleri sunucuda doğrulanır. Oturumlar 8 saatlik HttpOnly / SameSite cookie kullanır; üretimde Secure olur. Çıkış oturumu iptal eder. Giriş denemeleri sınırlıdır; POST istekleri Origin kontrolünden geçer. Admin ve taslak önizlemeleri noindex'tir. Tiptap yalnızca yönetim editöründe yüklenir.

## Görsel tasarım ve kaynaklar

Ana sayfanın sessiz videosu, mobil üst üste gelen uygulama kartları, önce/sonra karşılaştırması ve yorum şeridi korunur. İç sayfalar sade ortalı başlıklarla başlar. Makale listesi iki sütunlu, okuma sayfası masaüstünde üç sütunludur. Yeni klinik ve basın fotoğrafları kullanıcıdan beklenecektir.

Medyanın kaynakları `content/media-sources.json` ve medya kütüphanesinde bulunur. Önce/sonra fotoğraflarında yoğunluk değiştiren rötuş yapılmaz. Hareket azaltma tercihinde hero kapak görseli ve sabit yorum listesi gösterilir.

## Vercel'de kalıcı depolama

Yerel geliştirme SQLite ve `.data/uploads` kullanmaya devam eder. Vercel'de `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (veya `CMS_DATABASE_URL` + `CMS_DATABASE_TOKEN`) ile kalıcı veritabanı zorunludur. Yüklemeler `BLOB_READ_WRITE_TOKEN` ile bağlı **private** Vercel Blob deposunda tutulur. `NEXT_PUBLIC_SITE_URL` kalıcı site adresidir. `.env*`, `.data`, `.vercel`, testler ve yerel derleme çıktıları deployment paketine dahil edilmez.

Bulut ortamında dosya önce oturum ve Origin denetiminden geçmiş, tek bir özel dosya yoluna sınırlandırılmış token ile doğrudan depoya yüklenir. Sunucu dosya boyutunu ve içeriğini doğrular; fotoğrafları WebP'ye dönüştürür, orijinal geçici yüklemeyi siler. Yayınlanmamış dosyalar sadece oturum sahibine gösterilir. `/api/media/<id>` adresleri sabit kalır; yayınlanan dosyalar bu denetimli rota üzerinden stream edilir. Yarım kalan geçici yüklemeler sonraki yüklemelerde temizlenir.

İlk aktarım için production ortam değişkenlerini `.vercel/.env.production` gibi özel bir dosyaya alın ve `node --import tsx scripts/migrate-cloud.ts .vercel/.env.production` çalıştırın. İşlem dolu bulut veritabanını ezmez, tekrar çalıştırıldığında tamamlanan aktarımı atlar; mevcut içerikleri, geçmişi, medya kimliklerini ve admin şifre hash'ini korur. Oturumlar taşınmaz. Yalnızca ilk boş veritabanı için kullanılır; sonraki deployment'lar buluttaki düzenlemeleri değiştirmez. Üretim ortam değişkenlerini `.env.local` içine almayın.

Bulut yükleme doğrulaması `node tests/cms-cloud-http.mjs .vercel/.env.production` ile yapılır. Bu kontrol geçici yerel veritabanı ve işlem sonunda silinen özel test dosyaları kullanır; canlı içerik veritabanına yazmaz.
