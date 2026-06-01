# Discord M3U8 Streamer Selfbot (Screen Share Live Stream Bot)

This project allows you to stream `.m3u8` format HLS live streams or video files directly to Discord voice channels as a high-quality **Screen Share (Go Live)** using a Discord user account (selfbot).

Fully developed in **Node.js**, it is built on top of `@dank074/discord-video-stream` and `discord.js-selfbot-v13`, which reverse-engineer the Discord WebRTC/UDP protocols.

---

## 🚀 Features

- 📺 **Real Screen Sharing (Go Live)**: Streams both video and audio in real 720p/1080p resolution rather than just audio.
- ⚙️ **Customizable Quality**: Configure resolution, FPS, video/audio bitrate, and encoder settings directly in `config.json`.
- 💬 **Control via Discord Chat**: Authorized users can manage the bot dynamically using chat commands (`!stream`, `!stop`, `!volume`, `!status`, etc.).
- 🔊 **Dynamic Volume Control**: Change the stream volume in real-time with the `!volume` command (powered by ZeroMQ integration).
- 🖼️ **Dynamic Preview**: Automatically updates the instant preview image of the stream in the Discord channel list.
- 🔄 **Auto-Reconnect**: Automatically attempts to reconnect to the stream within 5 seconds if a network disruption or stream interruption occurs.

---

## 🛠️ Prerequisites & Installation

To run this bot, you must have **Node.js v21+** installed on your system along with a custom compiled **FFmpeg** build.

### 1. FFmpeg Installation (Critical Step)
Since the library's audio transcoding and volume control mechanisms depend on ZeroMQ filters, you must install an FFmpeg build with **`libzmq` enabled** instead of the standard Windows FFmpeg packages.

