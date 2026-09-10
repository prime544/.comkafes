const {EmbedBuilder} = require("discord.js");
const {cfg} = require("./db");

async function log(guild, title, description, fields=[]) {
  const c=cfg(guild.id);
  if(!c.logs.enabled || !c.logs.channel) return;
  const ch=guild.channels.cache.get(c.logs.channel);
  if(!ch) return;
  await ch.send({embeds:[new EmbedBuilder().setTitle(title).setDescription(description).addFields(fields).setColor(0x5865F2).setTimestamp()] }).catch(()=>{});
}
module.exports={log};
