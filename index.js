const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    InteractionContextType, 
    ApplicationIntegrationType,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
    ] 
});

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const HEDEF_SUNUCU_ID = 'SUNUCU_ID_BURAYA'; // Kendi Sunucu ID'ni yaz
const DAVET_LINKI = 'https://discord.gg/yNVnFJS62';

const commands = [
    new SlashCommandBuilder()
        .setName('mesaj')
        .setDescription('Mesaj göndermek için butonlu panel açar.')
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

        const basButon = new ButtonBuilder()
            .setCustomId('spam_baslat')
            .setLabel('🚀 20 Mesaj Gönder')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(basButon);

        const response = await interaction.reply({
            content: `Hazır! Butona her bastığında şu mesaj 20 kez gönderilecek:\n> **${mesajim}**`,
            components: [row],
            ephemeral: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 86400000 
        });

        collector.on('collect', async buttonInteraction => {
            if (buttonInteraction.customId === 'spam_baslat') {
                try {
                    // KİLİT NOKTA: 3 saniye zaman aşımı hatasını (Etkileşim başarısız) önlemek için anında defer veriyoruz
                    await buttonInteraction.deferReply({ ephemeral: true });

                    // SUNUCU ÜYELİK KONTROLÜ
                    const guild = client.guilds.cache.get(HEDEF_SUNUCU_ID);
                    
                    if (guild) {
                        const isMember = await guild.members.fetch(buttonInteraction.user.id).catch(() => null);

                        if (!isMember) {
                            return await buttonInteraction.editReply({
                                content: `⚠️ Bu botu kullanabilmek için önce destek sunucumuza katılmanız gerekmektedir!\n\nKatılmak için tıkla: ${DAVET_LINKI}`
                            });
                        }
                    }

                    await buttonInteraction.editReply({ content: 'Gönderim başlatıldı!' });

                    // 20 MESAJ GÖNDERME DÖNGÜSÜ
                    for (let i = 0; i < 20; i++) {
                        try {
                            if (interaction.channel) {
                                await interaction.channel.send(mesajim);
                            } else {
                                await interaction.followUp({ content: mesajim });
                            }
                        } catch (err) {
                            await interaction.followUp({ content: mesajim }).catch(() => {});
                        }

                        await new Promise(resolve => setTimeout(resolve, 100));
                    }

                } catch (err) {
                    console.error("Etkileşim işleme hatası:", err);
                }
            }
        });
    }
});

client.login(token);
