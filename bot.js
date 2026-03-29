/**
 * Discord bot â€” port of bot.py (discord.py) to discord.js
 */
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes
} = require('discord.js');

const cfg = require('./config');
const store = require('./store');
const cooldown = require('./cooldown');
const { createTicket } = require('./tickets');
const midman = require('./midman');
const gameStatusLib = require('./gameStatusLib');
const ticketHandlers = require('./ticketHandlers');
const { sendTicketPanel } = require('./ticketPanel');

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment (.env).');
  process.exit(1);
}

function calculateSalary(totalSales) {
  return Math.min(Math.floor(totalSales * cfg.COMMISSION_RATE), cfg.SALARY_CAP);
}

function canManageGameStatus(interaction) {
  const adminRole = interaction.guild?.roles.cache.get(cfg.ADMIN_ROLE_ID);
  if (adminRole && interaction.member.roles.cache.has(adminRole.id)) return true;
  return interaction.member.roles.cache.some((r) => r.name.toLowerCase() === 'branch');
}

function formatChangelogLines(rawText) {
  const lines = rawText
    .split('|')
    .map((l) => l.trim())
    .filter(Boolean);
  let out = '';
  for (const cleanedLine of lines) {
    if (cleanedLine.startsWith('+')) {
      out += `[+] ${cleanedLine.slice(1).trim()}\n`;
    } else if (cleanedLine.startsWith('/')) {
      out += `[/] ${cleanedLine.slice(1).trim()}\n`;
    } else if (cleanedLine.startsWith('=')) {
      out += `[/] ${cleanedLine.slice(1).trim()}\n`;
    } else if (cleanedLine.startsWith('!')) {
      out += `[!] ${cleanedLine.slice(1).trim()}\n`;
    } else if (cleanedLine.startsWith('-')) {
      out += `[-] ${cleanedLine.slice(1).trim()}\n`;
    } else {
      const lower = cleanedLine.toLowerCase();
      if (lower.startsWith('improve')) {
        out += `[/] ${cleanedLine}\n`;
      } else if (lower.startsWith('remove')) {
        out += `[-] ${cleanedLine}\n`;
      } else if (lower.startsWith('fix')) {
        out += `[!] ${cleanedLine}\n`;
      } else {
        out += `[+] ${cleanedLine}\n`;
      }
    }
  }
  return out.trim();
}

const STATUS_CHOICES = [
  { name: 'Working', value: 'working' },
  { name: 'Not Working', value: 'not_working' },
  { name: 'Maybe Outdated', value: 'outdated' },
  { name: 'Working In Progress', value: 'in_progress' }
];

