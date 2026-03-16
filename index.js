const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
console.clear()
const config = require('./config.json');

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.MessageContent,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.GuildMembers,

    GatewayIntentBits.GuildPresences,

    GatewayIntentBits.GuildMessageReactions,

    GatewayIntentBits.GuildMessageTyping,

    GatewayIntentBits.DirectMessages,

    GatewayIntentBits.DirectMessageReactions,

    GatewayIntentBits.DirectMessageTyping
  ],

  partials: [

    Partials.Message,

    Partials.Channel
  ]

});

module.exports = client;

client.slashCommands = new Collection();

const { token } = require("./config.json");

client.login(token);

const evento = require("./handler/Events");

evento.run(client);

require("./handler/index")(client);

process.on('unhandledRejection', (reason, promise) => {

  console.log(`🚫 Erro Detectado:\n\n` + reason, promise)

});

process.on('uncaughtException', (error, origin) => {

  console.log(`🚫 Erro Detectado:\n\n` + error, origin)

});


const axios = require("axios")
const url = 'https://discord.com/api/v10/applications/@me';


const data = {
  description: "**Conheça a Gratian.pro!\nhttps://gratian.pro**",
};

axios.patch(url, data, {
  headers: {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json'
  }
}).catch((error) => {
  console.error(`Erro ao atualizar aplicação: ${error}`);
});
