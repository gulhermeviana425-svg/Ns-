const mercadopago = require("mercadopago");
const axios = require("axios");
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const gpanel = require('../../Lib/gpanelClient');
const pix = new JsonDatabase({ databasePath: "./config.json" });
const Discord = require("discord.js");
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        let produto;
        let nome;
        let vencimento;
        const id = interaction.customId;
        if (interaction.isButton() && interaction.customId.endsWith("_outrasapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();
            interaction.reply({
                content: `Em qual parte dos itens diversos você deseja usar para gerenciar?`,
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`${ids}_alterarnomeapp`)
                                .setLabel(`Nome Aplicação`)
                                .setStyle(1)
                                .setEmoji(`1302019715727626260`),
                            new ButtonBuilder()
                                .setCustomId(`${ids}_alterartokenapp`)
                                .setLabel(`Token Aplicação`)
                                .setStyle(1)
                                .setEmoji(`1246953149009367173`),
                            new ButtonBuilder()
                                .setCustomId(`${ids}_transferirposseapp`)
                                .setLabel(`Doar Posse`)
                                .setStyle(1)
                                .setEmoji(`1302019361623769281`)
                        )
                ],
                ephemeral: true
            })
        };

        if (interaction.isButton() && interaction.customId.endsWith("_transferirposseapp")) {
            const ids = id.split("_")[0];
            const kk = await db2.get(`${ids}`);

            if (interaction.user.id !== kk.owner) return interaction.deferUpdate();

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_transferirposseapp_modal`)
                .setTitle(`${kk.nome} - Transferir Posse`);

            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual é o id do usuario?`)
                .setStyle(1)
                .setPlaceholder(`⚠️ Você irá perder o acesso completo.`)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text));

            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_transferirposseapp_modal")) {
            const ids = id.split("_")[0];

            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();

            const text = interaction.fields.getTextInputValue(`text`);
            const users = interaction.guild.members.cache.get(text);

            if (!users) {
                interaction.reply({
                    content: `\`⚠️\` Eu não achei este usuario, certifique que ele esteja nesse servidor!`,
                    ephemeral: true
                });
                return;
            };

            const userId = interaction.user.id;
            db2.set(`${ids}.owner`, text);

            interaction.update({
                embeds: [],
                components: [],
                content: `\`✅\` Posse doada com êxito!\n-# **Você perdeu o acesso total de seu bot!**`
            });

        };

        if (interaction.isButton() && interaction.customId.endsWith("_alterartokenapp")) {
            const ids = id.split("_")[0];

            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate();

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_alterartokenapp_modal`)
                .setTitle(`Alterar Token do Bot`);
            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Coloque Token Bot`)
                .setStyle(1)
                .setRequired(true)
                .setPlaceholder(`Coloque o Token Certo!`)

            modal.addComponents(new ActionRowBuilder().addComponents(text));
            await interaction.showModal(modal);

        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_alterartokenapp_modal")) {
            const ids = id.split("_")[0];

            const msgas = await interaction.reply({
                content: `\`🔄️\` Carregando...`,
                ephemeral: true
            });

            const token = interaction.fields.getTextInputValue(`text`);
            const data = JSON.stringify({ token: token, owner: interaction.user.id });

            const configPath = `source/client/${ids}.json`;
            const envPath = `source/client/.env`;

            const configExists = fs.existsSync(configPath);

            if (configExists) {
                fs.writeFile(configPath, data, async (err) => {
                    if (err) throw err;

                    try {
                    const res = await gpanel.appCommitSingleFile(ids, configPath, 'config.json');

                        fs.unlink(configPath, (err) => {
                            if (err) throw err;
                        });

                        try { await gpanel.appRestart(ids); } catch { try { await gpanel.appStart(ids); } catch {} }
                        msgas.edit(`\`✅\` Pronto!`);
                    } catch (err) {
                        msgas.edit(`\`❌\` Ocorreu um erro ao realizar o commit!`);
                        console.error(err);
                    };

                });

            } else {
                const envContent = `TOKEN=${token}\nOWNER=${interaction.user.id}\n`;
                fs.writeFileSync(envPath, envContent, { flag: 'w' });

                try {
                    const res = await gpanel.appCommitSingleFile(ids, envPath, '.env');

                    try { await gpanel.appRestart(ids); } catch { try { await gpanel.appStart(ids); } catch {} }
                    msgas.edit(`\`✅\` Pronto!`);
                } catch (err) {
                    msgas.edit(`\`❌\` Ocorreu um erro ao realizar o commit!`);
                    console.error(err);
                };

            };

        };

        if (interaction.isButton() && interaction.customId.endsWith("_alterarnomeapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()

            const modal = new ModalBuilder()
                .setCustomId(`${ids}_alterarnomeapp_modal`)
                .setTitle(`Alterar Nome da Aplicação`);

            const text = new TextInputBuilder()
                .setCustomId(`text`)
                .setLabel(`Qual será o novo nome?`)
                .setStyle(1)
                .setPlaceholder(`Coloque o nome que ira ser trocado!`)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text))
            await interaction.showModal(modal)
        };

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_alterarnomeapp_modal")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const text = interaction.fields.getTextInputValue(`text`);
            const msg1 = await interaction.reply({
                content: `🔄️ Carregando...`,
                ephemeral: true
            })

            const idToModify = ids;
            db2.set(`${idToModify}.nome`, `${text}`);

            editGPanel(ids);
        };

        if (interaction.isButton() && interaction.customId.endsWith("_ligarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `\`🔄️\` Carregando...`,
                embeds: [],
                components: []
            });

            try {
                await gpanel.appStart(ids);
                editGPanel(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `\`❌\` Ocorre um erro...`,
                    ephemeral: true
                })
            }
        }


        if (interaction.isButton() && interaction.customId.endsWith("_desligarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `\`🔄️\` Carregando...`,
                embeds: [],
                components: []
            });

            try {
                await gpanel.appStop(ids);
                editGPanel(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `\`❌\` Ocorre um erro...`,
                    ephemeral: true
                })
            }

        }


        if (interaction.isButton() && interaction.customId.endsWith("_reiniciarapp")) {
            const ids = id.split("_")[0];
            if (interaction.user.id !== await db2.get(`${ids}.owner`)) return interaction.deferUpdate()
            const msgs = await interaction.update({
                content: `\`🔄️\` Carregando...`,
                embeds: [],
                components: []
            });

            try {
                await gpanel.appRestart(ids);
                editGPanel(ids);
            } catch (err) {
                console.log(err)
                interaction.followUp({
                    content: `\`❌\` Ocorre um erro...`,
                    ephemeral: true
                })
            }
        }

        if (interaction.isStringSelectMenu() && interaction.customId === `appsconfig`) {
            const msgs = await interaction.update({
                content: `\`🔄️\` Carregando...`,
                embeds: [],
                components: []
            });
            const ids = interaction.values[0];
            editGPanel(ids);
        }

