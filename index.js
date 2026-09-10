require("dotenv").config();
const fs=require("fs");
const {
 Client,GatewayIntentBits,Partials,REST,Routes,SlashCommandBuilder,
 PermissionFlagsBits,ChannelType,ActionRowBuilder,StringSelectMenuBuilder,
 ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle,
 EmbedBuilder
}=require("discord.js");
const {cfg,save}=require("./utils/db");
const {isStaff}=require("./utils/helpers");

if(!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
 console.error("DISCORD_TOKEN veya CLIENT_ID eksik.");
 process.exit(1);
}

const client=new Client({
 intents:[
  GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildInvites,GatewayIntentBits.GuildVoiceStates
 ],
 partials:[Partials.Channel]
});

const commands=[
 new SlashCommandBuilder().setName("genel").setDescription("Genel")
  .addSubcommand(s=>s.setName("ping").setDescription("Ping"))
  .addSubcommand(s=>s.setName("avatar").setDescription("Avatar").addUserOption(o=>o.setName("kullanici").setDescription("Kullanıcı")))
  .addSubcommand(s=>s.setName("kullanıcı").setDescription("Kullanıcı bilgisi").addUserOption(o=>o.setName("kullanici").setDescription("Kullanıcı")))
  .addSubcommand(s=>s.setName("sunucu").setDescription("Sunucu bilgisi"))
  .addSubcommand(s=>s.setName("istatistik").setDescription("Bot istatistikleri")),
 new SlashCommandBuilder().setName("mod").setDescription("Moderasyon")
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers.toString())
  .addSubcommand(s=>s.setName("ban").setDescription("Ban").addUserOption(o=>o.setName("kullanici").setDescription("Üye").setRequired(true)).addStringOption(o=>o.setName("sebep").setDescription("Sebep")))
  .addSubcommand(s=>s.setName("kick").setDescription("Kick").addUserOption(o=>o.setName("kullanici").setDescription("Üye").setRequired(true)).addStringOption(o=>o.setName("sebep").setDescription("Sebep")))
  .addSubcommand(s=>s.setName("timeout").setDescription("Timeout").addUserOption(o=>o.setName("kullanici").setDescription("Üye").setRequired(true)).addIntegerOption(o=>o.setName("dakika").setDescription("Dakika").setRequired(true).setMinValue(1).setMaxValue(40320)))
  .addSubcommand(s=>s.setName("clear").setDescription("Mesaj sil").addIntegerOption(o=>o.setName("miktar").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100))),
 new SlashCommandBuilder().setName("ticket").setDescription("Ticket")
  .addSubcommand(s=>s.setName("kur").setDescription("Menülerle kur"))
  .addSubcommand(s=>s.setName("gönder").setDescription("Panel gönder")),
 new SlashCommandBuilder().setName("kurulum").setDescription("Sistem kurulum merkezi"),
 new SlashCommandBuilder().setName("duyuru").setDescription("Duyuru").addStringOption(o=>o.setName("mesaj").setDescription("Mesaj").setRequired(true)),
 new SlashCommandBuilder().setName("öneri").setDescription("Öneri").addStringOption(o=>o.setName("metin").setDescription("Öneri").setRequired(true)),
 new SlashCommandBuilder().setName("çekiliş").setDescription("Çekiliş").addStringOption(o=>o.setName("ödül").setDescription("Ödül").setRequired(true)).addIntegerOption(o=>o.setName("dakika").setDescription("Süre").setRequired(true).setMinValue(1)),
 new SlashCommandBuilder().setName("drop").setDescription("Drop").addStringOption(o=>o.setName("ödül").setDescription("Ödül").setRequired(true)),
 new SlashCommandBuilder().setName("rolver").setDescription("Rol ver").addUserOption(o=>o.setName("kullanici").setDescription("Kullanıcı").setRequired(true)).addRoleOption(o=>o.setName("rol").setDescription("Rol").setRequired(true)),
 new SlashCommandBuilder().setName("rolal").setDescription("Rol al").addUserOption(o=>o.setName("kullanici").setDescription("Kullanıcı").setRequired(true)).addRoleOption(o=>o.setName("rol").setDescription("Rol").setRequired(true)),
 new SlashCommandBuilder().setName("invites").setDescription("Davet bilgisi")
].map(x=>x.toJSON());

