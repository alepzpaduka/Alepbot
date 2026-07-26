/**
 * AlepzBot — Sistem Selamat Datang
 * Pemilik: fiqq
 * Versi: 2.0.0
 */

const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

async function sendWelcomeMessage(member, client) {
  const guild = member.guild;
  
  // Cari channel welcome
  const welcomeChannelId = cfg.WELCOME_CHANNEL_ID || '1434769506798010480';
  const channel = guild.channels.cache.get(welcomeChannelId);
  if (!channel) {
    console.log('[WELCOME] Channel welcome tidak dijumpai.');
    return;
  }

  // Dapatkan jumlah ahli
  const memberCount = guild.memberCount;

  // Dapatkan tarikh join
  const joinDate = member.joinedAt ? member.joinedAt.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Tarikh tidak diketahui';

  // Dapatkan tarikh akaun dibuat
  const accountCreated = member.user.createdAt.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Kira umur akaun
  const accountAge = Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Dapatkan avatar URL
  const avatarURL = member.user.displayAvatarURL({ size: 512, dynamic: true });

  // Dapatkan banner (jika ada)
  let bannerURL = null;
  try {
    const user = await client.users.fetch(member.user.id, { force: true });
    if (user.banner) {
      bannerURL = user.bannerURL({ size: 512 });
    }
  } catch (_) {}

  // Bina embed
  const embed = new EmbedBuilder()
    .setTitle('🎉 SELAMAT DATANG!')
    .setDescription(`**${member.user.tag}** telah menyertai **${guild.name}**!`)
    .setColor(0x00ff00)
    .setThumbnail(avatarURL)
    .addFields(
      { name: '👤 Nama Pengguna', value: `${member}`, inline: true },
      { name: '🆔 ID', value: `\`${member.user.id}\``, inline: true },
      { name: '📅 Tarikh Sertai', value: joinDate, inline: true },
      { name: '📆 Akaun Dibuat', value: accountCreated, inline: true },
      { name: '📊 Umur Akaun', value: `${accountAge} hari`, inline: true },
      { name: '👥 Jumlah Ahli', value: `${memberCount} ahli`, inline: true }
    )
    .setFooter({ text: `AlepzBot • Welcome System • ${guild.name}` })
    .setTimestamp();

  if (bannerURL) {
    embed.setImage(bannerURL);
  }

  // Bina payload Components V2
  const payload = {
    embeds: [embed.toJSON()],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: '📋 Lihat Peraturan',
            url: `https://discord.com/channels/${guild.id}/1434782966533324872`
          },
          {
            type: 2,
            style: 2,
            label: '🎫 Buka Tiket',
            custom_id: 'ticket_support'
          }
        ]
      }
    ]
  };

  // Hantar menggunakan V2
  await channel.send({
    content: `👋 **Selamat datang ${member}!** Sila baca peraturan di <#1434782966533324872>.`,
    embeds: [embed],
    components: payload.components
  });

  // Hantar DM kepada ahli baru
  try {
    await member.send({
      content: `🎉 **Selamat datang ke ${guild.name}, ${member.user.username}!**\n\n` +
        `Terima kasih kerana menyertai server kami. Sila baca peraturan dan jangan lupa untuk memperkenalkan diri.\n\n` +
        `📌 **Pautan Penting:**\n` +
        `• Peraturan: <#1434782966533324872>\n` +
        `• Sokongan: Buka tiket di <#1434769506798010480>\n\n` +
        `Selamat beraktiviti! 🚀`
    });
  } catch (_) {
    // DM tertutup
  }
}

async function testWelcome(interaction) {
  const member = interaction.member;
  await sendWelcomeMessage(member, interaction.client);
  await interaction.reply({
    content: '✅ **Selamat Datang** telah dihantar!',
    ephemeral: true
  });
}

module.exports = { sendWelcomeMessage, testWelcome };
