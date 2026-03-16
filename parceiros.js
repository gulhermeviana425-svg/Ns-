const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ApplicationCommandType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logs, perms, db2 } = require("../../databases/index");

// Path to the partners.json file
const partnersFilePath = path.join(__dirname, '../../databases/partners.json');

// Helper function to read partners data
function getPartnersData() {
    try {
        if (!fs.existsSync(partnersFilePath)) {
            fs.writeFileSync(partnersFilePath, JSON.stringify({ partners: [] }, null, 4));
            return { partners: [] };
        }
        const data = fs.readFileSync(partnersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading partners data:', error);
        return { partners: [] };
    }
}

// Helper function to save partners data
function savePartnersData(data) {
    try {
        fs.writeFileSync(partnersFilePath, JSON.stringify(data, null, 4));
        return true;
    } catch (error) {
        console.error('Error saving partners data:', error);
        return false;
    }
}

module.exports = {
    name: 'parceiros',
    description: '[🤝] Gerenciar parceiros da plataforma',
    type: ApplicationCommandType.ChatInput,
    
    run: async(client, interaction) => {
        if (!perms.get(`usersPerms`).includes(interaction.user.id)) {
            return interaction.reply({ content: "\`❌\` Você não tem permissão para usar este comando.", ephemeral: true })
        };
      
        const embed = new EmbedBuilder()
            .setTitle('Gestão de Parceiros')
            .setDescription('Adicione ou remova parceiros da plataforma.')
            .setColor("#FFFFFF")
            .setFooter({ text: 'Cycle Apps - Parceiros', iconURL: interaction.guild.iconURL() });
        
        const addButton = new ButtonBuilder()
            .setCustomId('add_partner')
            .setLabel('Adicionar Parceiro')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:mais:1347420001136541779>');
        
        const removeButton = new ButtonBuilder()
            .setCustomId('remove_partner')
            .setLabel('Remover Parceiro')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('<:menos:1347420107508547644>');
        
        const viewButton = new ButtonBuilder()
            .setCustomId('view_partners')
            .setLabel('Ver Parceiros')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('<:pessoas:1347419769468354582>');
        
        const row = new ActionRowBuilder()
            .addComponents(addButton, removeButton, viewButton);
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleButtons(interaction) {
        if (interaction.customId === 'add_partner') {
            const modal = new ModalBuilder()
                .setCustomId('add_partner_modal')
                .setTitle('Adicionar Parceiro');
            
            const nameInput = new TextInputBuilder()
                .setCustomId('partner_name')
                .setLabel('Nome do Servidor')
                .setPlaceholder('Digite o nome do servidor parceiro')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const iconInput = new TextInputBuilder()
                .setCustomId('partner_icon')
                .setLabel('URL do Ícone')
                .setPlaceholder('Digite a URL da imagem do servidor (png, jpg, etc)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const descriptionInput = new TextInputBuilder()
                .setCustomId('partner_description')
                .setLabel('Descrição')
                .setPlaceholder('Digite uma breve descrição do servidor parceiro')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            
            const inviteLinkInput = new TextInputBuilder()
                .setCustomId('partner_invite')
                .setLabel('Link de Convite')
                .setPlaceholder('Digite o link de convite para o servidor')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const firstRow = new ActionRowBuilder().addComponents(nameInput);
            const secondRow = new ActionRowBuilder().addComponents(iconInput);
            const thirdRow = new ActionRowBuilder().addComponents(descriptionInput);
            const fourthRow = new ActionRowBuilder().addComponents(inviteLinkInput);
            
            modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);
            
            await interaction.showModal(modal);
        } 
        else if (interaction.customId === 'remove_partner') {
            const modal = new ModalBuilder()
                .setCustomId('remove_partner_modal')
                .setTitle('Remover Parceiro');
            
            const nameInput = new TextInputBuilder()
                .setCustomId('partner_name')
                .setLabel('Nome do Servidor')
                .setPlaceholder('Digite o nome exato do servidor parceiro a ser removido')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const row = new ActionRowBuilder().addComponents(nameInput);
            
            modal.addComponents(row);
            
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'view_partners') {
            const data = getPartnersData();
            
            if (data.partners.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('Lista de Parceiros')
                    .setDescription('Não há parceiros registrados no momento.')
                    .setColor("#FFFFFF");
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }
            
            const embed = new EmbedBuilder()
                .setTitle('Lista de Parceiros')
                .setDescription(`Total: ${data.partners.length} parceiros`)
                .setColor("#FFFFFF")
                .setFooter({ text: 'Cycle Apps - Parceiros', iconURL: interaction.guild.iconURL() });
            
            data.partners.forEach((partner, index) => {
                embed.addFields({
                    name: `${index + 1}. ${partner.name}`,
                    value: partner.description.length > 100 
                        ? partner.description.substring(0, 97) + '...' 
                        : partner.description
                });
            });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async handleModals(interaction) {
        if (interaction.customId === 'add_partner_modal') {
            const name = interaction.fields.getTextInputValue('partner_name');
            const icon = interaction.fields.getTextInputValue('partner_icon');
            const description = interaction.fields.getTextInputValue('partner_description');
            const inviteLink = interaction.fields.getTextInputValue('partner_invite');
            
            // Validate icon URL
            try {
                new URL(icon);
            } catch (error) {
                await interaction.reply({ content: 'URL do ícone inválida. Por favor, forneça uma URL válida.', ephemeral: true });
                return;
            }
            
            // Validate invite link
            if (!inviteLink.includes('discord.gg/') && !inviteLink.includes('discord.com/invite/')) {
                await interaction.reply({ content: 'Link de convite inválido. Por favor, forneça um link de convite do Discord válido.', ephemeral: true });
                return;
            }
            
            const partnersData = getPartnersData();
            
            // Check if partner already exists
            if (partnersData.partners.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                await interaction.reply({ content: `Um parceiro com o nome "${name}" já existe.`, ephemeral: true });
                return;
            }
            
            partnersData.partners.push({
                name,
                icon,
                description,
                inviteLink,
                addedAt: new Date().toISOString(),
                addedBy: interaction.user.id
            });
            
            if (savePartnersData(partnersData)) {
                const embed = new EmbedBuilder()
                    .setTitle('Parceiro Adicionado')
                    .setDescription(`O servidor "${name}" foi adicionado com sucesso à lista de parceiros.`)
                    .setColor("#FFFFFF")
                    .setThumbnail(icon);
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ content: 'Ocorreu um erro ao salvar o parceiro. Tente novamente.', ephemeral: true });
            }
        }
        else if (interaction.customId === 'remove_partner_modal') {
            const name = interaction.fields.getTextInputValue('partner_name');
            
            const partnersData = getPartnersData();
            
            const partnerIndex = partnersData.partners.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
            
            if (partnerIndex === -1) {
                await interaction.reply({ content: `Não foi encontrado um parceiro com o nome "${name}".`, ephemeral: true });
                return;
            }
            
            const removedPartner = partnersData.partners[partnerIndex];
            
            partnersData.partners.splice(partnerIndex, 1);
            
            if (savePartnersData(partnersData)) {
                const embed = new EmbedBuilder()
                    .setTitle('Parceiro Removido')
                    .setDescription(`O servidor "${removedPartner.name}" foi removido com sucesso da lista de parceiros.`)
                    .setColor("#FFFFFF")
                    .setThumbnail(removedPartner.icon);
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ content: 'Ocorreu um erro ao remover o parceiro. Tente novamente.', ephemeral: true });
            }
        }
    }
}; 