async function register(){
 const rest=new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);
 await rest.put(Routes.applicationCommands(process.env.CLIENT_ID),{body:commands});
}

function panel(c){
 const menu=new StringSelectMenuBuilder().setCustomId("ticket_type").setPlaceholder("🎫 Kategori seç")
  .addOptions(c.ticket.categories.map((x,i)=>({label:x.name.slice(0,100),value:String(i),description:"Ticket aç"})));
 return new ActionRowBuilder().addComponents(menu);
}
async function setupTicket(i){
 const ch=i.guild.channels.cache.filter(x=>x.type===ChannelType.GuildText).first(25);
 const menu=new StringSelectMenuBuilder().setCustomId("ts_channel").setPlaceholder("1/4 • Panel kanalı")
  .addOptions(ch.map(x=>({label:x.name.slice(0,100),value:x.id})));
 return i.reply({content:"🎫 Ticket kurulumu — panel kanalını seç.",components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
}

client.on("interactionCreate",async i=>{
 try{
  if(i.isChatInputCommand()){
   const sub=i.options.getSubcommand(false);

   if(i.commandName==="genel"){
    if(sub==="ping") return i.reply(`🏓 ${client.ws.ping}ms`);
    if(sub==="avatar"){const u=i.options.getUser("kullanici")||i.user;return i.reply({embeds:[new EmbedBuilder().setTitle(`${u.username} • Avatar`).setImage(u.displayAvatarURL({size:1024})).setColor(0x5865F2)]});}
    if(sub==="kullanıcı"){const u=i.options.getUser("kullanici")||i.user;return i.reply({embeds:[new EmbedBuilder().setTitle("Kullanıcı Bilgisi").setDescription(`**Kullanıcı:** ${u}\\n**ID:** ${u.id}`).setColor(0x5865F2)]});}
    if(sub==="sunucu")return i.reply({embeds:[new EmbedBuilder().setTitle(i.guild.name).setDescription(`Üye: **${i.guild.memberCount}**\\nRol: **${i.guild.roles.cache.size}**\\nKanal: **${i.guild.channels.cache.size}**`).setColor(0x5865F2)]});
    if(sub==="istatistik")return i.reply(`🤖 ${client.user.tag}\\nSunucu: ${client.guilds.cache.size}\\nÜye: ${client.guilds.cache.reduce((a,g)=>a+g.memberCount,0)}`);
   }

   if(i.commandName==="mod"){
    const u=i.options.getUser("kullanici"),m=await i.guild.members.fetch(u.id).catch(()=>null);
    if(!m)return i.reply({content:"Üye bulunamadı.",ephemeral:true});
    const r=i.options.getString("sebep")||"Sebep belirtilmedi";
    if(sub==="ban"){await m.ban({reason:r});return i.reply(`🔨 ${u} yasaklandı.`);}
    if(sub==="kick"){await m.kick(r);return i.reply(`👢 ${u} atıldı.`);}
    if(sub==="timeout"){const n=i.options.getInteger("dakika");await m.timeout(n*60000,r);return i.reply(`⏳ ${u} ${n} dakika timeout aldı.`);}
    if(sub==="clear"){const n=i.options.getInteger("miktar"),x=await i.channel.bulkDelete(n,true);return i.reply({content:`🧹 ${x.size} mesaj silindi.`,ephemeral:true});}
   }

   if(i.commandName==="ticket"){
    if(sub==="kur"){if(!i.member.permissions.has(PermissionFlagsBits.Administrator))return i.reply({content:"Yönetici gerekli.",ephemeral:true});return setupTicket(i);}
    if(sub==="gönder"){const c=cfg(i.guild.id);if(!c.ticket.panelChannel||!c.ticket.categories.length)return i.reply({content:"Önce /ticket kur.",ephemeral:true});const ch=i.guild.channels.cache.get(c.ticket.panelChannel);await ch.send({embeds:[new EmbedBuilder().setTitle("🎫 Destek Merkezi").setDescription("Kategori seçerek ticket aç.").setColor(0x5865F2)],components:[panel(c)]});return i.reply({content:"Panel gönderildi.",ephemeral:true});}
   }

   if(i.commandName==="kurulum"){
    const m=new StringSelectMenuBuilder().setCustomId("setup").setPlaceholder("⚙️ Sistem seç").addOptions(
     {label:"🎫 Ticket",value:"ticket"},{label:"📜 Log",value:"logs"},{label:"👋 Hoş Geldin",value:"welcome"},
     {label:"🛡️ AutoMod",value:"automod"},{label:"💡 Öneri",value:"suggestion"},{label:"🔊 Geçici Ses",value:"voice"},{label:"🎭 Oto Rol",value:"autorole"}
    );
    return i.reply({content:"**PrimeLegacy Kurulum Merkezi**",components:[new ActionRowBuilder().addComponents(m)],ephemeral:true});
   }

   if(i.commandName==="duyuru")return i.reply({embeds:[new EmbedBuilder().setTitle("📢 Duyuru").setDescription(i.options.getString("mesaj")).setColor(0x5865F2)]});
   if(i.commandName==="öneri"){const c=cfg(i.guild.id),ch=c.suggestion.channel?i.guild.channels.cache.get(c.suggestion.channel):i.channel;const m=await ch.send({embeds:[new EmbedBuilder().setTitle("💡 Öneri").setDescription(i.options.getString("metin")).setFooter({text:i.user.tag}).setColor(0x57F287)]});await m.react("👍");await m.react("👎");return i.reply({content:"Öneri gönderildi.",ephemeral:true});}
   if(i.commandName==="rolver"){const u=await i.guild.members.fetch(i.options.getUser("kullanici").id),r=i.options.getRole("rol");await u.roles.add(r);return i.reply(`✅ ${u} → ${r}`);}
   if(i.commandName==="rolal"){const u=await i.guild.members.fetch(i.options.getUser("kullanici").id),r=i.options.getRole("rol");await u.roles.remove(r);return i.reply(`✅ ${u} ← ${r}`);}
   if(i.commandName==="invites")return i.reply("📨 Invite tracking altyapısı aktif; ayrıntılı davet sayımı Discord cache durumuna bağlıdır.");
   if(i.commandName==="drop")return i.reply({embeds:[new EmbedBuilder().setTitle("🎁 DROP").setDescription(`Ödül: **${i.options.getString("ödül")}**\\nİlk tıklayan kazanır!`).setColor(0xEB459E)],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("drop").setLabel("🎁 KAP").setStyle(ButtonStyle.Primary))]});
   if(i.commandName==="çekiliş"){
    const prize=i.options.getString("ödül"),min=i.options.getInteger("dakika");
    const m=await i.reply({embeds:[new EmbedBuilder().setTitle("🎉 Çekiliş").setDescription(`Ödül: **${prize}**\\nSüre: **${min} dakika**\\nKatılmak için 🎉`).setTimestamp(Date.now()+min*60000).setColor(0xFEE75C)],fetchReply:true});
    await m.react("🎉");setTimeout(async()=>{const x=await i.channel.messages.fetch(m.id).catch(()=>null);if(!x)return;const us=await x.reactions.cache.get("🎉")?.users.fetch().catch(()=>null);const pool=us?.filter(u=>!u.bot);const w=pool?.size?pool.random():null;i.channel.send(w?`🎉 ${w} kazandı: **${prize}**`:`🎉 Katılan olmadı.`)},min*60000);return;
   }
  }

  if(i.isStringSelectMenu()){
   if(i.customId==="setup"){
    if(i.values[0]==="ticket")return setupTicket(i);
    const type=i.values[0],c=cfg(i.guild.id);
    if(type==="logs"||type==="welcome"||type==="suggestion"||type==="voice"){
     const chans=i.guild.channels.cache.filter(x=>[ChannelType.GuildText,ChannelType.GuildCategory].includes(x.type)).first(25);
     const m=new StringSelectMenuBuilder().setCustomId(`simple:${type}`).setPlaceholder(`${type} için kanal/kategori seç`)
      .addOptions(chans.map(x=>({label:x.name.slice(0,100),value:x.id})));
     return i.update({content:`${type} ayarı: seçim yap.`,components:[new ActionRowBuilder().addComponents(m)]});
    }
    if(type==="autorole"){
     const roles=i.guild.roles.cache.filter(r=>!r.managed&&r.id!==i.guild.id).first(25);
     const m=new StringSelectMenuBuilder().setCustomId("autorole").setPlaceholder("Oto rol seç").addOptions(roles.map(r=>({label:r.name.slice(0,100),value:r.id})));
     return i.update({content:"Oto rolü seç.",components:[new ActionRowBuilder().addComponents(m)]});
    }
    if(type==="automod"){
     const m=new StringSelectMenuBuilder().setCustomId("automod").setPlaceholder("AutoMod seçenekleri").setMinValues(0).setMaxValues(4).addOptions(
      {label:"🔗 Link engelle",value:"links"},{label:"🌊 Spam/Flood",value:"spam"},{label:"📣 Mention koruması",value:"mentions"},{label:"🛡️ AutoMod'u kapat",value:"off"});
     return i.update({content:"AutoMod özelliklerini seç.",components:[new ActionRowBuilder().addComponents(m)]});
    }
   }
   if(i.customId==="ts_channel"){
    const c=cfg(i.guild.id);c.ticket.panelChannel=i.values[0];save();
    const cats=i.guild.channels.cache.filter(x=>x.type===ChannelType.GuildCategory).first(25);
    const m=new StringSelectMenuBuilder().setCustomId("ts_cat").setPlaceholder("2/4 • Ticket kategori").addOptions(cats.map(x=>({label:x.name.slice(0,100),value:x.id})));
    return i.update({content:"2/4 • Ticketların açılacağı kategoriyi seç.",components:[new ActionRowBuilder().addComponents(m)]});
   }
   if(i.customId==="ts_cat"){
    const c=cfg(i.guild.id);c.ticket.category=i.values[0];save();
    const roles=i.guild.roles.cache.filter(r=>!r.managed&&r.id!==i.guild.id).first(25);
    const m=new StringSelectMenuBuilder().setCustomId("ts_role").setPlaceholder("3/4 • Yetkili rolü").addOptions(roles.map(r=>({label:r.name.slice(0,100),value:r.id})));
    return i.update({content:"3/4 • Yetkili rolünü seç.",components:[new ActionRowBuilder().addComponents(m)]});
   }
   if(i.customId==="ts_role"){
    const c=cfg(i.guild.id);c.ticket.staffRole=i.values[0];save();
    const m=new StringSelectMenuBuilder().setCustomId("ts_count").setPlaceholder("4/4 • Kategori sayısı").addOptions([1,2,3,4,5].map(n=>({label:`${n} kategori`,value:String(n)})));
    return i.update({content:"4/4 • 1-5 kategori seç.",components:[new ActionRowBuilder().addComponents(m)]});
   }
   if(i.customId==="ts_count"){
    const n=Number(i.values[0]),modal=new ModalBuilder().setCustomId(`ticket_names:${n}`).setTitle("Ticket Kategorileri");
    for(let x=0;x<n;x++)modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`c${x}`).setLabel(`${x+1}. kategori`).setStyle(TextInputStyle.Short).setRequired(true)));
    return i.showModal(modal);
   }
   if(i.customId.startsWith("ticket_type")){
    const idx=Number(i.values[0]),c=cfg(i.guild.id),cat=c.ticket.categories[idx];
    const modal=new ModalBuilder().setCustomId(`ticket_reason:${idx}`).setTitle(`Ticket • ${cat.name}`)
     .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Neden").setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("Detay").setStyle(TextInputStyle.Paragraph).setRequired(true))
     );
    return i.showModal(modal);
   }
   if(i.customId.startsWith("simple:")){
    const type=i.customId.split(":")[1],c=cfg(i.guild.id),id=i.values[0];
    if(type==="logs")c.logs.channel=id,c.logs.enabled=true;
    if(type==="welcome")c.welcome.channel=id,c.welcome.enabled=true;
    if(type==="suggestion")c.suggestion.channel=id,c.suggestion.enabled=true;
    if(type==="voice")c.voice.category=id,c.voice.enabled=true;
    save();return i.update({content:`✅ ${type} ayarlandı.`,components:[]});
   }
   if(i.customId==="autorole"){const c=cfg(i.guild.id);c.autorole.role=i.values[0];c.autorole.enabled=true;save();return i.update({content:"✅ Oto rol ayarlandı.",components:[]});}
   if(i.customId==="automod"){const c=cfg(i.guild.id);c.automod.enabled=!i.values.includes("off");c.automod.links=i.values.includes("links");c.automod.spam=i.values.includes("spam");c.automod.mentions=i.values.includes("mentions");save();return i.update({content:`✅ AutoMod ${c.automod.enabled?"aktif":"kapalı"}.`,components:[]});}
  }

  if(i.isModalSubmit()){
   if(i.customId.startsWith("ticket_names:")){
    const n=Number(i.customId.split(":")[1]),c=cfg(i.guild.id);
    c.ticket.categories=Array.from({length:n},(_,x)=>({name:i.fields.getTextInputValue(`c${x}`)}));save();
    return i.reply({content:"✅ Ticket kurulumu tamamlandı. `/ticket gönder` kullan.",ephemeral:true});
   }
   if(i.customId.startsWith("ticket_reason:")){
    const c=cfg(i.guild.id),cat=c.ticket.categories[Number(i.customId.split(":")[1])],parent=i.guild.channels.cache.get(c.ticket.category);
    const name=`ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,70)||i.user.id}`;
    const ch=await i.guild.channels.create({name,type:ChannelType.GuildText,parent:parent?.type===ChannelType.GuildCategory?parent.id:undefined,
     permissionOverwrites:[
      {id:i.guild.roles.everyone.id,deny:["ViewChannel"]},
      {id:i.user.id,allow:["ViewChannel","SendMessages","ReadMessageHistory"]},
      {id:c.ticket.staffRole,allow:["ViewChannel","SendMessages","ReadMessageHistory","ManageMessages"]}
     ]});
    await ch.send({content:`${i.user} • <@&${c.ticket.staffRole}>`,embeds:[new EmbedBuilder().setTitle(`🎫 ${cat.name}`).addFields(
      {name:"Neden",value:i.fields.getTextInputValue("reason")},
      {name:"Detay",value:i.fields.getTextInputValue("details")}
    ).setColor(0x5865F2)],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_close").setLabel("🔒 Ticket Kapat").setStyle(ButtonStyle.Danger))]});
    return i.reply({content:`✅ Ticket oluşturuldu: ${ch}`,ephemeral:true});
   }
  }

  if(i.isButton()){
   if(i.customId==="ticket_close"){
    if(!isStaff(i.member))return i.reply({content:"❌ Sadece yetkili ekip kapatabilir.",ephemeral:true});
    await i.reply("🔒 Kapatılıyor...");setTimeout(()=>i.channel.delete().catch(()=>{}),1000);return;
   }
   if(i.customId==="drop"){
    await i.message.edit({components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("drop_taken").setLabel("🎁 Alındı").setStyle(ButtonStyle.Secondary).setDisabled(true))]});
    return i.reply(`🎉 ${i.user} dropu aldı!`);
   }
  }
 }catch(e){
  console.error(e);
  if(!i.replied&&!i.deferred)await i.reply({content:"Bir hata oluştu. Konsolu kontrol et.",ephemeral:true}).catch(()=>{});
 }
});

client.on("messageCreate",require("./events/messageCreate"));
client.on("guildMemberAdd",require("./events/memberAdd"));
client.on("guildMemberRemove",require("./events/memberRemove"));
client.on("messageDelete",require("./events/messageDelete"));
client.on("voiceStateUpdate",require("./events/voiceStateUpdate"));

client.once("ready",async()=>{
 console.log(`PrimeLegacy aktif: ${client.user.tag}`);
 try{await register();console.log("Slash komutları yüklendi.");}catch(e){console.error(e);}
});
client.login(process.env.DISCORD_TOKEN);
                                                                                  
