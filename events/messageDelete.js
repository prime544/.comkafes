const {log}=require("../utils/logger");
module.exports=async message=>{
  if(!message.guild || message.author?.bot) return;
  await log(message.guild,"🗑️ Mesaj Silindi",`${message.author||"Bilinmeyen kullanıcı"} tarafından gönderilen bir mesaj silindi.`,
    [{name:"Kanal",value:`${message.channel}`},{name:"İçerik",value:(message.content||"İçerik yok").slice(0,1000)}]);
};
