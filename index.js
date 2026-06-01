import ws from "ws";
globalThis.WebSocket = ws;

import { Client } from "discord.js-selfbot-v13";
import { Streamer, prepareStream, playStream, Encoders } from "@dank074/discord-video-stream";
import pc from "picocolors";
import fs from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import "dotenv/config";

// Yardımcı Loglama Fonksiyonları
const getTimestamp = () => {
  const now = new Date();
  return pc.gray(`[${now.toLocaleTimeString()}]`);
};

const logger = {
  info: (msg) => console.log(`${getTimestamp()} ${pc.blue("[BİLGİ]")} ${msg}`),
  success: (msg) => console.log(`${getTimestamp()} ${pc.green("[BAŞARILI]")} ${msg}`),
  warn: (msg) => console.log(`${getTimestamp()} ${pc.yellow("[UYARI]")} ${msg}`),
  error: (msg, err) => console.error(`${getTimestamp()} ${pc.red("[HATA]")} ${msg}`, err || ""),
  stream: (msg) => console.log(`${getTimestamp()} ${pc.cyan("[YAYIN]")} ${msg}`),
};

// Config Dosyasını Oku
let config = {};
try {
  const configData = await fs.readFile(path.resolve("config.json"), "utf-8");
  config = JSON.parse(configData);
  if (config.ffmpegPath) {
    ffmpeg.setFfmpegPath(config.ffmpegPath);
  }
} catch (err) {
  logger.error("config.json dosyası okunamadı veya biçimlendirmesi hatalı!", err);
  process.exit(1);
}

// Global Durum Değişkenleri
const client = new Client({
  checkUpdate: false,
});
const streamer = new Streamer(client);

let currentStreamUrl = process.env.STREAM_URL || "";
let activeGuildId = process.env.GUILD_ID || "";
let activeChannelId = process.env.VOICE_CHANNEL_ID || "";

let streamAbortController = null;
let isStreamingActive = false;
let autoRestartTimeout = null;
let streamStartTime = null;
let currentVolume = 1.0;
let streamController = null;

// Log Giriş Paneli
console.log(pc.cyan("===================================================="));
console.log(pc.cyan("||        DISCORD M3U8 STREAMER SELFBOT           ||"));
console.log(pc.cyan("===================================================="));
logger.info("Bot başlatılıyor...");

