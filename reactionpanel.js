/**
 * AlepzBot — Reaction Panel Module (Components V2)
 * Owner: fiqq
 * Version: 2.0.0
 */

const cfg = require('./config');

// ===== ALEPBOT ICON =====
const ALEPBOT_ICON = 'https://www.image2url.com/r2/default/images/1779079676715-cb48ada2-85fe-4f0f-bba8-411ce270c94d.jpg';

// ===== REACTION ROLE DATA (SATU ROLE SAHAJA) =====
// ⚠️ TUKAR ROLE ID DI SINI ⚠️
const REACTION_ROLE = {
    emoji: '🎯',
    role_name: 'Member',
    role_id: '1483807325079867452'  // ← GANTI DENGAN ROLE ID KAU
};

// ===== GET OR CREATE ROLE (FALLBACK) =====
async function getOrCreateRole(guild) {
    const roleName = REACTION_ROLE.role_name;
    const roleId = REACTION_ROLE.role_id;
    
    // Cari role dari ID
    let role = guild.roles.cache.get(roleId);
    if (role) {
        console.log(`[REACTION] Found role: ${roleName} (${roleId})`);
        return role;
    }
    
    // Fallback: cari by name
    role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
        try {
            role = await guild.roles.create({
                name: roleName,
                mentionable: false,
                reason: 'Reaction role setup - AlepzBot'
            });
            console.log(`[REACTION] Created role: ${roleName} (${role.id})`);
        } catch (error) {
            console.error(`[REACTION] Failed to create role:`, error);
        }
    }
    return role;
}

// ===== BUILD REACTION PANEL PAYLOAD (COMPONENTS V2) =====
function buildReactionPanelPayload(role) {
    return {
        embeds: [{
            title: '🎮 DAPATKAN ROLE',
            description: [
                'Klik butang di bawah untuk mendapatkan role!',
                '',
                `**${role.emoji} - ${role.name}**`,
                '',
                '**Klik sekali = Dapat role**',
                '**Klik sekali lagi = Buang role**',
                '',
                'AlepzBot • Reaction Panel'
            ].join('\n'),
            color: 0x5865F2,
            thumbnail: { url: ALEPBOT_ICON },
            footer: { text: 'AlepzBot • Reaction Panel', icon_url: ALEPBOT_ICON }
        }],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 2,
                        label: role.name,
                        custom_id: `reaction_role_${role.id}`,
                        emoji: {
                            name: role.emoji
                        }
                    }
                ]
            }
        ]
    };
}

// ===== SEND V2 TO CHANNEL =====
async function sendV2ToChannel(token, channelId, payload) {
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
            return [true, await res.json(), null];
        }
        return [false, null, await res.text()];
    } catch (error) {
        return [false, null, error.message];
    }
}

// ===== SEND REACTION PANEL =====
async function sendReactionPanel(interaction) {
    const token = interaction.client.token;
    const channelId = interaction.channelId;
    const guild = interaction.guild;

    await interaction.deferReply({ ephemeral: true });

    const role = await getOrCreateRole(guild);
    if (!role) {
        await interaction.editReply({ content: '❌ Gagal mendapatkan role. Sila hubungi admin.' });
        return;
    }

    // Tambah emoji ke role object
    role.emoji = REACTION_ROLE.emoji;

    const payload = buildReactionPanelPayload(role);
    const [ok, , err] = await sendV2ToChannel(token, channelId, payload);

    if (ok) {
        await interaction.editReply({ content: '✅ Reaction panel telah dihantar!' });
    } else {
        await interaction.editReply({ content: `❌ Gagal menghantar panel: ${err}` });
    }
}

// ===== BUTTON HANDLER =====
async function handleReactionButtons(interaction) {
    const id = interaction.customId;
    
    if (id.startsWith('reaction_role_')) {
        const roleId = id.replace('reaction_role_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            await interaction.reply({ 
                content: '❌ Role tidak ditemukan.', 
                ephemeral: true 
            });
            return true;
        }
        
        const member = interaction.member;
        const hasRole = member.roles.cache.has(roleId);
        
        try {
            if (hasRole) {
                await member.roles.remove(role);
                await interaction.reply({ 
                    content: `✅ Role **${role.name}** telah dikeluarkan.`, 
                    ephemeral: true 
                });
            } else {
                await member.roles.add(role);
                await interaction.reply({ 
                    content: `✅ Role **${role.name}** telah diberikan.`, 
                    ephemeral: true 
                });
            }
        } catch (error) {
            await interaction.reply({ 
                content: `❌ Gagal mengubah role: ${error.message}`, 
                ephemeral: true 
            });
        }
        return true;
    }
    return false;
}

// ===== COMMAND BUILDER =====
function buildReactionCommand() {
    return {
        name: 'reactionpanel',
        description: '[ADMIN] Hantar panel reaction role',
        default_member_permissions: null,
        dm_permission: false
    };
}

module.exports = {
    ALEPBOT_ICON,
    REACTION_ROLE,
    getOrCreateRole,
    buildReactionPanelPayload,
    sendV2ToChannel,
    sendReactionPanel,
    handleReactionButtons,
    buildReactionCommand
};
