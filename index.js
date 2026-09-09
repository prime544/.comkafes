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
    StreamType
} = require("@discordjs/voice");

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const ffmpeg = require("ffmpeg-static");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.log("TOKEN veya CLIENT_ID bulunamadı.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const ytDlpPath = path.join(__dirname, "yt-dlp");

async function downloadYtDlp() {
    if (fs.existsSync(ytDlpPath)) {
        return;
    }

    console.log("yt-dlp indiriliyor...");

    await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(ytDlpPath);

        https.get(
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
            response => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    https.get(response.headers.location, redirected => {
                        redirected.pipe(file);

                        file.on("finish", () => {
                            file.close(() => {
                                fs.chmodSync(ytDlpPath, 0o755);
                                resolve();
                            });
                        });
                    }).on("error", reject);
                } else {
                    response.pipe(file);

                    file.on("finish", () => {
                        file.close(() => {
                            fs.chmodSync(ytDlpPath, 0o755);
                            resolve();
                        });
                    });
                }
            }
        ).on("error", reject);
    });

    console.log("yt-dlp hazır.");
}

const commands = [
    new SlashCommandBuilder()
        .setName("play")
        .setDescription("YouTube videosu oynatır.")
        .addStringOption(option =>
            option
                .setName("url")
                .setDescription("YouTube video URL'si")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Müziği durdurur ve ses kanalından çıkar.")
];

const players = new Map();

client.once("ready", async () => {
    console.log(`${client.user.tag} aktif!`);

    await downloadYtDlp();

    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        {
            body: commands.map(command => command.toJSON())
        }
    );

    console.log("Slash komutları yüklendi.");
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "play") {
        await playMusic(interaction);
    }

    if (interaction.commandName === "stop") {
        stopMusic(interaction);
    }
});

async function playMusic(interaction) {
    const member = interaction.member;

    if (!member.voice.channel) {
        return interaction.reply({
            content: "❌ Önce bir ses kanalına gir knk.",
            ephemeral: true
        });
    }

    const url = interaction.options.getString("url");

    if (
        !url.includes("youtube.com/") &&
        !url.includes("youtu.be/")
    ) {
        return interaction.reply({
            content: "❌ Sadece YouTube URL'si kullanabilirsin.",
            ephemeral: true
        });
    }

    await interaction.deferReply();

    try {
        const old = players.get(interaction.guild.id);

        if (old) {
            try {
                old.ytdlp.kill("SIGKILL");
            } catch {}

            try {
                old.ffmpeg.kill("SIGKILL");
            } catch {}

            try {
                old.connection.destroy();
            } catch {}

            players.delete(interaction.guild.id);
        }

        const channel = member.voice.channel;

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop
            }
        });

        connection.subscribe(player);

        const ytdlp = spawn(
            ytDlpPath,
            [
                "--no-playlist",
                "--no-warnings",
                "--quiet",
                "--js-runtimes",
                "node",
                "--remote-components",
                "ejs:github",
                "-f",
                "bestaudio/best",
                "-o",
                "-",
                url
            ],
            {
                stdio: ["ignore", "pipe", "pipe"]
            }
        );

        const ffmpegProcess = spawn(
            ffmpeg,
            [
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                "pipe:0",
                "-f",
                "s16le",
                "-ar",
                "48000",
                "-ac",
                "2",
                "pipe:1"
            ],
            {
                stdio: ["pipe", "pipe", "pipe"]
            }
        );

        ytdlp.stdout.pipe(ffmpegProcess.stdin);

        const resource = createAudioResource(
            ffmpegProcess.stdout,
            {
                inputType: StreamType.Raw
            }
        );

        player.play(resource);

        players.set(interaction.guild.id, {
            connection,
            player,
            ytdlp,
            ffmpeg: ffmpegProcess
        });

        player.once(AudioPlayerStatus.Idle, () => {
            try {
                ytdlp.kill("SIGKILL");
            } catch {}

            try {
                ffmpegProcess.kill("SIGKILL");
            } catch {}

            try {
                connection.destroy();
            } catch {}

            players.delete(interaction.guild.id);
        });

        ytdlp.stderr.on("data", data => {
            const text = data.toString().trim();

            if (text) {
                console.log("[yt-dlp]", text);
            }
        });

        ytdlp.on("error", error => {
            console.log("yt-dlp hatası:", error.message);
        });

        ffmpegProcess.on("error", error => {
            console.log("FFmpeg hatası:", error.message);
        });

        await interaction.editReply(
            `🎵 **Oynatılıyor!**\n${url}`
        );

    } catch (error) {
        console.error(error);

        await interaction.editReply(
            "❌ Video oynatılırken bir hata oluştu."
        );
    }
}

function stopMusic(interaction) {
    const data = players.get(interaction.guild.id);

    if (!data) {
        return interaction.reply({
            content: "❌ Şu anda çalan bir müzik yok.",
            ephemeral: true
        });
    }

    try {
        data.ytdlp.kill("SIGKILL");
    } catch {}

    try {
        data.ffmpeg.kill("SIGKILL");
    } catch {}

    try {
        data.player.stop();
    } catch {}

    try {
        data.connection.destroy();
    } catch {}

    players.delete(interaction.guild.id);

    return interaction.reply("⏹️ Müzik durduruldu.");
}

client.login(TOKEN);
