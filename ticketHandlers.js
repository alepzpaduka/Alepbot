/**
 * AlepzBot — Pengendali Tiket
 * Pemilik: Mr. Kholis
 * Versi: 2.0.0 (Bersih)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cfg = require('./config');
const { addClaimToCooldown, isStaffOnCooldown, getClaimCount } = require('./cooldown');

function collectTicketChannelIds(store) {
  const ids = [];
  for (const data of Object.values(store.activeTickets)) {
    ids.push(typeof data === 'object' ? data.channel_id : data);
  }
  for (const cid of Object.values(store.x8Tickets)) {
    ids.push(cid);
  }
  return ids.map(String);
}

async function fetchAllMessages(channel) {
  const out = [];
  let before;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;
    out.push(...batch.values());
    before = batch.last().id;
  }
  out.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  return out;
}

async function sendTranscriptToLog(guild, channel, closedByUser) {
  const log = guild.channels.cache.get(cfg.TICKET_LOG_CHANNEL_ID);
  if (!log) return;

  const messages = await fetchAllMessages(channel);
  const lines = [];
  for (const msg of messages) {
    const ts = msg.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    let content = msg.content || '*[Tiada teks]*';
    if (msg.attachments?.size) {
      content += '\n' + [...msg.attachments.values()].map((a) => `[Lampiran] ${a.url}`).join('\n');
    }
    lines.push(`**${msg.author.tag}** [${ts}]:\n${content}\n`);
  }

  const header = `Tiket Ditutup Oleh: ${closedByUser.tag} (${closedByUser.id})\n\n`;
  const transcript = header + lines.join('\n');

  for (let i = 0; i < transcript.length; i += 4096) {
    const part = transcript.slice(i, i + 4096);
    const embed = new EmbedBuilder()
      .setTitle(`📝 Transkrip — ${channel.name}`)
      .setDescription(part)
      .addFields({
        name: 'Ditutup Oleh',
        value: `${closedByUser} (${closedByUser.id})`,
        inline: true
      });
    await log.send({ embeds: [embed] });
  }
  await log.send(`✅ Transkrip **${channel.name}** selesai.`).catch(() => {});
}

function detectTicketKind(store, channelId) {
  const cid = String(channelId);
  for (const ch of Object.values(store.x8Tickets)) {
    if (String(ch) === cid) return 'x8';
  }
  for (const data of Object.values(store.activeTickets)) {
    const ch = typeof data === 'object' ? data.channel_id : data;
    if (String(ch) === cid) return 'regular';
  }
  return null;
}

async function handleClaimTicket(interaction, store) {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;
  const staffRole = guild.roles.cache.get(cfg.STAFF_ROLE_ID);
  const helperRole = guild.roles.cache.get(cfg.HELPER_ROLE_ID);

  const hasStaff =
    (staffRole && interaction.member.roles.cache.has(staffRole.id)) ||
    (helperRole && interaction.member.roles.cache.has(helperRole.id));
  if (!hasStaff) {
    await interaction.reply({ content: '❌ Hanya staff yang boleh claim tiket.', ephemeral: true });
    return;
  }

  const adminRole = guild.roles.cache.get(cfg.ADMIN_ROLE_ID);
  const isAdmin = adminRole && interaction.member.roles.cache.has(adminRole.id);

  if (!isAdmin) {
    const [onCooldown, timeLeft] = isStaffOnCooldown(store, user.id);
    if (onCooldown && timeLeft) {
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      await interaction.reply({
        content:
          `⏰ **Kuota habis! Cooldown aktif**\n\n` +
          `Kamu sudah claim ${cfg.COOLDOWN_LIMIT} tiket dan kuota habis.\n` +
          `Cooldown tamat dalam: **${hours} jam ${minutes} minit**\n\n` +
          `💡 **Tip:** Kalau kuota belum habis, reset automatik setiap ${cfg.RESET_MINUTES} minit!`,
        ephemeral: true
      });
      return;
    }
  }

  const existing = store.getClaim(channel.id);
  if (existing) {
    if (String(existing) === String(user.id)) {
      await interaction.reply({ content: '✅ Kamu sudah claim tiket ini.', ephemeral: true });
      return;
    }
    const claimer = await guild.members.fetch(existing).catch(() => null);
    const name = claimer ? claimer.toString() : 'Tidak Diketahui';
    await interaction.reply({ content: `❌ Tiket ini sudah di-claim oleh ${name}.`, ephemeral: true });
    return;
  }

  store.addClaim(channel.id, user.id);
  if (!isAdmin) {
    addClaimToCooldown(store, user.id);
  }

  const claimCount = isAdmin ? 0 : getClaimCount(store, user.id);
  const remaining = isAdmin ? 999 : cfg.COOLDOWN_LIMIT - claimCount;

  let ticketCreatorId = null;
  for (const [uid, data] of Object.entries(store.activeTickets)) {
    const cid = typeof data === 'object' ? data.channel_id : data;
    if (String(cid) === String(channel.id)) {
      ticketCreatorId = uid;
      break;
    }
  }

  if (staffRole) {
    await channel.permissionOverwrites.edit(staffRole, { ViewChannel: false }).catch(() => {});
  }
  if (helperRole) {
    await channel.permissionOverwrites.edit(helperRole, { ViewChannel: false }).catch(() => {});
  }
  await channel.permissionOverwrites
    .edit(user, { ViewChannel: true, SendMessages: true })
    .catch(() => {});

  if (ticketCreatorId) {
    const creator = await guild.members.fetch(ticketCreatorId).catch(() => null);
    if (creator) {
      await channel.permissionOverwrites
        .edit(creator, { ViewChannel: true, SendMessages: true })
        .catch(() => {});
    }
  }

  let quotaMsg = '';
  if (isAdmin) {
    quotaMsg = '\n\n👑 **Mod Admin:** Kuota tanpa had - Tiada cooldown!';
  } else if (remaining > 0) {
    quotaMsg = `\n\n📊 Baki kuota: **${remaining}/${cfg.COOLDOWN_LIMIT}** tiket\n💡 Reset automatik dalam ${cfg.RESET_MINUTES} minit jadi 5/5 lagi!`;
  } else {
    quotaMsg = `\n\n⚠️ Kuota habis! Cooldown ${cfg.COOLDOWN_HOURS} jam bermula sekarang.`;
  }

  await interaction.reply({
    content: `✅ ${user} telah **claim** tiket ini! Tiket sekarang hanya kelihatan oleh kamu dan pembuat tiket.${quotaMsg}`
  });
}

async function handleCloseTicket(interaction, store) {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;
  const staffRole = guild.roles.cache.get(cfg.STAFF_ROLE_ID);
  const helperRole = guild.roles.cache.get(cfg.HELPER_ROLE_ID);

  const hasStaff =
    (staffRole && interaction.member.roles.cache.has(staffRole.id)) ||
    (helperRole && interaction.member.roles.cache.has(helperRole.id));
  const kind = detectTicketKind(store, channel.id);

  if (!kind) {
    await interaction.reply({ content: '❌ Saluran ini bukan tiket berdaftar.', ephemeral: true });
    return;
  }

  if (!hasStaff) {
    await interaction.reply({ content: '❌ Hanya staff yang boleh menutup tiket.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '📁 Membuat transkrip…', ephemeral: true });

  await sendTranscriptToLog(guild, channel, user);

  if (kind === 'x8') {
    for (const [uid, ch] of Object.entries(store.x8Tickets)) {
      if (String(ch) === String(channel.id)) {
        delete store.x8Tickets[uid];
        break;
      }
    }
    store.saveX8Tickets();
  } else {
    for (const [uid, data] of Object.entries(store.activeTickets)) {
      const ch = typeof data === 'object' ? data.channel_id : data;
      if (String(ch) === String(channel.id)) {
        delete store.activeTickets[uid];
        break;
      }
    }
    store.saveTickets();
  }

  store.removeClaim(channel.id);
  store.removeDoneTicket(channel.id);
  await channel.delete().catch(() => {});
}

async function handlePayNow(interaction) {
  await interaction.reply({
    content: '💳 **Sila hubungi staff untuk maklumat pembayaran.**',
    ephemeral: true
  });
}

async function handlePayNowX8(interaction) {
  await interaction.reply({
    content: '🧾 **Sila hubungi staff untuk maklumat pembayaran X8.**',
    ephemeral: true
  });
}

async function handleDoneTicketConfirm(interaction, store) {
  const user = interaction.user;
  const channel = interaction.channel;

  if (store.isTicketDone(channel.id)) {
    await interaction.reply({
      content: '❌ Tiket ini sudah ditanda sebagai **Selesai** sebelum ini!',
      ephemeral: true
    });
    return;
  }

  let ticketCreatorId = null;
  for (const [uid, data] of Object.entries(store.activeTickets)) {
    const cid = typeof data === 'object' ? data.channel_id : data;
    if (String(cid) === String(channel.id)) {
      ticketCreatorId = uid;
      break;
    }
  }

  if (String(user.id) !== String(ticketCreatorId)) {
    await interaction.reply({
      content: '❌ Hanya pembuat tiket yang boleh menekan butang Selesai.',
      ephemeral: true
    });
    return;
  }

  const claimerId = store.getClaim(channel.id);
  if (!claimerId) {
    await interaction.reply({
      content: '❌ Tiket ini belum di-claim oleh staff.',
      ephemeral: true
    });
    return;
  }

  store.markTicketDone(channel.id);

  await interaction.reply({
    content: `✅ Tiket selesai! Terima kasih ${user} kerana menggunakan perkhidmatan kami.`
  });
}

module.exports = {
  collectTicketChannelIds,
  handleClaimTicket,
  handleCloseTicket,
  handlePayNow,
  handlePayNowX8,
  handleDoneTicketConfirm,
  detectTicketKind
};
