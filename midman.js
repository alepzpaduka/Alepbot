/**
 * Midman Components V2 + channel creation — ported from bot.py
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const cfg = require('./config');

const MIDMAN_RANGE_OPTIONS = [
  ['Rp 10.000 - Rp 50.000', 'Fee: Rp 1.500'],
  ['Rp 50.000 - Rp 100.000', 'Fee: Rp 5.000'],
  ['Rp 100.000 - Rp 200.000', 'Fee: Rp 8.000'],
  ['Rp 200.000 - Rp 300.000', 'Fee: Rp 12.000'],
  ['≥ Rp 300.000', 'Fee: 5% dari total transaksi']
];

const MIDMAN_RANGE_VALUES = ['Dt6MCd51SJ', 'n3NBeXDmDA', 'r6E8nV4QkL', 'a2W7yT9uPm', 'z5H1xC3bNj'];
const MIDMAN_RANGE_MAP = Object.fromEntries(
  MIDMAN_RANGE_VALUES.map((v, i) => [
    v,
    { range_label: MIDMAN_RANGE_OPTIONS[i][0], fee_label: MIDMAN_RANGE_OPTIONS[i][1] }
  ])
);

const MIDMAN_CID_RANGE = 'p_284631762749886583';
const MIDMAN_CID_SELLER_SELECT = 'p_284635144629784683';
const MIDMAN_CID_SELLER_SELF = 'p_284634434974519297';
const MIDMAN_CID_BUYER_SELECT = 'p_284638204156448769';
const MIDMAN_CID_BUYER_SELF = 'p_284638379805511681';
const MIDMAN_CID_FEE_SELECT = 'p_284639308655104005';

function buildMidmanStartPayload() {
  const options = MIDMAN_RANGE_VALUES.map((value, i) => ({
    label: MIDMAN_RANGE_OPTIONS[i][0],
    value,
    description: MIDMAN_RANGE_OPTIONS[i][1]
  }));
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          {
            type: 9,
            components: [{ type: 10, content: '# Ticket — Midman Service by Vora\n' }],
            accessory: { type: 2, style: 5, label: 'Join Vora', url: 'https://discord.gg/vorahub' }
          },
          { type: 14, spacing: 2 },
          {
            type: 10,
            content:
              'Untuk membuat ticket Rekber, silakan pilih rentang nominal transaksi melalui dropdown di bawah ini.\n'
          },
          { type: 14, spacing: 2 },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: MIDMAN_CID_RANGE,
                options,
                min_values: 1,
                max_values: 1
              }
            ]
          }
        ]
      }
    ]
  };
}

function buildMidmanSellerPayload(session) {
  return {
    flags: 32768,
    components: [
      { type: 17, components: [{ type: 10, content: '# :ticket: - Pilih Penjual\n' }] },
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `- Rentang Transaksi: ${session.range_label}\n- Fee Rekber: ${session.fee_label}`
          }
        ]
      },
      {
        type: 17,
        components: [
          { type: 10, content: 'Silakan pilih siapa yang menjadi Penjual dalam transaksi ini.\n' },
          {
            type: 1,
            components: [
              { type: 5, custom_id: MIDMAN_CID_SELLER_SELECT, min_values: 1, max_values: 1 }
            ]
          },
          { type: 14, spacing: 2 },
          {
            type: 9,
            components: [{ type: 10, content: 'Klik ini jika Penjualnya anda sendiri ->\n' }],
            accessory: { style: 2, type: 2, label: 'Saya', custom_id: MIDMAN_CID_SELLER_SELF }
          }
        ]
      }
    ]
  };
}

function buildMidmanBuyerPayload(session) {
  return {
    flags: 32768,
    components: [
      { type: 17, components: [{ type: 10, content: '# :ticket: - Pilih Pembeli\n' }] },
      {
        type: 17,
        components: [
          { type: 10, content: `- Penjual: <@${session.seller_id}>` }
        ]
      },
      {
        type: 17,
        components: [
          { type: 10, content: 'Silakan pilih siapa yang menjadi Pembeli dalam transaksi ini.\n' },
          {
            type: 1,
            components: [
              { type: 5, custom_id: MIDMAN_CID_BUYER_SELECT, min_values: 1, max_values: 1 }
            ]
          },
          { type: 14, spacing: 2 },
          {
            type: 9,
            components: [{ type: 10, content: 'Klik ini jika Pembelinya anda sendiri ->\n' }],
            accessory: { style: 2, type: 2, label: 'Saya', custom_id: MIDMAN_CID_BUYER_SELF }
          }
        ]
      }
    ]
  };
}

function buildMidmanFeePayload(session) {
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          { type: 10, content: '# Fee dibayar Oleh\n' },
          { type: 14, spacing: 2 },
          {
            type: 10,
            content: `- Penjual : <@${session.seller_id}>\n- Pembeli : <@${session.buyer_id}>\n\n`
          },
          { type: 10, content: 'Silakan pilih siapa yang menanggung biaya rekber.\n' },
          {
            type: 1,
            components: [
              {
                type: 3,
                placeholder: 'Pilih Siapa Yang Membayar Fee',
                custom_id: MIDMAN_CID_FEE_SELECT,
                options: [
                  { label: 'Penjual', value: 'Penjual', description: 'Fee ditanggung oleh Penjual' },
                  { label: 'Pembeli', value: 'Pembeli', description: 'Fee ditanggung oleh Pembeli' },
                  {
                    label: 'Dibagi Dua',
                    value: 'Dibagi Dua',
                    description: 'Fee dibagi dua antara Penjual & Pembeli'
                  }
                ],
                min_values: 1,
                max_values: 1
              }
            ]
          }
        ]
      }
    ]
  };
}

function buildMidmanCreatedPayload(
  userMention,
  rangeLabel,
  feeLabel,
  sellerDisplay,
  buyerDisplay,
  feePayer,
  item,
  hargaFormatted
) {
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          { type: 10, content: '# :ticket: Midman Ticket Dibuat\n' },
          {
            type: 10,
            content:
              `- Rentang Transaksi: ${rangeLabel}\n` +
              `- Fee Rekber: ${feeLabel}\n` +
              `- Penjual: ${sellerDisplay}\n` +
              `- Pembeli: ${buyerDisplay}\n` +
              `- Penanggung Fee: ${feePayer}\n` +
              `- Jenis Barang: ${item}\n` +
              `- Harga: ${hargaFormatted}\n` +
              `- Pembuat Ticket: ${userMention}\n`
          },
          { type: 14, spacing: 2 },
          {
            type: 10,
            content: 'Staff Midman akan segera merespons untuk membantu transaksi.'
          }
        ]
      }
    ]
  };
}

function buildMidmanSuccessPayload(pihak1, pihak2, rangeLabel, feeLabel, timestampUnix) {
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content:
              '## Transaksi Berhasil\n' +
              '**Detail Transaksi:**\n' +
              `- <:USERS:1381580388119613511> Pihak 1: ${pihak1}\n` +
              `- <:USERS:1381580388119613511> Pihak 2: ${pihak2}\n` +
              `- <:calc:1381580377340117002> Rentang nominal: ${rangeLabel}\n` +
              `- <:PIG:1381580596349767771> Fee middleman: ${feeLabel}\n` +
              `- <:alarm:1381580370704601210> Tanggal transaksi: <t:${timestampUnix}:F>\n` +
              'Terima kasih telah menggunakan layanan middleman kami.'
          }
        ]
      }
    ]
  };
}

async function sendV2MessageToChannel(token, channelId, payload) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.status === 200 || res.status === 201) {
    return [true, await res.json(), null];
  }
  return [false, null, await res.text()];
}

async function sendV2InteractionCallback(interaction, payload, ephemeral) {
  const callbackPayload = { ...payload };
  let flags = callbackPayload.flags ?? 32768;
  if (ephemeral) flags |= 64;
  callbackPayload.flags = flags;
  const res = await fetch(
    `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 4, data: callbackPayload })
    }
  );
  if (res.status === 200 || res.status === 204) return [true, null];
  return [false, await res.text()];
}

function midmanControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('claim_midman_ticket')
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✋'),
    new ButtonBuilder()
      .setCustomId('close_midman_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId('done_midman_ticket')
      .setLabel('Done ✅')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✅')
  );
}

async function handleMidmanComponent(interaction, store, token) {
  const data = interaction.data || {};
  const customId = data.custom_id;
  const ids = new Set([
    MIDMAN_CID_RANGE,
    MIDMAN_CID_SELLER_SELECT,
    MIDMAN_CID_SELLER_SELF,
    MIDMAN_CID_BUYER_SELECT,
    MIDMAN_CID_BUYER_SELF,
    MIDMAN_CID_FEE_SELECT
  ]);
  if (!ids.has(customId)) return false;

  if (!interaction.message || !interaction.channel) {
    await interaction.reply({ content: '❌ Message panel tidak ditemukan.', ephemeral: true });
    return true;
  }

  const uid = interaction.user.id;
  let session = store.midmanSessions.get(uid);
  if (!session) {
    session = {};
    store.midmanSessions.set(uid, session);
  }
  const values = data.values || [];

  const fail = async (msg) => {
    if (interaction.replied || interaction.deferred) return;
    await interaction.reply({ content: msg, ephemeral: true });
  };

  if (customId === MIDMAN_CID_RANGE) {
    const selected = values[0];
    const sel = MIDMAN_RANGE_MAP[selected];
    if (!sel) {
      await fail('❌ Pilihan rentang tidak valid.');
      return true;
    }
    session.range_label = sel.range_label;
    session.fee_label = sel.fee_label;
    const [ok, err] = await sendV2InteractionCallback(
      interaction,
      buildMidmanSellerPayload(session),
      true
    );
    if (!ok && !interaction.replied) await fail(`❌ Gagal update panel: ${err}`);
    return true;
  }

  if (customId === MIDMAN_CID_SELLER_SELECT) {
    if (!values[0]) {
      await fail('❌ Penjual belum dipilih.');
      return true;
    }
    session.seller_id = values[0];
    const [ok, err] = await sendV2InteractionCallback(
      interaction,
      buildMidmanBuyerPayload(session),
      true
    );
    if (!ok && !interaction.replied) await fail(`❌ Gagal update panel: ${err}`);
    return true;
  }

  if (customId === MIDMAN_CID_SELLER_SELF) {
    session.seller_id = interaction.user.id;
    const [ok, err] = await sendV2InteractionCallback(
      interaction,
      buildMidmanBuyerPayload(session),
      true
    );
    if (!ok && !interaction.replied) await fail(`❌ Gagal update panel: ${err}`);
    return true;
  }

  if (customId === MIDMAN_CID_BUYER_SELECT) {
    if (!values[0]) {
      await fail('❌ Pembeli belum dipilih.');
      return true;
    }
    session.buyer_id = values[0];
    const [ok, err] = await sendV2InteractionCallback(
      interaction,
      buildMidmanFeePayload(session),
      true
    );
    if (!ok && !interaction.replied) await fail(`❌ Gagal update panel: ${err}`);
    return true;
  }

  if (customId === MIDMAN_CID_BUYER_SELF) {
    session.buyer_id = interaction.user.id;
    const [ok, err] = await sendV2InteractionCallback(
      interaction,
      buildMidmanFeePayload(session),
      true
    );
    if (!ok && !interaction.replied) await fail(`❌ Gagal update panel: ${err}`);
    return true;
  }

  if (customId === MIDMAN_CID_FEE_SELECT) {
    if (!values[0]) {
      await fail('❌ Pilihan fee belum dipilih.');
      return true;
    }
    session.fee_payer = values[0];
    const need = ['range_label', 'fee_label', 'seller_id', 'buyer_id', 'fee_payer'];
    if (need.some((k) => session[k] == null)) {
      await fail('❌ Sesi belum lengkap. Ulangi dari awal lewat panel midman.');
      return true;
    }
    const modal = new ModalBuilder()
      .setCustomId('midman_final_modal')
      .setTitle('Form Midman')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('midman_item')
            .setLabel('Jenis Barang yang Dijual')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: Akun Roblox, Robux, dll.')
            .setRequired(true)
            .setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('midman_harga')
            .setLabel('Harga Barang yang Dijual (Rp)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 150000')
            .setRequired(true)
            .setMaxLength(20)
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  return false;
}

async function createMidmanTicket(interaction, store, token) {
  const user = interaction.user;
  const guild = interaction.guild;
  const item = interaction.fields.getTextInputValue('midman_item').trim();
  const hargaRaw = interaction.fields.getTextInputValue('midman_harga').trim();
  const session = store.midmanSessions.get(user.id);
  if (!session) {
    await interaction.reply({
      content: '❌ Sesi midman tidak ditemukan. Ulangi dari awal.',
      ephemeral: true
    });
    return;
  }

  const buyer = String(session.buyer_id);
  const seller = String(session.seller_id);
  const payment = session.fee_payer;
  const range_label = session.range_label || '-';
  const fee_label = session.fee_label || '-';

  if (store.midmanTickets[user.id]) {
    const existingCid = store.midmanTickets[user.id];
    const ch = guild.channels.cache.get(existingCid);
    if (ch) {
      await interaction.reply({
        content: `⚠ Kamu masih punya ticket Midman aktif di ${ch}.`,
        ephemeral: true
      });
      return;
    }
    store.removeMidmanTicket(user.id);
    store.removeClaim(existingCid);
    store.removeDoneTicket(existingCid);
  }

  const num = store.incrementMidmanTicketCounter();
  const category = guild.channels.cache.get(cfg.TICKET_CATEGORY_ID_MIDMAN);
  const midmanRole = guild.roles.cache.get(cfg.MIDMAN_ROLE_ID);
  const name = `midman-${String(num).padStart(4, '0')}`;

  const resolveMember = (txt) => {
    const t = String(txt).replace(/<@!?|>/g, '').trim();
    if (/^\d+$/.test(t)) return guild.members.cache.get(t);
    return null;
  };
  const buyerMember = resolveMember(buyer);
  const sellerMember = resolveMember(seller);

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
  ];
  if (midmanRole) {
    overwrites.push({
      id: midmanRole.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }
  if (buyerMember) {
    overwrites.push({
      id: buyerMember.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }
  if (sellerMember) {
    overwrites.push({
      id: sellerMember.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }

  const ticketChannel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category?.id ?? null,
    permissionOverwrites: overwrites
  });

  store.addMidmanTicket(user.id, ticketChannel.id);

  const n = parseInt(String(hargaRaw).replace(/[.,\s]/g, ''), 10);
  const hargaFormatted = Number.isFinite(n)
    ? `IDR ${n.toLocaleString('id-ID')}`
    : `IDR ${hargaRaw}`;

  const buyerDisplay = buyerMember ? `<@${buyerMember.id}>` : buyer;
  const sellerDisplay = sellerMember ? `<@${sellerMember.id}>` : seller;

  store.midmanTicketContext.set(ticketChannel.id, {
    pihak1: sellerDisplay,
    pihak2: buyerDisplay,
    range_label,
    fee_label
  });

  const createdPayload = buildMidmanCreatedPayload(
    `<@${user.id}>`,
    range_label,
    fee_label,
    sellerDisplay,
    buyerDisplay,
    payment,
    item,
    hargaFormatted
  );
  const [ok, , err] = await sendV2MessageToChannel(token, ticketChannel.id, createdPayload);
  if (!ok) {
    await ticketChannel.send({
      content:
        `# :ticket: Midman Ticket Dibuat\n\n` +
        `- Rentang Transaksi: ${range_label}\n` +
        `- Fee Rekber: ${fee_label}\n` +
        `- Penjual: ${sellerDisplay}\n` +
        `- Pembeli: ${buyerDisplay}\n` +
        `- Penanggung Fee: ${payment}\n` +
        `- Jenis Barang: ${item}\n` +
        `- Harga: ${hargaFormatted}\n` +
        `- Pembuat Ticket: <@${user.id}>\n\n` +
        'Staff Midman akan segera merespons untuk membantu transaksi.'
    });
    console.error('[MIDMAN] V2 failed:', err);
  }

  const mentions = midmanRole ? [midmanRole.toString()] : [];
  await ticketChannel.send({
    content: `${mentions.join(' ')}\nGunakan tombol berikut untuk handle ticket ini.`,
    components: [midmanControlRow()]
  });

  await interaction.reply({
    content: `🎫 Ticket Midman kamu sudah dibuat: ${ticketChannel}`,
    ephemeral: true
  });

  const log = guild.channels.cache.get(cfg.TICKET_LOG_CHANNEL_ID);
  if (log) {
    await log.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('📩 Midman Ticket Dibuat')
          .setColor(cfg.VORA_BLUE)
          .setDescription(
            `**User:** <@${user.id}>\n**Item:** ${item}\n**Buyer:** ${buyer}\n**Seller:** ${seller}\n**Harga:** ${hargaFormatted}\n**Payment:** ${payment}\n\n📌 **Channel:** ${ticketChannel}`
          )
          .setFooter({ text: 'VoraHub Midman System • Ticket Log' })
      ]
    });
  }

  store.midmanSessions.delete(user.id);
}

module.exports = {
  MIDMAN_CID_RANGE,
  buildMidmanStartPayload,
  buildMidmanSuccessPayload,
  sendV2MessageToChannel,
  sendV2InteractionCallback,
  handleMidmanComponent,
  createMidmanTicket,
  midmanControlRow
};
