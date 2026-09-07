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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

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

        // Spamlama Butonu Oluşturma
        const basButon = new ButtonBuilder()
            .setCustomId('spam_baslat')
            .setLabel('🚀 20 Mesaj Gönder')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(basButon);

        // Kullanıcıya özel (ephemeral) butonlu mesaj gönder
        const response = await interaction.reply({
            content: `Hazır! Aşağıdaki butona bastığında şu mesaj 20 kez gönderilecek:\n> **${mesajim}**`,
            components: [row],
            ephemeral: true
        });

        // Buton Dinleyicisi (Sadece komutu yazan kişinin butonuna odaklanır)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 dakika boyunca buton aktif kalır
        });

        collector.on('collect', async buttonInteraction => {
            if (buttonInteraction.customId === 'spam_baslat') {
                // Butona tıklandığında anında yanıt verip dondurmayı önlüyoruz
                await buttonInteraction.reply({ content: 'Spam başlatıldı!', ephemeral: true });

                // 20 mesaj gönderme döngüsü
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

                    // Hızlı atması için 0.1 saniye (100ms) bekleme
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        });
    }
});

client.login(token);
