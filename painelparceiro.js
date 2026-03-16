const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logs, perms, db2, partners, partnersAuto } = require("../../databases/index");

// Helper function to get partners data
function getPartnersData() {
    try {
        const partnersData = partners.get('partners');
        return { partners: partnersData || [] };
    } catch (error) {
        console.error('Error reading partners data:', error);
        return { partners: [] };
    }
}

// Helper function to get auto partners data
function getPartnersAutoData() {
    try {
        const partnersAutoData = partnersAuto.get('partners');
        return { partners: partnersAutoData || [] };
    } catch (error) {
        console.error('Error reading auto partners data:', error);
        return { partners: [] };
    }
}

// Helper function to save partners data
function savePartnersData(data) {
    try {
        partners.set('partners', data.partners);
        console.log(`Saved ${data.partners.length} partners to partners database`);
        return true;
    } catch (error) {
        console.error('Error saving partners data:', error);
        return false;
    }
}

// Helper function to save auto partners data
function savePartnersAutoData(data) {
    try {
        partnersAuto.set('partners', data.partners);
        console.log(`Saved ${data.partners.length} partners to auto partners database`);
        return true;
    } catch (error) {
        console.error('Error saving auto partners data:', error);
        return false;
    }
}

// Verify partner status every 20 seconds
function startPartnerVerification(client) {
    setInterval(async () => {
        const partnersAutoData = getPartnersAutoData();
        const partnersData = getPartnersData();
        const updated = { partners: [] };
        
        for (const partner of partnersAutoData.partners) {
            try {
                const guild = await client.guilds.fetch(partner.serverId).catch(() => null);
                
                if (!guild) {
                    // Remove from partners.json and continue
                    partnersData.partners = partnersData.partners.filter(p => p.serverId !== partner.serverId);
                    continue;
                }
                
                // Check only for message existence
                let messageExists = false;
                try {
                    // Try to get the channel
                    const channel = await guild.channels.fetch(partner.channelId).catch(() => null);
                    
                    // If channel exists, check for message
                    if (channel) {
                        const message = await channel.messages.fetch(partner.messageId).catch(() => null);
                        if (message) {
                            messageExists = true;
                        }
                    }
                } catch (error) {
                    console.error(`Error checking message for partner ${partner.name}:`, error);
                }
                
                if (messageExists) {
                    // Everything is valid, keep this partner
                    updated.partners.push(partner);
                } else {
                    // Message doesn't exist, remove partnership
                    console.log(`Removing partnership with ${partner.name} (${partner.serverId}) - Message no longer exists`);
                    partnersData.partners = partnersData.partners.filter(p => p.serverId !== partner.serverId);
                    await guild.leave().catch((err) => {
                        console.error(`Error leaving guild ${partner.serverId}:`, err);
                    });
                }
            } catch (error) {
                console.error(`Error verifying partner ${partner.name}:`, error);
            }
        }
        
        // Save updated data
        savePartnersAutoData(updated);
        savePartnersData(partnersData);
    }, 20000); // 20 seconds
}

