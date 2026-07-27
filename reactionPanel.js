/**
 * AlepzBot — Reaction Panel Module (Components V2)
 * Owner: fiqq
 * Version: 2.0.0
 */

const cfg = require('./config');

// ===== ALEPBOT ICON =====
const ALEPBOT_ICON = 'https://files.catbox.moe/sfh2tk.jpg';

// ===== REACTION ROLE DATA =====
const REACTION_ROLE = {
    emoji: '🎯',
    role_name: 'Member',
    role_id: '1483807325079867452'
};

// ===== BUILD REACTION PANEL PAYLOAD (COMPONENTS V2 - MACAM TICKET) =====
function buildReactionPanelPayload(role) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: `# DAPATKAN ROLE\n\nKlik butang di bawah untuk dapatkan role!\n\n**${role.emoji} - ${role.name}**\n\nKlik sekali`
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: {
                                url: ALEPBOT_ICON
                            }
                        }
                    },
                    { type: 14, spacing: 2 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 2,
                                label: role.name,
                                custom_id: `reaction_role_${role.id}`
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

// ===== SEND REACTION PANEL =====
async function sendReactionPanel(interaction) {
    const token = interaction.client.token;
    const channelId = interaction.channelId;
    const guild = interaction.guild;

    await interaction.deferReply({ ephemeral: true });

    const roleId = REACTION_ROLE.role_id;
    let role = guild.roles.cache.get(roleId);
    
    if (!role) {
        await interaction.editReply({ content: '❌ Role tidak dijumpai. Sila hubungi admin.' });
        return;
    }

    const payload = buildReactionPanelPayload(role);
    
    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 200 || res.status === 201) {
            await interaction.editReply({ content: '✅ Reaction panel telah dihantar!' });
        } else {
            const err = await res.text();
            await interaction.editReply({ content: `❌ Gagal: ${err}` });
        }
    } catch (error) {
        await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
}

// ===== BUTTON HANDLER =====
async function handleReactionButtons(interaction) {
    const id = interaction.customId;
    
    if (id.startsWith('reaction_role_')) {
        const roleId = id.replace('reaction_role_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            await interaction.reply({ content: '❌ Role tidak ditemukan.', ephemeral: true });
            return true;
        }
        
        const member = interaction.member;
        const hasRole = member.roles.cache.has(roleId);
        
        try {
            if (hasRole) {
                await member.roles.remove(role);
                await interaction.reply({ content: `✅ Role **${role.name}** telah dikeluarkan.`, ephemeral: true });
            } else {
                await member.roles.add(role);
                await interaction.reply({ content: `✅ Role **${role.name}** telah diberikan.`, ephemeral: true });
            }
        } catch (error) {
            await interaction.reply({ content: `❌ Gagal: ${error.message}`, ephemeral: true });
        }
        return true;
    }
    return false;
}

module.exports = {
    sendReactionPanel,
    handleReactionButtons,
    REACTION_ROLE,
    ALEPBOT_ICON
};
