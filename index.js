const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const {
  Player
} = require("discord-player");

const {
  DefaultExtractors
} = require("@discord-player/extractor");

const ffmpeg = require("ffmpeg-static");

process.env.FFMPEG_PATH = ffmpeg;

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN eksik!");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID eksik!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const player = new Player(client);

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Müzik oynatır.")
    .addStringOption(option =>
      option
        .setName("link")
        .setDescription("SoundCloud veya direkt ses bağlantısı")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Müziği durdurur."),

  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Şarkıyı geçer.")
].map(command => command.toJSON());

client.once("ready", async () => {

  console.log(`✅ Bot aktif: ${client.user.tag}`);

  await player.extractors.loadMulti(
    DefaultExtractors
  );

  console.log("✅ Müzik extractorları yüklendi.");

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
      "❌ Slash komut hatası:",
      error
    );

  }

});

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ==============================
    // PLAY
    // ==============================

    if (interaction.commandName === "play") {

      const voiceChannel =
        interaction.member?.voice?.channel;

      if (!voiceChannel) {

        return interaction.reply({
          content:
            "❌ Önce ses kanalına gir knk.",
          ephemeral: true
        });

      }

      const link =
        interaction.options.getString("link");

      await interaction.deferReply();

      try {

        const { track } =
          await player.play(
            voiceChannel,
            link,
            {
              nodeOptions: {
                metadata: interaction
              }
            }
          );

        await interaction.editReply(
          `🎵 **${track.title}** çalıyor!`
        );

      } catch (error) {

        console.error(
          "PLAY ERROR:",
          error
        );

        await interaction.editReply(
          "❌ Bu bağlantı oynatılamadı.\n\n" +
          "Desteklenen bir SoundCloud bağlantısı " +
          "veya direkt ses akışı bağlantısı dene."
        );

      }

      return;
    }

    // ==============================
    // STOP
    // ==============================

    if (interaction.commandName === "stop") {

      const queue =
        player.nodes.get(
          interaction.guild.id
        );

      if (!queue) {

        return interaction.reply({
          content:
            "❌ Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      queue.delete();

      return interaction.reply(
        "⏹️ Müzik durduruldu."
      );
    }

    // ==============================
    // SKIP
    // ==============================

    if (interaction.commandName === "skip") {

      const queue =
        player.nodes.get(
          interaction.guild.id
        );

      if (!queue) {

        return interaction.reply({
          content:
            "❌ Şu anda müzik çalmıyor.",
          ephemeral: true
        });

      }

      queue.node.skip();

      return interaction.reply(
        "⏭️ Şarkı geçildi."
      );
    }

  }
);

client.login(TOKEN);
