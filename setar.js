const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder, ButtonStyle } = require("discord.js")
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const fs = require("fs")
const JSZip = require('jszip');

module.exports = {
    name: "setar",
    description: `[⭐] Setar um aluguel bot para a venda.`,
    type: ApplicationCommandType.ChatInput, 
    options: [
        {
            name: `alugueis`,
            description: `Veja todos os seus alugueis registrados`,
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
      ],
      async autocomplete(interaction) {
        const value = interaction.options.getFocused().toLowerCase();
        let choices = db.all().filter(pd => pd.data.nomeproduto)

        const filtered = choices.filter(choice => choice.data.nomeproduto.toLowerCase().includes(value)).slice(0, 25);

        if (!interaction) return;
        if (choices.length === 0) {
            await interaction.respond([
                { name: `Crie um BOT!`, value: `a29183912asd92384XASDASDSADASDSADASDASD12398212222` }
            ]);
        } else if (filtered.length === 0) {
            await interaction.respond([
                { name: `Não achei nenhum BOT`, value: `a29183912asd92384XASDASDSADASDSADASDASD1239821` }
            ]);
        } else {
            await interaction.respond(
                filtered.map(choice => ({ name: choice.data.nomeproduto, value: choice.data.nomeproduto }))
            );
        };
    },
    run: async (client, interaction) => {
        if (!(perms.get(`usersPerms`) || []).includes(interaction.user.id)) {
            return interaction.reply({ content: `\`❌\` Você não tem permissão para usar este comando.`, ephemeral: true })
        };

        const id = interaction.options.getString(`alugueis`);
        if (id === `a29183912asd92384XASDASDSADASDSADASDASD1239821`) {
            interaction.reply({
                content: `\`❌\` Bot aluguel não encontrado.`,
                ephemeral: true
            })
            return;
        };

        if (id === `a29183912asd92384XASDASDSADASDSADASDASD12398212222`) {
            interaction.reply({
                content: `\`❌\` Não existe nenhum bot aluguel ainda.`,
                ephemeral: true
            })
            return;
        };

        if (id !== db.get(`${id}.nomeproduto`)) {
            interaction.reply({
                content: `\`❌\` Bot aluguel não encontrado.`,
                ephemeral: true
            })
            return;
        };

        interaction.reply({ content: `✅ Bot aluguel enviado com êxito`, ephemeral: true })

        if (await db.get(`${id}.type`) === "embed") {

        const embed = new EmbedBuilder()
        .setDescription(`${db.get(`${id}.preco.embed.desc`)}`)
        .setTitle(`${db.get(`${id}.preco.embed.titulo`)}`)
        .setColor(`${db.get(`${id}.preco.embed.cor`)}`)
        .setFooter({ text: `${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

        if(db.get(`${id}.banner`) !== null) {
            embed.setImage(`${db.get(`${id}.banner`)}`)
        };
        
        const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId(`${id}_buy`)
            .setLabel("Alugar")
            .setEmoji("1302021432259117076")
            .setStyle(3)
        );

        if(db.get(`${id}.link`) !== "remover") {
            row.addComponents(
                new ButtonBuilder()
                .setStyle(5)
                .setURL(db.get(`${id}.link`))
                .setLabel("Tutorial/Preview")
                .setEmoji("1302020475760934973")
            )
        };

        interaction.channel.send({
            embeds:[embed],
            components:[row]
        });

    } else {

        const content1 = `${await db.get(`${id}.preco.content.content`)}`;

        const banner = await db.get(`${id}.banner`);

        const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId(`${id}_buy`)
            .setLabel("Alugar")
            .setEmoji("1302021432259117076")
            .setStyle(3)
        );

        if(db.get(`${id}.link`) !== "remover") {
            row.addComponents(
                new ButtonBuilder()
                .setStyle(5)
                .setURL(db.get(`${id}.link`))
                .setLabel("Tutorial/Preview")
                .setEmoji("1302020475760934973")
            )
        };

        if (!banner) {
            interaction.channel.send({
                content: content1,
                components:[row]
            });
        } else {
            interaction.channel.send({
                content: content1,
                components: [row],
                files: [banner]
            });
        };

    }
  }}
