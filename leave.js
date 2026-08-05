/**
 * AlepzBot — Sistem Keluar Server
 * Pemilik: fiqq
 * Versi: 2.0.0
 */

const { EmbedBuilder } = require('discord.js');
const cfg = require('./config');

async function sendLeaveMessage(member) {
  const guild = member.guild;

  // Cari channel welcome/log
  const logChannelId = cfg.LEAVE_LOG_CHANNEL_ID || cfg.TICKET_LOG_CHANNEL_ID || '1452681875029102624';
  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) {
    console.log('[LEAVE] Channel log tidak dijumpai.');
    return;
  }

  // Dapatkan jumlah ahli terkini
  const memberCount = guild.memberCount;

  // Dapatkan tarikh join (jika ada)
  let joinDate = 'Tarikh tidak diketahui';
  if (member.joinedAt) {
    joinDate = member.joinedAt.toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Dapatkan avatar URL
  const avatarURL = member.user.displayAvatarURL({ size: 512, dynamic: true });

  // Kira tempoh berada dalam server
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

  // Bina embed
  const embed = new EmbedBuilder()
    .setTitle('👋 SELAMAT TINGGAL!')
    .setDescription(`**${member.user.tag}** telah meninggalkan **${guild.name}**.`)
    .setColor(0xff0000)
    .setThumbnail(avatarURL)
    .addFields(
      { name: '👤 Nama Pengguna', value: `${member.user.username}`, inline: true },
      { name: '🆔 ID', value: `\`${member.user.id}\``, inline: true },
      { name: '📅 Tarikh Sertai', value: joinDate, inline: true },
      { name: '⏳ Tempoh Dalam Server', value: duration, inline: true },
      { name: '👥 Jumlah Ahli Kini', value: `${memberCount} ahli`, inline: true }
    )
    .setFooter({ text: `AlepzBot • Leave System • ${guild.name}` })
    .setTimestamp();

  // Bina payload Components V2
  const payload = {
    embeds: [embed.toJSON()],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 4,
            label: '📊 Lihat Statistik',
            custom_id: 'stats_view'
          }
        ]
      }
    ]
  };

  // Hantar ke channel log
  await channel.send({
    embeds: [embed],
    components: payload.components
  });
}

async function testLeave(interaction) {
  const member = interaction.member;
  await sendLeaveMessage(member);
  await interaction.reply({
    content: '✅ **Selamat Tinggal** telah dihantar!',
    ephemeral: true
  });
}

module.exports = { sendLeaveMessage, testLeave };
