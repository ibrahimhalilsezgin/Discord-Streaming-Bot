# Discord M3U8 Streamer Selfbot (Ekran Paylaşımı Canlı Yayın Botu)

Bu proje, bir Discord kullanıcı hesabını (selfbot) kullanarak, `.m3u8` formatındaki (HLS) canlı yayın akışlarını veya normal video dosyalarını Discord ses kanallarında yüksek kalitede **Ekran Paylaşımı (Go Live)** olarak yayınlamanızı sağlar.

Tamamen **Node.js** ile geliştirilmiş olup, Discord WebRTC/UDP protokollerini reverse-engineer eden gelişmiş `@dank074/discord-video-stream` ve `discord.js-selfbot-v13` kütüphanelerini temel alır.

---

## 🚀 Öne Çıkan Özellikler

- 📺 **Gerçek Ekran Paylaşımı (Go Live)**: Yayını sadece ses olarak değil, gerçek 720p/1080p çözünürlükte görüntülü ve sesli olarak aktarır.
- ⚙️ **Özelleştirilebilir Kalite**: `config.json` üzerinden çözünürlük, FPS, video/ses bitrate değerlerini dilediğiniz gibi ayarlayabilirsiniz.
- 💬 **Discord Üzerinden Kontrol**: Tanımladığınız yetkili kullanıcılar Discord chat alanından komutlar göndererek botu yönetebilir (`!yayin`, `!durdur`, `!ses`, `!durum` vb.).
- 🔊 **Dinamik Ses Kontrolü**: `!ses` komutu ile yayının ses düzeyini gerçek zamanlı olarak değiştirebilirsiniz (ZeroMQ entegrasyonu sayesinde).
- 🖼️ **Dinamik Önizleme**: Discord kanal listesinde yayınınızın anlık önizleme görselini otomatik günceller.
- 🔄 **Otomatik Bağlantı Kurtarma**: İnternet kesintisi veya yayının anlık kapanması durumlarında bot yayına 5 saniye içinde otomatik olarak tekrar bağlanmayı dener.

---

## 🛠️ Önkoşullar ve Kurulum

Bu botun çalışabilmesi için sisteminizde **Node.js v21+** ve özel derlenmiş bir **FFmpeg** yüklü olmalıdır.

### 1. FFmpeg Kurulumu (Kritik Adım)
Kütüphanenin ses transcode ve hacim kontrol mekanizmaları ZeroMQ filtrelerine bağlı olduğundan, standart Windows FFmpeg paketleri yerine **`libzmq` etkinleştirilmiş** bir FFmpeg yapısı kurmalısınız.

