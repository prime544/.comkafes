require('dotenv').config();
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
} = require('discord.js');
const axios = require('axios');
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  {
    name: 'panel',
    description: 'IP ve Telefon sorgulama panelini kanala gönderir.',
    default_member_permissions: PermissionFlagsBits.Administrator.toString()
  }
];

client.once('ready', async () => {
  console.log(`Bot aktif: ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Slash komutları güncelleniyor...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash komutları yüklendi.');
  } catch (error) {
    console.error('Komut yükleme hatası:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  // 1. Slash Komutu (/panel)
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('🌐 Bilgi Sorgulama Paneli')
        .setDescription('Aşağıdaki butonları kullanarak **IP** veya **Telefon Numarası (Ülke/Operatör)** bilgisi sorgulayabilirsiniz.\n\n*Sonuçlar DM kutunuza gönderilecektir.*')
        .setColor(0x2B2D31);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('btn_ip_modal')
          .setLabel('IP Sorgula')
          .setEmoji('🌐')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('btn_phone_modal')
          .setLabel('Telefon Sorgula')
          .setEmoji('📱')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: 'Panel başarıyla oluşturuldu!', ephemeral: true });
    }
  } 

  // 2. Buton Tıklamaları
  else if (interaction.isButton()) {
    if (interaction.customId === 'btn_ip_modal') {
      const modal = new ModalBuilder()
        .setCustomId('ip_modal')
        .setTitle('IP Sorgulama Formu');

      const ipInput = new TextInputBuilder()
        .setCustomId('ip_input_field')
        .setLabel('IP Adresi')
        .setPlaceholder('Örn: 8.8.8.8')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(ipInput));
      await interaction.showModal(modal);
    } 
    else if (interaction.customId === 'btn_phone_modal') {
      const modal = new ModalBuilder()
        .setCustomId('phone_modal')
        .setTitle('Telefon Sorgulama Formu');

      const phoneInput = new TextInputBuilder()
        .setCustomId('phone_input_field')
        .setLabel('Telefon Numarası (Ülke Koduyla)')
        .setPlaceholder('Örn: +905320000000')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(phoneInput));
      await interaction.showModal(modal);
    }
  } 

  // 3. Form Gönderimleri (Modal Submit)
  else if (interaction.isModalSubmit()) {
    
    // IP SORGULAMA
    if (interaction.customId === 'ip_modal') {
      const ipAddress = interaction.fields.getTextInputValue('ip_input_field').trim();
      await interaction.reply({ content: `🔍 **${ipAddress}** sorgulanıyor, sonuç DM'den iletilecek...`, ephemeral: true });

      try {
        const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,regionName,city,zip,isp,org,query`);
        const data = response.data;

        if (data.status === 'fail') {
          await interaction.user.send(`❌ **Hata:** \`${ipAddress}\` adresi sorgulanamadı. (${data.message || 'Geçersiz IP'})`).catch(() => {});
          return;
        }

        const dmEmbed = new EmbedBuilder()
          .setTitle(`🌐 IP Sorgu Sonucu: ${data.query}`)
          .setColor(0x00FF00)
          .addFields(
            { name: 'Ülke', value: `${data.country} (${data.countryCode})`, inline: true },
            { name: 'Şehir / Bölge', value: `${data.city} / ${data.regionName}`, inline: true },
            { name: 'Posta Kodu', value: data.zip || 'Bilinmiyor', inline: true },
            { name: 'İnternet Sağlayıcı (ISP)', value: data.isp || 'Bilinmiyor', inline: false },
            { name: 'Organizasyon', value: data.org || 'Yok', inline: true }
          )
          .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] }).catch(() => {
          interaction.followUp({ content: '⚠️ DM kutunuz kapalı olduğu için sonuç gönderilemedi!', ephemeral: true });
        });

      } catch (err) {
        console.error('API Hatası:', err);
      }
    }

    // TELEFON SORGULAMA
    else if (interaction.customId === 'phone_modal') {
      const rawPhone = interaction.fields.getTextInputValue('phone_input_field').trim();
      await interaction.reply({ content: `📱 **${rawPhone}** sorgulanıyor, sonuç DM'den iletilecek...`, ephemeral: true });

      try {
        const numberObj = phoneUtil.parseAndKeepRawInput(rawPhone);
        const isValid = phoneUtil.isValidNumber(numberObj);

        if (!isValid) {
          await interaction.user.send(`❌ **Hata:** \`${rawPhone}\` geçerli bir telefon numarası formatında değil. Lütfen ülke koduyla birlikte yazın (Örn: +90...).`).catch(() => {});
          return;
        }

        const regionCode = phoneUtil.getRegionCodeForNumber(numberObj);
        const formattedE164 = phoneUtil.format(numberObj, PNF.E164);
        const formattedNational = phoneUtil.format(numberObj, PNF.NATIONAL);

        // Numara tipi tespiti (Mobil / Sabit Hat)
        const numberType = phoneUtil.getNumberType(numberObj);
        let typeString = 'Bilinmiyor';
        if (numberType === 1) typeString = 'Mobil Hat';
        else if (numberType === 0) typeString = 'Sabit Hat';

        // Numara Detay Bilgisi
        const dmEmbed = new EmbedBuilder()
          .setTitle(`📱 Numara Sorgu Sonucu`)
          .setColor(0x00FF00)
          .addFields(
            { name: 'Format (Uluslararası)', value: `\`${formattedE164}\``, inline: true },
            { name: 'Format (Ulusal)', value: `\`${formattedNational}\``, inline: true },
            { name: 'Ülke Kodu', value: `${regionCode}`, inline: true },
            { name: 'Hat Tipi', value: `${typeString}`, inline: true }
          )
          .setFooter({ text: 'Not: Operatör bilgisi numara taşımaya bağlı olarak değişiklik gösterebilir.' })
          .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] }).catch(() => {
          interaction.followUp({ content: '⚠️ DM kutunuz kapalı olduğu için sonuç gönderilemedi!', ephemeral: true });
        });

      } catch (err) {
        await interaction.user.send(`❌ **Hata:** Numara çözümlenemedi. Lütfen başında \`+\` ve ülke kodu olacak şekilde tekrar deneyin.`).catch(() => {});
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
