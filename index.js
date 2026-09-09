const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ComponentType
} = require("discord.js");

const axios = require("axios");

const phoneLib = require("google-libphonenumber");
const phoneUtil = phoneLib.PhoneNumberUtil.getInstance();
const PNF = phoneLib.PhoneNumberFormat;

// ==============================
// AYARLAR
// ==============================

if (!process.env.DISCORD_TOKEN) {
  console.error(
    "❌ HATA: DISCORD_TOKEN ortam değişkeni bulunamadı!"
  );
  process.exit(1);
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// 🚫 /mesaj'ın çalışmayacağı sunucu
const HEDEF_SUNUCU_ID = "1506325267910754434";

const DAVET_LINKI = "https://discord.gg/yNVnFJS62";

// ==============================
// CLIENT
// ==============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

// ==============================
// SLASH KOMUTLARI
// ==============================

const commands = [

  // ============================
  // /PANEL
  // ============================

  new SlashCommandBuilder()
    .setName("panel")
    .setDescription(
      "IP ve Telefon sorgulama panelini kanala gönderir."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator.toString()
    )
    .toJSON(),

  // ============================
  // /MESAJ
  // ============================

  new SlashCommandBuilder()
    .setName("mesaj")
    .setDescription(
      "Mesaj göndermek için butonlu panel açar."
    )
    .addStringOption(option =>
      option
        .setName("mesajim")
        .setDescription("Gönderilecek mesaj")
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
    .toJSON(),

  // ============================
  // /PING
  // ============================

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Botun Railway/Discord gecikmesini gösterir."
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

// ==============================
// READY
// ==============================

client.once("ready", async () => {

  console.log(`✅ Bot aktif: ${client.user.tag}`);

  const rest = new REST({
    version: "10"
  }).setToken(token);

  try {

    console.log("🔄 Slash komutları güncelleniyor...");

    const appId = clientId || client.user.id;

    await rest.put(
      Routes.applicationCommands(appId),
      {
        body: commands
      }
    );

    console.log("✅ Slash komutları yüklendi.");

  } catch (error) {

    console.error(
      "❌ Komut yükleme hatası:",
      error
    );

  }

});

// ==============================
// INTERACTION CREATE
// ==============================

client.on("interactionCreate", async interaction => {

  try {

    // ==========================================
    // SLASH KOMUTLARI
    // ==========================================

    if (interaction.isChatInputCommand()) {

      // ========================================
      // /PANEL
      // ========================================

      if (interaction.commandName === "panel") {

        if (!interaction.guild) {
          return interaction.reply({
            content:
              "❌ Bu komut sadece sunucularda kullanılabilir.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle("🌐 Bilgi Sorgulama Paneli")
          .setDescription(
            "Aşağıdaki butonları kullanarak **IP** veya **Telefon Numarası** bilgisi sorgulayabilirsiniz.\n\n" +
            "*Sonuçlar DM kutunuza gönderilecektir.*"
          )
          .setColor(0x2B2D31);

        const row = new ActionRowBuilder()
          .addComponents(

            new ButtonBuilder()
              .setCustomId("btn_ip_modal")
              .setLabel("IP Sorgula")
              .setEmoji("🌐")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("btn_phone_modal")
              .setLabel("Telefon Sorgula")
              .setEmoji("📱")
              .setStyle(ButtonStyle.Success)

          );

        await interaction.channel.send({
          embeds: [embed],
          components: [row]
        });

        return interaction.reply({
          content:
            "✅ Panel başarıyla oluşturuldu!",
          ephemeral: true
        });

      }

      // ========================================
      // /MESAJ
      // ========================================

      else if (interaction.commandName === "mesaj") {

        // 🚫 SADECE BELİRLENEN SUNUCUDA YASAK
        if (
          interaction.guild &&
          interaction.guild.id === HEDEF_SUNUCU_ID
        ) {

          return interaction.reply({
            content:
              "❌ `/mesaj` komutu bu sunucuda kullanılamaz.",
            ephemeral: true
          });

        }

        const mesajim =
          interaction.options.getString("mesajim");

        if (!mesajim) {

          return interaction.reply({
            content:
              "❌ Gönderilecek mesajı belirtmelisin.",
            ephemeral: true
          });

        }

        const basButon = new ButtonBuilder()
          .setCustomId("spam_baslat")
          .setLabel("🚀 20 Mesaj Gönder")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
          .addComponents(basButon);

        const response = await interaction.reply({
          content:
            `Hazır! Butona bastığında şu mesaj 20 kez gönderilecek:\n> **${mesajim}**`,
          components: [row],
          ephemeral: true,
          fetchReply: true
        });

        const collector =
          response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 86400000
          });

        collector.on(
          "collect",
          async buttonInteraction => {

            if (
              buttonInteraction.customId !==
              "spam_baslat"
            ) {
              return;
            }

            try {

              // 🚫 BUTONA BASILDIĞINDA HEDEF SUNUCU KONTROLÜ
              if (
                buttonInteraction.guild &&
                buttonInteraction.guild.id ===
                  HEDEF_SUNUCU_ID
              ) {

                return buttonInteraction.reply({
                  content:
                    "❌ `/mesaj` komutu bu sunucuda kullanılamaz.",
                  ephemeral: true
                });

              }

              await buttonInteraction.deferReply({
                ephemeral: true
              });

              // ==================================
              // DESTEK SUNUCUSU ÜYELİK KONTROLÜ
              // ==================================

              const guild =
                client.guilds.cache.get(
                  HEDEF_SUNUCU_ID
                );

              if (guild) {

                const isMember =
                  await guild.members
                    .fetch(buttonInteraction.user.id)
                    .catch(() => null);

                if (!isMember) {

                  return buttonInteraction.editReply({
                    content:
                      `⚠️ Bu özelliği kullanabilmek için önce destek sunucumuza katılmanız gerekmektedir!\n\n` +
                      `🔗 ${DAVET_LINKI}`
                  });

                }

              }

              await buttonInteraction.editReply({
                content:
                  "🚀 Gönderim başlatıldı!"
              });

              // ==================================
              // 20 MESAJ
              // ==================================

              for (let i = 0; i < 20; i++) {

                try {

                  if (
                    interaction.channel
                  ) {

                    await interaction.channel.send(
                      mesajim
                    );

                  } else {

                    await interaction.followUp({
                      content: mesajim
                    });

                  }

                } catch (err) {

                  await interaction.followUp({
                    content: mesajim
                  }).catch(() => {});

                }

                await new Promise(
                  resolve =>
                    setTimeout(resolve, 100)
                );

              }

            } catch (err) {

              console.error(
                "❌ /mesaj buton hatası:",
                err
              );

            }

          }
        );

      }

      // ========================================
      // /PING
      // ========================================

      else if (interaction.commandName === "ping") {

        const start = Date.now();

        await interaction.reply({
          content: "🏓 Ping ölçülüyor..."
        });

        const apiPing =
          Date.now() - start;

        const websocketPing =
          client.ws.ping;

        const embed =
          new EmbedBuilder()
            .setTitle("🏓 Pong!")
            .setDescription(
              "Bot bağlantı durumu ve gecikme bilgileri"
            )
            .addFields(
              {
                name: "🤖 Bot Gecikmesi",
                value: `\`${apiPing} ms\``,
                inline: true
              },
              {
                name: "🌐 Discord WS",
                value: `\`${websocketPing} ms\``,
                inline: true
              },
              {
                name: "🚂 Railway",
                value: "🟢 Aktif",
                inline: true
              }
            )
            .setColor(0x2B2D31)
            .setFooter({
              text: "Fallix • Ping System"
            })
            .setTimestamp();

        return interaction.editReply({
          content: "",
          embeds: [embed]
        });

      }

    }

    // ==========================================
    // BUTONLAR
    // ==========================================

    else if (interaction.isButton()) {

      if (
        interaction.customId ===
        "btn_ip_modal"
      ) {

        const modal = new ModalBuilder()
          .setCustomId("ip_modal")
          .setTitle(
            "IP Sorgulama Formu"
          );

        const ipInput =
          new TextInputBuilder()
            .setCustomId(
              "ip_input_field"
            )
            .setLabel("IP Adresi")
            .setPlaceholder(
              "Örn: 8.8.8.8"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(ipInput)
        );

        return interaction.showModal(
          modal
        );

      }

      else if (
        interaction.customId ===
        "btn_phone_modal"
      ) {

        const modal = new ModalBuilder()
          .setCustomId(
            "phone_modal"
          )
          .setTitle(
            "Telefon Sorgulama Formu"
          );

        const phoneInput =
          new TextInputBuilder()
            .setCustomId(
              "phone_input_field"
            )
            .setLabel(
              "Telefon Numarası (Ülke Koduyla)"
            )
            .setPlaceholder(
              "Örn: +905320000000"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(phoneInput)
        );

        return interaction.showModal(
          modal
        );

      }

    }

    // ==========================================
    // MODAL SUBMIT
    // ==========================================

    else if (
      interaction.isModalSubmit()
    ) {

      // ========================================
      // IP
      // ========================================

      if (
        interaction.customId ===
        "ip_modal"
      ) {

        const ipAddress =
          interaction.fields
            .getTextInputValue(
              "ip_input_field"
            )
            .trim();

        await interaction.reply({
          content:
            `🔍 **${ipAddress}** sorgulanıyor, sonuç DM'den iletilecek...`,
          ephemeral: true
        });

        try {

          const response =
            await axios.get(
              `http://ip-api.com/json/${encodeURIComponent(ipAddress)}?fields=status,message,country,countryCode,regionName,city,zip,isp,org,query`
            );

          const data =
            response.data;

          if (
            data.status === "fail"
          ) {

            await interaction.user
              .send(
                `❌ **Hata:** \`${ipAddress}\` adresi sorgulanamadı. (${data.message || "Geçersiz IP"})`
              )
              .catch(() => {});

            return;
          }

          const dmEmbed =
            new EmbedBuilder()
              .setTitle(
                `🌐 IP Sorgu Sonucu: ${data.query}`
              )
              .setColor(0x00FF00)
              .addFields(

                {
                  name: "Ülke",
                  value:
                    `${data.country} (${data.countryCode})`,
                  inline: true
                },

                {
                  name:
                    "Şehir / Bölge",
                  value:
                    `${data.city} / ${data.regionName}`,
                  inline: true
                },

                {
                  name:
                    "Posta Kodu",
                  value:
                    data.zip ||
                    "Bilinmiyor",
                  inline: true
                },

                {
                  name:
                    "İnternet Sağlayıcı (ISP)",
                  value:
                    data.isp ||
                    "Bilinmiyor",
                  inline: false
                },

                {
                  name:
                    "Organizasyon",
                  value:
                    data.org ||
                    "Yok",
                  inline: true
                }

              )
              .setTimestamp();

          await interaction.user
            .send({
              embeds: [dmEmbed]
            })
            .catch(() => {

              interaction.followUp({
                content:
                  "⚠️ DM kutunuz kapalı olduğu için sonuç gönderilemedi!",
                ephemeral: true
              });

            });

        } catch (err) {

          console.error(
            "❌ IP API Hatası:",
            err
          );

        }

      }

      // ========================================
      // TELEFON
      // ========================================

      else if (
        interaction.customId ===
        "phone_modal"
      ) {

        const rawPhone =
          interaction.fields
            .getTextInputValue(
              "phone_input_field"
            )
            .trim();

        await interaction.reply({
          content:
            `📱 **${rawPhone}** sorgulanıyor, sonuç DM'den iletilecek...`,
          ephemeral: true
        });

        try {

          const numberObj =
            phoneUtil.parseAndKeepRawInput(
              rawPhone
            );

          const isValid =
            phoneUtil.isValidNumber(
              numberObj
            );

          if (!isValid) {

            await interaction.user
              .send(
                `❌ **Hata:** \`${rawPhone}\` geçerli bir telefon numarası formatında değil. Lütfen ülke koduyla birlikte yazın (Örn: +90...).`
              )
              .catch(() => {});

            return;
          }

          const regionCode =
            phoneUtil.getRegionCodeForNumber(
              numberObj
            );

          const formattedE164 =
            phoneUtil.format(
              numberObj,
              PNF.E164
            );

          const formattedNational =
            phoneUtil.format(
              numberObj,
              PNF.NATIONAL
            );

          const dmEmbed =
            new EmbedBuilder()
              .setTitle(
                "📱 Numara Sorgu Sonucu"
              )
              .setColor(0x00FF00)
              .addFields(

                {
                  name:
                    "Format (Uluslararası)",
                  value:
                    `\`${formattedE164}\``,
                  inline: true
                },

                {
                  name:
                    "Format (Ulusal)",
                  value:
                    `\`${formattedNational}\``,
                  inline: true
                },

                {
                  name:
                    "Ülke Kodu",
                  value:
                    `${regionCode}`,
                  inline: true
                }

              )
              .setFooter({
                text:
                  "Not: Operatör bilgisi değişiklik gösterebilir."
              })
              .setTimestamp();

          await interaction.user
            .send({
              embeds: [dmEmbed]
            })
            .catch(() => {

              interaction.followUp({
                content:
                  "⚠️ DM kutunuz kapalı olduğu için sonuç gönderilemedi!",
                ephemeral: true
              });

            });

        } catch (err) {

          await interaction.user
            .send(
              "❌ **Hata:** Numara çözümlenemedi. Lütfen başında `+` ve ülke kodu olacak şekilde tekrar deneyin."
            )
            .catch(() => {});

        }

      }

    }

  } catch (error) {

    console.error(
      "❌ Etkileşim hatası:",
      error
    );

  }

});

// ==============================
// LOGIN
// ==============================

client.login(token);
