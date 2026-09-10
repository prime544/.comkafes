const {PermissionFlagsBits} = require("discord.js");
const {cfg}=require("../utils/db");
const {log}=require("../utils/logger");

const links=/https?:\/\/|www\./i;
const badDefault=["discord.gg/","free nitro","nitro generator"];

module.exports=async message=>{
  if(!message.guild || message.author.bot) return;
  const c=cfg(message.guild.id);
  if(!c.automod.enabled || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  let reason=null;
  if(c.automod.links && links.test(message.content)) reason="Yasaklı bağlantı";
  if(c.automod.spam && message.content.length>0) {
    const now=Date.now();
    const key=`_spam_${message.author.id}`;
    const s=global.__plspam ||= {};
    s[key]=(s[key]||[]).filter(x=>now-x<6000);
    s[key].push(now);
    if(s[key].length>=6) reason="Spam/Flood";
  }
  if(c.automod.mentions && message.mentions.users.size>=6) reason="Aşırı mention";
  if(c.automod.words.concat(badDefault).some(w=>message.content.toLowerCase().includes(w.toLowerCase()))) reason="Yasaklı içerik";

  if(reason) {
    await message.delete().catch(()=>{});
    await message.channel.send({content:`🛡️ ${message.author}, mesajın AutoMod tarafından kaldırıldı. **${reason}**`})
      .then(m=>setTimeout(()=>m.delete().catch(()=>{}),5000)).catch(()=>{});
    await log(message.guild,"🛡️ AutoMod",`${message.author} mesajı kaldırıldı.`,[{name:"Sebep",value:reason}]);
  }
};
