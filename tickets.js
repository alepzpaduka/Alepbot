/**
 * Ticket creation with Components V2 payloads.
 */
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const cfg = require('./config');

async function sendV2ToChannel(token, channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (res.status === 200 || res.status === 201) return [true, await res.json(), null];
  return [false, null, await res.text()];
}

function buildTicketCreatedPayload(userId, categoryName) {
  if (categoryName === 'Premium Purchase') {
    return {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            { type: 10, content: '# 🎫 Ticket Created — Premium Purchase\n' },
            { type: 14, spacing: 2 },
            {
              type: 10,
              content:
                `**Hello <@${userId}>**\n\nYour ticket has been successfully created under the **Premium Purchase** category.\nOur staff will respond as soon as possible.\n\nPlease do not close the ticket until your issue is resolved.\n\n**Ticket Creator:** <@${userId}>\n**Category:** Premium Purchase`
            }
          ]
        },
        {
          type: 17,
          components: [
            {
              type: 1,
              components: [
                { style: 3, type: 2, label: 'Claim Ticket', custom_id: cfg.CID_CLAIM_PREMIUM },
                { style: 1, type: 2, label: 'Bayar Sekarang', custom_id: cfg.CID_PAY_PREMIUM },
                { style: 4, type: 2, label: 'Close Ticket', custom_id: cfg.CID_CLOSE_PREMIUM }
              ]
            }
          ]
        }
      ]
    };
  }

  const closeIdMap = {
    'Content Creator Request': cfg.CID_CLOSE_CREATOR,
    Support: cfg.CID_CLOSE_SUPPORT,
    'Bug / Misconduct Report': cfg.CID_CLOSE_REPORT
  };

  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          { type: 10, content: `# 🎫 **Ticket Created — ${categoryName}**\n` },
          { type: 14, spacing: 2 },
          {
            type: 10,
            content:
              `**Hello <@${userId}>,**\n\nYour ticket has been successfully created under the **${categoryName}** category.\nOur staff will respond as soon as possible.\n\nPlease do not close this ticket until your issue has been resolved.\n\n**Ticket Creator:** <@${userId}>\n**Category:** ${categoryName}`
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 1,
            components: [{ style: 4, type: 2, label: 'Close Ticket', custom_id: closeIdMap[categoryName] || 'close_ticket' }]
          }
        ]
      }
    ]
  };
}

async function createTicket(interaction, categoryName, store, token) {
  const user = interaction.user;
  const guild = interaction.guild;
  const isX8 = categoryName.toLowerCase().includes('x8');

  if (isX8) {
    if (store.x8Tickets[user.id]) {
      const cid = store.x8Tickets[user.id];
      const ch = guild.channels.cache.get(cid);
      if (ch) {
        await interaction.reply({ content: `⚠ Kamu masih punya ticket X8 aktif di ${ch}.`, ephemeral: true });
        return;
      }
      store.removeX8Ticket(user.id);
      store.removeClaim(cid);
      store.removeDoneTicket(cid);
    }
  } else if (store.activeTickets[user.id]) {
    const chId = store.getTicketChannel(user.id);
    const ch = chId ? guild.channels.cache.get(chId) : null;
    if (ch) {
      await interaction.reply({ content: `⚠ Kamu masih punya ticket aktif di ${ch}.`, ephemeral: true });
      return;
    }
    store.removeTicket(user.id);
    if (chId) {
      store.removeClaim(chId);
      store.removeDoneTicket(chId);
    }
  }

  const num = isX8 ? store.incrementX8TicketCounter() : store.incrementTicketCounter();
  let category;
  let channelName;

  if (isX8) {
    category = guild.channels.cache.get(cfg.TICKET_CATEGORY_ID_X8);
    channelName = `x8-ticket-${String(num).padStart(4, '0')}`;
  } else {
    const primary = guild.channels.cache.get(cfg.TICKET_CATEGORY_ID);
    category = primary && primary.children?.cache?.size >= 50 ? guild.channels.cache.get(cfg.TICKET2_CATEGORY_ID) : primary;
    channelName = `ticket-${String(num).padStart(4, '0')}`;
  }

  const staffRole = guild.roles.cache.get(cfg.STAFF_ROLE_ID);
  const helperRole = guild.roles.cache.get(cfg.HELPER_ROLE_ID);
  const adminRole = guild.roles.cache.get(cfg.ADMIN_ROLE_ID);

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ];
  if (staffRole) overwrites.push({ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  if (helperRole) overwrites.push({ id: helperRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
  if (adminRole) {
    overwrites.push({
      id: adminRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category?.id ?? null,
    permissionOverwrites: overwrites
  });

  const isPremium = categoryName.toLowerCase().includes('premium');
  if (isX8) store.addX8Ticket(user.id, ticketChannel.id);
  else store.addTicket(user.id, ticketChannel.id, isPremium);

  const mentions = [];
  if (staffRole) mentions.push(staffRole.toString());
  if (helperRole) mentions.push(helperRole.toString());
  if (mentions.length) {
    await ticketChannel.send({ content: mentions.join(' ') });
  }

  if (isX8) {
    await ticketChannel.send({
      content: `# 🎫 Ticket Created — X8 Ticket\n\nHello ${user}, ticket kamu sudah dibuat.`
    });
  } else {
    const payload = buildTicketCreatedPayload(user.id, categoryName);
    const [ok, , err] = await sendV2ToChannel(token, ticketChannel.id, payload);
    if (!ok) {
      await ticketChannel.send({ content: `# 🎫 Ticket Created — ${categoryName}\n\nHello ${user}, ticket kamu sudah dibuat.\n(V2 fallback)\n${err}` });
    }
  }

  await interaction.reply({ content: `🎫 Ticket kamu sudah dibuat: ${ticketChannel}`, ephemeral: true });

  const log = guild.channels.cache.get(cfg.TICKET_LOG_CHANNEL_ID);
  if (log) {
    await log.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('📩 Ticket Dibuat')
          .setColor(cfg.VORA_BLUE)
          .setDescription(`**User:** ${user}\n**Kategori:** ${categoryName}\n\n📌 **Channel:** ${ticketChannel}`)
          .setFooter({ text: 'Vora Hub Ticket System • Ticket Log' })
      ]
    });
  }
}

module.exports = { createTicket };