async function fetchGPanelStatus(appId) {
    try {
        const res = await gpanel.appStatus(appId);
        const data = res && res.success !== undefined ? res.data : res;
        if (!data) throw new Error('Resposta vazia ao buscar status');
        return data;
    } catch (error) {
        logApiError(error, appId, `/apps/${appId}/status`);
        throw error;
    }
}

async function fetchGPanelInfo(appId) {
    try {
        const res = await gpanel.appGet(appId);
        return res && res.success !== undefined ? res.data : res;
    } catch (error) {
        logApiError(error, appId, `/apps/${appId}`);
        return null;
    }
}

function logApiError(error, appId, endpoint) {
    try {
        const base = api.get('gpanelBase');
        const key = api.get('gpanel');
        const payload = {
            appId,
            endpoint,
            base,
            hasApiKey: Boolean(key),
            code: error && error.code,
            message: error && error.message,
            responseStatus: error && error.response && error.response.status,
            responseStatusText: error && error.response && error.response.statusText,
            responseData: error && error.response && error.response.data
        };
        console.error('Falha na API de status da aplicação (G-Panel):', payload);
    } catch (e) {
        console.error('Falha ao logar erro da API:', e);
    }
}

async function editGPanel(ids) {
    const auto = db2.get(ids);

    if (!auto) {
        console.error(`❌ Dados da aplicação não encontrados para ID: ${ids}`);
        return interaction.editReply({
            content: "❌ Erro: Dados da aplicação não encontrados.",
            embeds: [],
            components: []
        });
    }

    try {
        const statusData = await fetchGPanelStatus(ids);
        const infoData = await fetchGPanelInfo(ids);

        const statusRaw = String(statusData?.status || infoData?.status || '').toLowerCase();
        const isRunning = statusRaw === 'running' || statusRaw === 'online' || statusRaw === 'started' || statusData?.running === true || statusData?.online === true;

        const { produto, nome, dataExpiracao } = auto;
        const timestamp = Math.floor(new Date(dataExpiracao).getTime() / 1000);

        const tokenbot = db2.get(`${ids}.token`);

        // Busca de informações do bot
        let botInfo = { id: 'Unknown' };
        try {
            const response = await axios.get("https://discord.com/api/v10/users/@me", {
                headers: {
                    Authorization: `Bot ${tokenbot}`
                }
            });
            botInfo = response.data;
        } catch (botError) {
            console.error(`Erro ao buscar informações do bot: ${botError}`);
        }

        const uptimeMs = (statusData?.metrics?.uptime ?? statusData?.uptime ?? (infoData?.startedAt ? (Date.now() - new Date(infoData.startedAt).getTime()) : null));
        const uptimeText = typeof uptimeMs === 'number' && uptimeMs > 0
            ? `<t:${Math.floor((Date.now() - uptimeMs) / 1000)}:R>`
            : `\`🔴 Bot está desligado\``;
        const storageUsed = statusData?.metrics?.storage ?? null;
        const storageTotal = statusData?.metrics?.totalStorage ?? null;
        const storageText = storageTotal != null ? `${storageUsed ?? 'N/A'}/${storageTotal}` : `${storageUsed ?? 'N/A'}`;
        const ramUsed = statusData?.metrics?.ram ?? null;
        const ramTotal = statusData?.metrics?.totalRam ?? null;
        const ramText = ramTotal != null ? `${ramUsed ?? 'N/A'}/${ramTotal}` : `${ramUsed ?? 'N/A'}`;

        await interaction.editReply({
            content: "",
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: `${interaction.user.username} - Gerenciando ${nome}`, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        {
                            name: `Aplicação`,
                            value: `\`${db2.get(`${ids}.nome`)}\``,
                            inline: true
                        },
                        {
                            name: `Uptime`,
                            value: uptimeText,
                            inline: true
                        },
                        {
                            name: `Status`,
                            value: isRunning
                                ? `\`🟢 Online\``
                                : `\`🔴 ${statusRaw === 'stopped' ? 'offline' : (statusRaw || 'offline')}\``,
                            inline: true
                        },
                        {
                            name: `Recursos`,
                            value: `CPU: \`${statusData.metrics?.cpu ?? 'N/A'}\`\nRAM: \`${ramText}\`\nStorage: \`${storageText}\``,
                            inline: false
                        },
                        {
                            name: `Rede`,
                            value: `Total: \`${(statusData.metrics?.network?.rx ?? 0) + (statusData.metrics?.network?.tx ?? 0)}\`\nRX: \`${statusData.metrics?.network?.rx ?? 'N/A'}\`\nTX: \`${statusData.metrics?.network?.tx ?? 'N/A'}\``,
                            inline: false
                        },
                        {
                            name: `Aluguel Termina`,
                            value: `<t:${timestamp}:f> (<t:${timestamp}:R>)`,
                            inline: false
                        }
                    )
                    .setColor(`#00FFFF`)
                    .setFooter({ text: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder()
                    .addComponents(new StringSelectMenuBuilder()
                        .setCustomId(`appsconfig`)
                        .setPlaceholder(`📡 Seleção App`)
                        .addOptions([{
                            label: `${nome} - ${ids}`,
                            description: `${produto}`,
                            value: `${ids}`
                        }])
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${isRunning ? `${ids}_desligarapp` : `${ids}_ligarapp`}`)
                            .setLabel(`${isRunning ? `Desligar App` : `Ligar App`}`)
                            .setEmoji(`1302021031866929224`)
                            .setStyle(`${isRunning ? 4 : 3}`),
                        new ButtonBuilder()
                            .setCustomId(`${ids}_reiniciarapp`)
                            .setLabel(`Reiniciar Aplicação`)
                            .setStyle(1)
                            .setEmoji(`1297641351164203120`),
                        new ButtonBuilder()
                            .setCustomId(`${ids}_outrasapp`)
                            .setLabel(`Alterar diversos`)
                            .setStyle(1)
                            .setEmoji(`1302021603915337879`)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${produto}_${ids}_renovApp`)
                            .setLabel(`Renovar App`)
                            .setStyle(1)
                            .setEmoji(`1302019727471804416`)
                            .setDisabled(!api.get("mp")),
                        new ButtonBuilder()
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${botInfo.id}&permissions=8&scope=bot`)
                            .setLabel(`OAuth2 Aplicação`)
                            .setEmoji(`1302020207753302166`)
                            .setStyle(5)
                    )
            ]
        });

    } catch (apiError) {
        console.error(`Erro na API do G-Panel: ${apiError}`);
        
        const errorMessage = apiError.response 
            ? `Erro: ${apiError.response.status} - ${apiError.response.statusText}`
            : apiError.message || 'Erro desconhecido';

        await interaction.editReply({
            content: `❌ Erro ao acessar a aplicação: ${errorMessage}`,
            embeds: [],
            components: []
        });
    }
}
    }
}
