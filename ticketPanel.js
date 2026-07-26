/**
 * AlepzBot — Hantar/Kemaskini Panel Tiket
 * Pemilik: fiqq
 * Versi: 2.0.0
 */

const cfg = require('./config');

async function sendV2(token, channelId, payload) {
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

async function editV2(token, channelId, messageId, payload) {
  if (!messageId) return [false, null, 'missing message id'];
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (res.status === 200 || res.status === 201) return [true, null, null];
  return [false, res.status, await res.text()];
}

function generalPanelPayload() {
  return {
    flags: 32768,
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
                  '# Panel Tiket AlepzBot\nPanel ini digunakan untuk menghubungi sokongan dan mengendalikan pelbagai permintaan dengan lebih teratur. Anda boleh menggunakannya untuk:\n\n- Laporkan pepijat atau isu teknikal\n- Mohon bantuan atau sokongan\n- Laporkan pengguna yang melanggar peraturan\n- Tanya soalan umum\n- Hantar cadangan atau permintaan\n\nSemua tiket akan dikendalikan oleh pasukan sokongan untuk memastikan bantuan yang sewajarnya.'
              }
            ],
            accessory: {
              type: 11,
              media: {
                url: 'https://cdn.discordapp.com/attachments/1458860086381510811/1487817042886393966/BG_5_ACC.png?ex=69ca8519&is=69c93399&hm=1f438fd819c1d43f4b0cd7143737a9dbd50960232860e4a0749dd983f0284205&'
              }
            }
          },
          { type: 14, spacing: 2 },
          {
            type: 10,
            content:
              '\n**Tujuan:**  \nBuka saluran untuk mendapatkan sokongan, laporkan isu, atau mohon peranan. Tekan butang yang bersesuaian dengan keperluan anda.\n\n**Butang:**  \n🎥 **Pencipta Kandungan** - Mohon peranan (minimum 1K YouTube & 1K TikTok)  \n📬 **Sokongan** - Hubungi staff untuk bantuan  \n🐞 **Laporan Pepijat / Salah Laku** - Laporkan pepijat atau pelanggaran peraturan\n\n**Peraturan:**  \n• Tekan butang hanya apabila perlu  \n• Berikan sebab yang jelas untuk membuka tiket  \n• Jangan tutup tiket sebelum isu anda selesai'
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 1,
            components: [
              { style: 2, type: 2, label: 'Pencipta Kandungan', custom_id: cfg.CID_TICKET_CREATOR },
              { style: 3, type: 2, label: 'Sokongan', custom_id: cfg.CID_TICKET_SUPPORT },
              { style: 4, type: 2, label: 'Laporan Pepijat', custom_id: cfg.CID_TICKET_REPORT }
            ]
          }
        ]
      }
    ]
  };
}

function purchasePanelPayload() {
  return {
    flags: 32768,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content:
              '# Panel Tiket Pembelian AlepzBot\nAnda hanya boleh membuka tiket untuk membeli skrip. Membuka tiket tanpa membuat pembelian akan dianggap sebagai troll dan amaran akan diberikan.\n\nSila hubungi staff untuk maklumat harga dan pembayaran.'
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 10,
            content:
              '# Kaedah Pembayaran:\nSila hubungi staff untuk maklumat lanjut mengenai kaedah pembayaran yang tersedia.'
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 1,
            components: [
              {
                style: 3,
                type: 2,
                label: 'Beli Skrip (Buka Tiket)',
                custom_id: cfg.CID_TICKET_PURCHASE
              }
            ]
          }
        ]
      }
    ]
  };
}

async function sendTicketPanel(client, token) {
  const legacyMainMessageId = '1458004446473883732';
  const [editedMain, statusMain] = await editV2(
    token,
    cfg.TICKET_PANEL_CHANNEL_ID,
    legacyMainMessageId,
    generalPanelPayload()
  );
  if (!editedMain && statusMain !== 404) {
    console.warn('[PANEL] Gagal mengemaskini panel utama, mencipta mesej baru.');
  }
  if (!editedMain) {
    await sendV2(token, cfg.TICKET_PANEL_CHANNEL_ID, generalPanelPayload());
  }

  await sendV2(token, cfg.TICKET_PANEL_PURCHASE_CHANNEL_ID, purchasePanelPayload());

  const x8Channel = await client.channels.fetch(cfg.TICKET_PANEL_CHANNEL_ID_X8).catch(() => null);
  if (x8Channel && x8Channel.isTextBased()) {
    await x8Channel.send({
      content:
        '🎫 **Tiket X8**\nKlik butang di bawah untuk mendaftar acara X8.',
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 3, label: '🚀 Daftar Acara', custom_id: 'ticket_x8' }]
        }
      ]
    });
  }
}

module.exports = { sendTicketPanel };
