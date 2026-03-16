const mercadopago = require("mercadopago");
const axios = require("axios");
const { JsonDatabase } = require("wio.db");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const schedule = require('node-schedule');
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const gpanel = require('../../Lib/gpanelClient');
const Discord = require("discord.js");
const pix = new JsonDatabase({ databasePath: "./config.json" });
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        if (customId === "selectGerenciamentDev") {

            const option = interaction.values[0];

            if (option === "ligarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("ligargrc_modal")
                    .setTitle("Ligar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "reiniciarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("reinicargrc_modal")
                    .setTitle("Reiniciar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "desligarBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("desligargrc_modal")
                    .setTitle("Desligar App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };


            if (option === "statusBotGrc") {

                const modal = new ModalBuilder()
                    .setCustomId("statusgrc_modal")
                    .setTitle("Status App");

                const text = new TextInputBuilder()
                    .setCustomId("text")
                    .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                    .setPlaceholder(`APP-ID AQUI`)
                    .setStyle(1)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(text));

                return interaction.showModal(modal);

            };

        };


        if (customId === "consoleBotGrc") {

            const modal = new ModalBuilder()
                .setCustomId("consolegrc_modal")
                .setTitle("Console App");

            const text = new TextInputBuilder()
                .setCustomId("text")
                .setLabel("QUAL O APP-ID DA APLICAÇÃO?")
                .setPlaceholder(`APP-ID AQUI`)
                .setStyle(1)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(text));

            return interaction.showModal(modal);

        };

        

        if (customId === "ligargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `\`🔄\` Enviando requisição...`,
                ephemeral: true
            });

            try {
                await gpanel.appStart(text);
                    await interaction.editReply({ content: `\`✅\` Requisição bem sucedida!` }).catch(error => { });
            } catch (error) {
                return await interaction.editReply({ content: `\`❌\` Ops... Erro na requisição!` }).catch(error => { });
            }

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Inicio o APP-ID: \`${text}\``
                })
            }
        }


        if (customId === "reinicargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `\`🔄\` Enviando requisição...`,
                ephemeral: true
            });

            try {
                await gpanel.appRestart(text);
                    await interaction.editReply({ content: `\`✅\` Requisição bem sucedida!` }).catch(error => { });
            } catch (error) {
                return await interaction.editReply({ content: `\`❌\` Ops... Erro na requisição!` }).catch(error => { });
            }

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Reinicio o APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "desligargrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `\`🔄\` Enviando requisição...`,
                ephemeral: true
            });

            try {
                await gpanel.appStop(text);
                    await interaction.editReply({ content: `\`✅\` Requisição bem sucedida!` }).catch(error => { });
            } catch (error) {
                return await interaction.editReply({ content: `\`❌\` Ops... Erro na requisição!` }).catch(error => { });
            }

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Parou o APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "statusgrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `\`🔄️\` Carregando...`,
                ephemeral: true
            });

            try {
                const res = await gpanel.appStatus(text);
                const asd = res?.data || {};
                    await interaction.editReply({
                        content: ``,
                        embeds: [
                            new EmbedBuilder()
                                .setColor(`#00FF00`)
                                .setTitle("Informações do APP")
                                .setDescription(`**Status:** ${asd.status} \n **CPU:** ${asd.metrics?.cpu ?? 'N/A'} \n **RAM:** ${asd.metrics?.ram ?? 'N/A'} \n **Armazenamento:** ${asd.metrics?.storage ?? 'N/A'} \n **Rede RX:** ${asd.metrics?.network?.rx ?? 'N/A'} \n **Rede TX:** ${asd.metrics?.network?.tx ?? 'N/A'} \n **Tempo de Atividade:** ${asd.metrics?.uptime ? `<t:${Math.floor(asd.metrics.uptime / 1000)}:f>` : '\`🔴 Indisponível\`'}`)
                        ]
                    });
            } catch (error) {
                return await interaction.editReply({ content: `\`❌\` Ops... Erro ao puxar status!` }).catch(error => { });
            }
            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Olhou o Status do APP-ID: \`${text}\``
                })
            }

        }

        if (customId === "consolegrc_modal") {
            const text = interaction.fields.getTextInputValue("text");
            await interaction.reply({
                content: `🔄️ Carregando...`,
                ephemeral: true
            });

            try {
                const res = await gpanel.appLogs(text);
                const asd = res?.data || '';
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription("```js\n" + asd + "```")
                                .setColor(`#2F3136`)
                        ],
                        ephemeral: true
                    });
            } catch (error) {
                return await interaction.editReply({ content: `\`❌\` Ops... Erro ao puxar console!` }).catch(error => { });
            }

            const chanel = interaction.guild.channels.cache.get(await logs.get(`channel_logs`))
            if (chanel) {
                chanel.send({
                    content: `O Usuario: ${interaction.user} - \`${interaction.user.id}\` Olhou o console do APP-ID: \`${text}\``
                })
            }
        }

    }
}
