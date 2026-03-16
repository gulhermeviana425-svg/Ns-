const { EmbedBuilder, ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { adminDb } = require("../../index");

module.exports = {
    name: `logins`,
    description: `[👑] Gerencia os logins administrativos do painel.`,
    type: ApplicationCommandType.ChatInput,
    run: async (client, interaction) => {
        // Verificar se o usuário é um administrador do bot
        // Usando o ID do dono do bot definido no config.json
        const config = require('../../config.json');
        
        if (interaction.user.id !== config.owner) {
            return interaction.reply({
                content: `❌ | Você não tem permissão para usar este comando. Apenas o proprietário do bot pode gerenciar administradores.`,
                ephemeral: true
            });
        }

        // Criar embed de gerenciamento de administradores
        const embed = new EmbedBuilder()
            .setTitle('🔐 Gerenciamento de Administradores')
            .setDescription('Gerencie os administradores que podem acessar o painel administrativo.\n\nEscolha uma opção abaixo:')
            .setColor('#2b2d31')
            .setFooter({ text: 'Painel de Administração', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        // Botões para adicionar ou remover administradores
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_admin')
                    .setLabel('Criar Administrador')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('remove_admin')
                    .setLabel('Remover Administrador')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️'),
                new ButtonBuilder()
                    .setCustomId('list_admins')
                    .setLabel('Listar Administradores')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
            );

        // Enviar mensagem com botões
        const message = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        // Coletor para interação com botões
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000 // 5 minutos
        });

        collector.on('collect', async (buttonInteraction) => {
            // Verificar se é o mesmo usuário
            if (buttonInteraction.user.id !== interaction.user.id) {
                return buttonInteraction.reply({
                    content: '❌ | Esta interação não é para você.',
                    ephemeral: true
                });
            }

            if (buttonInteraction.customId === 'create_admin') {
                // Criar modal para adicionar administrador
                const modal = new ModalBuilder()
                    .setCustomId('admin_create_modal')
                    .setTitle('Criar Novo Administrador');

                // Campos para username e senha
                const usernameInput = new TextInputBuilder()
                    .setCustomId('admin_username')
                    .setLabel('Nome de Usuário')
                    .setPlaceholder('Digite o nome de usuário do administrador')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                const passwordInput = new TextInputBuilder()
                    .setCustomId('admin_password')
                    .setLabel('Senha')
                    .setPlaceholder('Digite a senha do administrador')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                // Adicionar campos ao modal
                modal.addComponents(
                    new ActionRowBuilder().addComponents(usernameInput),
                    new ActionRowBuilder().addComponents(passwordInput)
                );

                // Mostrar o modal
                await buttonInteraction.showModal(modal);
            } else if (buttonInteraction.customId === 'remove_admin') {
                // Criar modal para remover administrador
                const modal = new ModalBuilder()
                    .setCustomId('admin_remove_modal')
                    .setTitle('Remover Administrador');

                // Campo para username
                const usernameInput = new TextInputBuilder()
                    .setCustomId('admin_username')
                    .setLabel('Nome de Usuário')
                    .setPlaceholder('Digite o nome de usuário do administrador a remover')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);

                // Adicionar campo ao modal
                modal.addComponents(
                    new ActionRowBuilder().addComponents(usernameInput)
                );

                // Mostrar o modal
                await buttonInteraction.showModal(modal);
            } else if (buttonInteraction.customId === 'list_admins') {
                // Listar administradores existentes
                const allAdmins = adminDb.all();
                
                if (Object.keys(allAdmins).length === 0) {
                    return buttonInteraction.reply({
                        content: '📋 | Não há administradores cadastrados.',
                        ephemeral: true
                    });
                }
                
                const adminList = Object.entries(allAdmins).map(([username, admin]) => {
                    const lastLogin = admin.lastLogin 
                        ? new Date(admin.lastLogin).toLocaleString('pt-BR') 
                        : 'Nunca';
                    
                    return `👤 **${username}**\n└ Último login: ${lastLogin}`;
                }).join('\n\n');
                
                const listEmbed = new EmbedBuilder()
                    .setTitle('📋 Lista de Administradores')
                    .setDescription(adminList)
                    .setColor('#2b2d31')
                    .setFooter({ text: 'Painel de Administração', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                return buttonInteraction.reply({
                    embeds: [listEmbed],
                    ephemeral: true
                });
            }
        });

        // Configurar ouvinte para o modal de criar administrador
        interaction.client.on('interactionCreate', async (modalInteraction) => {
            if (!modalInteraction.isModalSubmit()) return;
            
            if (modalInteraction.customId === 'admin_create_modal') {
                // Obter valores do modal
                const username = modalInteraction.fields.getTextInputValue('admin_username');
                const password = modalInteraction.fields.getTextInputValue('admin_password');
                
                // Verificar se é um dos administradores protegidos
                if (username === "Aham" || username === "Lz") {
                    return modalInteraction.reply({
                        content: `❌ | Não é possível modificar o administrador "${username}" pois é um administrador padrão do sistema.`,
                        ephemeral: true
                    });
                }
                
                // Verificar se o administrador já existe
                if (adminDb.get(username)) {
                    return modalInteraction.reply({
                        content: `❌ | Um administrador com o nome "${username}" já existe.`,
                        ephemeral: true
                    });
                }
                
                // Criar novo administrador
                adminDb.set(username, {
                    username,
                    password,
                    createdAt: new Date().toISOString(),
                    createdBy: modalInteraction.user.id
                });
                
                // Responder com sucesso
                return modalInteraction.reply({
                    content: `✅ | Administrador "${username}" criado com sucesso! Agora ele pode fazer login no painel administrativo.`,
                    ephemeral: true
                });
            } else if (modalInteraction.customId === 'admin_remove_modal') {
                // Obter username do modal
                const username = modalInteraction.fields.getTextInputValue('admin_username');
                
                // Verificar se é um dos administradores protegidos
                if (username === "Aham" || username === "Lz") {
                    return modalInteraction.reply({
                        content: `❌ | Não é possível remover o administrador "${username}" pois é um administrador padrão do sistema.`,
                        ephemeral: true
                    });
                }
                
                // Verificar se o administrador existe
                if (!adminDb.get(username)) {
                    return modalInteraction.reply({
                        content: `❌ | Não foi encontrado um administrador com o nome "${username}".`,
                        ephemeral: true
                    });
                }
                
                // Remover administrador
                adminDb.delete(username);
                
                // Responder com sucesso
                return modalInteraction.reply({
                    content: `✅ | Administrador "${username}" removido com sucesso!`,
                    ephemeral: true
                });
            }
        });
    }
}; 