// Yayını Başlatma Fonksiyonu
const startStreaming = async (url) => {
  // Eğer mevcut bir yayın varsa önce onu temiz bir şekilde durdur
  if (isStreamingActive || streamAbortController) {
    logger.info("Aktif olan önceki yayın sonlandırılıyor...");
    await stopStreaming(false); // Tamamen kanaldan çıkma, sadece yayını durdur
  }

  if (!activeGuildId || !activeChannelId) {
    logger.warn("Sunucu ID veya Ses Kanalı ID eksik! Yayın başlatılamıyor.");
    return;
  }

  logger.stream(`Yayına başlanıyor: ${pc.underline(url)}`);
  currentStreamUrl = url;
  isStreamingActive = true;
  streamStartTime = new Date();
  streamAbortController = new AbortController();

  try {
    // 1. Ses kanalına katıl
    logger.info("Ses kanalına bağlanılıyor...");
    await streamer.joinVoice(activeGuildId, activeChannelId);
    logger.success("Ses kanalına başarıyla bağlanıldı!");

    // 2. Yayını hazırla (Transcode FFmpeg)
    logger.info("Yayın akışı hazırlanıyor (FFmpeg başlatılıyor)...");

    // Encoder Seçimi
    let selectedEncoder = undefined;
    if (config.streamOptions.encoder === "nvenc" || config.streamOptions.encoder === "nvidia") {
      logger.info("Nvidia Donanım Hızlandırma (NVENC) etkinleştirildi.");
      selectedEncoder = Encoders.nvenc({ preset: "p1" });
    } else if (config.streamOptions.encoder === "ultrafast") {
      logger.info("Yazılımsal Hızlı Transcode (ultrafast) etkinleştirildi.");
      selectedEncoder = Encoders.software({ x264: { preset: "ultrafast", tune: "zerolatency" } });
    } else if (config.streamOptions.encoder === "superfast") {
      logger.info("Yazılımsal Transcode (superfast) etkinleştirildi.");
      selectedEncoder = Encoders.software({ x264: { preset: "superfast", tune: "film" } });
    }

    const { command, output, promise: transcodePromise, controller } = prepareStream(
      url,
      {
        width: config.streamOptions.width,
        height: config.streamOptions.height,
        frameRate: config.streamOptions.fps,
        bitrateVideo: config.streamOptions.bitrateVideo,
        bitrateAudio: config.streamOptions.bitrateAudio,
        videoCodec: "H264",
        includeAudio: true,
        minimizeLatency: true,
        ...(selectedEncoder ? { encoder: selectedEncoder } : {}),
        customInputOptions: [
          "-reconnect 1",
          "-reconnect_at_eof 1",
          "-reconnect_streamed 1",
          "-reconnect_delay_max 5",
        ],
      },
      streamAbortController.signal
    );

    streamController = controller;

    // FFmpeg Hata Dinleyicisi
    command.on("error", (err) => {
      // Eğer kullanıcı isteğiyle durdurulduysa hata loglama
      if (streamAbortController?.signal.aborted) return;
      logger.error("FFmpeg transcode işlemi sırasında bir hata oluştu:", err);
    });

    // 3. Yayını gönder (Play Stream)
    logger.info("Ekran paylaşımı başlatılıyor...");
    
    // playStream asenkron çalışır ve yayın bittiğinde veya iptal edildiğinde çözümlenir
    const playPromise = playStream(
      output,
      streamer,
      {
        type: "go-live",
        streamPreview: true, // Discord'da önizleme resmini günceller
      },
      streamAbortController.signal
    );

    // Yayın durumlarını bekle
    Promise.all([transcodePromise, playPromise])
      .then(() => {
        if (!streamAbortController?.signal.aborted) {
          logger.success("Yayın akışı doğal bir şekilde sona erdi.");
          handleStreamEnded();
        }
      })
      .catch((err) => {
        if (!streamAbortController?.signal.aborted) {
          logger.error("Yayın sırasında beklenmeyen bir hata oluştu:", err);
          handleStreamEnded();
        }
      });

  } catch (err) {
    logger.error("Yayın başlatılırken kritik bir hata meydana geldi:", err);
    handleStreamEnded();
  }
};

// Yayın Sonlandığında Yeniden Başlatma Mantığı
const handleStreamEnded = () => {
  isStreamingActive = false;
  streamStartTime = null;
  streamController = null;
  
  if (streamAbortController) {
    streamAbortController = null;
  }

  // Canlı m3u8 akışları geçici olarak kesilebilir, bu yüzden 5 saniye sonra otomatik yeniden bağlanmayı deneriz
  logger.warn("Yayın kapandı. 5 saniye içinde otomatik yeniden bağlanma denenecek...");
  autoRestartTimeout = setTimeout(() => {
    if (currentStreamUrl) {
      startStreaming(currentStreamUrl);
    }
  }, 5000);
};

// Yayını Durdurma Fonksiyonu
const stopStreaming = async (leaveChannel = true) => {
  logger.info("Yayın durduruluyor...");
  
  // Otomatik yeniden başlatma zamanlayıcısını iptal et
  if (autoRestartTimeout) {
    clearTimeout(autoRestartTimeout);
    autoRestartTimeout = null;
  }

  // Abort controller'ı tetikleyerek FFmpeg ve yayını durdur
  if (streamAbortController) {
    streamAbortController.abort();
    streamAbortController = null;
  }

  isStreamingActive = false;
  streamStartTime = null;
  streamController = null;

  try {
    if (leaveChannel) {
      logger.info("Ses kanalından ayrılınıyor...");
      await streamer.leaveVoice();
      logger.success("Ses kanalından çıkış yapıldı ve yayın durduruldu.");
    } else {
      logger.success("Mevcut yayın durduruldu (Kanalda kalındı).");
    }
  } catch (err) {
    logger.error("Kanaldan ayrılırken bir hata oluştu:", err);
  }
};

