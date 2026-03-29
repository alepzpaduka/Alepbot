/**
 * Ticket / midman / payment button handlers — ported from bot.py views
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cfg = require('./config');
const { addClaimToCooldown, isStaffOnCooldown, getClaimCount } = require('./cooldown');
const {
  sendV2MessageToChannel,
  buildMidmanSuccessPayload
} = require('./midman');

function calculateSalary(totalSales) {
  return Math.min(Math.floor(totalSales * cfg.COMMISSION_RATE), cfg.SALARY_CAP);
}

function isSalaryMaxed(store, staffId) {
  return calculateSalary(store.getSales(staffId).total) >= cfg.SALARY_CAP;
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

async function sendTranscriptToLog(guild, channel, closedByUser, titlePrefix) {
  const log = guild.channels.cache.get(cfg.TICKET_LOG_CHANNEL_ID);
  if (!log) return;

  const messages = await fetchAllMessages(channel);
  const lines = [];
  for (const msg of messages) {
    const ts = msg.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    let content = msg.content || '*[Tidak ada teks]*';
    if (msg.attachments?.size) {
      content += '\n' + [...msg.attachments.values()].map((a) => `[Attachment] ${a.url}`).join('\n');
    }
    lines.push(`**${msg.author.tag}** [${ts}]:\n${content}\n`);
  }

  const header = `Ticket Closed By: ${closedByUser.tag} (${closedByUser.id})\n\n`;
  const transcript = header + lines.join('\n');

  for (let i = 0; i < transcript.length; i += 4096) {
    const part = transcript.slice(i, i + 4096);
    const embed = new EmbedBuilder()
      .setTitle(`📝 ${titlePrefix} — ${channel.name}`)
      .setDescription(part)
      .setColor(cfg.VORA_BLUE)
      .addFields({
        name: 'Closed By',
        value: `${closedByUser} (${closedByUser.id})`,
        inline: true
      });
    await log.send({ embeds: [embed] });
  }
  await log.send(`✅ Transcript **${channel.name}** selesai.`).catch(() => {});
}

function paymentActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('payment_send_proof')
      .setLabel('📤 Send Proof')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('payment_open_qris')
      .setLabel('💳 Open QRIS')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('payment_open_dana')
      .setLabel('💸 Open DANA')
      .setStyle(ButtonStyle.Success)
  );
}

async function sendPaymentEmbed(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🛒 Premium Purchase Information')
    .setDescription(
      '**💳 Pricelist**\n• Lifetime Premium → IDR 30.000\n\n' +
        '**📘 English**\nPay via QRIS or DANA then send proof here.\n\n' +
        '**📗 Indonesian**\nBayar via QRIS atau DANA, lalu kirim bukti transfer di sini.\n\n' +
        '📨 Kirim bukti transfer di ticket ini.\n👥 Tunggu staff jika butuh bantuan.'
    )
    .setColor(cfg.VORA_BLUE)
    .setFooter({ text: 'Vora Hub Premium • Secure Payment' });

  await channel.send({ embeds: [embed], components: [paymentActionRow()] });
}

function collectTicketChannelIds(store) {
  const ids = [];
  for (const data of Object.values(store.activeTickets)) {
    ids.push(typeof data === 'object' ? data.channel_id : data);
  }
  for (const cid of Object.values(store.x8Tickets)) {
    ids.push(cid);
  }
  for (const cid of Object.values(store.midmanTickets)) {
    ids.push(cid);
  }
  return ids.map(String);
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
    await interaction.reply({ content: '❌ Hanya staff yang bisa claim ticket.', ephemeral: true });
    return;
  }

  const adminRole = guild.roles.cache.get(cfg.ADMIN_ROLE_ID);
  const isAdmin = adminRole && interaction.member.roles.cache.has(adminRole.id);

  if (!isAdmin && isSalaryMaxed(store, user.id)) {
    const staffSales = store.getSales(user.id);
    const currentSalary = calculateSalary(staffSales.total);
    await interaction.reply({
      content:
        `❌ **Gaji kamu sudah mencapai batas maksimal IDR ${currentSalary.toLocaleString('id-ID')}!**\n\n` +
        `Kamu tidak bisa claim ticket baru sampai gaji dibayar oleh admin.\n` +
        `Hubungi admin untuk pembayaran gaji dengan command \`/gajisudahbayar\`.`,
      ephemeral: true
    });
    return;
  }

  if (!isAdmin) {
    const [onCooldown, timeLeft] = isStaffOnCooldown(store, user.id);
    if (onCooldown && timeLeft) {
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      await interaction.reply({
        content:
          `⏰ **Quota habis! Cooldown aktif**\n\n` +
          `Kamu sudah claim ${cfg.COOLDOWN_LIMIT} ticket dan quota habis.\n` +
          `Cooldown berakhir dalam: **${hours} jam ${minutes} menit**\n\n` +
          `💡 **Tip:** Kalau quota belum habis, reset otomatis setiap ${cfg.RESET_MINUTES} menit!`,
        ephemeral: true
      });
      return;
    }
  }

  const existing = store.getClaim(channel.id);
  if (existing) {
    if (String(existing) === String(user.id)) {
      await interaction.reply({ content: '✅ Kamu sudah claim ticket ini.', ephemeral: true });
      return;
    }
    const claimer = await guild.members.fetch(existing).catch(() => null);
    const name = claimer ? claimer.toString() : 'Unknown';
    await interaction.reply({ content: `❌ Ticket ini sudah di-claim oleh ${name}.`, ephemeral: true });
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
    quotaMsg = '\n\n👑 **Admin Mode:** Unlimited quota - No cooldown!';
  } else if (remaining > 0) {
    quotaMsg = `\n\n📊 Sisa quota: **${remaining}/${cfg.COOLDOWN_LIMIT}** ticket\n💡 Reset otomatis dalam ${cfg.RESET_MINUTES} menit jadi 5/5 lagi!`;
  } else {
    quotaMsg = `\n\n⚠️ Quota habis! Cooldown ${cfg.COOLDOWN_HOURS} jam dimulai sekarang.`;
  }

  await interaction.reply({
    content: `✅ ${user} telah **claim** ticket ini! Ticket sekarang hanya terlihat oleh kamu dan pembuat ticket.${quotaMsg}`
  });
}

function detectTicketKind(store, channelId) {
  const cid = String(channelId);
  for (const ch of Object.values(store.x8Tickets)) {
    if (String(ch) === cid) return 'x8';
  }
  for (const ch of Object.values(store.midmanTickets)) {
    if (String(ch) === cid) return 'midman';
  }
  for (const data of Object.values(store.activeTickets)) {
    const ch = typeof data === 'object' ? data.channel_id : data;
    if (String(ch) === cid) return 'regular';
  }
  return null;
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
  const midmanRole = guild.roles.cache.get(cfg.MIDMAN_ROLE_ID);
  const kind = detectTicketKind(store, channel.id);

  if (!kind) {
    await interaction.reply({ content: '❌ Channel ini bukan ticket terdaftar.', ephemeral: true });
    return;
  }

  if (kind === 'midman') {
    if (!midmanRole || !interaction.member.roles.cache.has(midmanRole.id)) {
      await interaction.reply({ content: '❌ Hanya Midman yang bisa menutup ticket ini.', ephemeral: true });
      return;
    }
  } else if (!hasStaff) {
    await interaction.reply({ content: '❌ Hanya staff yang bisa menutup ticket.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '📁 Membuat transcript…', ephemeral: true });

  const title =
    kind === 'midman' ? 'Transcript Midman' : 'Transcript';
  await sendTranscriptToLog(guild, channel, user, title);

  if (kind === 'x8') {
    for (const [uid, ch] of Object.entries(store.x8Tickets)) {
      if (String(ch) === String(channel.id)) {
        delete store.x8Tickets[uid];
        break;
      }
    }
    store.saveX8Tickets();
  } else if (kind === 'midman') {
    for (const [uid, ch] of Object.entries(store.midmanTickets)) {
      if (String(ch) === String(channel.id)) {
        delete store.midmanTickets[uid];
        break;
      }
    }
    store.saveMidmanTickets();
    store.midmanTicketContext.delete(channel.id);
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

async function handlePayNow(interaction, store) {
  const channel = interaction.channel;
  if (!store.isTicketPremium(channel.id)) {
    await interaction.reply({ content: '❌ Tidak ada pembayaran di ticket ini.', ephemeral: true });
    return;
  }
  await sendPaymentEmbed(channel);
  await interaction.reply({ content: '📄 Informasi pembayaran dikirim!', ephemeral: true });
}

async function handlePayNowX8(interaction) {
  await interaction.reply({
    content:
      '🧾 **QRIS Payment X8 Event:**\nhttps://cdn.discordapp.com/attachments/1448212332244242524/1461696579055521944/IMG_2466.png',
    ephemeral: true
  });
}

async function handleDoneTicketConfirm(interaction, store) {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;

  if (store.isTicketDone(channel.id)) {
    await interaction.reply({
      content:
        '❌ Ticket ini sudah di-mark sebagai **Done** sebelumnya!\nSales sudah tercatat untuk staff yang handle ticket ini.',
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
      content: '❌ Hanya pembuat ticket yang bisa menekan tombol Done.',
      ephemeral: true
    });
    return;
  }

  const claimerId = store.getClaim(channel.id);
  if (!claimerId) {
    await interaction.reply({
      content: '❌ Ticket ini belum di-claim oleh staff. Tidak ada yang bisa dikreditkan.',
      ephemeral: true
    });
    return;
  }

  const claimer = await guild.members.fetch(claimerId).catch(() => null);
  if (!claimerId || !claimer) {
    await interaction.reply({ content: '❌ Staff yang claim ticket tidak ditemukan.', ephemeral: true });
    return;
  }

  let ticketIsPremium = store.isTicketPremium(channel.id);
  if (
    !ticketIsPremium &&
    channel.parentId &&
    [cfg.TICKET_CATEGORY_ID, cfg.TICKET2_CATEGORY_ID].includes(channel.parentId)
  ) {
    ticketIsPremium = true;
  }

  const saleAmount = ticketIsPremium ? 30000 : 0;
  if (saleAmount === 0) {
    await interaction.reply({
      content: '❌ Ticket ini bukan ticket premium, tidak ada sales yang dicatat.',
      ephemeral: true
    });
    return;
  }

  store.addSale(claimerId, saleAmount, `Premium Sale - Ticket ${channel.name}`);
  const staffSales = store.getSales(claimerId);
  const total = staffSales.total;

  const embed = new EmbedBuilder()
    .setTitle('✅ Ticket Selesai & Sales Tercatat')
    .setDescription(`Terima kasih ${user}! Ticket telah ditandai selesai.`)
    .setColor(cfg.VORA_BLUE)
    .addFields(
      { name: 'Staff yang Handle', value: `${claimer}`, inline: true },
      { name: 'Credit Sales', value: `IDR ${saleAmount.toLocaleString('id-ID')}`, inline: true },
      { name: 'Total Sales Staff', value: `IDR ${total.toLocaleString('id-ID')}`, inline: true }
    )
    .setFooter({ text: 'VoraHub Sales Tracker' });

  await interaction.reply({ embeds: [embed] });

  try {
    await claimer.send(
      `🎉 Selamat! Kamu mendapat credit sales **IDR ${saleAmount.toLocaleString('id-ID')}** dari ticket **${channel.name}**!\n` +
        `Total sales kamu sekarang: **IDR ${total.toLocaleString('id-ID')}**`
    );
  } catch {
    await channel
      .send(`🎉 ${claimer} mendapat credit sales **IDR ${saleAmount.toLocaleString('id-ID')}**!`)
      .catch(() => {});
  }

  store.markTicketDone(channel.id);
}

async function handleClaimMidman(interaction, store) {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;
  const midmanRole = guild.roles.cache.get(cfg.MIDMAN_ROLE_ID);

  if (!midmanRole || !interaction.member.roles.cache.has(midmanRole.id)) {
    await interaction.reply({ content: '❌ Hanya Midman yang bisa claim ticket ini.', ephemeral: true });
    return;
  }

  const existing = store.getClaim(channel.id);
  if (existing) {
    if (String(existing) === String(user.id)) {
      await interaction.reply({ content: '✅ Kamu sudah claim ticket ini.', ephemeral: true });
      return;
    }
    const claimer = await guild.members.fetch(existing).catch(() => null);
    const name = claimer ? claimer.toString() : 'Unknown';
    await interaction.reply({ content: `❌ Ticket ini sudah di-claim oleh ${name}.`, ephemeral: true });
    return;
  }

  store.addClaim(channel.id, user.id);

  let ticketCreatorId = null;
  for (const [uid, cid] of Object.entries(store.midmanTickets)) {
    if (String(cid) === String(channel.id)) {
      ticketCreatorId = uid;
      break;
    }
  }

  await channel.permissionOverwrites.edit(midmanRole, { ViewChannel: false }).catch(() => {});
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

  await interaction.reply({
    content: `✅ ${user} telah **claim** ticket Midman ini!\nTicket sekarang hanya terlihat oleh kamu dan pembuat ticket.`
  });
}

async function handleDoneMidman(interaction, store, token) {
  const user = interaction.user;
  const guild = interaction.guild;
  const channel = interaction.channel;
  const midmanRole = guild.roles.cache.get(cfg.MIDMAN_ROLE_ID);

  if (!midmanRole || !interaction.member.roles.cache.has(midmanRole.id)) {
    await interaction.reply({
      content: '❌ Hanya Midman yang bisa mark ticket ini sebagai Done.',
      ephemeral: true
    });
    return;
  }

  if (store.isTicketDone(channel.id)) {
    await interaction.reply({
      content: '❌ Ticket ini sudah di-mark sebagai **Done** sebelumnya!',
      ephemeral: true
    });
    return;
  }

  const claimerId = store.getClaim(channel.id);
  if (!claimerId) {
    await interaction.reply({
      content: '❌ Ticket ini belum di-claim. Claim dulu sebelum mark Done.',
      ephemeral: true
    });
    return;
  }

  if (String(claimerId) !== String(user.id)) {
    const claimer = await guild.members.fetch(claimerId).catch(() => null);
    const name = claimer ? claimer.toString() : 'Unknown';
    await interaction.reply({
      content: `❌ Hanya ${name} (yang claim) yang bisa mark Done.`,
      ephemeral: true
    });
    return;
  }

  store.markTicketDone(channel.id);

  const txCtx = store.midmanTicketContext.get(channel.id) || {};
  const ts = Math.floor(Date.now() / 1000);
  const payload = buildMidmanSuccessPayload(
    txCtx.pihak1 || 'Unknown',
    txCtx.pihak2 || 'Unknown',
    txCtx.range_label || 'Unknown',
    txCtx.fee_label || 'Unknown',
    ts
  );
  const [ok, , err] = await sendV2MessageToChannel(token, cfg.MIDMAN_SUCCESS_CHANNEL_ID, payload);

  if (ok) {
    await interaction.reply({
      content: `✅ Transaksi Midman selesai dan panel berhasil dikirim ke <#${cfg.MIDMAN_SUCCESS_CHANNEL_ID}>.`
    });
  } else {
    await interaction.reply({
      content: `✅ Transaksi Midman selesai, tapi gagal kirim panel V2 ke channel tujuan.\nError: ${err}`,
      ephemeral: true
    });
  }
}

async function handlePaymentProof(interaction) {
  await interaction.reply({
    content: 'Silakan **upload bukti transfer beserta tunjukan detailnya** di chat ticket ini.',
    ephemeral: true
  });
}

async function handlePaymentQris(interaction) {
  await interaction.reply({
    content:
      '🧾 **QRIS Payment:**\nhttps://cdn.discordapp.com/attachments/1350087792176136243/1477711116179214509/IMG-20260207-WA00064.jpg',
    ephemeral: true
  });
}

async function handlePaymentDana(interaction) {
  await interaction.reply({
    content:
      '💸 **DANA Payment:**\nNo. DANA: `08137320837`\n\nTransfer ke nomor di atas lalu kirim bukti di ticket ini.',
    ephemeral: true
  });
}

module.exports = {
  sendPaymentEmbed,
  collectTicketChannelIds,
  handleClaimTicket,
  handleCloseTicket,
  handlePayNow,
  handlePayNowX8,
  handleDoneTicketConfirm,
  handleClaimMidman,
  handleDoneMidman,
  handlePaymentProof,
  handlePaymentQris,
  handlePaymentDana,
  detectTicketKind
};
