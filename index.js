const fs = require("fs")

module.exports = async (client) => {

const SlashsArray = []

  fs.readdir(`./Comandos`, (error, folder) => {
  folder.forEach(subfolder => {
fs.readdir(`./Comandos/${subfolder}/`, (error, files) => { 
  files.forEach(files => {
      
  if(!files?.endsWith('.js')) return;
  files = require(`../Comandos/${subfolder}/${files}`);
  if(!files?.name) return;
  client.slashCommands.set(files?.name, files);
   
  SlashsArray.push(files)
  });
    });
  });
});
  client.on("ready", async () => {
    try { await client.application.commands.set([]); } catch {}
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.commands.set([]);
        await guild.commands.set(SlashsArray);
      } catch {}
    }
  });
};
