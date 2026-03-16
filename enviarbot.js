const mercadopago = require("mercadopago");
const axios = require("axios");
const gpanel = require('../../Lib/gpanelClient');
const Discord = require("discord.js");
const JSZip = require('jszip');
const path = require('path');
const fs = require("fs");
const { StringSelectMenuBuilder, EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonBuilder, ComponentType, ModalBuilder, TextInputBuilder } = require(`discord.js`);
const { api, db2, auto, db1, logs, perms, db } = require("../../databases/index");
const FormData = require("form-data");

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {

        if (interaction.isModalSubmit() && interaction.customId.endsWith("_uparbot_modal")) {
            // Inicia o processo de defer reply para dar mais tempo para o processamento
            await interaction.reply({ content: `\`🔁\` Verificando e logando informações...`, ephemeral: true });

            const Dias = interaction.customId.split("_")[0];
            const id = interaction.customId.split("_")[1];
            const nome = interaction.fields.getTextInputValue("nomeapp");
            const iddono = interaction.user.id;
            const tokenbot = interaction.fields.getTextInputValue("tokenapp");
            
            // Verifica se o arquivo ZIP de base existe
            const sourceZipPath = `source/${id}.zip`;
            if (!fs.existsSync(sourceZipPath)) {
                return interaction.editReply({ content: `\`❌\` Erro: O arquivo base do bot (\`${id}.zip\`) não foi encontrado.`, ephemeral: true });
            }
            let zip;
            try {
                zip = await JSZip.loadAsync(fs.readFileSync(sourceZipPath));
            } catch (e) {
                console.error("Falha ao carregar zip base:", e);
                return interaction.editReply({ content: `\`❌\` Erro ao ler o arquivo base (\`${id}.zip\`).`, ephemeral: true });
            }

            // Valida o token do bot e obtém informações
            const response = await axios.get("https://discord.com/api/v10/users/@me", {
                headers: {
                    Authorization: `Bot ${tokenbot}`
                }
            }).catch((err) => {
                console.error("Erro ao validar o token:", err);
                return null;
            });

            if (!response || !response.data) {
                return interaction.editReply({ content: `\`❌\` O token fornecido é inválido. Por favor, verifique e tente novamente.`, ephemeral: true });
            }

            // Atualiza o arquivo de configuração principal
            if (zip.file('config.json')) {
                zip.file('config.json', JSON.stringify({
                    token: tokenbot,
                    owner: iddono,
                    botid: response.data.id,
                    CLIENT_ID: response.data.id,
                    EXPIRATION: new Date(Date.now() + Dias * 24 * 60 * 60 * 1000),
                    "versao": "2.0",
                    "sistema": true,
                    "status": {
                        "name": "Ant Ethical",
                        "type": "streaming"
                    },
                    "server": ""
                }, null, 2)); // Adicionado null, 2 para identação (melhor leitura)
            }

            // Atualiza o arquivo de token secundário (se existir)
            if (zip.file('token.json')) {
                zip.file('token.json', JSON.stringify({
                    token: tokenbot
                }, null, 2));
            }

            // Gera arquivo .env para bots que usam dotenv
            zip.file('.env', `TOKEN=${tokenbot}\nOWNER=${iddono}\n`);

            // Prepara para o upload no G-Panel
            // Não é necessário arquivo de configuração específico.
            // Opcional: cria package.json básico se o projeto for Node e não houver
            const cleanUsername = interaction.user.username
                .replace(/[^a-zA-Z0-9_-]/g, '')
                .replace(/\s+/g, '')
                .substring(0, 32) || `User${interaction.user.id.slice(-4)}`;
            const mainJs = zip.files['index.js'] ? 'index.js' : (zip.files['main.js'] ? 'main.js' : null);
            if (!zip.files['package.json'] && mainJs) {
                const pkg = {
                    name: cleanUsername.toLowerCase(),
                    version: '1.0.0',
                    main: mainJs,
                    scripts: { start: `node ${mainJs}` }
                };
                zip.file('package.json', JSON.stringify(pkg, null, 2));
            }

            // Gera o novo arquivo .zip e salva temporariamente
            const content = await zip.generateAsync({ type: 'nodebuffer' });
            const userZipPath = `source/client/${nome}-${iddono}.zip`; // Nome de arquivo mais único
            await fs.promises.mkdir(path.dirname(userZipPath), { recursive: true });
            await fs.promises.writeFile(userZipPath, content);

            try {
                const res = await require('../../Lib/gpanelClient').appCreate(
                    userZipPath,
                    nome,
                    { image: 'node.js generic', memory: 512, disk: '1024', cpu: 50 }
                );

                const plano = await db1.get(`${interaction.channel.id}.plano`);
                const quantia = await db1.get(`${interaction.channel.id}.quantia`);

                const dataId = res?.data?.id || res?.dataId || res?.id;
                
                // Salva as informações no banco de dados
                auto.push(`${iddono}_owner.butecos`, {
                    nome,
                    dias: Number(Dias),
                    plano: plano,
                    quantia: quantia,
                    dataExpiracao: new Date(Date.now() + Dias * 24 * 60 * 60 * 1000),
                    idapp: dataId,
                    token: tokenbot,
                    produto: id,
                    notify: false
                });

                db2.set(`${dataId}`, {
                    nome,
                    dias: Number(Dias),
                    plano: plano,
                    quantia: quantia,
                    dataExpiracao: new Date(Date.now() + Dias * 24 * 60 * 60 * 1000),
                    idapp: dataId,
                    token: tokenbot,
                    produto: id,
                    owner: iddono
                });

                try { await gpanel.appStart(dataId); } catch (e) { try { await gpanel.appRestart(dataId); } catch {} }

                await interaction.editReply({
                    content: `\`✅\` Olá ${interaction.user}, o seu **${nome}** foi logado com sucesso!\n\`📅\` Tempo de aluguel: \`${Dias}d\`\n\`🆔\` ID da Aplicação: \`${dataId}\``,
                    ephemeral: true
                });

                // Envia o backup para o canal de logs
                const attachment = new Discord.AttachmentBuilder(userZipPath, { name: `${nome}-backup.zip` });
                const logscha = client.channels.cache.get(logs.get(`logs_backup`));
                if (logscha) {
                    await logscha.send({
                        embeds: [
                            new EmbedBuilder()
                            .setAuthor({ name: `${interaction.user.username} - Sistema de Backup`, iconURL: interaction.user.displayAvatarURL() })
                            .setDescription(`-# \`💾\` Backup do bot **${nome}** criado com sucesso.`)
                            .setColor(`#00FFFF`)
                            .addFields({ name: 'Dono', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` })
                            .setFooter({ text: `ID da Aplicação: ${dataId}`})
                            .setTimestamp()
                        ],
                        files: [attachment]
                    }).catch(console.error);
                }

                // Limpeza
                db1.delete(interaction.channel.id);
                setTimeout(() => {
                    try {
                        interaction.channel.delete();
                    } catch (e) {
                        console.error("Falha ao deletar o canal:", e);
                    };
                }, 10000); // Aumentado para 10s para dar tempo do usuário ler a mensagem

            } catch (error) {
                const status = error?.response?.status;
                const data = error?.response?.data;
                const detail = data ? JSON.stringify(data).slice(0, 1500) : String(error);
                console.error("Erro na criação de app:", detail);
                await interaction.editReply({ content: `\`❌\` Erro ao criar app: ${status || ''} ${detail}`, ephemeral: true });
            } finally {
                // Garante que o arquivo zip temporário seja deletado
                try {
                    if (fs.existsSync(userZipPath)) {
                        fs.unlink(userZipPath, (err) => {
                            if (err) console.error("Erro ao deletar arquivo zip de backup:", err);
                        });
                    }
                } catch (e) {
                    console.error("Erro ao verificar/deletar arquivo zip de backup:", e);
                }
            }
        }

        if (interaction.isButton() && interaction.customId.endsWith("_uparbot")) {
            const Dias = interaction.customId.split("_")[0];
            const id = interaction.customId.split("_")[1];
            const modal = new Discord.ModalBuilder()
                .setTitle(`Gerenciando Informações do App`)
                .setCustomId(`${Dias}_${id}_uparbot_modal`);

            const nome = new Discord.TextInputBuilder()
                .setCustomId("nomeapp")
                .setLabel("NOME PARA A APLICAÇÃO NO G-Panel")
                .setPlaceholder(`Ex: MeuBot-Vendas, Bot-Tickets, etc.`)
                .setStyle(1)
                .setRequired(true);

            const tokenbot = new Discord.TextInputBuilder()
                .setCustomId("tokenapp")
                .setLabel("TOKEN DO SEU BOT")
                .setPlaceholder(`Cole o token do seu bot obtido no Portal de Desenvolvedores`)
                .setStyle(2) // Mudado para Paragraph para melhor visualização de tokens longos
                .setRequired(true);

            modal.addComponents(new Discord.ActionRowBuilder().addComponents(nome));
            modal.addComponents(new Discord.ActionRowBuilder().addComponents(tokenbot));

            try {
                await interaction.showModal(modal);
            } catch (e) {
                console.error("Falha ao abrir modal:", e);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: `\`❌\` Não foi possível abrir o formulário. Tente novamente.`, ephemeral: true });
                }
            }
        }
    }
};
