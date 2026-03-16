const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, AttachmentBuilder } = require("discord.js");
const { db, db_testes, db_ja_testou, db2, auto, logs, db1 } = require("../../databases/index");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const JSZip = require('jszip');
const gpanel = require('../../Lib/gpanelClient');

module.exports = {
    name: "interactionCreate",
    run: async (interaction, client) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const { customId } = interaction;

        // 1. Botão "Iniciar Teste Gratuito"
        if (interaction.isButton() && customId.endsWith("_testefree")) {
            const botId = customId.split("_")[0];

            // Verifica se já testou
            if (db_ja_testou.has(interaction.user.id)) {
                return interaction.reply({
                    content: "`❌` Você já utilizou seu teste gratuito! Adquira um plano para continuar usando.",
                    ephemeral: true
                });
            }

            // Verifica se o bot existe no banco de dados de produtos
            if (!db.has(botId)) {
                return interaction.reply({
                    content: "`❌` Este bot não está mais disponível para teste.",
                    ephemeral: true
                });
            }

            // Abre o modal para configurar o bot de teste
            const modal = new ModalBuilder()
                .setCustomId(`${botId}_testefree_modal`)
                .setTitle(`Configurar Teste Gratuito`);

            const nomeInput = new TextInputBuilder()
                .setCustomId("nomeapp")
                .setLabel("Nome para a Aplicação")
                .setPlaceholder("Ex: BotTeste")
                .setStyle(1)
                .setRequired(true);

            const tokenInput = new TextInputBuilder()
                .setCustomId("tokenapp")
                .setLabel("Token do Bot")
                .setPlaceholder("Cole o token do seu bot aqui")
                .setStyle(1)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(tokenInput)
            );

            await interaction.showModal(modal);
        }

        // 2. Submissão do Modal de Teste
        if (interaction.isModalSubmit() && customId.endsWith("_testefree_modal")) {
            const botId = customId.split("_")[0];
            const nome = interaction.fields.getTextInputValue("nomeapp");
            const token = interaction.fields.getTextInputValue("tokenapp");
            const userId = interaction.user.id;

            // Verificação dupla se já testou
            if (db_ja_testou.has(userId)) {
                return interaction.reply({
                    content: "`❌` Você já utilizou seu teste gratuito!",
                    ephemeral: true
                });
            }

            await interaction.reply({ content: "`🔄` Preparando seu ambiente de teste... Aguarde.", ephemeral: true });

            // Verifica se o arquivo ZIP base existe
            const sourceZipPath = `source/${botId}.zip`;
            if (!fs.existsSync(sourceZipPath)) {
                return interaction.editReply({ content: `\`❌\` Erro: O arquivo base do bot não foi encontrado. Contate o suporte.` });
            }

            try {
                // Carrega o ZIP
                const zipData = fs.readFileSync(sourceZipPath);
                const zip = await JSZip.loadAsync(zipData);

                // Valida o Token
                const response = await axios.get("https://discord.com/api/v10/users/@me", {
                    headers: { Authorization: `Bot ${token}` }
                }).catch(() => null);

                if (!response || !response.data) {
                    return interaction.editReply({ content: "`❌` Token inválido! Verifique e tente novamente." });
                }

                // Configurações do Teste
                const tempoTesteHoras = 12; // 12 horas de teste
                const expirationDate = new Date(Date.now() + tempoTesteHoras * 60 * 60 * 1000);

                // Atualiza config.json no ZIP
                if (zip.file('config.json')) {
                    zip.file('config.json', JSON.stringify({
                        token: token,
                        owner: userId,
                        botid: response.data.id,
                        CLIENT_ID: response.data.id,
                        EXPIRATION: expirationDate,
                        "versao": "2.0",
                        "sistema": true,
                        "status": { "name": "Test Mode", "type": "playing" }
                    }, null, 2));
                }

                // Gera .env
                zip.file('.env', `TOKEN=${token}\nOWNER=${userId}\n`);

                // Package.json se necessário (simplificado do enviarbot.js)
                const mainJs = zip.files['index.js'] ? 'index.js' : (zip.files['main.js'] ? 'main.js' : null);
                if (!zip.files['package.json'] && mainJs) {
                     const cleanUsername = interaction.user.username.replace(/[^a-zA-Z0-9]/g, '');
                     zip.file('package.json', JSON.stringify({
                        name: `test-${cleanUsername.toLowerCase()}`,
                        version: '1.0.0',
                        main: mainJs,
                        scripts: { start: `node ${mainJs}` }
                    }, null, 2));
                }

                // Salva ZIP temporário
                const content = await zip.generateAsync({ type: 'nodebuffer' });
                const userZipPath = `source/client/test-${nome}-${userId}.zip`;
                
                await fs.promises.mkdir(path.dirname(userZipPath), { recursive: true });
                await fs.promises.writeFile(userZipPath, content);

                // Cria App no G-Panel
                const res = await gpanel.appCreate(
                    userZipPath,
                    `TESTE-${nome}`,
                    { image: 'node.js generic', memory: 512, disk: '512', cpu: 25 }
                );

                console.log("App Create Response:", JSON.stringify(res, null, 2));

                const appId = res?.data?.id || res?.dataId || res?.id || res?.data?.attributes?.id || res?.attributes?.id || res?.application?.id || res?.data?.appId;

                if (!appId) throw new Error(`Falha ao obter ID da aplicação criada. Resposta: ${JSON.stringify(res)}`);

                // Registra o teste
                db_ja_testou.set(userId, {
                    data: Date.now(),
                    appId: appId,
                    botId: botId
                });

                db_testes.set(appId, {
                    owner: userId,
                    start: Date.now(),
                    end: expirationDate.getTime(),
                    appId: appId
                });

                // Registra como app normal também para aparecer no gerenciamento (opcional, mas bom para o user ver)
                // Mas com expiração curta
                db2.set(`${appId}`, {
                    nome: `TESTE-${nome}`,
                    dias: 0.5, // 12h
                    plano: "Gratuito",
                    quantia: 1,
                    dataExpiracao: expirationDate,
                    idapp: appId,
                    token: token,
                    produto: botId,
                    owner: userId,
                    isTest: true
                });

                auto.push(`${userId}_owner.butecos`, {
                    nome: `TESTE-${nome}`,
                    dias: 0.5,
                    plano: "Gratuito",
                    quantia: 1,
                    dataExpiracao: expirationDate,
                    idapp: appId,
                    token: token,
                    produto: botId,
                    notify: false
                });

                // Inicia o App
                try { await gpanel.appStart(appId); } catch {}

                // Responde Sucesso
                await interaction.editReply({
                    content: `\`✅\` **Teste Iniciado com Sucesso!**\n\nSeu bot **${nome}** foi ativado por **12 horas**.\nID da Aplicação: \`${appId}\`\n\nUse o comando \`/painel\` para gerenciar seu bot.`
                });

                // Limpa arquivo temporário
                fs.unlink(userZipPath, () => {});

                // Log
                const logsChannelId = logs.get("channel_logs");
                if (logsChannelId) {
                    const logsChannel = client.channels.cache.get(logsChannelId);
                    if (logsChannel) {
                        logsChannel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle("🧪 Novo Teste Iniciado")
                                    .setDescription(`Usuário: ${interaction.user} (${userId})\nBot: ${botId}\nApp ID: ${appId}`)
                                    .setColor("Green")
                                    .setTimestamp()
                            ]
                        });
                    }
                }

            } catch (error) {
                console.error("Erro ao iniciar teste:", error);
                const errorDetail = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
                await interaction.editReply({ content: `\`❌\` Ocorreu um erro ao iniciar seu teste: ${errorDetail}` });
            }
        }
    }
};