1. **BtbN FFmpeg Yapısını İndirin**: [BtbN GitHub Releases](https://github.com/BtbN/FFmpeg-Builds/releases) adresine gidin.
2. Windows için **`ffmpeg-master-latest-win64-gpl.zip`** dosyasını indirin.
3. Zip dosyasını bilgisayarınızda sabit bir yere çıkartın (Örn: `C:\ffmpeg`).
4. `C:\ffmpeg\bin` klasörünü sisteminizin **Ortam Değişkenleri (PATH)** alanına ekleyin.
   - *Arama çubuğuna "ortam değişkenleri" yazın -> Sistem ortam değişkenlerini düzenleyin -> Ortam Değişkenleri -> PATH satırını seçip Düzenle deyin -> Yeni deyip `C:\ffmpeg\bin` yolunu ekleyin ve kaydedin.*
5. Terminali kapatıp tekrar açarak `ffmpeg -version` yazdığınızda kurulumun başarıyla tanındığını doğrulayın.

### 2. Proje Kurulumu
Proje dizininde terminali açın ve aşağıdaki komutla bağımlılıkları yükleyin:

```powershell
# Windows PowerShell üzerinde yerel derleyicileri çalıştırmak için:
npm install
```

*Not: Eğer NPM bazı native paketlerin derleme betiklerini güvenlik nedeniyle engellerse, terminalde şu onaylama komutlarını çalıştırın:*
```powershell
npm approve-scripts "@lng2004/node-datachannel"
npm approve-scripts "node-av"
npm approve-scripts "sharp"
npm approve-scripts "zeromq"
npm install
```

---

## ⚙️ Yapılandırma Dosyaları

### 1. `.env` Yapılandırması
Proje klasöründeki `.env` dosyasını bir metin editörüyle açın ve kendi bilgilerinizi girin:

```env
# Hesap token'ınız (Bir hesaptan giriş yapıp F12 -> Application -> Local Storage altından alınır)
DISCORD_TOKEN=SİZİN_HESAP_TOKENINIZ

# Botun başlangıçta katılacağı sunucu ve ses kanalı ID'leri (Sağ tıklayıp kopyalayabilirsiniz)
GUILD_ID=123456789012345678
VOICE_CHANNEL_ID=123456789012345678

# Bot başladığında otomatik açılacak varsayılan m3u8 test yayını
STREAM_URL=https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8
```

> [!CAUTION]
> **TOKEN UYARISI:** Discord token'ınız hesabınızın şifresi gibidir. Kesinlikle bu tokenı kimseyle paylaşmayın. Selfbot kullanımı Discord kurallarına aykırı olduğundan, risk almamak için **kesinlikle bir ALT (yan) hesap** tokenı kullanmanızı öneririz.
### 2. `config.json` Yapılandırması
`config.json` dosyasını açarak botun yayın kalitesini ve komut verebilecek yetkili kullanıcıları düzenleyin:

```json
{
  "streamOptions": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "bitrateVideo": 1500,
    "bitrateAudio": 128,
    "encoder": "ultrafast"
  },
  "acceptedAuthors": [
    "SİZİN_DİSCORD_KULLANICI_ID_NİZ",
    "DİĞER_YETKİLİ_KULLANICI_ID"
  ],
  "prefix": "!",
  "ffmpegPath": "C:\\ffmpeg\\bin\\ffmpeg.exe"
}
```

- **`encoder`**: FFmpeg transcode (kodlama) yöntemini belirler:
  - `"ultrafast"`: (Önerilen) İşlemciyi (CPU) en az kullanan en hızlı kodlama yöntemi. Kasma/donmaları büyük ölçüde engeller.
  - `"superfast"`: Standart hızlı yazılımsal kodlama yöntemi.
  - `"nvenc"` veya `"nvidia"`: Eğer Nvidia ekran kartınız varsa, kodlama yükünü tamamen ekran kartınıza aktararak kasma problemini tamamen çözer!
- **`ffmpegPath`**: (İsteğe bağlı) Eğer FFmpeg'i sistem PATH ortam değişkenlerine eklemek istemiyorsanız, doğrudan `ffmpeg.exe` dosyasının bilgisayarınızdaki tam yolunu buraya yazabilirsiniz. Boş bırakırsanız bot FFmpeg'i sistem PATH değişkeninde arayacaktır. Boş bırakmak için `""` şeklinde tanımlayabilirsiniz.



---

## 🎮 Botun Çalıştırılması

Tüm yapılandırmaları tamamladıktan sonra botu başlatmak için:

```powershell
npm start
```

Bot başarıyla giriş yaptığında terminalde şık loglar yazacak ve yapılandırılan kanala katılarak ekran paylaşımını başlatacaktır.

---

## 🗣️ Mesaj Komutları

Yalnızca `config.json` içerisindeki `acceptedAuthors` listesinde ID'si bulunan kullanıcılar Discord chat alanından şu komutlarla botu yönetebilir:

| Komut | Açıklama |
| :--- | :--- |
| `!yayin <m3u8-url>` | Belirtilen `.m3u8` yayınını açar (Eski yayını otomatik sonlandırır). |
| `!durdur` | Yayını tamamen sonlandırır ve botu ses kanalından çıkartır. |
| `!katil <kanal-id>` | Botun bulunduğu ses kanalını değiştirir (Yayındaysa yayını yeni kanala taşır). |
| `!ses <0.0 - 10.0>` | Yayının ses seviyesini dinamik ayarlar (Örn: `1.0` standart, `2.0` çift ses, `0.0` sessiz). |
| `!durum` | Botun bağlantı durumunu, yayın kalitesini, süresini ve aktif linkini gösterir. |
| `!yardim` | Kullanılabilir tüm komutların listesini gönderir. |

---

## ⚠️ Önemli Uyarılar ve Sorumluluk Reddi

1. **Discord ToS Riski**: Selfbot kullanımı Discord Hizmet Koşulları'na aykırıdır. Hesabınızın kalıcı olarak yasaklanma riski bulunmaktadır. Bu botun kullanımından doğacak her türlü sorumluluk tamamen kullanıcıya aittir.
2. **Kendi Yayınınızı Görememe**: Discord WebRTC sınırlamaları nedeniyle, yayını yapan hesabın kendisi (yani bot hesabı) kendi ekran paylaşımını izleyemez (yükleniyor sembolünde kalır). Yayının çalıştığını doğrulamak için **alt hesap veya başka bir arkadaşınızın hesabı ile** ses kanalına girip izlemelisiniz.
3. **Ağ Bitrate Limitleri**: Eğer internet yükleme (upload) hızınız yetersizse, yayında takılmalar yaşanabilir. Bu durumda `config.json` dosyasındaki `bitrateVideo` değerini `1500` veya `1000` seviyelerine çekmeyi deneyin.
