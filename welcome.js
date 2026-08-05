/**
 * AlepzBot — Welcome System (Component V2)
 * Pemilik: fiqq
 * Versi: 3.0.0
 */

const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

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

    // ── BUILD EMBED ──
    const embed = new EmbedBuilder()
        .setTitle('🎉 SELAMAT DATANG!')
        .setDescription(`**${member.user.tag}** telah menyertai **${guild.name}**!`)
        .setColor(cfg.FIQQZR_PURPLE || 0x8b5cf6)
        .setThumbnail(avatarURL)
        .addFields(
            { name: '👤 Nama', value: `${member}`, inline: true },
            { name: '🆔 ID', value: `\`${member.user.id}\``, inline: true },
            { name: '📅 Tarikh Sertai', value: joinDate, inline: true },
            { name: '📆 Akaun Dibuat', value: accountCreated, inline: true },
            { name: '📊 Umur Akaun', value: `${accountAge} hari`, inline: true },
            { name: '👥 Jumlah Ahli', value: `${memberCount} ahli`, inline: true }
        )
        .setFooter({ text: `AlepzBot • Welcome System • ${guild.name}` })
        .setTimestamp();

    // ── COMPONENTS (type: 1 SAHAJA) ──
    return {
        embeds: [embed],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 5,
                        label: '📋 Lihat Peraturan',
                        url: `https://discord.com/channels/${guild.id}/${cfg.RULES_CHANNEL_ID}`
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
            }
        ]
    };
}

// ── BUILD DM MESSAGE (Component V2) ──
function buildWelcomeDM(member, guild) {
    const embed = new EmbedBuilder()
        .setTitle('🎉 SELAMAT DATANG!')
        .setDescription(
            `**${member.user.username}**, terima kasih kerana menyertai **${guild.name}**!\n\n` +
            `📌 **Pautan Penting:**\n` +
            `• 📋 Peraturan: <#${cfg.RULES_CHANNEL_ID}>\n` +
            `• 🎫 Sokongan: Buka tiket di <#${cfg.TICKET_PANEL_CHANNEL_ID}>\n\n` +
            `Selamat beraktiviti! 🚀`
        )
        .setColor(cfg.FIQQZR_PURPLE || 0x8b5cf6)
        .setThumbnail(cfg.GUILD_ICON_URL || 'https://www.image2url.com/r2/default/gifs/1781644461860-b9ab6b79-4444-4495-9c2f-c43dbde8a3a4.gif')
        .setFooter({ text: 'AlepzBot • Welcome System' })
        .setTimestamp();

    return {
        embeds: [embed],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 5,
                        label: '📋 Baca Peraturan',
                        url: `https://discord.com/channels/${guild.id}/${cfg.RULES_CHANNEL_ID}`
                    },
                    {
                        type: 2,
                        style: 5,
                        label: '🎫 Buka Tiket',
                        url: `https://discord.com/channels/${guild.id}/${cfg.TICKET_PANEL_CHANNEL_ID}`
                    }
                ]
            }
        ]
    };
}

// ── SEND WELCOME ──
async function sendWelcomeMessage(member, client) {
    const guild = member.guild;
    const channel = guild.channels.cache.get(cfg.WELCOME_CHANNEL_ID);
    if (!channel) {
        console.log('[WELCOME] Channel welcome tidak dijumpai.');
        return;
    }

    const payload = buildWelcomePanel(member, guild, client);
    const dmPayload = buildWelcomeDM(member, guild);

    // ── SEND TO CHANNEL ──
    await channel.send({
        content: `👋 **Selamat datang ${member}!** Sila baca peraturan di <#${cfg.RULES_CHANNEL_ID}>.`,
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

    const channel = interaction.guild.channels.cache.get(cfg.INTRO_CHANNEL_ID);
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
            .setColor(cfg.FIQQZR_PURPLE || 0x8b5cf6)
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
