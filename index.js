const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    InteractionContextType, 
    ApplicationIntegrationType 
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Slash Komut Tanımı
const commands = [
    new SlashCommandBuilder()
        .setName('mesaj')
        .setDescription('Yazdığın mesajı kanala 20 kere atar.')
        .addStringOption(option =>
            option
                .setName('mesajim')
                .setDescription('Gönderilecek mesaj')
                .setRequired(true)
        )
        // Hem sunucuya hem kullanıcı uygulamasına yüklenmeye izin ver
        .setIntegrationTypes([
            ApplicationIntegrationType.UserInstall, 
            ApplicationIntegrationType.GuildInstall
        ])
        // Sunucularda, DM'lerde ve özel kanallarda çalışmasını sağla
        .setContexts([
            InteractionContextType.Guild, 
            InteractionContextType.BotDM, 
            InteractionContextType.PrivateChannel
        ])
        .toJSON()
];

client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);

    if (!token || !clientId) {
        console.error("HATA: DISCORD_TOKEN veya CLIENT_ID çevre değişkeni (Variables) eksik!");
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('Slash komutları Discord API’sine gönderiliyor...');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('Slash komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komut kaydı sırasında hata oluştu:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'mesaj') {
        const mesajim = interaction.options.getString('mesajim');

        // Zaman aşımı (Timeout) hatasını önlemek için ephemeral (gizli) yanıt veriyoruz
        await interaction.reply({ 
            content: 'Mesaj gönderimi başlatıldı!', 
            ephemeral: true 
        }).catch(err => console.error("Yanıt hatası:", err));

        // 20 defa mesaj atma döngüsü
        for (let i = 0; i < 20; i++) {
            if (interaction.channel) {
                await interaction.channel.send(mesajim).catch(err => {
                    console.error(`Mesaj ${i+1} gönderilemedi:`, err);
                });
            }
            // Rate-limit yememek için 0.6 saniye bekleme
            await new Promise(resolve => setTimeout(resolve, 600));
        }
    }
});

client.login(token);
