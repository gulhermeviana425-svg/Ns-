const { ActivityType } = require("discord.js");
const { token } = require("../../config.json");
const colors = require("colors");
const axios = require("axios");

module.exports = {
    name: "ready",
    run: async (client) => {

        console.log(`${colors.green(`[Logs] - Estou online no bot ${client.user.displayName} | ${client.user.id}!`)}`);
        console.log(`${colors.green(`[Logs] - Servindo ${client.users.cache.size} users.`)}`);
        console.log(`${colors.green(`[Logs] - Estou em ${client.guilds.cache.size} servidores!`)}`);
        console.log(``)
        console.log(`${colors.blue(`[Gratian.pro] - Obrigado por usar o bot!`)}`)

        client.user.setPresence({
            activities: [{
                name: `Gratian.pro`,
                type: ActivityType.Streaming,
                url: "https://twitch.tv/discord"
            }]
        });
        client.user.setStatus("idle");

        setDesc();

        function setDesc() {
            axios.patch('https://discord.com/api/v10/applications/@me', {
                description: `**Conheça a Gratian.pro!\nhttps://gratian.pro**`
            },
                {
                    headers: {
                        Authorization: `Bot ${token}`,
                        'Content-Type': `application/json`
                    }
                }).catch(error => { });
        };
        
    }
};