function buildSlashCommands() {
  return [
    new SlashCommandBuilder().setName('hello').setDescription('Says hello to the user.').toJSON(),
    new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Chat Anything With A Bot.')
      .addStringOption((o) => o.setName('messages').setDescription('Message').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('sendgamesstatus')
      .setDescription('[ADMIN] Kirim panel status script games')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('setgamestatus')
      .setDescription('[ADMIN] Ubah status game tertentu')
      .addStringOption((o) => o.setName('game').setDescription('Nama game').setRequired(true))
      .addStringOption((o) =>
        o
          .setName('status')
          .setDescription('Status terbaru')
          .setRequired(true)
          .addChoices(...STATUS_CHOICES)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('addgame')
      .setDescription('[ADMIN] Tambah game baru ke panel status')
      .addStringOption((o) => o.setName('game_name').setDescription('Nama game').setRequired(true))
      .addStringOption((o) =>
        o
          .setName('status')
          .setDescription('Status awal')
          .addChoices(...STATUS_CHOICES)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('setoverallstatus')
      .setDescription('[ADMIN] Ubah status utama panel game')
      .addStringOption((o) =>
        o
          .setName('status')
          .setDescription('Status utama')
          .setRequired(true)
          .addChoices(...STATUS_CHOICES)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kicks a member from the server.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a member from the server.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('nigger')
      .setDescription('Just a normal command')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a member.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('delwarn')
      .setDescription('Remove a warning from a member.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .addIntegerOption((o) =>
        o.setName('index').setDescription('Index warn (mulai 1), kosong = hapus terakhir')
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('warnlist')
      .setDescription('View all warns of a member.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('timeout')
      .setDescription('Temporarily mute a member.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .addIntegerOption((o) =>
        o.setName('minutes').setDescription('Duration in minutes').setMinValue(1).setMaxValue(40320)
      )
      .addStringOption((o) => o.setName('reason').setDescription('Reason'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('deltimeout')
      .setDescription('Remove timeout from a member.')
      .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('changelog')
      .setDescription('Send VoraHub changelog (Components V2).')
      .addStringOption((o) =>
        o
          .setName('tier')
          .setDescription('Tier')
          .setRequired(true)
          .addChoices(
            { name: 'Free', value: 'Free' },
            { name: 'Premium', value: 'Premium' },
            { name: 'Both', value: 'Both' }
          )
      )
      .addStringOption((o) => o.setName('map_name').setDescription('Map / feature name').setRequired(true))
      .addStringOption((o) => o.setName('version').setDescription('Version e.g. v1.0').setRequired(true))
      .addStringOption((o) => o.setName('changelogs').setDescription('Changes, pisah dengan |'))
      .addStringOption((o) => o.setName('premium_changelogs').setDescription('Premium only (Both)'))
      .addStringOption((o) => o.setName('free_changelogs').setDescription('Free only (Both)'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('ticketpanel')
      .setDescription('Send the ticket creation panel.')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('midmanpanel')
      .setDescription('Kirim panel midman (manual).')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('add')
      .setDescription('Tambah user ke ticket ini')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('remove')
      .setDescription('Keluarkan user dari ticket ini')
      .addUserOption((o) => o.setName('user').setDescription('User').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('sales')
      .setDescription('Sales')
      .addUserOption((o) => o.setName('staff').setDescription('Opsional: staff tertentu'))
      .addStringOption((o) => o.setName('description').setDescription('Deskripsi'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('mygaji')
      .setDescription('Lihat total penjualan dan gaji staff')
      .addUserOption((o) => o.setName('staff').setDescription('Opsional: staff lain'))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('gajisudahbayar')
      .setDescription('[ADMIN] Konfirmasi pembayaran gaji staff dan reset sales')
      .addUserOption((o) => o.setName('staff').setDescription('Staff').setRequired(true))
      .toJSON(),
    new SlashCommandBuilder()
      .setName('resetcooldown')
      .setDescription('[ADMIN] Reset cooldown claim ticket untuk staff')
      .addUserOption((o) => o.setName('staff').setDescription('Staff').setRequired(true))
      .toJSON()
  ];
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember]
});

async function handleSlash(interaction) {
  const { commandName } = interaction;

  if (commandName === 'hello') {
    await interaction.reply(`Hello ${interaction.user}!`);
    return;
  }

  if (commandName === 'chat') {
    await interaction.reply(interaction.options.getString('messages', true));
    return;
  }

  if (commandName === 'sendgamesstatus') {
    if (!canManageGameStatus(interaction)) {
      await interaction.reply({
        content: 'âŒ Hanya admin atau role Branch yang bisa menggunakan command ini.',
        ephemeral: true
      });
      return;
    }
    const ch = interaction.guild.channels.cache.get(cfg.GAME_STATUS_TARGET_CHANNEL_ID);
    if (!ch) {
      await interaction.reply({
        content: `âŒ Channel status tidak ditemukan: \`${cfg.GAME_STATUS_TARGET_CHANNEL_ID}\``,
        ephemeral: true
      });
      return;
    }
    const [ok, messageId, err] = await gameStatusLib.upsertGameStatusMessage(
      TOKEN,
      store.gameStatusData,
      () => store.saveGameStatus()
    );
    if (!ok) {
      await interaction.reply({ content: `âŒ ${err}`, ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `âœ… Panel game status berhasil dikirim di ${ch}\nhttps://discord.com/channels/${interaction.guildId}/${cfg.GAME_STATUS_TARGET_CHANNEL_ID}/${messageId}`,
      ephemeral: true
    });
    return;
  }

  if (commandName === 'setgamestatus') {
    if (!canManageGameStatus(interaction)) {
      await interaction.reply({
        content: 'âŒ Hanya admin atau role Branch yang bisa menggunakan command ini.',
        ephemeral: true
      });
      return;
    }
    const game = interaction.options.getString('game', true);
    const status = interaction.options.getString('status', true);
    if (!store.gameStatusData.statuses || store.gameStatusData.statuses[game] === undefined) {
      await interaction.reply({ content: `âŒ Game \`${game}\` belum terdaftar. Pakai \`/addgame\` dulu.`, ephemeral: true });
      return;
    }
    store.gameStatusData.statuses[game] = status;
    store.saveGameStatus();
    const ch = interaction.guild.channels.cache.get(cfg.GAME_STATUS_TARGET_CHANNEL_ID);
    if (!ch) {
      await interaction.reply({
        content: `âš ï¸ Status tersimpan, tapi channel \`${cfg.GAME_STATUS_TARGET_CHANNEL_ID}\` tidak ditemukan.`,
        ephemeral: true
      });
      return;
    }
    const [ok, , err] = await gameStatusLib.upsertGameStatusMessage(
      TOKEN,
      store.gameStatusData,
      () => store.saveGameStatus()
    );
    if (!ok) {
      await interaction.reply({ content: `âŒ Status tersimpan, tapi gagal update panel: ${err}`, ephemeral: true });
      return;
    }
    await interaction.reply({ content: `âœ… Status **${game}** diubah ke **${status}**.`, ephemeral: true });
    return;
  }

  if (commandName === 'addgame') {
    if (!canManageGameStatus(interaction)) {
      await interaction.reply({
        content: 'âŒ Hanya admin atau role Branch yang bisa menggunakan command ini.',
        ephemeral: true
      });
      return;
    }
    let gameName = interaction.options.getString('game_name', true).trim();
    if (!gameName) {
      await interaction.reply({ content: 'âŒ Nama game tidak boleh kosong.', ephemeral: true });
      return;
    }
    const status = interaction.options.getString('status') || 'working';
    const existing = store.gameStatusData.statuses || {};
    for (const k of Object.keys(existing)) {
      if (k.toLowerCase() === gameName.toLowerCase()) {
        await interaction.reply({ content: `âŒ Game \`${k}\` sudah ada di daftar.`, ephemeral: true });
        return;
      }
    }
    if (!store.gameStatusData.statuses) store.gameStatusData.statuses = {};
    store.gameStatusData.statuses[gameName] = status;
    if (!cfg.GAME_LIST.includes(gameName)) cfg.GAME_LIST.push(gameName);
    store.saveGameStatus();
    const ch = interaction.guild.channels.cache.get(cfg.GAME_STATUS_TARGET_CHANNEL_ID);
    if (!ch) {
      await interaction.reply({
        content: `âš ï¸ Game berhasil ditambah, tapi channel \`${cfg.GAME_STATUS_TARGET_CHANNEL_ID}\` tidak ditemukan.`,
        ephemeral: true
      });
      return;
    }
    const [ok, , err] = await gameStatusLib.upsertGameStatusMessage(
      TOKEN,
      store.gameStatusData,
      () => store.saveGameStatus()
    );
    if (!ok) {
      await interaction.reply({ content: `âŒ Game berhasil ditambah, tapi gagal update panel: ${err}`, ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `âœ… Game **${gameName}** berhasil ditambahkan dengan status **${status}**.`,
      ephemeral: true
    });
    return;
  }

  if (commandName === 'setoverallstatus') {
    if (!canManageGameStatus(interaction)) {
      await interaction.reply({
        content: 'âŒ Hanya admin atau role Branch yang bisa menggunakan command ini.',
        ephemeral: true
      });
      return;
    }
    const status = interaction.options.getString('status', true);
    store.gameStatusData.overall_status = status;
    store.saveGameStatus();
    const ch = interaction.guild.channels.cache.get(cfg.GAME_STATUS_TARGET_CHANNEL_ID);
    if (!ch) {
      await interaction.reply({
        content: `âš ï¸ Status utama tersimpan, tapi channel \`${cfg.GAME_STATUS_TARGET_CHANNEL_ID}\` tidak ditemukan.`,
        ephemeral: true
      });
      return;
    }
    const [ok, , err] = await gameStatusLib.upsertGameStatusMessage(
      TOKEN,
      store.gameStatusData,
      () => store.saveGameStatus()
    );
    if (!ok) {
      await interaction.reply({ content: `âŒ Status utama tersimpan, tapi gagal update panel: ${err}`, ephemeral: true });
      return;
    }
    await interaction.reply({ content: `âœ… Status utama panel diubah ke **${status}**.`, ephemeral: true });
    return;
  }

  if (commandName === 'kick') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "You don't have permission to kick members.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    if (!member) {
      await interaction.reply({ content: 'âŒ Member tidak ditemukan di server ini.', ephemeral: true });
      return;
    }
    const reason = interaction.options.getString('reason') || 'No Reason Provided';
    if (cfg.IMMUNE_USER_IDS.includes(String(member.id))) {
      await interaction.reply({ content: `âŒ ${member} cannot be kicked (protected user).`, ephemeral: true });
      return;
    }
    try {
      await member.kick(reason);
      await interaction.reply(`${member} has been kicked.\nReason: ${reason}`);
    } catch (e) {
      await interaction.reply({ content: `Failed to kick ${member}. Error: ${e.message}`, ephemeral: true });
    }
    return;
  }

  if (commandName === 'ban') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ content: "You don't have permission to ban members.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    if (!member) {
      await interaction.reply({ content: 'âŒ Member tidak ditemukan di server ini.', ephemeral: true });
      return;
    }
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (cfg.IMMUNE_USER_IDS.includes(String(member.id))) {
      await interaction.reply({ content: `âŒ ${member} cannot be Ban (protected user).`, ephemeral: true });
      return;
    }
    try {
      await member.ban({ reason });
      await interaction.reply(`${member} has been banned.\nReason: ${reason}`);
    } catch (e) {
      await interaction.reply({ content: `Failed to ban ${member}. Error: ${e.message}`, ephemeral: true });
    }
    return;
  }

  if (commandName === 'nigger') {
    const member = interaction.options.getMember('member');
    await interaction.reply(`${member}'ve been nigger by ${interaction.user}`);
    return;
  }

  if (commandName === 'warn') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "You don't have permission to warn members.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildId = String(interaction.guildId);
    const memberId = String(member.id);
    if (!store.warns[guildId]) store.warns[guildId] = {};
    if (!store.warns[guildId][memberId]) store.warns[guildId][memberId] = [];
    store.warns[guildId][memberId].push(reason);
    store.saveWarns();
    const total = store.warns[guildId][memberId].length;
    await interaction.reply(`${member} has been warned.\nReason: ${reason}\nTotal warns: ${total}`);
    return;
  }

  if (commandName === 'delwarn') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "You don't have permission to remove warns.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    const guildId = String(interaction.guildId);
    const memberId = String(member.id);
    const idx = interaction.options.getInteger('index');
    if (!store.warns[guildId]?.[memberId]?.length) {
      await interaction.reply({ content: `${member} has no warns.`, ephemeral: true });
      return;
    }
    const arr = store.warns[guildId][memberId];
    let removed;
    if (idx == null) {
      removed = arr.pop();
    } else {
      if (idx < 1 || idx > arr.length) {
        await interaction.reply({
          content: `Invalid index. Member has ${arr.length} warns.`,
          ephemeral: true
        });
        return;
      }
      removed = arr.splice(idx - 1, 1)[0];
    }
    const left = store.warns[guildId][memberId].length;
    if (left === 0) delete store.warns[guildId][memberId];
    if (Object.keys(store.warns[guildId] || {}).length === 0) delete store.warns[guildId];
    store.saveWarns();
    await interaction.reply(
      `Removed warn from ${member}.\nRemoved reason: ${removed}\nTotal warns left: ${left}`
    );
    return;
  }

  if (commandName === 'warnlist') {
    const member = interaction.options.getMember('member');
    const guildId = String(interaction.guildId);
    const memberId = String(member.id);
    if (!store.warns[guildId]?.[memberId]?.length) {
      await interaction.reply({ content: `${member} has no warns.`, ephemeral: true });
      return;
    }
    const list = store.warns[guildId][memberId]
      .map((reason, i) => `${i + 1}. ${reason}`)
      .join('\n');
    await interaction.reply(`Warns for ${member}:\n${list}`);
    return;
  }

  if (commandName === 'timeout') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "You don't have permission to timeout members.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    const minutes = interaction.options.getInteger('minutes') ?? 5;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    try {
      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply(`${member} has been timed out for ${minutes} minutes.\nReason: ${reason}`);
    } catch (e) {
      await interaction.reply({ content: `Failed to timeout ${member}. Error: ${e.message}`, ephemeral: true });
    }
    return;
  }

  if (commandName === 'deltimeout') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: "You don't have permission to remove timeout.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    try {
      await member.timeout(null);
      await interaction.reply(`Timeout removed from ${member}.`);
    } catch (e) {
      await interaction.reply({ content: `Failed to remove timeout. Error: ${e.message}`, ephemeral: true });
    }
    return;
  }

  if (commandName === 'changelog') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: 'âŒ Command ini **khusus Admin saja**.', ephemeral: true });
      return;
    }
    const tier = interaction.options.getString('tier', true);
    const mapName = interaction.options.getString('map_name', true);
    const version = interaction.options.getString('version', true);
    const changelogs = interaction.options.getString('changelogs') || '';
    const premiumChangelogs = interaction.options.getString('premium_changelogs') || '';
    const freeChangelogs = interaction.options.getString('free_changelogs') || '';

    const changelogChannel = interaction.guild.channels.cache.get(cfg.CHANGELOG_CHANNEL_ID);
    if (!changelogChannel) {
      await interaction.reply({ content: 'âŒ Changelog channel not found in this server.', ephemeral: true });
      return;
    }

    let sections = [];
    let mentionRoles = [];
    let titleText = '';

    if (tier === 'Premium') {
      const text = formatChangelogLines(changelogs);
      if (!text) {
        await interaction.reply({ content: 'âŒ Isi `changelogs` untuk tier Premium tidak boleh kosong.', ephemeral: true });
        return;
      }
      sections = [['Premium', text]];
      mentionRoles = [cfg.PREMIUM_ROLE_ID];
      titleText = 'Vorahub Premium Update Logs';
    } else if (tier === 'Free') {
      const text = formatChangelogLines(changelogs);
      if (!text) {
        await interaction.reply({ content: 'âŒ Isi `changelogs` untuk tier Free tidak boleh kosong.', ephemeral: true });
        return;
      }
      sections = [['Free', text]];
      mentionRoles = [cfg.MEMBER_TAG_ID];
      titleText = 'Vorahub Free Update Logs';
    } else {
      let premiumText = premiumChangelogs.trim() ? formatChangelogLines(premiumChangelogs) : '';
      let freeText = freeChangelogs.trim() ? formatChangelogLines(freeChangelogs) : '';
      if (!premiumText && !freeText && changelogs.trim()) {
        premiumText = formatChangelogLines(changelogs);
      }
      if (premiumText) sections.push(['Premium', premiumText]);
      if (freeText) sections.push(['Free', freeText]);
      if (!sections.length) {
        await interaction.reply({
          content: 'âŒ Untuk tier Both, isi minimal salah satu: `premium_changelogs` atau `free_changelogs`.',
          ephemeral: true
        });
        return;
      }
      mentionRoles = [cfg.MEMBER_TAG_ID];
      titleText = 'Vorahub Update Logs';
    }

    const mentionLine = mentionRoles.map((rid) => `<@&${rid}>`).join(' ');

    const payload = {
      flags: 32768,
      allowed_mentions: { roles: mentionRoles.map(String) },
      components: [
        {
          type: 17,
          spoiler: false,
          components: [
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `# ${titleText}\n- **Map** : ${mapName}\n- **Version** : ${version}\n${mentionLine}`
                }
              ],
              accessory: {
                type: 11,
                media: { url: cfg.GUILD_ICON_URL }
              }
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
                  type: 2,
                  style: 5,
                  url: `https://discord.com/channels/${cfg.GUILD_ID_FOR_LINKS}/${cfg.BUGREPORT_CHANNEL_ID}`,
                  label: 'Report Bugs'
                },
                {
                  type: 2,
                  style: 5,
                  url: `https://discord.com/channels/${cfg.GUILD_ID_FOR_LINKS}/${cfg.SUGGESTION_CHANNEL_ID}`,
                  label: 'Suggestion'
                }
              ]
            }
          ]
        }
      ]
    };

    for (const [name, text] of [...sections].reverse()) {
      payload.components.splice(1, 0, {
        type: 17,
        components: [{ type: 10, content: `# ${name} :\n${text}` }]
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const res = await fetch(`https://discord.com/api/v10/channels/${cfg.CHANGELOG_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.status === 200 || res.status === 201) {
      await interaction.editReply({
        content: `âœ… Changelog **${tier}** â€” **${mapName}** v**${version}** berhasil dikirim ke <#${cfg.CHANGELOG_CHANNEL_ID}>.`
      });
    } else {
      const err = await res.text();
      await interaction.editReply({ content: `âŒ Gagal mengirim changelog. Status: ${res.status}\n\`\`\`${err}\`\`\`` });
    }
    return;
  }

  if (commandName === 'ticketpanel') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "âŒ You don't have permission to use this command.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await sendTicketPanel(client, TOKEN);
    await interaction.editReply({ content: 'âœ… Ticket panel has been sent.' });
    return;
  }

  if (commandName === 'midmanpanel') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "âŒ You don't have permission to use this command.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const [ok, , err] = await midman.sendV2MessageToChannel(TOKEN, interaction.channelId, midman.buildMidmanStartPayload());
    if (!ok) {
      await interaction.editReply({ content: `âŒ Gagal kirim panel Midman V2: ${err}` });
      return;
    }
    await interaction.editReply({ content: 'âœ… Panel Midman V2 berhasil dikirim.' });
    return;
  }

  if (commandName === 'add') {
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      await interaction.reply({ content: 'âŒ Kamu bukan staff.', ephemeral: true });
      return;
    }
    const user = interaction.options.getMember('user');
    const ids = ticketHandlers.collectTicketChannelIds(store).map(String);
    if (!ids.includes(String(interaction.channelId))) {
      await interaction.reply({ content: 'âŒ Kamu tidak bisa berinteraksi dengan channel ini karena bukan ticket.', ephemeral: true });
      return;
    }
    await interaction.channel.permissionOverwrites.edit(user, {
      ViewChannel: true,
      SendMessages: true
    });
    await interaction.reply({ content: `âœ… ${user} telah **ditambahkan** ke ticket ini.` });
    return;
  }

  if (commandName === 'remove') {
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      await interaction.reply({ content: 'âŒ Kamu bukan staff.', ephemeral: true });
      return;
    }
    const user = interaction.options.getMember('user');
    const ids = ticketHandlers.collectTicketChannelIds(store).map(String);
    if (!ids.includes(String(interaction.channelId))) {
      await interaction.reply({ content: 'âŒ Kamu tidak bisa berinteraksi dengan channel ini karena bukan ticket.', ephemeral: true });
      return;
    }
    const creatorIds = [];
    for (const [uid, data] of Object.entries(store.activeTickets)) {
      const cid = typeof data === 'object' ? data.channel_id : data;
      if (String(cid) === String(interaction.channelId)) creatorIds.push(uid);
    }
    for (const [uid, cid] of Object.entries(store.x8Tickets)) {
      if (String(cid) === String(interaction.channelId)) creatorIds.push(uid);
    }
    for (const [uid, cid] of Object.entries(store.midmanTickets)) {
      if (String(cid) === String(interaction.channelId)) creatorIds.push(uid);
    }
    if (creatorIds.map(String).includes(String(user.id))) {
      await interaction.reply({ content: 'âŒ Kamu tidak bisa mengeluarkan *pembuat ticket*.', ephemeral: true });
      return;
    }
    await interaction.channel.permissionOverwrites.delete(user);
    await interaction.reply({ content: `ðŸš« ${user} telah **dikeluarkan** dari ticket ini.` });
    return;
  }

  if (commandName === 'sales') {
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    const helperRole = interaction.guild.roles.cache.get(cfg.HELPER_ROLE_ID);
    const ok =
      (staffRole && interaction.member.roles.cache.has(staffRole.id)) ||
      (helperRole && interaction.member.roles.cache.has(helperRole.id));
    if (!ok) {
      await interaction.reply({ content: 'âŒ Hanya staff yang bisa menggunakan command ini.', ephemeral: true });
      return;
    }
    const staffUser = interaction.options.getUser('staff');
    if (staffUser) {
      const data = store.getSales(staffUser.id);
      const gaji = calculateSalary(data.total);
      await interaction.reply({
        content: `ðŸ“Š **${staffUser.tag}** â€” Sales: IDR ${data.total.toLocaleString('id-ID')} | Gaji: IDR ${gaji.toLocaleString('id-ID')} | ${data.sales.length} transaksi`,
        ephemeral: true
      });
      return;
    }
    const leaderboard = [];
    for (const [staffIdStr, data] of Object.entries(store.salesData)) {
      const staffId = staffIdStr;
      const member = interaction.guild.members.cache.get(staffId);
      if (member) {
        leaderboard.push({
          member,
          total: data.total,
          count: data.sales.length
        });
      }
    }
    leaderboard.sort((a, b) => b.total - a.total);
    if (!leaderboard.length) {
      await interaction.reply({ content: 'ðŸ“Š Belum ada data penjualan yang tercatat.', ephemeral: true });
      return;
    }
    let leaderboardText = '';
    const medals = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'];
    leaderboard.slice(0, 10).forEach((entry, idx) => {
      const medal = idx < 3 ? medals[idx] : `**${idx + 1}.**`;
      const commission = calculateSalary(entry.total);
      leaderboardText += `${medal} ${entry.member}\n   ðŸ’° Sales: IDR ${entry.total.toLocaleString('id-ID')} | ðŸ’µ Gaji: IDR ${commission.toLocaleString('id-ID')} | ðŸ“¦ ${entry.count} transaksi\n\n`;
    });
    const totalAll = leaderboard.reduce((s, e) => s + e.total, 0);
    const totalTx = leaderboard.reduce((s, e) => s + e.count, 0);
    const embed = new EmbedBuilder()
      .setTitle('ðŸ† Leaderboard Penjualan')
      .setDescription('Top staff berdasarkan total penjualan')
      .setColor(cfg.VORA_BLUE)
      .addFields(
        { name: 'ðŸ“Š Top Performers', value: leaderboardText || 'Tidak ada data', inline: false },
        {
          name: 'ðŸ“ˆ Total Keseluruhan',
          value: `Sales: IDR ${totalAll.toLocaleString('id-ID')} | Transaksi: ${totalTx}`,
          inline: false
        }
      )
      .setFooter({ text: 'VoraHub Sales Tracker â€¢ Komisi 10%' });
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'mygaji') {
    const staffOpt = interaction.options.getUser('staff');
    const targetUser = staffOpt || interaction.user;
    const staffSales = store.getSales(targetUser.id);
    const totalSales = staffSales.total;
    const salesList = staffSales.sales;
    const gaji = calculateSalary(totalSales);
    const isMaxed = gaji >= cfg.SALARY_CAP;
    if (totalSales === 0) {
      await interaction.reply({ content: `ðŸ“Š ${targetUser} belum memiliki penjualan yang tercatat.` });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle('ðŸ’¼ Laporan Gaji & Penjualan')
      .setDescription(`Data untuk ${targetUser}`)
      .setColor(cfg.VORA_BLUE)
      .addFields(
        { name: 'ðŸ“ˆ Total Penjualan', value: `IDR ${totalSales.toLocaleString('id-ID')}`, inline: true },
        {
          name: `ðŸ’µ Gaji (Komisi 10%, Max ${cfg.SALARY_CAP.toLocaleString('id-ID')})`,
          value: `IDR ${gaji.toLocaleString('id-ID')}${isMaxed ? ' ðŸ”´ **MAX**' : ''}`,
          inline: true
        },
        { name: 'ðŸ”¢ Jumlah Transaksi', value: `${salesList.length} transaksi`, inline: true }
      )
      .setFooter({ text: 'VoraHub Sales Tracker â€¢ Data diperbarui real-time' });
    if (isMaxed) {
      embed.addFields({
        name: 'âš ï¸ Peringatan',
        value: 'Gaji sudah mencapai batas maksimal! Tidak bisa claim ticket baru sampai gaji dibayar.',
        inline: false
      });
    }
    if (salesList.length > 0) {
      const recent = salesList.slice(-5).reverse();
      let salesText = '';
      for (const sale of recent) {
        const d = new Date(sale.timestamp);
        const dateStr = d.toLocaleString('id-ID');
        salesText += `â€¢ **IDR ${sale.amount.toLocaleString('id-ID')}** - ${sale.description} (${dateStr})\n`;
      }
      embed.addFields({ name: 'ðŸ“‹ Transaksi Terakhir', value: salesText, inline: false });
    }
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (commandName === 'gajisudahbayar') {
    const adminRole = interaction.guild.roles.cache.get(cfg.ADMIN_ROLE_ID);
    if (!adminRole || !interaction.member.roles.cache.has(adminRole.id)) {
      await interaction.reply({ content: 'âŒ Hanya admin yang bisa menggunakan command ini.', ephemeral: true });
      return;
    }
    const staff = interaction.options.getUser('staff', true);
    const staffSales = store.getSales(staff.id);
    const totalSales = staffSales.total;
    const gaji = calculateSalary(totalSales);
    const transactionCount = staffSales.sales.length;
    if (totalSales === 0) {
      await interaction.reply({ content: `âŒ ${staff} belum memiliki penjualan yang tercatat.`, ephemeral: true });
      return;
    }
    store.resetSales(staff.id);
    const embed = new EmbedBuilder()
      .setTitle('ðŸ’° Gaji Telah Dibayar')
      .setDescription(`Pembayaran gaji untuk ${staff} berhasil dikonfirmasi!`)
      .setColor(0x00ff00)
      .addFields(
        { name: 'ðŸ’µ Gaji yang Dibayar', value: `IDR ${gaji.toLocaleString('id-ID')}`, inline: true },
        { name: 'ðŸ“ˆ Total Sales (Sebelum Reset)', value: `IDR ${totalSales.toLocaleString('id-ID')}`, inline: true },
        { name: 'ðŸ“¦ Transaksi', value: `${transactionCount} transaksi`, inline: true },
        { name: 'âœ… Status', value: 'Sales telah di-reset ke 0. Staff bisa claim ticket lagi!', inline: false }
      )
      .setFooter({ text: `Dibayar oleh ${interaction.user.username}` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('ðŸ’° Gaji Kamu Telah Dibayar!')
        .setDescription('Admin telah mengkonfirmasi pembayaran gaji kamu.')
        .setColor(0x00ff00)
        .addFields(
          { name: 'ðŸ’µ Jumlah', value: `IDR ${gaji.toLocaleString('id-ID')}`, inline: true },
          { name: 'ðŸ“ˆ Total Sales', value: `IDR ${totalSales.toLocaleString('id-ID')}`, inline: true },
          {
            name: 'âœ… Status Baru',
            value: 'Sales kamu sudah di-reset. Kamu bisa claim ticket lagi!',
            inline: false
          }
        )
        .setFooter({ text: 'VoraHub Salary System' });
      const mem = await interaction.guild.members.fetch(staff.id).catch(() => null);
      if (mem) await mem.send({ embeds: [dmEmbed] });
    } catch {
      await interaction.channel
        .send(
          `ðŸ“¢ ${staff} Gaji kamu sebesar **IDR ${gaji.toLocaleString('id-ID')}** telah dibayar! Sales sudah di-reset, kamu bisa claim ticket lagi.`
        )
        .catch(() => {});
    }
    return;
  }

  if (commandName === 'resetcooldown') {
    const adminRole = interaction.guild.roles.cache.get(cfg.ADMIN_ROLE_ID);
    if (!adminRole || !interaction.member.roles.cache.has(adminRole.id)) {
      await interaction.reply({
        content: 'âŒ **Command ini hanya untuk Admin!**\nHanya admin yang bisa reset cooldown staff.',
        ephemeral: true
      });
      return;
    }
    const staff = interaction.options.getUser('staff', true);
    const member = await interaction.guild.members.fetch(staff.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'âŒ Member tidak ditemukan.', ephemeral: true });
      return;
    }
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    const helperRole = interaction.guild.roles.cache.get(cfg.HELPER_ROLE_ID);
    const isStaff =
      (staffRole && member.roles.cache.has(staffRole.id)) ||
      (helperRole && member.roles.cache.has(helperRole.id));
    if (!isStaff) {
      await interaction.reply({ content: `âŒ ${member} bukan staff atau helper!`, ephemeral: true });
      return;
    }
    const staffKey = String(staff.id);
    if (!store.staffCooldowns[staffKey]) {
      await interaction.reply({
        content:
          `â„¹ï¸ ${member} tidak memiliki cooldown aktif.\nStaff ini belum pernah claim ticket atau cooldown sudah expired.`,
        ephemeral: true
      });
      return;
    }
    const [onCooldown, timeLeft, currentCount] = cooldown.isStaffOnCooldown(store, staff.id);
    store.staffCooldowns[staffKey] = {
      cycle_start: new Date().toISOString(),
      claims_in_cycle: 0,
      exhausted_cooldown_until: null
    };
    store.saveCooldowns();
    const embed = new EmbedBuilder()
      .setTitle('ðŸ”„ Cooldown Di-Reset')
      .setDescription(`Cooldown untuk ${member} telah berhasil di-reset!`)
      .setColor(0x00ff00);
    if (onCooldown && timeLeft) {
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      embed.addFields({
        name: 'ðŸ“Š Status Sebelumnya',
        value: `Cooldown aktif: ${hours}j ${minutes}m tersisa\nClaim: ${currentCount}/${cfg.COOLDOWN_LIMIT}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: 'ðŸ“Š Status Sebelumnya',
        value: `Claim: ${currentCount}/${cfg.COOLDOWN_LIMIT}`,
        inline: false
      });
    }
    embed.addFields({
      name: 'âœ… Status Baru',
      value: `Claim: 0/${cfg.COOLDOWN_LIMIT}\nCooldown: Tidak ada\nStaff bisa claim ticket lagi!`,
      inline: false
    });
    embed.setFooter({ text: `Di-reset oleh ${interaction.user.username}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('ðŸ”„ Cooldown Kamu Di-Reset!')
        .setDescription(`Admin ${interaction.user} telah mereset cooldown kamu.`)
        .setColor(0x00ff00)
        .addFields({
          name: 'âœ… Status Baru',
          value: `Claim: 0/${cfg.COOLDOWN_LIMIT}\nKamu bisa claim ticket lagi!`,
          inline: false
        })
        .setFooter({ text: 'VoraHub Cooldown System' });
      await member.send({ embeds: [dmEmbed] });
    } catch {
      await interaction.channel
        .send(`ðŸ“¢ ${member} Cooldown kamu telah di-reset oleh admin! Kamu bisa claim ticket lagi.`)
        .catch(() => {});
    }
    return;
  }

  await interaction.reply({ content: 'Unknown command.', ephemeral: true });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const commands = buildSlashCommands();
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID), {
        body: commands
      });
      console.log(`Slash commands synced to guild ${process.env.GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('Slash commands synced globally (can take up to 1 hour to appear).');
    }
  } catch (e) {
    console.error('Failed to register slash commands:', e);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleSlash(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'midman_final_modal') {
      await midman.createMidmanTicket(interaction, store, TOKEN);
      return;
    }

    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu()) {
      const handled = await midman.handleMidmanComponent(interaction, store, TOKEN);
      if (handled) return;
    }

    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id === 'ticket_premium' || id === cfg.CID_TICKET_PURCHASE) {
        await createTicket(interaction, 'Premium Purchase', store, TOKEN);
        return;
      }
      if (id === 'ticket_creator' || id === cfg.CID_TICKET_CREATOR) {
        await createTicket(interaction, 'Content Creator Request', store, TOKEN);
        return;
      }
      if (id === 'ticket_report' || id === cfg.CID_TICKET_REPORT) {
        await createTicket(interaction, 'Bug / Misconduct Report', store, TOKEN);
        return;
      }
            if (id === cfg.CID_TICKET_SUPPORT) {
        await createTicket(interaction, 'Support', store, TOKEN);
        return;
      }
      if (id === 'ticket_x8') {
        await createTicket(interaction, 'X8 Ticket', store, TOKEN);
        return;
      }
      if (id === 'claim_ticket' || id === cfg.CID_CLAIM_PREMIUM) {
        await ticketHandlers.handleClaimTicket(interaction, store);
        return;
      }
      if (id === 'close_ticket' || id === cfg.CID_CLOSE_PREMIUM || id === cfg.CID_CLOSE_CREATOR || id === cfg.CID_CLOSE_SUPPORT || id === cfg.CID_CLOSE_REPORT) {
        await ticketHandlers.handleCloseTicket(interaction, store);
        return;
      }
      if (id === 'pay_now' || id === cfg.CID_PAY_PREMIUM) {
        await ticketHandlers.handlePayNow(interaction, store);
        return;
      }
      if (id === 'pay_now_x8') {
        await ticketHandlers.handlePayNowX8(interaction);
        return;
      }
      if (id === 'done_ticket_confirm') {
        await ticketHandlers.handleDoneTicketConfirm(interaction, store);
        return;
      }
      if (id === 'claim_midman_ticket') {
        await ticketHandlers.handleClaimMidman(interaction, store);
        return;
      }
      if (id === 'close_midman_ticket') {
        await ticketHandlers.handleCloseTicket(interaction, store);
        return;
      }
      if (id === 'done_midman_ticket') {
        await ticketHandlers.handleDoneMidman(interaction, store, TOKEN);
        return;
      }
      if (id === 'payment_send_proof') {
        await ticketHandlers.handlePaymentProof(interaction);
        return;
      }
      if (id === 'payment_open_qris') {
        await ticketHandlers.handlePaymentQris(interaction);
        return;
      }
      if (id === 'payment_open_dana') {
        await ticketHandlers.handlePaymentDana(interaction);
        return;
      }
    }
  } catch (err) {
    console.error('interactionCreate:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: `âŒ Error: ${err.message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `âŒ Error: ${err.message}`, ephemeral: true });
      }
    } catch (_) {
      /* ignore */
    }
  }
});

client.login(TOKEN);