// Discord İstemci Dinleyicileri
client.on("ready", async () => {
  logger.success(`Giriş yapıldı! Aktif Hesap: ${pc.bold(client.user.tag)}`);

  // Yetkili Kullanıcı Kontrol Uyarısı
  if (config.acceptedAuthors.includes("YOUR_DISCORD_USER_ID_HERE")) {
    logger.warn(
      `config.json dosyasındaki ${pc.underline("acceptedAuthors")} listesinde hala varsayılan ID yazıyor!`
    );
    logger.warn(
      `Kendi komutlarınızı algılayabilmesi için lütfen bu listeye kendi Discord Kullanıcı ID'nizi ekleyin.`
    );
  } else {
    logger.info(`Yetkili Kullanıcılar: [${pc.green(config.acceptedAuthors.join(", "))}]`);
  }

  // Başlangıçta Yapılandırılmış Kanala Katıl ve Yayını Aç
  if (activeGuildId && activeChannelId && currentStreamUrl) {
    logger.info("Başlangıç yapılandırmasına göre kanala otomatik katılarak yayın başlatılıyor...");
    await startStreaming(currentStreamUrl);
  } else {
    logger.warn(
      "Başlangıç sunucu, kanal veya yayın linki yapılandırılmamış. Bota Discord üzerinden komut vererek yayını başlatabilirsiniz."
    );
  }
});

