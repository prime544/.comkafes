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
        .setIntegrationTypes([
            ApplicationIntegrationType.UserInstall, 
            ApplicationIntegrationType.GuildInstall
        ])
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
        console.error("HATA: DISCORD_TOKEN veya CLIENT_ID eksik!");
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('Slash komutları güncellendi!');
    } catch (error) {
        console.error('Komut kaydı hatası:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'mesaj') {
        const mesajim = interaction.options.getString('mesajim');

        // İlk gizli onay mesajı
        await interaction.reply({ 
            content: 'Mesaj gönderimi başlatıldı!', 
            ephemeral: true 
        }).catch(err => console.error("Yanıt hatası:", err));

        // 20 mesaj gönderme döngüsü
        for (let i = 0; i < 20; i++) {
            try {
                // Öncelik 1: Normal kanal varsa kanala gönder
                if (interaction.channel) {
                    await interaction.channel.send(mesajim);
                } else {
                    // Öncelik 2: Kanal yoksa (DM / Özel Etkileşim) followUp kullan
                    await interaction.followUp({ content: mesajim });
                }
            } catch (err) {
                // Kanal izni yoksa alternatif olarak followUp ile gönder
                await interaction.followUp({ content: mesajim }).catch(() => {});
            }

            // Hızlı gönderim için 0.1 saniye (100ms) bekleme
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
});

client.login(token);
