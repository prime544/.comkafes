const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const { Connectors } = require("shoukaku");
const { Kazagumo, Plugins } = require("kazagumo");

// ==========================================
// AYARLAR
// ==========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const LAVALINK_HOST = process.env.LAVALINK_HOST;
const LAVALINK_PORT = Number(process.env.LAVALINK_PORT || 2333);
const LAVALINK_PASSWORD =
  process.env.LAVALINK_PASSWORD || "youshallnotpass";
const LAVALINK_SECURE =
  process.env.LAVALINK_SECURE === "true";

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN bulunamadı!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID bulunamadı!");
  process.exit(1);
}

if (!LAVALINK_HOST) {
  console.error("❌ LAVALINK_HOST bulunamadı!");
  process.exit(1);
}

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ==========================================
// LAVALINK / KAZAGUMO
// ==========================================

const shoukaku = {
  nodes: [
    {
      name: "Main",
      url: `${LAVALINK_HOST}:${LAVALINK_PORT}`,
      auth: LAVALINK_PASSWORD,
      secure: LAVALINK_SECURE
    }
  ]
};

const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: "youtube",
    plugins: [
      new Plugins.PlayerMoved(client)
    ]
  },
  new Connectors.DiscordJS(client),
  shoukaku.nodes
);

// ==========================================
// SLASH KOMUTLARI
// ==========================================

const commands = [

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Şarkı çalar.")
    .addStringOption(option =>
      option
        .setName("şarkı")
        .setDescription("Şarkı adı veya bağlantı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Mevcut şarkıyı geçer."),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Müziği durdurur ve kuyruğu temizler."),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Müziği duraklatır."),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Müziği devam ettirir."),

  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Müzik kuyruğunu gösterir."),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Şu anda çalan şarkıyı gösterir."),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ses seviyesini ayarlar.")
    .addIntegerOption(option =>
      option
        .setName("seviye")
        .setDescription("0-100 arası ses seviyesi")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    )

].map(command => command.toJSON());

// ==========================================
// READY
// ==========================================

client.once("ready", async () => {

  console.log("");
  console.log("================================");
  console.log(`✅ Bot aktif: ${client.user.tag}`);
  console.log("🎵 Müzik sistemi hazırlanıyor...");
  console.log("================================");

  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  try {

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands
      }
    );

    console.log("✅ Slash komutları yüklendi.");

  } catch (error) {

    console.error(
      "❌ Slash komut yükleme hatası:",
      error
    );

  }

});

// ==========================================
// LAVALINK EVENTS
// ==========================================

kazagumo.shoukaku.on(
  "ready",
  name => {
    console.log(`🟢 Lavalink bağlandı: ${name}`);
  }
);

kazagumo.shoukaku.on(
  "error",
  (name, error) => {
    console.error(
      `❌ Lavalink hatası [${name}]:`,
      error
    );
  }
);

kazagumo.shoukaku.on(
  "close",
  (name, code, reason) => {
    console.log(
      `🔴 Lavalink bağlantısı kapandı [${name}]`,
      code,
      reason
    );
  }
);

kazagumo.shoukaku.on(
  "disconnect",
  name => {
    console.log(
      `⚠️ Lavalink bağlantısı kesildi: ${name}`
    );
  }
);

// ==========================================
// PLAYER START
// ==========================================

kazagumo.on(
  "playerStart",
  async player => {

    const channel =
      client.channels.cache.get(
        player.textId
      );

    if (!channel) return;

    const track =
      player.queue.current;

    if (!track) return;

    const embed =
      new EmbedBuilder()
        .setTitle("🎵 Şarkı Çalıyor")
        .setDescription(
          `**${track.title}**`
        )
        .addFields(
          {
            name: "🎤 Sanatçı",
            value:
              track.author || "Bilinmiyor",
            inline: true
          },
          {
            name: "⏱️ Süre",
            value:
              track.length
                ? formatTime(track.length)
                : "Bilinmiyor",
            inline: true
          }
        )
        .setColor(0x2b2d31);

    await channel.send({
      embeds: [embed]
    }).catch(() => {});

  }
);

// ==========================================
// QUEUE END
// ==========================================

kazagumo.on(
  "playerEmpty",
  async player => {

    const channel =
      client.channels.cache.get(
        player.textId
      );

    if (channel) {

      await channel.send(
        "✅ Müzik kuyruğu bitti."
      ).catch(() => {});

    }

    setTimeout(() => {

      const current =
        kazagumo.players.get(
          player.guildId
        );

      if (current && current.queue.size === 0) {

        current.destroy();

      }

    }, 30000);

  }
);

// ==========================================
// TRACK ERROR
// ==========================================

kazagumo.on(
  "playerException",
  async (player, data) => {

    const channel =
      client.channels.cache.get(
        player.textId
      );

    if (!channel) return;

    await channel.send(
      `❌ Şarkı oynatılırken hata oluştu:\n\`${data?.exception?.message || "Bilinmeyen hata"}\``
    ).catch(() => {});

  }
);

