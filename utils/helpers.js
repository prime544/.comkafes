const {PermissionFlagsBits} = require("discord.js");
const {cfg} = require("./db");

function isStaff(member) {
  const c = cfg(member.guild.id);
  return member.permissions.has(PermissionFlagsBits.Administrator) ||
    (c.ticket.staffRole && member.roles.cache.has(c.ticket.staffRole));
}
function replaceVars(text, member) {
  return text.replaceAll("{user}", `${member}`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{count}", String(member.guild.memberCount));
}
module.exports = {isStaff, replaceVars};