module.exports = {
    name: 'painelparceiro',
    description: '[👥] Painel de gerenciamento de parcerias',
    
    run: async (client, interaction) => {
        const embed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('Painel de Parcerias')
            .setDescription('Gerencie suas parcerias com a Cycle Apps')
            .setFooter({ text: 'Cycle Apps - Sistema de Parcerias', iconURL: client.user.displayAvatarURL() });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('solicitar_parceria')
                    .setLabel('Solicitar Parceria')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:emoji_106:1346610032162111609>'),
                new ButtonBuilder()
                    .setCustomId('duvidas_parceria')
                    .setLabel('Dúvidas')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:emoji_129:1346610080518377473>')
            );
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },
    
    // Handle button interactions
    async handleButtons(interaction) {
        const { customId } = interaction;
        
        if (customId === 'solicitar_parceria') {
            try {
                const embed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle('Solicitação de Parceria')
                    .setDescription('Para prosseguir com a parceria, o bot oficial da Cycle Apps deve estar no servidor que receberá a parceria. Caso o bot não esteja presente, a parceria será cancelada.')
                    .setFooter({ text: 'Cycle Apps - Sistema de Parcerias', iconURL: interaction.client.user.displayAvatarURL() });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('continuar_parceria')
                            .setLabel('Continuar Parceria')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('<:s_:1352375658449338418>'),
                        new ButtonBuilder()
                            .setLabel('Adicionar Bot')
                            .setStyle(ButtonStyle.Link)
                            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
                            .setEmoji('<:but:1346366641142759487>')
                    );
                
                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            } catch (error) {
                console.error('Erro ao processar botão solicitar_parceria:', error);
                await interaction.reply({ content: 'Ocorreu um erro ao processar esta interação. Por favor, tente novamente mais tarde.', ephemeral: true }).catch(e => {});
            }
        } 
        else if (customId === 'duvidas_parceria') {
            try {
                const embed = new EmbedBuilder()
                    .setColor('#2F3136')
                    .setTitle('Dúvidas sobre Parcerias')
                    .setDescription('Aqui estão algumas informações sobre nosso sistema de parcerias:')
                    .addFields(
                        { name: 'Como funciona?', value: 'Nosso sistema cria um canal de parceria no seu servidor e monitora se ele continua ativo.' },
                        { name: 'O que acontece se eu remover o canal?', value: 'Se o canal for removido, a parceria será automaticamente cancelada.' },
                        { name: 'Posso personalizar a mensagem de parceria?', value: 'Por enquanto, a mensagem de parceria é padronizada para todos os parceiros.' },
                        { name: 'Mais dúvidas?', value: 'Entre em contato com a nossa equipe no [servidor oficial](https://discord.gg/applications).' }
                    )
                    .setFooter({ text: 'Cycle Apps - Sistema de Parcerias', iconURL: interaction.client.user.displayAvatarURL() });
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Erro ao processar botão duvidas_parceria:', error);
                await interaction.reply({ content: 'Ocorreu um erro ao processar esta interação. Por favor, tente novamente mais tarde.', ephemeral: true }).catch(e => {});
            }
        }
        else if (customId === 'continuar_parceria') {
            try {
                // Create modal for partner information
                const modal = new ModalBuilder()
                    .setCustomId('parceria_modal')
                    .setTitle('Informações da Parceria');
                
                const serverNameInput = new TextInputBuilder()
                    .setCustomId('server_name')
                    .setLabel('Nome do Servidor')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Cycle Apps')
                    .setRequired(true);
                    
                const serverIconInput = new TextInputBuilder()
                    .setCustomId('server_icon')
                    .setLabel('Ícone do Servidor (URL do imgur)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: https://i.imgur.com/example.png')
                    .setRequired(true);
                    
                const serverInviteInput = new TextInputBuilder()
                    .setCustomId('server_invite')
                    .setLabel('Link de Convite do Servidor')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: https://discord.gg/applications')
                    .setRequired(true);
                    
                const serverIdInput = new TextInputBuilder()
                    .setCustomId('server_id')
                    .setLabel('ID do Servidor')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: 123456789012345678')
                    .setRequired(true);
                    
                const serverDescInput = new TextInputBuilder()
                    .setCustomId('server_desc')
                    .setLabel('Descrição do Servidor')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Descreva seu servidor em poucas palavras...')
                    .setRequired(true);
                    
                // Add inputs to modal
                modal.addComponents(
                    new ActionRowBuilder().addComponents(serverNameInput),
                    new ActionRowBuilder().addComponents(serverIconInput),
                    new ActionRowBuilder().addComponents(serverInviteInput),
                    new ActionRowBuilder().addComponents(serverIdInput),
                    new ActionRowBuilder().addComponents(serverDescInput)
                );
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Erro ao processar botão continuar_parceria:', error);
                await interaction.reply({ content: 'Ocorreu um erro ao processar esta interação. Por favor, tente novamente mais tarde.', ephemeral: true }).catch(e => {});
            }
        }
    },
    
    // Handle modal submissions
    async handleModals(interaction) {
        try {
            if (interaction.customId === 'parceria_modal') {
                await interaction.deferReply({ ephemeral: true });
                
                try {
                    // Get values from modal
                    const serverName = interaction.fields.getTextInputValue('server_name');
                    const serverIcon = interaction.fields.getTextInputValue('server_icon');
                    const serverInvite = interaction.fields.getTextInputValue('server_invite');
                    const serverId = interaction.fields.getTextInputValue('server_id');
                    const serverDesc = interaction.fields.getTextInputValue('server_desc');
                    
                    // Validate server ID
                    const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
                    if (!guild) {
                        return interaction.editReply({ content: 'ID do servidor inválido ou o bot não está presente no servidor informado.' });
                    }
                    
                    // Check if the bot is actually in the server
                    if (!guild.members.cache.get(interaction.client.user.id)) {
                        return interaction.editReply({ content: 'O bot não está presente no servidor informado. Por favor, adicione o bot primeiro.' });
                    }
                    
                    try {
                        // Create partners category and channel
                        let category = guild.channels.cache.find(c => c.name === 'Parceiros' && c.type === ChannelType.GuildCategory);
                        
                        if (!category) {
                            category = await guild.channels.create({
                                name: 'Parceiros',
                                type: ChannelType.GuildCategory,
                                permissionOverwrites: [
                                    {
                                        id: guild.id,
                                        allow: [PermissionFlagsBits.ViewChannel],
                                    }
                                ]
                            });
                        }
                        
                        const partnerChannel = await guild.channels.create({
                            name: 'cycle-apps',
                            type: ChannelType.GuildText,
                            parent: category.id,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    allow: [PermissionFlagsBits.ViewChannel],
                                    deny: [PermissionFlagsBits.SendMessages]
                                }
                            ]
                        });
                        
                        // Send partnership message
                        const message = await partnerChannel.send({
                            content: `# Cycle Apps
- **Cycle Apps, é um Servidor Exclusivo, Com bots de Alta Qualidade, e Total Suporte**
> - **Oferecemos**:
> - 1 - **EPro (Mais Vendido)**
> - 2 - **Vendas**
> - 3 - **Ticket**

- **Ta esperando Oque???**
> - **Vem pra Cycle!**

> ** https://discord.gg/applications **`
                        });
                        
                        // Verify message was sent
                        setTimeout(async () => {
                            try {
                                const messageCheck = await partnerChannel.messages.fetch(message.id).catch(() => null);
                                
                                if (messageCheck) {
                                    // Save partnership data
                                    const partnersAutoData = getPartnersAutoData();
                                    const newPartner = {
                                        serverId: serverId,
                                        channelId: partnerChannel.id,
                                        messageId: message.id,
                                        name: serverName,
                                        icon: serverIcon,
                                        description: serverDesc,
                                        inviteLink: serverInvite,
                                        addedAt: new Date().toISOString(),
                                        addedBy: interaction.user.id
                                    };
                                    partnersAutoData.partners.push(newPartner);
                                    savePartnersAutoData(partnersAutoData);
                                    
                                    // Add to partners.json
                                    const partnersData = getPartnersData();
                                    partnersData.partners.push({
                                        name: serverName,
                                        icon: serverIcon,
                                        description: serverDesc,
                                        inviteLink: serverInvite,
                                        addedAt: new Date().toISOString(),
                                        addedBy: interaction.user.id,
                                        serverId: serverId
                                    });
                                    savePartnersData(partnersData);
                                    
                                    console.log(`Parceria salva para servidor: ${serverName} (${serverId})`);
                                    
                                    // Send embed to parcerias channel
                                    const config = require('../../config.json');
                                    if (config.canalparcerias) {
                                        const parceriasChannel = await interaction.client.channels.fetch(config.canalparcerias).catch(() => null);
                                        if (parceriasChannel) {
                                            const embed = new EmbedBuilder()
                                                .setTitle(`Nova Parceria Realizada Com ${serverName}`)
                                                .setDescription(`Nova Parceria Com ${serverName} Realizada, Agora ${serverName} é Nosso Parceiro!`)
                                                .setThumbnail(serverIcon)
                                                .setColor('#2F3136')
                                                .setFooter({ text: 'Cycle Apps - Sistema de Parcerias', iconURL: interaction.client.user.displayAvatarURL() });
                                            
                                            const row = new ActionRowBuilder()
                                                .addComponents(
                                                    new ButtonBuilder()
                                                        .setLabel('Entrar no Servidor')
                                                        .setStyle(ButtonStyle.Link)
                                                        .setURL(serverInvite),
                                                    new ButtonBuilder()
                                                        .setLabel('Fechar Parceria Também')
                                                        .setStyle(ButtonStyle.Link)
                                                        .setURL(interaction.channel.url)
                                                );
                                            
                                            await parceriasChannel.send({ embeds: [embed], components: [row] });
                                        }
                                    }
                                    
                                    await interaction.editReply({ content: '✅ Parceria criada com sucesso! Um canal foi criado no seu servidor.' });
                                } else {
                                    await interaction.editReply({ content: '❌ Erro ao verificar a mensagem de parceria.' });
                                }
                            } catch (error) {
                                console.error('Error verifying partnership message:', error);
                                await interaction.editReply({ content: '❌ Ocorreu um erro ao verificar a parceria.' });
                            }
                        }, 5000);
                        
                    } catch (error) {
                        console.error('Error creating partnership:', error);
                        await interaction.editReply({ content: '❌ Ocorreu um erro ao criar a parceria. Verifique se o bot tem permissões adequadas no servidor.' });
                    }
                } catch (error) {
                    console.error('Erro ao processar modal de parceria:', error);
                    await interaction.editReply({ content: 'Ocorreu um erro ao processar o formulário. Por favor, tente novamente mais tarde.' }).catch(e => {});
                }
            }
        } catch (error) {
            console.error('Erro grave no handleModals:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Ocorreu um erro ao processar esta interação. Por favor, tente novamente mais tarde.', ephemeral: true }).catch(e => {});
            } else if (interaction.deferred) {
                await interaction.editReply({ content: 'Ocorreu um erro ao processar esta interação. Por favor, tente novamente mais tarde.' }).catch(e => {});
            }
        }
    },
    
    // Initialize partner verification on bot startup
    initialize(client) {
        startPartnerVerification(client);
    }
}; 