// ==========================================
// INTERACTION
// ==========================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ======================================
    // PLAY
    // ======================================

    if (
      interaction.commandName === "play"
    ) {

      const query =
        interaction.options.getString(
          "şarkı"
        );

      const member =
        interaction.member;

      const voiceChannel =
        member?.voice?.channel;

      if (!voiceChannel) {

        return interaction.reply({
          content:
            "❌ Önce bir ses kanalına gir knk.",
          ephemeral: true
        });

      }

      await interaction.deferReply();

      try {

        let player =
          kazagumo.players.get(
            interaction.guild.id
          );

        if (!player) {

          player =
            await kazagumo.createPlayer({
              guildId:
                interaction.guild.id,

              voiceId:
                voiceChannel.id,

              textId:
                interaction.channel.id,

              deaf: true
            });

        }

        const result =
          await kazagumo.search(
            query,
            {
              requester:
                interaction.user
            }
          );

        if (
          !result ||
          !result.tracks ||
          result.tracks.length === 0
        ) {

          return interaction.editReply({
            content:
              "❌ Şarkı bulunamadı."
          });

        }

        if (
          result.type === "PLAYLIST"
        ) {

          for (
            const track of result.tracks
          ) {

            player.queue.add(track);

          }

          await interaction.editReply({
            content:
              `📚 **${result.tracks.length}** şarkı kuyruğa eklendi.`
          });

        } else {

          player.queue.add(
            result.tracks[0]
          );

          const track =
            result.tracks[0];

          await interaction.editReply({
            content:
              `🎵 **${track.title}** kuyruğa eklendi.`
          });

        }

        if (
          !player.playing &&
          !player.paused
        ) {

          await player.play();

        }

      } catch (error) {

        console.error(
          "❌ /play hatası:",
          error
        );

        await interaction.editReply({
          content:
            "❌ Şarkı oynatılırken bir hata oluştu."
        }).catch(() => {});

      }

      return;
    }

    // ======================================
    // SKIP
    // ======================================

    if (
      interaction.commandName === "skip"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      if (
        !player.queue.current
      ) {

        return interaction.reply({
          content:
            "❌ Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      await player.skip();

      return interaction.reply({
        content:
          "⏭️ Şarkı geçildi!"
      });

    }

    // ======================================
    // STOP
    // ======================================

    if (
      interaction.commandName === "stop"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Aktif müzik bulunmuyor.",
          ephemeral: true
        });

      }

      player.queue.clear();

      player.destroy();

      return interaction.reply({
        content:
          "⏹️ Müzik durduruldu ve kuyruk temizlendi."
      });

    }

    // ======================================
    // PAUSE
    // ======================================

    if (
      interaction.commandName === "pause"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Aktif müzik bulunmuyor.",
          ephemeral: true
        });

      }

      if (player.paused) {

        return interaction.reply({
          content:
            "⏸️ Müzik zaten duraklatılmış.",
          ephemeral: true
        });

      }

      await player.pause(true);

      return interaction.reply({
        content:
          "⏸️ Müzik duraklatıldı."
      });

    }

    // ======================================
    // RESUME
    // ======================================

    if (
      interaction.commandName === "resume"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Aktif müzik bulunmuyor.",
          ephemeral: true
        });

      }

      if (!player.paused) {

        return interaction.reply({
          content:
            "▶️ Müzik zaten oynuyor.",
          ephemeral: true
        });

      }

      await player.pause(false);

      return interaction.reply({
        content:
          "▶️ Müzik devam ediyor."
      });

    }

    // ======================================
    // QUEUE
    // ======================================

    if (
      interaction.commandName === "queue"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "📭 Kuyruk boş.",
          ephemeral: true
        });

      }

      const current =
        player.queue.current;

      const queue =
        player.queue
          .slice(0, 10);

      let text = "";

      if (current) {

        text +=
          `🎵 **Şimdi:** ${current.title}\n\n`;

      }

      if (queue.length === 0) {

        text +=
          "📭 Kuyrukta başka şarkı yok.";

      } else {

        queue.forEach(
          (track, index) => {

            text +=
              `**${index + 1}.** ${track.title}\n`;

          }
        );

      }

      const embed =
        new EmbedBuilder()
          .setTitle("🎶 Müzik Kuyruğu")
          .setDescription(text)
          .setColor(0x2b2d31)
          .setFooter({
            text:
              `Toplam: ${player.queue.size} şarkı`
          });

      return interaction.reply({
        embeds: [embed]
      });

    }

    // ======================================
    // NOW PLAYING
    // ======================================

    if (
      interaction.commandName ===
      "nowplaying"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (
        !player ||
        !player.queue.current
      ) {

        return interaction.reply({
          content:
            "❌ Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      const track =
        player.queue.current;

      const embed =
        new EmbedBuilder()
          .setTitle("🎵 Şimdi Çalıyor")
          .setDescription(
            `**${track.title}**`
          )
          .addFields(
            {
              name: "🎤 Sanatçı",
              value:
                track.author || "Bilinmiyor",
              inline: true
            },
            {
              name: "⏱️ Süre",
              value:
                formatTime(track.length),
              inline: true
            }
          )
          .setColor(0x2b2d31);

      return interaction.reply({
        embeds: [embed]
      });

    }

    // ======================================
    // VOLUME
    // ======================================

    if (
      interaction.commandName === "volume"
    ) {

      const player =
        kazagumo.players.get(
          interaction.guild.id
        );

      if (!player) {

        return interaction.reply({
          content:
            "❌ Aktif müzik bulunmuyor.",
          ephemeral: true
        });

      }

      const volume =
        interaction.options.getInteger(
          "seviye"
        );

      await player.setVolume(
        volume
      );

      return interaction.reply({
        content:
          `🔊 Ses seviyesi **%${volume}** olarak ayarlandı.`
      });

    }

  }
);

// ==========================================
// TIME FORMAT
// ==========================================

function formatTime(ms) {

  if (!ms || ms < 0) {
    return "00:00";
  }

  const totalSeconds =
    Math.floor(ms / 1000);

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {

    return (
      `${hours}:` +
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}`
    );

  }

  return (
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );

}

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);
