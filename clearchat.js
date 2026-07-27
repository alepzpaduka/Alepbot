/**
 * AlepzBot — Clear Chat Module
 * Owner: fiqq
 * Version: 2.0.0
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ===== CLEAR CHAT FUNCTION =====
async function clearChat(interaction) {
    const channel = interaction.channel;
    const amount = interaction.options.getInteger('amount') || 100;
    
    // Limit max 1000
    const finalAmount = Math.min(amount, 1000);
    
    await interaction.deferReply({ ephemeral: true });

    try {
        // Fetch messages
        const messages = await channel.messages.fetch({ limit: finalAmount });
        const messageCount = messages.size;
        
        if (messageCount === 0) {
            await interaction.editReply({ content: '📭 Tiada mesej untuk dipadam.' });
            return;
        }

        // Delete messages
        const deleted = await channel.bulkDelete(messages, true);
        
        const embed = new EmbedBuilder()
            .setTitle('🧹 Chat Dikosongkan')
            .setDescription(`✅ **${deleted.size}** mesej telah dipadamkan dari **${channel}**.`)
            .setColor(0x00ff00)
            .setFooter({ text: `Diminta oleh ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        
        // Log to console
        console.log(`[CLEAR] ${interaction.user.username} cleared ${deleted.size} messages in #${channel.name}`);

    } catch (error) {
        console.error('[CLEAR] Error:', error);
        
        let errorMsg = 'Gagal memadam mesej.';
        if (error.message.includes('Missing Permissions')) {
            errorMsg = '❌ Bot tiada permission **Manage Messages** atau **Administrator**.';
        } else if (error.message.includes('14 days')) {
            errorMsg = '❌ Mesej yang berusia lebih 14 hari tidak boleh dipadam secara pukal. Sila padam secara manual.';
        }
        
        await interaction.editReply({ content: errorMsg });
    }
}

// ===== BUILD SLASH COMMAND =====
function buildClearCommand() {
    return {
        name: 'clearchat',
        description: 'Padam mesej dalam channel ini',
        options: [
            {
                name: 'amount',
                description: 'Bilangan mesej untuk dipadam (max 1000)',
                type: 4, // INTEGER
                required: false,
                min_value: 1,
                max_value: 1000
            }
        ],
        default_member_permissions: '268435456' // Manage Messages
    };
}

module.exports = {
    clearChat,
    buildClearCommand
};
