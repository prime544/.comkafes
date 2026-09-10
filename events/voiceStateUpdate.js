const {ChannelType}=require("discord.js");
const {cfg}=require("../utils/db");

module.exports=async(oldState,newState)=>{
  const c=cfg(newState.guild.id);
  if(!c.voice.enabled || !c.voice.category) return;
  if(newState.channelId) {
    const cat=newState.guild.channels.cache.get(c.voice.category);
    if(cat && newState.channelId===cat.id) {
      const ch=await newState.guild.channels.create({
        name:`🔊 ${newState.member.user.username}`,
        type:ChannelType.GuildVoice,
        parent:cat.id,
        permissionOverwrites:[{id:newState.member.id,allow:["ManageChannels","MoveMembers","Connect","Speak"]}]
      }).catch(()=>null);
      if(ch) await newState.setChannel(ch).catch(()=>{});
    }
  }
  if(oldState.channel?.parentId===c.voice.category && oldState.channel.members.size===0 && oldState.channel.name.startsWith("🔊 "))
    await oldState.channel.delete().catch(()=>{});
};
