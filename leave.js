/**
 * AlepzBot — Leave System (Component V2)
 * Pemilik: fiqq
 * Versi: 3.0.0
 */

const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

// ============================================================
// CONFIG
// ============================================================
const LEAVE_LOG_CHANNEL_ID = cfg.LEAVE_LOG_CHANNEL_ID || cfg.TICKET_LOG_CHANNEL_ID || '1452681875029102624';
const PANEL_IMG = cfg.GUILD_ICON_URL || 'https://www.image2url.com/r2/default/gifs/1781644461860-b9ab6b79-4444-4495-9c2f-c43dbde8a3a4.gif';

// ============================================================
// BUILD LEAVE PANEL (Component V2)
// ============================================================
function buildLeavePanel(member, guild) {
    const avatarURL = member.user.displayAvatarURL({ size: 512, dynamic: true });
    const memberCount = guild.memberCount;
    
    // Tarikh join (jika ada)
    let joinDate = 'Tarikh tidak diketahui';
    if (member.joinedAt) {
        joinDate = member.joinedAt.toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // Kira tempoh dalam server
    let duration = 'Tidak diketahui';
    if (member.joinedAt) {
        const ms = Date.now() - member.joinedAt.getTime();
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) {
            duration = `${days} hari ${hours} jam`;
        } else {
            duration = `${hours} jam`;
        }
    }
    
    // Tarikh akaun dibuat
    const accountCreated = member.user.createdAt.toLocaleDateString('ms-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return {
        components: [
            {
                type: 17,
                components: [
                    // ── HEADER ──
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: [
                                    '# 👋 SELAMAT TINGGAL!',
                                    '',
                                    `**${member.user.tag}** telah meninggalkan **${guild.name}**.`,
                                    '',
                                    `👤 **Nama:** ${member.user.username}`,
                                    `🆔 **ID:** \`${member.user.id}\``,
                                    `📅 **Tarikh Sertai:** ${joinDate}`,
                                    `⏳ **Tempoh Dalam Server:** ${duration}`,
                                    `📆 **Akaun Dibuat:** ${accountCreated}`,
                                    `👥 **Jumlah Ahli Kini:** ${memberCount} ahli`,
                                    '',
                                    'Semoga berjaya di tempat lain! 🚀'
                                ].join('\n')
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: { url: avatarURL }
                        }
                    },
                    { type: 14, spacing: 2 },
                    
                    // ── BUTTONS ──
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                label: '📊 Lihat Statistik',
                                url: `https://discord.com/channels/${guild.id}/`
                            },
                            {
                                type: 2,
                                style: 5,
                                label: '📩 Hubungi Staff',
                                url: `https://discord.com/channels/${guild.id}/${cfg.TICKET_PANEL_CHANNEL_ID || '1434769506798010480'}`
                            }
                        ]
                    },
                    { type: 14, spacing: 1 },
                    
                    // ── FOOTER ──
                    {
                        type: 10,
                        content: `-# AlepzBot • Leave System • ${guild.name}`
                    }
                ]
            }
        ]
    };
}

// ============================================================
// BUILD LEAVE DM (Component V2)
// ============================================================
function buildLeaveDM(member, guild) {
    return {
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: [
                                    '# 👋 SELAMAT TINGGAL!',
                                    '',
                                    `**${member.user.username}**, kami sedih melihat anda pergi dari **${guild.name}**.`,
                                    '',
                                    'Terima kasih kerana menjadi sebahagian daripada komuniti kami.',
                                    '',
                                    '📌 **Jika anda ingin kembali:**',
                                    `• Gunakan pautan jemputan: [Klik di sini](${cfg.INVITE_LINK || 'https://discord.gg/yourlink'})`,
                                    '',
                                    'Semoga berjaya dan jumpa lagi! 🚀'
                                ].join('\n')
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: { url: PANEL_IMG }
                        }
                    },
                    { type: 14, spacing: 1 },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                label: '🔗 Join Semula',
                                url: cfg.INVITE_LINK || 'https://discord.gg/yourlink'
                            },
                            {
                                type: 2,
                                style: 5,
                                label: '📩 Hubungi Kami',
                                url: `https://discord.com/channels/${guild.id}/${cfg.TICKET_PANEL_CHANNEL_ID || '1434769506798010480'}`
                            }
                        ]
                    },
                    { type: 14, spacing: 1 },
                    {
                        type: 10,
                        content: `-# AlepzBot • Semoga berjaya!`
                    }
                ]
            }
        ]
    };
}

// ============================================================
// SEND LEAVE MESSAGE
// ============================================================
async function sendLeaveMessage(member) {
    const guild = member.guild;
    const channel = guild.channels.cache.get(LEAVE_LOG_CHANNEL_ID);
    
    if (!channel) {
        console.log('[LEAVE] Channel log tidak dijumpai.');
        return;
    }

    const payload = buildLeavePanel(member, guild);
    const dmPayload = buildLeaveDM(member, guild);

    // ── SEND TO CHANNEL ──
    await channel.send(payload);

    // ── SEND DM ──
    try {
        await member.send(dmPayload);
        console.log(`[LEAVE] DM dihantar ke ${member.user.tag}`);
    } catch (_) {
        console.log('[LEAVE] DM gagal dihantar ke', member.user.tag);
    }
}

// ============================================================
// TEST COMMAND
// ============================================================
async function testLeave(interaction) {
    const member = interaction.member;
    await sendLeaveMessage(member);
    await interaction.reply({
        content: '✅ **Selamat Tinggal** telah dihantar!',
        ephemeral: true
    });
}

// ============================================================
// BUTTON HANDLER
// ============================================================
async function handleLeaveButtons(interaction) {
    // Tiada button khas untuk leave, tapi boleh tambah jika perlu
    return false;
}

module.exports = {
    sendLeaveMessage,
    testLeave,
    handleLeaveButtons,
    buildLeavePanel,
    buildLeaveDM
};
