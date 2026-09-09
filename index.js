const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

// Sadece mesajlar ve webhooklar için gerekli temel intentler bırakıldı (Intent hatası vermez)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks
    ]
});

const PREFIX = "k!";

client.on('ready', () => {
    console.log(`Bot aktif: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'fakemesaj') {
        const targetUser = message.mentions.users.first();
        const fakeMessageText = args.slice(1).join(" ");

        if (!targetUser || !fakeMessageText) {
            return message.reply("Kullanım: `k!fakemesaj @kullanici <mesaj>`").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
        }

        try {
            // 1. Komut mesajını hemen sil
            await message.delete().catch(() => {});

            // 2. Yetki kontrolü
            if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
                return message.channel.send("Webhook oluşturmak için botun 'Webhooks Yönet' yetkisi olmalı!").then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
            }

            // 3. Kanalda webhook bul veya oluştur
            const channelsWebhooks = await message.channel.fetchWebhooks();
            let webhook = channelsWebhooks.find(wh => wh.name === 'FakeMessageBot');

            if (!webhook) {
                webhook = await message.channel.createWebhook({
                    name: 'FakeMessageBot',
                    avatar: client.user.displayAvatarURL(),
                    reason: 'Fake mesaj sistemi'
                });
            }

            // 4. Hedef kullanıcının ismi ve avatarı
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
            const displayName = member ? member.displayName : targetUser.username;
            const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 512 });

            // 5. Webhook ile mesajı gönder
            await webhook.send({
                content: fakeMessageText,
                username: displayName,
                avatarURL: avatarURL,
            });

        } catch (error) {
            console.error("Hata:", error);
        }
    }
});

client.login(process.env.TOKEN);
