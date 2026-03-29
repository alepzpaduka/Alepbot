const cfg = require('./config');

function buildGameStatusComponentsPayload(gameStatusData) {
  const overallKey = gameStatusData.overall_status || 'working';
  const overallEmoji = cfg.GAME_STATUS_EMOJIS[overallKey] || cfg.GAME_STATUS_EMOJIS.working;
  const gameLines = [];
  for (const game of cfg.GAME_LIST) {
    const statusKey = gameStatusData.statuses?.[game] || 'working';
    const emoji = cfg.GAME_STATUS_EMOJIS[statusKey] || cfg.GAME_STATUS_EMOJIS.working;
    gameLines.push(`- **${game} : ${emoji}**`);
  }
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
                content: `# Vorahub Script Status\n**Status : ${overallEmoji} **`
              }
            ],
            accessory: {
              type: 11,
              media: { url: cfg.GAME_STATUS_IMAGE_URL }
            }
          },
          { type: 14, spacing: 2 },
          { type: 10, content: cfg.GAME_STATUS_LEGEND_TEXT }
        ]
      },
      {
        type: 17,
        components: [{ type: 10, content: gameLines.join('\n') }]
      },
      {
        type: 17,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: 'Suggestion',
                url: 'https://discord.com/channels/1434540370284384338/1434782966533324872'
              },
              {
                type: 2,
                style: 5,
                label: 'Report Bugs',
                url: 'https://discord.com/channels/1434540370284384338/1434769709928284232'
              },
              {
                type: 2,
                style: 5,
                label: 'Buy Premium',
                url: 'https://discord.com/channels/1434540370284384338/1434769506798010480'
              }
            ]
          }
        ]
      }
    ]
  };
}

async function upsertGameStatusMessage(token, gameStatusData, saveGameStatus) {
  const payload = buildGameStatusComponentsPayload(gameStatusData);
  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json'
  };
  const channelId = cfg.GAME_STATUS_TARGET_CHANNEL_ID;
  let mid = gameStatusData.message_id;

  if (mid) {
    const patchUrl = `https://discord.com/api/v10/channels/${channelId}/messages/${mid}`;
    const res = await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify(payload) });
    if (res.status === 200 || res.status === 201) return [true, String(mid), null];
    if (res.status !== 404) return [false, null, await res.text()];
  }

  const postUrl = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const res = await fetch(postUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (res.status === 200 || res.status === 201) {
    const data = await res.json();
    gameStatusData.message_id = data.id;
    if (typeof saveGameStatus === 'function') saveGameStatus();
    return [true, String(data.id), null];
  }
  return [false, null, await res.text()];
}

module.exports = { buildGameStatusComponentsPayload, upsertGameStatusMessage };
