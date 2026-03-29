/**
 * Send/update ticket panels with Components V2 payloads.
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
                  '# Vorahub Ticket Panel\nThis panel is used to contact support and handle various requests in an organized way. You can use it to:\n\n- Report bugs or technical issues\n- Ask for help or support\n- Report users who violate the rules\n- Ask general questions\n- Send suggestions or requests\n\nAll tickets will be handled by the support team to ensure proper assistance.'
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
              '\n**Purpose:**  \nOpen a channel to get support, report issues, or request roles. Press the button matching your need.\n\n**Buttons:**  \n🎥 **Content Creator** - Apply for the role (min 1K YouTube subs & 1K TikTok followers)  \n📬 **Support** - Contact staff for help or assistance  \n🐞 **Bug / Misconduct Report** - Report bugs or rule violations\n\n**Rules:**  \n• Press buttons only when necessary  \n• Provide a clear reason for opening a ticket  \n• Do not close a ticket before your issue is resolved'
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 1,
            components: [
              { style: 2, type: 2, label: 'Content Creator Request', custom_id: cfg.CID_TICKET_CREATOR },
              { style: 3, type: 2, label: 'Support', custom_id: cfg.CID_TICKET_SUPPORT },
              { style: 4, type: 2, label: 'Bug Reports', custom_id: cfg.CID_TICKET_REPORT }
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
              '# Vorahub - Purchase Ticket Panel\nYou can only create a ticket to purchase a script. Opening a ticket without making a purchase will be considered intentional trolling and a warning will be given.\n\nOur script price is stated in <#1434760552688779336>\n'
          }
        ]
      },
      {
        type: 17,
        components: [
          {
            type: 10,
            content:
              '# Payment Method:\n- <:unknown:1487825663359451227>  - QRIS ( Quick Response Code Indonesian Standard )\n- <:unknown:1487825782947446794>  - Dana\n- <:unknown:1487825736948645969>  - Gopay\n- <:unknown:1487825617117511831>  - Paypal'
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
                label: 'Purchase Script ( Open A Ticket )',
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
    console.warn('[PANEL] Failed updating main panel, creating new message instead.');
  }
  if (!editedMain) {
    await sendV2(token, cfg.TICKET_PANEL_CHANNEL_ID, generalPanelPayload());
  }

  await sendV2(token, cfg.TICKET_PANEL_PURCHASE_CHANNEL_ID, purchasePanelPayload());

  const x8Channel = await client.channels.fetch(cfg.TICKET_PANEL_CHANNEL_ID_X8).catch(() => null);
  if (x8Channel && x8Channel.isTextBased()) {
    await x8Channel.send({
      content:
        '🎫 **Ticket X8**\nKlik tombol di bawah untuk register event X8.',
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 3, label: '🚀 Register Event', custom_id: 'ticket_x8' }]
        }
      ]
    });
  }
}

module.exports = { sendTicketPanel };
