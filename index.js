const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");

const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN bulunamadı!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID bulunamadı!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Direkt ses bağlantısını oynatır.")
    .addStringOption(option =>
      option
        .setName("link")
        .setDescription("Ses bağlantısı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Müziği durdurur."),

  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Botu ses kanalından çıkarır.")
].map(x => x.toJSON());

const players = new Map();
const connections = new Map();

client.once("ready", async () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);

  const rest = new REST({ version: "10" })
    .setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      {
        body: commands
      }
    );

    console.log("✅ Slash komutları yüklendi.");
  } catch (error) {
    console.error("❌ Komut yükleme hatası:", error);
  }
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  // =====================================
  // PLAY
  // =====================================

  if (interaction.commandName === "play") {

    const voiceChannel =
      interaction.member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Önce bir ses kanalına gir knk.",
        ephemeral: true
      });
    }

    const link =
      interaction.options.getString("link");

    if (!/^https?:\/\//i.test(link)) {
      return interaction.reply({
        content: "❌ Geçerli bir ses bağlantısı gir.",
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {

      let connection =
        connections.get(interaction.guild.id);

      if (!connection) {

        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator:
            interaction.guild.voiceAdapterCreator,
          selfDeaf: true
        });

        connections.set(
          interaction.guild.id,
          connection
        );

        await entersState(
          connection,
          VoiceConnectionStatus.Ready,
          15_000
        );
      }

      let player =
        players.get(interaction.guild.id);

      if (!player) {

        player = createAudioPlayer({
          behaviors: {
            noSubscriber:
              NoSubscriberBehavior.Pause
          }
        });

        players.set(
          interaction.guild.id,
          player
        );

        connection.subscribe(player);

        player.on(
          "error",
          error => {
            console.error(
              "❌ Ses oynatma hatası:",
              error
            );
          }
        );
      }

      /*
       * FFmpeg:
       * Direkt ses URL'sini Discord'un
       * anlayacağı Opus/PCM akışına çevirir.
       */

      const ffmpeg = spawn(
        ffmpegPath,
        [
          "-re",
          "-i",
          link,

          "-vn",

          "-f",
          "s16le",

          "-ar",
          "48000",

          "-ac",
          "2",

          "pipe:1"
        ],
        {
          stdio: [
            "ignore",
            "pipe",
            "pipe"
          ]
        }
      );

      ffmpeg.stderr.on(
        "data",
        data => {
          console.log(
            `[FFmpeg] ${data.toString()}`
          );
        }
      );

      ffmpeg.on(
        "error",
        error => {
          console.error(
            "❌ FFmpeg başlatılamadı:",
            error
          );
        }
      );

      const resource =
        createAudioResource(
          ffmpeg.stdout,
          {
            inputType: "raw"
          }
        );

      player.play(resource);

      await interaction.editReply(
        `🎵 **Müzik başlatıldı!**\n🔗 ${link}`
      );

    } catch (error) {

      console.error(
        "❌ /play hatası:",
        error
      );

      await interaction.editReply(
        "❌ Bu bağlantı oynatılamadı."
      ).catch(() => {});
    }

    return;
  }

  // =====================================
  // STOP
  // =====================================

  if (interaction.commandName === "stop") {

    const player =
      players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({
        content: "❌ Çalan müzik yok.",
        ephemeral: true
      });
    }

    player.stop();

    return interaction.reply(
      "⏹️ Müzik durduruldu."
    );
  }

  // =====================================
  // DISCONNECT
  // =====================================

  if (
    interaction.commandName ===
    "disconnect"
  ) {

    const connection =
      connections.get(
        interaction.guild.id
      );

    if (!connection) {
      return interaction.reply({
        content:
          "❌ Bot zaten ses kanalında değil.",
        ephemeral: true
      });
    }

    const player =
      players.get(interaction.guild.id);

    if (player) {
      player.stop();
      players.delete(interaction.guild.id);
    }

    connection.destroy();

    connections.delete(
      interaction.guild.id
    );

    return interaction.reply(
      "👋 Ses kanalından çıktım."
    );
  }

});

client.login(TOKEN);