// Komut İşlemci
client.on("messageCreate", async (message) => {
  // Sadece yetkili kişileri dinle
  if (!config.acceptedAuthors.includes(message.author.id)) return;

  // Prefix kontrolü
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 1. !yayin / !stream Komutu
  if (command === "yayin" || command === "stream") {
    const url = args.join(" ");
    if (!url) {
      return message.reply(`❌ Lütfen bir m3u8 yayın URL'si belirtin! \nÖrnek: \`${config.prefix}yayin http://yayin.m3u8\``);
    }
    
    // Eğer sunucu ve kanal bilgisi env'de yoksa veya güncellenecekse kontrol
    if (!activeGuildId || !activeChannelId) {
      return message.reply(`❌ Botun katılacağı bir ses kanalı bulunamadı. Lütfen önce \`${config.prefix}katil <kanal-id>\` komutunu kullanarak kanalı belirtin.`);
    }

    await message.reply(`📺 **Yayın başlatılıyor...**\n🔗 **Kaynak:** ${url}\n*Bu işlem FFmpeg transcode başlatacağı için birkaç saniye sürebilir.*`);
    await startStreaming(url);
  }

  // 2. !durdur / !stop Komutu
  else if (command === "durdur" || command === "stop") {
    await message.reply("🛑 **Yayın durduruluyor ve ses kanalından ayrılınıyor...**");
    await stopStreaming(true);
  }

  // 3. !katil / !join Komutu
  else if (command === "katil" || command === "join") {
    const channelId = args[0];
    if (!channelId) {
      return message.reply(`❌ Lütfen bir ses kanalı ID'si belirtin!\nÖrnek: \`${config.prefix}katil 123456789012345678\``);
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || channel.type !== "GUILD_VOICE") {
        return message.reply("❌ Belirttiğiniz ID geçerli bir ses kanalına ait değil!");
      }

      activeGuildId = channel.guild.id;
      activeChannelId = channel.id;

      await message.reply(`🔄 **Ses kanalı değiştirildi!**\nYeni Sunucu: **${channel.guild.name}**\nYeni Kanal: **${channel.name}**`);
      
      // Eğer yayındaysa yeni kanalda yayını yeniden başlat
      if (isStreamingActive) {
        logger.info("Kanal değişikliği nedeniyle yayın yeni kanala taşınıyor...");
        await startStreaming(currentStreamUrl);
      }
    } catch (err) {
      logger.error("Kanal bilgisi alınırken hata oluştu:", err);
      message.reply("❌ Belirtilen kanal ID'sine erişilemedi. Lütfen botun o kanalı görebildiğinden emin olun.");
    }
  }

  // 4. !durum / !status Komutu
  else if (command === "durum" || command === "status") {
    const uptime = streamStartTime
      ? Math.floor((new Date() - streamStartTime) / 1000)
      : 0;
    
    const formatUptime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return `${h}s ${m}d ${s}s`;
    };

    const statusEmbed = {
      title: "🤖 Yayıncı Bot Durumu",
      color: isStreamingActive ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: "Bağlantı Durumu",
          value: isStreamingActive ? "🟢 Yayında" : "🔴 Yayında Değil",
          inline: true,
        },
        {
          name: "Aktif Sunucu ID",
          value: activeGuildId || "Tanımlanmamış",
          inline: true,
        },
        {
          name: "Aktif Kanal ID",
          value: activeChannelId || "Tanımlanmamış",
          inline: true,
        },
        {
          name: "Yayın Süresi",
          value: isStreamingActive ? formatUptime(uptime) : "0s",
          inline: true,
        },
        {
          name: "Yayın Kalitesi",
          value: `⚙️ ${config.streamOptions.width}x${config.streamOptions.height} @ ${config.streamOptions.fps} FPS\n📹 Video: ${config.streamOptions.bitrateVideo} kbps\n🔊 Ses: ${config.streamOptions.bitrateAudio} kbps`,
          inline: false,
        },
        {
          name: "Yayın Linki",
          value: isStreamingActive ? `\`${currentStreamUrl}\`` : "Yok",
          inline: false,
        },
      ],
      timestamp: new Date(),
    };

    await message.reply({ embeds: [statusEmbed] });
  }

  // 5. !ses / !volume Komutu
  else if (command === "ses" || command === "volume") {
    if (!isStreamingActive || !streamController) {
      return message.reply("❌ Şu anda aktif bir yayın olmadığı için ses düzeyi değiştirilemez.");
    }

    const volArg = args[0];
    if (!volArg) {
      return message.reply(`🔊 **Mevcut Ses Düzeyi:** \`%${Math.round(currentVolume * 100)}\``);
    }

    const newVol = parseFloat(volArg);
    if (isNaN(newVol) || newVol < 0 || newVol > 10) {
      return message.reply("❌ Lütfen 0 ile 10 arasında geçerli bir ses seviyesi girin! (Örn: `1.0` varsayılan, `2.0` iki kat, `0.5` yarım)");
    }

    const success = await streamController.setVolume(newVol);
    if (success) {
      currentVolume = newVol;
      await message.reply(`🔊 **Ses seviyesi başarıyla değiştirildi:** \`%${Math.round(newVol * 100)}\``);
    } else {
      await message.reply("❌ Ses seviyesi değiştirilirken teknik bir sorun oluştu.");
    }
  }

  // 6. !yardim / !help Komutu
  else if (command === "yardim" || command === "help") {
    const helpEmbed = {
      title: "📖 Yayıncı Bot Komut Klavuzu",
      color: 0x00aaff,
      description: "Aşağıdaki komutları yalnızca yetkilendirilmiş kullanıcılar (`config.json`) kullanabilir.",
      fields: [
        {
          name: `${config.prefix}yayin <m3u8-url>`,
          value: "Belirtilen `.m3u8` canlı yayın linkini ses kanalında ekran paylaşımı olarak oynatmaya başlar.",
        },
        {
          name: `${config.prefix}durdur`,
          value: "Yayını tamamen sonlandırır ve botu ses kanalından çıkartır.",
        },
        {
          name: `${config.prefix}katil <kanal-id>`,
          value: "Botun hedef ses kanalını değiştirir. Eğer aktif yayın varsa yayını yeni kanala taşır.",
        },
        {
          name: `${config.prefix}durum`,
          value: "Botun anlık çalışma durumunu, yayın kalitesini, yayın süresini ve aktif linki raporlar.",
        },
        {
          name: `${config.prefix}ses <0.0 - 10.0>`,
          value: "Yayın ses seviyesini dinamik olarak ayarlar. (Örn: `1.0` varsayılan, `0.0` sessiz, `2.0` çift kat).",
        },
        {
          name: `${config.prefix}yardim`,
          value: "Bu yardım menüsünü görüntüler.",
        },
      ],
    };

    await message.reply({ embeds: [helpEmbed] });
  }
});

// Hata Yönetimi & Kapatma Sinyalleri
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Yakalanmamış Rejection hatası:", reason);
});

const cleanShutdown = async () => {
  logger.warn("Bot kapatılıyor, temizlik işlemleri yapılıyor...");
  await stopStreaming(true);
  logger.info("Bot başarıyla kapatıldı.");
  process.exit(0);
};

process.on("SIGINT", cleanShutdown);
process.on("SIGTERM", cleanShutdown);

// Discord Giriş Yap
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== "YOUR_SELF_TOKEN_HERE") {
  client.login(process.env.DISCORD_TOKEN).catch((err) => {
    logger.error("Discord tokenı ile giriş yapılırken kritik hata oluştu! Token'ın doğruluğunu kontrol edin.", err);
  });
} else {
  logger.error("Lütfen .env dosyasına geçerli bir DISCORD_TOKEN girin!");
}
