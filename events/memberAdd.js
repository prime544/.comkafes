const {EmbedBuilder}=require("discord.js");
const {cfg}=require("../utils/db");
const {replaceVars}=require("../utils/helpers");
const {log}=require("../utils/logger");

module.exports=async member=>{
  const c=cfg(member.guild.id);
  if(c.autorole.enabled && c.autorole.role) await member.roles.add(c.autorole.role).catch(()=>{});
  if(c.welcome.enabled && c.welcome.channel) {
    const ch=member.guild.channels.cache.get(c.welcome.channel);
    if(ch) await ch.send({embeds:[new EmbedBuilder().setTitle("👋 Hoş Geldin!").setDescription(replaceVars(c.welcome.message,member)).setThumbnail(member.user.displayAvatarURL()).setColor(0x57F287)]}).catch(()=>{});
  }
  await log(member.guild,"👋 Üye Katıldı",`${member} sunucuya katıldı.`);
};
