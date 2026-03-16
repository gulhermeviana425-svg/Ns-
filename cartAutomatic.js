const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js");
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const mercadopago = require("mercadopago");
const axios = require("axios");
const fs = require("fs");
let mp = api.get("mp");

module.exports = {
    name: `interactionCreate`,

    run: async (interaction, client) => {
        const { customId } = interaction;
        if (!customId) return;

        let id = interaction.customId.split("_")[0];

        if (customId === "copyCode") {

            const codigo = db1.get(`${interaction.channel.id}.copyCola`);

            interaction.reply({
                content: codigo,
                ephemeral: true
            });

        };

        if (customId.endsWith("_reembolAluguel")) {

            const axios = require('axios');
            await axios.post(`https://api.mercadopago.com/v1/payments/${id}/refunds`, {}, {
                headers: {
                    'Authorization': `Bearer ${mp}`
                }
            }).catch(error => { });

            interaction.update({
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`reembolsado`).setLabel(`Reembolsado`).setEmoji(`1246952363143729265`).setStyle(3).setDisabled(true)
                        )
                ]
            });

        };

        if (customId.endsWith("_automaticPay")) {

            const aluguel = await db1.get(`${interaction.channel.id}`);
            const plano = db1.get(`${interaction.channel.id}.plano`);

            const valor = parseFloat(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * aluguel.quantia).toFixed(2);

            if (!api.get("mp")) {
                return interaction.reply({ content: `\`❌\` A forma de pagamento não foi configurada ainda!`, ephemeral: true });
            };

            const timer = setTimeout(async () => {
                interaction.update({ content: `\`⏰\` Olá ${interaction.user}, o tempo para realizar o pagamento se esgotou, tente novamente abrindo outro carrinho.`, components: [] }).catch(error => { });

                if (logs.get("channel_logs")) {
                    const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));

                    channel.send({
                        content: ``,
                        embeds: [
                            new EmbedBuilder()
                                .setAuthor({ name: `${interaction.user.username} - Pendência Encerrada`, iconURL: interaction.user.displayAvatarURL() })
                                .setDescription(`-# \`⏰\` Pendência cancelada por inatividade.`)
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
            }, api.get("tempoPay") * 60 * 1000);

            const payment_data = {
                transaction_amount: Number(valor),
                description: `Cobrança - ${interaction.user.username}`,
                payment_method_id: "pix",
                payer: {
                    email: `${interaction.user?.id}@gmail.com`,
                }
            };

            mercadopago.configurations.setAccessToken(mp);
            await mercadopago.payment.create(payment_data)
                .then(async (paymentResponse) => {

                    const data = paymentResponse.body;
                    const qrCode = data.point_of_interaction.transaction_data.qr_code;
                    const { qrGenerator } = require('../../Lib/QRCodeLib')
                    const path = require('path');
                    const imagePath = path.join(__dirname, '../../Lib/aaaaa.png');
                    const qr = new qrGenerator({ imagePath: imagePath })
                    const qrcode = await qr.generate(qrCode)

                    let attachment = null;
                    if (qrcode.status === 'success' && typeof qrcode.response === 'string') {
                         const buffer = Buffer.from(qrcode.response, "base64");
                         attachment = new AttachmentBuilder(buffer, { name: "payment.png" });
                    } else {
                         console.error("Erro ao gerar QR Code:", qrcode.response);
                    }

                    let agora = new Date();
                    agora.setMinutes(agora.getMinutes() + Number(api.get("tempoPay")));
                    const time = Math.floor(agora.getTime() / 1000);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${interaction.user.username} - Pendência Aluguel Realizada`, iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`-# \`✅\` Pendência para realizar pagamento de plano realizada.\n-# \`❓\` Entrega automática após pagamento.\n\n**Código copia e cola:**\n\`\`\`${qrCode}\`\`\``)
                        .addFields(
                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: false },
                            { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                            { name: `Tempo Encerrar`, value: `<t:${time}:R>`, inline: true }
                        )
                        .setColor(`#00FFFF`)
                        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
                        .setTimestamp()

                    if (attachment) {
                        embed.setImage(`attachment://payment.png`)
                    }

                    interaction.update({
                        content: `<@${aluguel.userid}>`,
                        embeds: [embed],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder().setCustomId(`copyCode`).setLabel(`MobileService`).setEmoji(`1218967168960434187`).setStyle(1),
                                    new ButtonBuilder().setURL(data.point_of_interaction.transaction_data.ticket_url).setLabel(`Pagar por site`).setEmoji(`1302020475760934973`).setStyle(5),
                                    new ButtonBuilder().setCustomId(`${id}_${db1.get(`${interaction.channel.id}.plano`)}_cancel`).setEmoji(`1302020774709952572`).setStyle(2)
                                )
                        ],
                        files: attachment ? [attachment] : []
                    }).then(async (msg) => {

                        await db1.set(`${interaction.channel.id}.copyCola`, qrCode);

                        const checkPaymentStatus = setInterval(() => {

                            if (!interaction.channel) {
                                clearInterval(checkPaymentStatus);
                                return;
                            }
                            
                            axios.get(`https://api.mercadopago.com/v1/payments/${data?.id}`, {
                                headers: {
                                    'Authorization': `Bearer ${mp}`
                                }
                            }).then(async (doc) => {
                                

                                if (doc?.data.status === "approved") {

                                    const blockedBanks = api.get("banksOff");
                                    const longName = doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name.toLowerCase();
                                    const encontrado = blockedBanks.some(banco => longName.includes(banco.toLowerCase()));

                                    const plano = db1.get(`${interaction.channel.id}.plano`);

                                    if (encontrado) {
                                        clearInterval(checkPaymentStatus);

                                        await msg.edit({
                                            content: `${interaction.user} **Fechando carrinho por Anti Fraude...**`,
                                            embeds: [
                                                new EmbedBuilder()
                                                .setAuthor({ name: `${interaction.user.username} - Anti Fraude Detectada`, iconURL: interaction.user.displayAvatarURL() })
                                                .setDescription(`-# \`🔎\` Por questão de segurança a sua transferência com o banco \`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name}\` foi cancelada.\n-# \`❓\` Está em dúvida ou precisa de ajuda com algo? Contate o suporte!`)
                                                .addFields(
                                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                    { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                    { name: `User/Banco`, value: `<@${db1.get(`${interaction.channel.id}.userid`)}>/\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                )
                                                .setColor(`#FF0000`)
                                                .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                .setTimestamp()
                                            ],
                                            components: [],
                                            files: []
                                        }).catch(error => { });

                                        if (logs.get("channel_logs")) {
                                            const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));
                            
                                            channel.send({
                                                content: ``,
                                                embeds: [
                                                    new EmbedBuilder()
                                                        .setAuthor({ name: `${interaction.user.username} - Anti Fraude Detectada`, iconURL: interaction.user.displayAvatarURL() })
                                                        .setDescription(`-# \`❌\` Pendência cancelada por **Anti Fraude Detectada**.`)
                                                        .addFields(
                                                            { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                            { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                            { name: `User/Banco`, value: `<@${db1.get(`${interaction.channel.id}.userid`)}>/\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                        )
                                                        .setColor(`#FF0000`)
                                                        .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                        .setTimestamp()
                                                ],
                                                components: [
                                                    new ActionRowBuilder()
                                                        .addComponents(
                                                            new ButtonBuilder().setCustomId(`botN`).setLabel(`Notificação do Anti Fraude`).setStyle(2).setDisabled(true)
                                                        )
                                                ]
                                            }).catch(error => { });
                            
                                        };

                                        const axios = require('axios');
                                        await axios.post(`https://api.mercadopago.com/v1/payments/${data?.id}/refunds`, {}, {
                                            headers: {
                                                'Authorization': `Bearer ${mp}`
                                            }
                                        }).catch(error => { });

                                        db1.delete(interaction.channel.id);

                                        setTimeout(() => {
                                            try {
                                                interaction.channel.delete();
                                            } catch { };
                                        }, 15000);

                                        return;

                                    };

                                    await db1.set(`${interaction.channel.id}.status`, "aprovado");

                                } else { };

                                const aluguel = await db1.get(`${interaction.channel.id}`);

                                if (aluguel.status === "aprovado") {
                                    clearInterval(checkPaymentStatus);

                                    const plano = db1.get(`${interaction.channel.id}.plano`);

                                    const user = client.users.cache.get(`${aluguel.userid}`);
                                    const member = interaction.guild.members.cache.get(`${aluguel.userid}`);

                                    if (user) {

                                        const role = await interaction.guild.roles.cache.get(logs.get(`cargo_client`));

                                        if (role) {
                                            if (!member.roles.cache.has(role)) {
                                                member.roles.add(role?.id).catch(error => { });
                                            };
                                        };
                                        
                                    };

                                    await msg.edit({
                                        content: `${interaction.user}`,
                                        embeds: [
                                            new EmbedBuilder()
                                            .setAuthor({ name: `${interaction.user.username} - Aluguel Pago`, iconURL: interaction.user.displayAvatarURL() })
                                            .setDescription(`-# \`✅\` Aluguel plano \`${aluguel.plano}\` pago com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                            .addFields(
                                                { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                { name: `Banco`, value: `\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                            )
                                            .setColor(`#00FF00`)
                                            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                            .setTimestamp()
                                        ],
                                        components: [
                                            new ActionRowBuilder()
                                            .addComponents(
                                                new ButtonBuilder().setCustomId(`${aluguel.dias}_${id}_uparbot`).setLabel(`Logar Sistema`).setEmoji(`1302019443916017714`).setStyle(3),
                                                new ButtonBuilder().setURL(`https://discord.com/developers/applications`).setLabel(`Discord Dev`).setEmoji(`1302021603915337879`).setStyle(5)
                                            )
                                        ],
                                        files: []
                                    });

                                    if (logs.get("channel_logs")) {
                                        const channel = interaction.guild.channels.cache.get(logs.get("channel_logs"));
                        
                                        channel.send({
                                            content: ``,
                                            embeds: [
                                                new EmbedBuilder()
                                                .setAuthor({ name: `${interaction.user.username} - Aluguel Pago`, iconURL: interaction.user.displayAvatarURL() })
                                                .setDescription(`-# \`✅\` Aluguel plano \`${aluguel.plano}\` pago com êxito!\n-# \`🔎\` Veja algumas informações abaixo:`)
                                                .addFields(
                                                    { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                    { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true },
                                                    { name: `Banco`, value: `\`${doc.data.point_of_interaction.transaction_data.bank_info.payer.long_name || "\`🔴 Não encontrado.\`"}\`` }
                                                )
                                                .setColor(`#00FF00`)
                                                .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                .setTimestamp()
                                            ],
                                            components: [
                                                new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setCustomId(`${doc.data.id}_reembolAluguel`).setLabel(`Realizar Reembolso`).setEmoji(`1246953228655132772`).setStyle(2).setDisabled(doc?.data.status !== "approved")
                                                    )
                                            ]
                                        }).catch(error => { });
                        
                                    };

                                    if (logs.get("vendas")) {
                                        const channel = interaction.guild.channels.cache.get(logs.get("vendas"));
            
                                        channel.send({
                                            content: ``,
                                            embeds: [
                                                new EmbedBuilder()
                                                    .setAuthor({ name: `${interaction.user.username} - Pedido Entregue`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setDescription(`Um pedido foi realizado e entregue com êxito.`)
                                                    .addFields(
                                                        { name: `Aluguel`, value: `\`${id} | R$${Number(db.get(`${id}.preco.${plano.toLowerCase()}.preco`) * Number(db1.get(`${interaction.channel.id}.quantia`))).toFixed(2)}\``, inline: true },
                                                        { name: `Plano`, value: `\`x${Number(db1.get(`${interaction.channel.id}.quantia`))} | ${plano}/${Number(db1.get(`${interaction.channel.id}.dias`))}d\``, inline: true }
                                                    )
                                                    .setColor(`#00FF00`)
                                                    .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                                                    .setTimestamp()
                                            ],
                                            components: [
                                                new ActionRowBuilder()
                                                    .addComponents(
                                                        new ButtonBuilder().setURL(`https://discord.com/channels/${db1.get(`${interaction.channel.id}.msg.guild`)}/${db1.get(`${interaction.channel.id}.msg.channel`)}/${db1.get(`${interaction.channel.id}.msg.id`)}`).setLabel(`Alugar também`).setEmoji(`1302020274681675896`).setStyle(5)
                                                    )
                                            ]
                                        }).catch(error => { });
            
                                    };

                                    clearTimeout(timer);

                                } else { };

                            });
                        }, 2000);

                    });

                });

        };

    }
}