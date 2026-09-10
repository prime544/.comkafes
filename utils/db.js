const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "data", "guilds.json");

function load() {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return {}; }
}
let db = load();

function save() {
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}
function cfg(id) {
  if (!db[id]) db[id] = {
    ticket:{panelChannel:null, category:null, staffRole:null, categories:[]},
    logs:{channel:null, enabled:true},
    welcome:{channel:null, enabled:false, message:"Hoş geldin {user}! {server} sunucusuna katıldın."},
    automod:{enabled:false, links:false, spam:false, mentions:false, words:[]},
    suggestion:{channel:null, enabled:false},
    voice:{category:null, enabled:false},
    invites:{enabled:false, channel:null},
    autorole:{role:null, enabled:false}
  };
  return db[id];
}
module.exports = {db, cfg, save};
