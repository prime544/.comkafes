const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = "k!";

client.once("ready", () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    try {
        // Botları ve DM mesajlarını yok say
        if (message.author.bot || !message.guild) return;

        // Prefix kontrolü
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content
            .slice(PREFIX.length)
            .trim()
            .split(/\s+/);

        const command = args.shift()?.toLowerCase();

        if (command !== "fakemesaj") return;

        // Kullanıcı kontrolü
        const targetUser = message.mentions.users.first();

        // Mention dışındaki mesaj
        const fakeMessageText = args
            .filter(arg => !arg.startsWith("<@"))
            .join(" ")
            .trim();

        if (!targetUser || !fakeMessageText) {
            const reply = await message.reply(
                "❌ Kullanım: `k!fakemesaj @kullanici <mesaj>`"
            );

            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 5000);

            return;
        }

        // Botun webhook yetkisini kontrol et
        const botMember = message.guild.members.me;

        if (!botMember) {
            console.log("❌ Bot üyesi bulunamadı.");
            return;
        }

        if (
            !botMember.permissionsIn(message.channel).has(
                PermissionsBitField.Flags.ManageWebhooks
            )
        ) {
            const reply = await message.channel.send(
                "❌ Bu kanalda **Webhook'ları Yönet** yetkim yok."
            );

            setTimeout(() => {
                reply.delete().catch(() => {});
            }, 5000);

            return;
        }

        // Komut mesajını sil
        await message.delete().catch(() => {});

        // Kanal webhooklarını getir
        const webhooks = await message.channel.fetchWebhooks();

        // Daha önce oluşturulmuş webhooku bul
        let webhook = webhooks.find(
            wh => wh.name === "FakeMessageBot" && wh.owner?.id === client.user.id
        );

        // Yoksa oluştur
        if (!webhook) {
            webhook = await message.channel.createWebhook({
                name: "FakeMessageBot",
                avatar: client.user.displayAvatarURL(),
                reason: "Bot webhook sistemi"
            });
        }

        // Hedef kullanıcının sunucudaki adını al
        const member = await message.guild.members
            .fetch(targetUser.id)
            .catch(() => null);

        const displayName = member
            ? member.displayName
            : targetUser.username;

        const avatarURL = targetUser.displayAvatarURL({
            size: 512
        });

        // Webhook mesajı
        await webhook.send({
            content: fakeMessageText,
            username: displayName,
            avatarURL: avatarURL
        });

        console.log(
            `✅ Webhook mesajı gönderildi: ${displayName}`
        );

    } catch (error) {
        console.error("❌ HATA:");
        console.error(error);
    }
});

client.login(process.env.TOKEN);
