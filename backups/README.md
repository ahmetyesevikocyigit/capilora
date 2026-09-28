# Tam proje yedeği — 28 Eylül 2026

Bu depo herkese açıktır. Kodlar ve sitenin statik dosyaları normal Git dosyalarıdır. Özel içerikler, taslaklar, şifre hash'leri, oturumlar ve ortam değişkenleri yalnızca **AES-256-GCM ile şifreli** arşivdedir.

`capilora-2026-09-28.enc` arşivinin anahtarı bu depoda **yoktur**. Proje sahibinin bilgisayarındaki `outputs/capilora-private-backup-2026-09-28T08-34-14Z/recovery.key` dosyasındadır. Anahtarı ayrıca güvenli bir yerde saklayın; arşiv bu dosya olmadan açılamaz. Anahtarı veya çözülmüş arşivi GitHub'a yüklemeyin.

## Arşiv içeriği

- `local-project/`: Projenin kaynak dosyaları, statik medya, `.env.local`, `.vercel` ayarları ve `.data` dizininin tam kopyası. SQLite dosyası tutarlı bir anlık yedek olarak alınmıştır. Önceki özel yedekler ve aktarım kayıtları da korunmuştur.
- `production/`: Canlı Turso veritabanının şeması ve tüm tabloları (`database.json` ve `content.db`); özel Vercel Blob dosyalarının tam kopyası ve SHA-256 doğrulama listesi. Canlı veritabanına veya depolamaya yazılmamıştır.
- `backup-info.json` ve `manifest.json`: Yedek zamanı, kapsamı ve dosya doğrulama bilgileri.

Bağımlılıklar (`node_modules`), derleme önbellekleri (`.next*`) ve yeniden üretilebilir TypeScript önbelleği arşiv dışındadır. Bağımlılıklar `pnpm-lock.yaml` ile yeniden kurulabilir. Kaynak ve içerik dosyaları korunmuştur.

## Var olan verileri ezmeden açma

Node.js 24 ile, **henüz mevcut olmayan** bir çıktı dosyası seçin:

```sh
node scripts/decrypt-backup.mjs \
  backups/capilora-2026-09-28.enc \
  /guvenli/dizin/recovery.key \
  /guvenli/dizin/capilora-restored.tar.gz
```

Araç, yanlış anahtarda veya bozulmuş dosyada çıktı oluşturmaz. Mevcut bir çıktı dosyasının üzerine yazmayı reddeder.

Arşivi mevcut projenin veya canlı sunucunun üzerine açmayın. Önce yeni bir dizin oluşturun:

```sh
mkdir -m 700 /guvenli/dizin/capilora-recovery
tar -xzkf /guvenli/dizin/capilora-restored.tar.gz \
  -C /guvenli/dizin/capilora-recovery
```

Yerel ve canlı veritabanları ayrı yedeklerdir; bunları birbirinin üzerine kopyalamayın. Canlı yedekteki medya kayıtları özel Blob yollarını korur. Canlı ortamın geri yüklenmesi, önce yeni bir veritabanı/depolama üzerinde doğrulanmalıdır. `scripts/migrate-cloud.ts` yalnızca ilk boş kurulum içindir; mevcut canlı veritabanının üzerine aktarım yapmak için kullanılmaz.

Normal kod güncellemesi mevcut Turso/Blob verilerini değiştirmez. Bu GitHub yüklemesi yeni bir Vercel dağıtımı veya otomatik Git entegrasyonu başlatmak amacıyla yapılmamıştır.
