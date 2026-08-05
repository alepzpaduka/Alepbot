/**
 * AlepzBot — Welcome System (Component V2)
 * Pemilik: fiqq
 * Versi: 3.0.0
 */

const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

// ── CONFIG ──
const WELCOME_CHANNEL_ID = cfg.WELCOME_CHANNEL_ID || '1434769506798010480';
const RULES_CHANNEL_ID = cfg.RULES_CHANNEL_ID || '1531047610625036509';
const TICKET_CHANNEL_ID = cfg.TICKET_PANEL_CHANNEL_ID || '1531043111009124352';
const PANEL_IMG = cfg.GUILD_ICON_URL || 'https://www.image2url.com/r2/default/gifs/1781644461860-b9ab6b79-4444-4495-9c2f-c43dbde8a3a4.gif';

// ── BUILD WELCOME PANEL (Component V2) ──
function buildWelcomePanel(member, guild, client) {
    const avatarURL = member.user.displayAvatarURL({ size: 512, dynamic: true });
    const memberCount = guild.memberCount;
    const joinDate = member.joinedAt ? member.joinedAt.toLocaleDateString('ms-MY', {
        day: 'numeric', month: 'long', year: 'numeric'
    }) : 'Tarikh tidak diketahui';
    const accountCreated = member.user.createdAt.toLocaleDateString('ms-MY', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

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
                                content:
                                    '# 🎉 SELAMAT DATANG!\n' +
                                    `**${member.user.tag}** telah menyertai **${guild.name}**!\n\n` +
                                    `👤 **Nama:** ${member}\n` +
                                    `🆔 **ID:** \`${member.user.id}\`\n` +
                                    `📅 **Tarikh Sertai:** ${joinDate}\n` +
                                    `📆 **Akaun Dibuat:** ${accountCreated}\n` +
                                    `📊 **Umur Akaun:** ${accountAge} hari\n` +
                                    `👥 **Jumlah Ahli:** ${memberCount} ahli`
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
                                label: '📋 Lihat Peraturan',
                                url: `https://discord.com/channels/${guild.id}/${RULES_CHANNEL_ID}`
                            },
                            {
                                type: 2,
                                style: 3,
                                label: '🎫 Buka Tiket',
                                custom_id: 'ticket_support'
                            },
                            {
                                type: 2,
                                style: 2,
                                label: '👋 Perkenalkan Diri',
                                custom_id: 'welcome_introduce'
                            }
                        ]
                    },

                    { type: 14, spacing: 1 },

                    // ── FOOTER ──
                    {
                        type: 10,
                        content: `-# AlepzBot • Selamat beraktiviti di ${guild.name}!`
                    }
                ]
            }
        ]
    };
}

// ── BUILD DM MESSAGE (Component V2) ──
function buildWelcomeDM(member, guild) {
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
                                content:
                                    `# 🎉 SELAMAT DATANG!\n` +
                                    `**${member.user.username}**, terima kasih kerana menyertai **${guild.name}**!\n\n` +
                                    `📌 **Pautan Penting:**\n` +
                                    `• 📋 Peraturan: <#${RULES_CHANNEL_ID}>\n` +
                                    `• 🎫 Sokongan: Buka tiket di <#${TICKET_CHANNEL_ID}>\n\n` +
                                    `Selamat beraktiviti! 🚀`
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
                                label: '📋 Baca Peraturan',
                                url: `https://discord.com/channels/${guild.id}/${RULES_CHANNEL_ID}`
                            },
                            {
                                type: 2,
                                style: 5,
                                label: '🎫 Buka Tiket',
                                url: `https://discord.com/channels/${guild.id}/${TICKET_CHANNEL_ID}`
                            }
                        ]
                    },
                    { type: 14, spacing: 1 },
                    {
                        type: 10,
                        content: `-# AlepzBot • Selamat datang!`
                    }
                ]
            }
        ]
    };
}

// ── SEND WELCOME ──
async function sendWelcomeMessage(member, client) {
    const guild = member.guild;
    const channel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) {
        console.log('[WELCOME] Channel welcome tidak dijumpai.');
        return;
    }

    const payload = buildWelcomePanel(member, guild, client);
    const dmPayload = buildWelcomeDM(member, guild);

    // ── SEND TO CHANNEL ──
    await channel.send({
        content: `👋 **Selamat datang ${member}!** Sila baca peraturan di <#${RULES_CHANNEL_ID}>.`,
        ...payload
    });

    // ── SEND DM ──
    try {
        await member.send(dmPayload);
    } catch (_) {
        console.log('[WELCOME] DM gagal dihantar ke', member.user.tag);
    }
}

// ── TEST COMMAND ──
async function testWelcome(interaction) {
    const member = interaction.member;
    await sendWelcomeMessage(member, interaction.client);
    await interaction.reply({
        content: '✅ **Selamat Datang** telah dihantar!',
        ephemeral: true
    });
}

// ── BUTTON HANDLER ──
async function handleWelcomeButtons(interaction) {
    const id = interaction.customId;

    if (id === 'welcome_introduce') {
        const modal = {
            custom_id: 'welcome_intro_modal',
            title: '👋 Perkenalkan Diri',
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'intro_name',
                            label: 'Nama / Panggilan',
                            style: 1,
                            placeholder: 'Contoh: Fiqqzr7',
                            required: true,
                            min_length: 2,
                            max_length: 50
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'intro_age',
                            label: 'Umur',
                            style: 1,
                            placeholder: 'Contoh: 20',
                            required: false,
                            min_length: 1,
                            max_length: 3
                        }
                    ]
                },
                {
                    type: 1,
                    components: [
                        {
                            type: 4,
                            custom_id: 'intro_about',
                            label: 'Perkenalan Ringkas',
                            style: 2,
                            placeholder: 'Cerita sikit tentang diri anda...',
                            required: false,
                            min_length: 5,
                            max_length: 500
                        }
                    ]
                }
            ]
        };

        await interaction.showModal(modal);
        return true;
    }

    return false;
}

// ── MODAL HANDLER ──
async function handleWelcomeModal(interaction) {
    if (interaction.customId !== 'welcome_intro_modal') return false;

    const name = interaction.fields.getTextInputValue('intro_name');
    const age = interaction.fields.getTextInputValue('intro_age') || 'Rahsia';
    const about = interaction.fields.getTextInputValue('intro_about') || 'Tiada perkenalan';

    const channel = interaction.guild.channels.cache.get('1434768946491887624');
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle('👋 Perkenalan Ahli Baru')
            .setDescription(`**${interaction.user.tag}** telah memperkenalkan diri!`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '📛 Nama', value: name, inline: true },
                { name: '📅 Umur', value: age, inline: true },
                { name: '📝 Tentang', value: about, inline: false }
            )
            .setColor(0x8b5cf6)
            .setFooter({ text: 'AlepzBot • Welcome System' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }

    await interaction.reply({
        content: `✅ **Terima kasih ${name}!** Perkenalan anda telah dihantar!`,
        ephemeral: true
    });

    return true;
}

module.exports = {
    sendWelcomeMessage,
    testWelcome,
    handleWelcomeButtons,
    handleWelcomeModal,
    buildWelcomePanel,
    buildWelcomeDM
};
