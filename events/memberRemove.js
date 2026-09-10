const {EmbedBuilder}=require("discord.js");
const {cfg}=require("../utils/db");
const {log}=require("../utils/logger");

module.exports=async member=>{
  const c=cfg(member.guild.id);
  if(c.welcome.enabled && c.welcome.channel) {
    const ch=member.guild.channels.cache.get(c.welcome.channel);
    if(ch) await ch.send({embeds:[new EmbedBuilder().setTitle("📤 Üye Ayrıldı").setDescription(`**${member.user.tag}** sunucudan ayrıldı.`).setColor(0xED4245)]}).catch(()=>{});
  }
  await log(member.guild,"📤 Üye Ayrıldı",`${member.user.tag} sunucudan ayrıldı.`);
};
