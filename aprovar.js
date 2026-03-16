const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js")
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const fs = require("fs");
const { JsonDatabase } = require("wio.db");
const JSZip = require('jszip');
const mercadopago = require("mercadopago")
const axios = require("axios")
// G-PanelAPI
const chave = new JsonDatabase({ databasePath: "./config.json" })

module.exports = {
    name: "aprovar",
    description: "✅ Aprove alguma compra de aluguel.",
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {

        if (!perms.get(`usersPerms`).includes(interaction.user.id)) {
            return interaction.reply({ content: "\`❌\` Você não tem permissão para usar este comando.", ephemeral: true })
        };

        const asd = db1.get(`${interaction.channel.id}`);
        if (!asd) {
            return interaction.reply({ content: "\`❌\` Não achei este carrinho!", ephemeral: true });
        };

        await db1.set(`${interaction.channel.id}.status`, "aprovado");

        interaction.reply({
            content: "\`✅\` Carrinho aprovado com êxito.",
            ephemeral: true
        });

    }
}
