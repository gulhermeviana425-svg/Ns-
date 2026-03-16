const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`)
const { JsonDatabase, } = require(`wio.db`);
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const JSZip = require('jszip');
const fs = require("fs");
const axios = require("axios");
const zip = new JSZip();
const gpanel = require('../../Lib/gpanelClient');

// Função de delay usando Promise
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    name: `atualizartodos`,
    description: `[⚡] Atualize todas as aplicações de um produto`,
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: `aluguel`,
            description: `Veja todos os seus produtos registrados`,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
        {
            name: "arquivo",
            description: "Coloque o Arquivo que será atualizado",
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }
    ],
    async autocomplete(interaction) {
        const value = interaction.options.getFocused().toLowerCase();
        let choices = db.all().filter(pd => pd.data.nomeproduto)

        const filtered = choices.filter(choice => choice.data.nomeproduto.toLowerCase().includes(value)).slice(0, 25);

        if (!interaction) return;
        if (choices.length === 0) {
            await interaction.respond([
                { name: `Crie um BOT!`, value: `a29183912asd92384XASDASDSADASDSADASDASDASDASD12398212222` }
            ])
        } else if (filtered.length === 0) {
            await interaction.respond([
                { name: `Não Achei Nenhum BOT`, value: `a29183912asd92384XASDASDSADASDSADASDASD1239821` }
            ]);
        } else {
            await interaction.respond(
                filtered.map(choice => ({ name: choice.data.nomeproduto, value: choice.ID }))
            );
        }
    },
    run: async (client, interaction) => {

        if (!perms.get(`usersPerms`).includes(interaction.user.id)) {
            return interaction.reply({ content: "\`❌\` Você não tem permissão para usar este comando.", ephemeral: true })
        };

        const nomeproduto = interaction.options.getString("aluguel");
        const prod = await db.get(`${nomeproduto}`);

        if (!prod) return interaction.reply({ content: `\`❌\` Não encontrei nenhum produto com este nome.`, ephemeral: true });

        const arquivo = interaction.options.getAttachment("arquivo");

        if (!arquivo.name.includes(".zip")) return interaction.reply({ content: `\`❌\` Coloque arquivo o arquivo em \`.zip\`.`, ephemeral: true });

        const msg = await interaction.reply({ content: `\`🔁\` Atualizando todas as aplicações...` });

        const response = await axios.get(arquivo.url, { responseType: 'arraybuffer' });
        const arquivoBuffer = Buffer.from(response.data);

        const cavaleirocobranca = await db2.all().filter(a => a.data.produto === nomeproduto);
        let abc = 0;

        for (const cavareiro of cavaleirocobranca) {
            abc++;

            try {
                const appId = cavareiro.ID;
                
                console.log(`Atualizando app ${appId} (${abc}/${cavaleirocobranca.length})`);
                
                const res = await gpanel.appCommitZip(appId, arquivoBuffer);
                
                if (res && res.success) {
                    console.log(`App ${appId} atualizado com sucesso!`);
                } else {
                    console.log(`Erro ao atualizar app ${appId}:`, res);
                }
            } catch (err) {
                console.log(`Erro ao atualizar app ${cavareiro.ID}:`, err.message);
                // Se houver um erro de response, exibe os detalhes
                if (err.response) {
                    console.log('Status:', err.response.status);
                    console.log('Dados:', err.response.data);
                }
            }
            
            // Adicionar delay de 5 segundos entre cada atualização, exceto após a última
            if (abc < cavaleirocobranca.length) {
                console.log(`Aguardando 5 segundos antes da próxima atualização...`);
                await delay(5000);
            }
        };

        interaction.channel.send({ content: `\`✅\` ${interaction.user} Todas as aplicações foram atualizadas com sucesso!` });

    }
}


async function download(url, destination) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const zipFile = await JSZip.loadAsync(response.data);
    await fs.promises.writeFile(destination, await zipFile.generateAsync({ type: 'nodebuffer' }));
}
