const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, InteractionContextType, ApplicationIntegrationType } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Slash komutu tanımı
const commands = [
    new SlashCommandBuilder()
        .setName('mesaj')
        .setDescription('Yazdığın mesajı kanala 20 kere atar.')
        .addStringOption(option =>
            option.setName('mesajim')
                .setDescription('Gönderilecek mesaj')
                .setRequired(true)
        )
        // Botun uygulamana ekli olarak her yerde çalışmasını sağlar:
        .setIntegrationTypes([ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall])
        .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel])
];

client.once('ready', async () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    
    // Slash komutlarını kaydet
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Slash komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komut yüklenirken hata oluştu:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'mesaj') {
        const mesajim = interaction.options.getString('mesajim');

        // İlk yanıtı sadece sana görünecek şekilde veriyoruz (zamanaşımını önlemek için)
        await interaction.reply({ content: 'Mesaj gönderimi başlatıldı!', ephemeral: true });

        // 20 mesajı kanala gönder
        for (let i = 0; i < 20; i++) {
            await interaction.channel.send(mesajim);
            // Discord rate-limit (engel) yememek için 0.5 sn bekleme
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
});

client.login(token);