1. **Download BtbN FFmpeg Build**: Go to [BtbN GitHub Releases](https://github.com/BtbN/FFmpeg-Builds/releases).
2. Download **`ffmpeg-master-latest-win64-gpl.zip`** for Windows.
3. Extract the ZIP file to a permanent directory on your PC (e.g., `C:\ffmpeg`).
4. Add `C:\ffmpeg\bin` to your system's **Environment Variables (PATH)**.
   - *Search for "environment variables" in your Windows search bar -> Edit the system environment variables -> Click "Environment Variables" -> Find the `Path` variable in User/System variables and click "Edit" -> Click "New" and add `C:\ffmpeg\bin` -> Save all dialogs.*
5. Reopen your terminal and run `ffmpeg -version` to verify the installation was successful.

### 2. Project Installation
Open a terminal in the project directory and run the following command to install dependencies:

```powershell
# To run local builders on Windows PowerShell:
npm install
```

> [!NOTE]
> If NPM blocks the execution of some native package build scripts due to security settings, run these approval commands in your terminal and reinstall:
> ```powershell
> npm approve-scripts "@lng2004/node-datachannel"
> npm approve-scripts "node-av"
> npm approve-scripts "sharp"
> npm approve-scripts "zeromq"
> npm install
> ```

---

## ⚙️ Configuration Files

### 1. `.env` Configuration
Open the `.env` file in the root directory with a text editor and fill in your details:

```env
# Your Discord User Token (Obtained via F12 -> Application -> Local Storage in Discord Web/Desktop app)
DISCORD_TOKEN=YOUR_DISCORD_ACCOUNT_TOKEN

# Guild (Server) and Voice Channel IDs where the bot should join (Right-click to copy IDs)
GUILD_ID=123456789012345678
VOICE_CHANNEL_ID=123456789012345678

# The default m3u8 test stream URL that opens automatically when the bot starts
STREAM_URL=https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8
```

> [!CAUTION]
> **TOKEN WARNING:** Your Discord token acts as your password. Never share it with anyone. Since selfbots violate Discord's Terms of Service, we strongly recommend using an **ALT (secondary) account** token to avoid any ban risks.

### 2. `config.json` Configuration
Open `config.json` to customize the stream quality, prefix, and authorized users who can issue commands:

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
    "YOUR_DISCORD_USER_ID",
    "OTHER_AUTHORIZED_USER_ID"
  ],
  "prefix": "!",
  "ffmpegPath": "C:\\ffmpeg\\bin\\ffmpeg.exe"
}
```

- **`encoder`**: Specifies the FFmpeg transcode (encoding) preset:
  - `"ultrafast"`: (Recommended) The fastest software encoding method with the lowest CPU usage. Greatly reduces lag or stuttering.
  - `"superfast"`: Standard fast software encoding preset.
  - `"nvenc"` or `"nvidia"`: If you have an NVIDIA graphics card, this offloads the encoding task to your GPU, solving stutter/CPU bottleneck issues completely!
- **`ffmpegPath`**: (Optional) If you prefer not to add FFmpeg to your system's PATH, you can write the full path to `ffmpeg.exe` here. If left empty (`""`), the bot will look for FFmpeg in your system PATH.

---

## 🎮 Running the Bot

Once configuration is complete, start the bot with:

```powershell
npm start
```

Upon logging in successfully, stylish logs will appear in the terminal, the bot will join the configured voice channel, and it will immediately start screen sharing the stream.

---

## 🗣️ Chat Commands

Only users whose IDs are in the `acceptedAuthors` list in `config.json` can manage the bot via Discord chat commands:

| Command | Description |
| :--- | :--- |
| `!stream <m3u8-url>` or `!yayin <m3u8-url>` | Starts the specified `.m3u8` stream (automatically stops the previous stream). |
| `!stop` or `!durdur` | Stops the stream and disconnects the bot from the voice channel. |
| `!join <channel-id>` or `!katil <channel-id>` | Moves the bot to a different voice channel (moves the active stream as well). |
| `!volume <0.0 - 10.0>` or `!ses <0.0 - 10.0>` | Dynamically adjusts the stream volume (e.g., `1.0` is default, `2.0` is double volume, `0.0` is muted). |
| `!status` or `!durum` | Displays connection status, stream quality, uptime, and active stream link. |
| `!help` or `!yardim` | Sends a list of all available commands. |

---

## ⚠️ Important Warnings & Disclaimer

1. **Discord ToS Risk**: Running a selfbot is against Discord's Terms of Service and can result in your account being permanently banned. All responsibility for using this bot belongs entirely to the user.
2. **Cannot Watch Own Stream**: Due to Discord WebRTC limitations, the account streaming (the bot account itself) cannot view its own Go Live screen share (it stays on the loading spinner). To verify that the stream is working, **log in with an alternative account or ask a friend** to check the voice channel.
3. **Network Bitrate Limits**: If your internet upload speed is low, you might experience stuttering. If this happens, try lowering the `bitrateVideo` in `config.json` to `1500` or `1000`.

---
---

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

> [!NOTE]
> Eğer NPM bazı native paketlerin derleme betiklerini güvenlik nedeniyle engellerse, terminalde şu onaylama komutlarını çalıştırın:
> ```powershell
> npm approve-scripts "@lng2004/node-datachannel"
> npm approve-scripts "node-av"
> npm approve-scripts "sharp"
> npm approve-scripts "zeromq"
> npm install
> ```

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
| `!yayin <m3u8-url>` veya `!stream <m3u8-url>` | Belirtilen `.m3u8` yayınını açar (Eski yayını otomatik sonlandırır). |
| `!durdur` veya `!stop` | Yayını tamamen sonlandırır ve botu ses kanalından çıkartır. |
| `!katil <kanal-id>` veya `!join <kanal-id>` | Botun bulunduğu ses kanalını değiştirir (Yayındaysa yayını yeni kanala taşır). |
| `!ses <0.0 - 10.0>` veya `!volume <0.0 - 10.0>` | Yayının ses seviyesini dinamik ayarlar (Örn: `1.0` standart, `2.0` çift ses, `0.0` sessiz). |
| `!durum` veya `!status` | Botun bağlantı durumunu, yayın kalitesini, süresini ve aktif linkini gösterir. |
| `!yardim` veya `!help` | Kullanılabilir tüm komutların listesini gönderir. |

---

## ⚠️ Önemli Uyarılar ve Sorumluluk Reddi

1. **Discord ToS Riski**: Selfbot kullanımı Discord Hizmet Koşulları'na aykırıdır. Hesabınızın kalıcı olarak yasaklanma riski bulunmaktadır. Bu botun kullanımından doğacak her türlü sorumluluk tamamen kullanıcıya aittir.
2. **Kendi Yayınınızı Görememe**: Discord WebRTC sınırlamaları nedeniyle, yayını yapan hesabın kendisi (yani bot hesabı) kendi ekran paylaşımını izleyemez (yükleniyor sembolünde kalır). Yayının çalıştığını doğrulamak için **alt hesap veya başka bir arkadaşınızın hesabı ile** ses kanalına girip izlemelisiniz.
3. **Ağ Bitrate Limitleri**: Eğer internet yükleme (upload) hızınız yetersizse, yayında takılmalar yaşanabilir. Bu durumda `config.json` dosyasındaki `bitrateVideo` değerini `1500` veya `1000` seviyelerine çekmeyi deneyin.

