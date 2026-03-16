const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("discord.js");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];

        if (customId.endsWith("_buy")) {

            const sistemaM = await db.get(`${id}.preco.mensal.onoff`);
            const sistemaT = await db.get(`${id}.preco.trimensal.onoff`);
            const sistemaA = await db.get(`${id}.preco.anual.onoff`);

            if (!logs.get("sistema")) {
                return interaction.reply({ content: `\`📡\` Ops... O sistema de aluguel está atualmente fora de serviço.`, ephemeral: true });
            };

            if (!api.get("sistemaMp") && !logs.get("semi.sistema")) {
                return interaction.reply({ content: `\`❌\` Todos os metodos de pagamento estão desativados.`, ephemeral: true });
            };

            if (!api.get("mp") && !logs.get("semi.tipo")) {
                return interaction.reply({ content: `\`❌\` Todos os metodos de pagamento estão mal configurados.`, ephemeral: true });
            };

            if (!sistemaM && !sistemaT && !sistemaA) {
                return interaction.reply({ content: `\`❌\` Todos os planos estão offline no momento.`, ephemeral: true });
            };

            interaction.reply({
                content: ``,
                embeds: [],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${id}_selectPlano`)
                                .setPlaceholder(`📅 Seleção de plano`)
                                .addOptions(
                                    {
                                        value: `mensalPlanBuy`,
                                        label: `Mensal`,
                                        description: `R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}`,
                                        emoji: `1302023888636739664`
                                    },
                                    {
                                        value: `trimenPlanBuy`,
                                        label: `Trimensal`,
                                        description: `R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}`,
                                        emoji: `1302023845254926407`
                                    },
                                    {
                                        value: `anualPlanBuy`,
                                        label: `Anual`,
                                        description: `R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}`,
                                        emoji: `1302023949827440662`
                                    }
                                )
                        )
                ],
                ephemeral: true
            });

        };

        if (customId.endsWith("_selectPlano")) {

            const option = interaction.values[0];

            if (option === "mensalPlanBuy") {

                const sistemaM = await db.get(`${id}.preco.mensal.onoff`);

                if (!sistemaM) {
                    return interaction.reply({ content: `\`📅\` O plano está atualmente desativado para alugueis.`, ephemeral: true });
                };

                const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

                if (exist) {
                    return interaction.update({ content: `\`⚠️\` Você já tem um canal aberto em ${exist.url}`, ephemeral: true });
                };

                if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
                    return interaction.update({ content: `\`⚠️\` Eu não consigo abrir um tópico!`, ephemeral: true });
                };

                const permission = [
                    {
                        id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
                        allow: ['VIEW_CHANNEL']
                    }
                ];

                await interaction.channel.threads.create({
                    name: `🛒・${interaction.user.username}`,
                    type: ChannelType.PrivateThread,
                    reason: 'Needed a separate thread for moderation',
                    autoArchiveDuration: 60,
                    permissionOverwrites: logs.get("roleAprove") ? permission : []
                }).then(async (thread) => {

                    interaction.update({
                        content: `\`✅\` Aluguel mensal criado com êxito.`,
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setURL(thread.url).setLabel(`Procurar aluguel`).setEmoji(`1302020493779402872`).setStyle(5)
                                )
                        ]
                    });

                    thread.send({
                        content: `${interaction.user}${logs.get("roleAprove") ? ` | ${interaction.guild.roles.cache.get(logs.get("roleAprove"))}` : ""}`,
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `${interaction.user.username} - Aluguel de Aplicação`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription(`-# \`💸\` Alugando o plano de aluguel de uma aplicação.`)
                                .addFields(
                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\``, inline: true },
                                    { name: `Plano`, value: `\`x1 | Mensal/30d\``, inline: true }
                                )
                                .setColor(`#00FFFF`)
                                .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                .setTimestamp()
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_prosseguir`).setLabel(`Prosseguir Compra`).setEmoji(`1246953283826745476`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Mensal_editEstoque`).setLabel(`Multiplicador`).setEmoji(`1302020565552599040`).setStyle(1),
                                    new ButtonBuilder().setCustomId(`${id}_Mensal_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Mensal",
                            dias: 30,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.mensal.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Mensal/30d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

            if (option === "trimenPlanBuy") {

                const sistemaT = await db.get(`${id}.preco.trimensal.onoff`);

                if (!sistemaT) {
                    return interaction.reply({ content: `\`📅\` O plano está atualmente desativado para alugueis.`, ephemeral: true });
                };

                const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

                if (exist) {
                    return interaction.update({ content: `\`⚠️\` Você já tem um canal aberto em ${exist.url}`, ephemeral: true });
                };

                if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
                    return interaction.update({ content: `\`⚠️\` Eu não consigo abrir um tópico!`, ephemeral: true });
                };

                const permission = [
                    {
                        id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
                        allow: ['VIEW_CHANNEL']
                    }
                ];

                await interaction.channel.threads.create({
                    name: `🛒・${interaction.user.username}`,
                    type: ChannelType.PrivateThread,
                    reason: 'Needed a separate thread for moderation',
                    autoArchiveDuration: 60,
                    permissionOverwrites: logs.get("roleAprove") ? permission : []
                }).then(async (thread) => {

                    interaction.update({
                        content: `\`✅\` Aluguel trimensal criado com êxito.`,
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setURL(thread.url).setLabel(`Procurar aluguel`).setEmoji(`1302020493779402872`).setStyle(5)
                                )
                        ]
                    });

                    thread.send({
                        content: `${interaction.user}${logs.get("roleAprove") ? ` | ${interaction.guild.roles.cache.get(logs.get("roleAprove"))}` : ""}`,
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `${interaction.user.username} - Aluguel de Aplicação`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription(`-# \`💸\` Alugando o plano de aluguel de uma aplicação.`)
                                .addFields(
                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\``, inline: true },
                                    { name: `Plano`, value: `\`x1 | Trimensal/90d\``, inline: true }
                                )
                                .setColor(`#00FFFF`)
                                .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                .setTimestamp()
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_prosseguir`).setLabel(`Prosseguir Compra`).setEmoji(`1246953283826745476`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Trimensal_editEstoque`).setLabel(`Multiplicador`).setEmoji(`1302020565552599040`).setStyle(1),
                                    new ButtonBuilder().setCustomId(`${id}_Trimensal_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Trimensal",
                            dias: 90,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.trimensal.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Trimensal/90d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

            if (option === "anualPlanBuy") {

                const sistemaA = await db.get(`${id}.preco.anual.onoff`);

                if (!sistemaA) {
                    return interaction.reply({ content: `\`📅\` O plano está atualmente desativado para alugueis.`, ephemeral: true });
                };

                const exist = interaction.channel.threads.cache.find(thread => thread.name === `🛒・${interaction.user.username}`);

                if (exist) {
                    return interaction.update({ content: `\`⚠️\` Você já tem um canal aberto em ${exist.url}`, components: [], ephemeral: true });
                };

                if (!interaction.message.channel.permissionsFor(client.user).has("CreatePrivateThreads")) {
                    return interaction.update({ content: `\`⚠️\` Eu não consigo abrir um tópico!`, ephemeral: true });
                };

                const permission = [
                    {
                        id: interaction.guild.roles.cache.find(role => role.id === logs.get("roleAprove")),
                        allow: ['VIEW_CHANNEL']
                    }
                ];

                await interaction.channel.threads.create({
                    name: `🛒・${interaction.user.username}`,
                    type: ChannelType.PrivateThread,
                    reason: 'Needed a separate thread for moderation',
                    autoArchiveDuration: 60,
                    permissionOverwrites: logs.get("roleAprove") ? permission : []
                }).then(async (thread) => {

                    interaction.update({
                        content: `\`✅\` Aluguel anual criado com êxito.`,
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setURL(thread.url).setLabel(`Procurar aluguel`).setEmoji(`1302020493779402872`).setStyle(5)
                                )
                        ]
                    });

                    thread.send({
                        content: `${interaction.user}${logs.get("roleAprove") ? ` | ${interaction.guild.roles.cache.get(logs.get("roleAprove"))}` : ""}`,
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `${interaction.user.username} - Aluguel de Aplicação`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription(`-# \`💸\` Alugando o plano de aluguel de uma aplicação.`)
                                .addFields(
                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\``, inline: true },
                                    { name: `Plano`, value: `\`x1 | Anual/365d\``, inline: true }
                                )
                                .setColor(`#00FFFF`)
                                .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                .setTimestamp()
                        ],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`${id}_prosseguir`).setLabel(`Prosseguir Compra`).setEmoji(`1246953283826745476`).setStyle(3),
                                    new ButtonBuilder().setCustomId(`${id}_Anual_editEstoque`).setLabel(`Multiplicador`).setEmoji(`1302020565552599040`).setStyle(1),
                                    new ButtonBuilder().setCustomId(`${id}_Anual_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                                )
                        ]
                    }).then(send => {
                        db1.set(thread.id, {
                            quantia: 1,
                            userid: interaction.user.id,
                            aluguel: id,
                            plano: "Anual",
                            dias: 365,
                            status: "proccess",
                            msg: {
                                id: send.id,
                                channel: interaction.channel.id,
                                guild: interaction.guild.id
                            }
                        });

                        if (logs.get("channel_logs")) {
                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                            channel.send({
                                content: ``,
                                embeds: [
                                    new EmbedBuilder()
                                        .setAuthor({ name: `${interaction.user.username} - Pendência Criada`, iconURL: interaction.user.displayAvatarURL() })
                                        .setDescription(`-# \`📋\` Pendência criada com êxito.`)
                                        .addFields(
                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.anual.preco`)).toFixed(2)}\``, inline: true },
                                            { name: `Plano`, value: `\`x1 | Anual/365d\``, inline: true },
                                            { name: `Canal/User`, value: `${thread.url} | ${interaction.user}` }
                                        )
                                        .setColor(`#00FF00`)
                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                        .setTimestamp()
                                ],
                                components: [
                                    new ActionRowBuilder()
                                        .addComponents(
                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                                        )
                                ]
                            }).catch(error => { });

                        };
                    }).catch(error => { });
                });

            };

        };

        if (customId.endsWith("_editEstoque")) {

            const plano = interaction.customId.split("_")[1];

            const modal = new ModalBuilder()
                .setCustomId(`${id}_${plano}_modalMultiplique`)
                .setTitle(`Multiplicador`)

            const option1 = new TextInputBuilder()
                .setCustomId(`mult`)
                .setLabel(`QUANTOS MULTIPLOS DESEJA SETAR?`)
                .setPlaceholder(`EX: 2`)
                .setMaxLength(4)
                .setStyle("Short")

            const optionx1 = new ActionRowBuilder().addComponents(option1);

            modal.addComponents(optionx1);
            await interaction.showModal(modal);

        };

        if (customId.endsWith("_modalMultiplique")) {
            const mult = interaction.fields.getTextInputValue("mult");

            const plano = interaction.customId.split("_")[1];

            if (!/^\d+$/.test(mult)) {
                return interaction.reply({ content: `\`❌\` Quantia inválida, tente novamente!`, ephemeral: true }).catch(error => { });
            };

            if (mult < 1) {
                return interaction.reply({ content: `\`❌\` A quantia mínima é de: **x1**!`, ephemeral: true }).catch(error => { });
            };

            const planDias = plano.toLowerCase() === "mensal" ? 30 : plano.toLowerCase() === "trimensal" ? 90 : 365;

            const dias = planDias * Number(mult);

            await db1.set(`${interaction.channel.id}.quantia`, Number(mult));
            await db1.set(`${interaction.channel.id}.dias`, dias);
            interaction.update({
                content: `${interaction.user}${logs.get("roleAprove") ? ` | ${interaction.guild.roles.cache.get(logs.get("roleAprove"))}` : ""}`,
                embeds: [
                    new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Aluguel de Aplicação`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`💸\` Alugando o plano de aluguel de uma aplicação.`)
                        .addFields(
                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                            { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${dias}d\``, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                ]
            });

        };

        if (customId.endsWith("_cancel")) {

            const plano = interaction.customId.split("_")[1];

            interaction.update({
                content: `\`✅\` Pronto! O seu carrinho de aluguel de aplicação será fechado <t:${Math.floor((Date.now() + 15000) / 1000)}:R>`,
                embeds: [],
                components: []
            });

            if (logs.get("channel_logs")) {
                const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                channel.send({
                    content: ``,
                    embeds: [
                        new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username} - Pendência Encerrada`, iconURL: interaction.user.displayAvatarURL() })
                            .setDescription(`-# \`❌\` Pendência cancelada com êxito.`)
                            .addFields(
                                { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                { name: `User`, value: `${interaction.user}` }
                            )
                            .setColor(`#FF0000`)
                            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                            .setTimestamp()
                    ],
                    components: [
                        new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder().setCustomId(`botN`).setLabel(`Mensagem do Sistema`).setStyle(2).setDisabled(true)
                            )
                    ]
                }).catch(error => { });

            };

            db1.delete(interaction.channel.id);

            setTimeout(() => {
                try {
                    interaction.channel.delete();
                } catch { };
            }, 15000);

        };

        if (customId.endsWith("_prosseguir")) {

            interaction.update({
                content: `Qual será a forma de pagamento?`,
                embeds: [],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`${id}_automaticPay`).setLabel(`Automático`).setEmoji(`1256808767325081683`).setStyle(1).setDisabled(!api.get("sistemaMp")),
                            new ButtonBuilder().setCustomId(`${id}_semiAutoPay`).setLabel(`Semi Auto`).setEmoji(`1302020615192187031`).setStyle(1).setDisabled(!logs.get("semi.sistema")),
                            new ButtonBuilder().setCustomId(`${id}_${db1.get(`${interaction.channel.id}.plano`)}_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                        )
                ]
            });

        };

    }
}