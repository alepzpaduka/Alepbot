/**
 * AlepzBot — Discord Bot
 * Owner: fiqq
 * Version: 2.0.0 (Clean)
 * Description: Sistem tiket, moderation, cooldown
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
const ticketHandlers = require('./ticketHandlers');
const { sendTicketPanel } = require('./ticketPanel');

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment (.env).');
  process.exit(1);
}

// ========== SLASH COMMAND BUILDER ==========
function buildSlashCommands() {
  return [
    new SlashCommandBuilder().setName('hello').setDescription('Says hello to the user.').toJSON(),
    new SlashCommandBuilder()
      .setName('chat')
      .setDescription('Chat Anything With A Bot.')
      .addStringOption((o) => o.setName('messages').setDescription('Message').setRequired(true))
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
      .setName('ticketpanel')
      .setDescription('Send the ticket creation panel.')
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

  if (commandName === 'kick') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: "You don't have permission to kick members.", ephemeral: true });
      return;
    }
    const member = interaction.options.getMember('member');
    if (!member) {
      await interaction.reply({ content: '❌ Member tidak ditemukan di server ini.', ephemeral: true });
      return;
    }
    const reason = interaction.options.getString('reason') || 'No Reason Provided';
    if (cfg.IMMUNE_USER_IDS.includes(String(member.id))) {
      await interaction.reply({ content: `❌ ${member} cannot be kicked (protected user).`, ephemeral: true });
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
      await interaction.reply({ content: '❌ Member tidak ditemukan di server ini.', ephemeral: true });
      return;
    }
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (cfg.IMMUNE_USER_IDS.includes(String(member.id))) {
      await interaction.reply({ content: `❌ ${member} cannot be Ban (protected user).`, ephemeral: true });
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

  if (commandName === 'ticketpanel') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await sendTicketPanel(client, TOKEN);
    await interaction.editReply({ content: '✅ Ticket panel has been sent.' });
    return;
  }

  if (commandName === 'add') {
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      await interaction.reply({ content: '❌ Kamu bukan staff.', ephemeral: true });
      return;
    }
    const user = interaction.options.getMember('user');
    const ids = ticketHandlers.collectTicketChannelIds(store).map(String);
    if (!ids.includes(String(interaction.channelId))) {
      await interaction.reply({ content: '❌ Kamu tidak bisa berinteraksi dengan channel ini karena bukan ticket.', ephemeral: true });
      return;
    }
    await interaction.channel.permissionOverwrites.edit(user, {
      ViewChannel: true,
      SendMessages: true
    });
    await interaction.reply({ content: `✅ ${user} telah **ditambahkan** ke ticket ini.` });
    return;
  }

  if (commandName === 'remove') {
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
      await interaction.reply({ content: '❌ Kamu bukan staff.', ephemeral: true });
      return;
    }
    const user = interaction.options.getMember('user');
    const ids = ticketHandlers.collectTicketChannelIds(store).map(String);
    if (!ids.includes(String(interaction.channelId))) {
      await interaction.reply({ content: '❌ Kamu tidak bisa berinteraksi dengan channel ini karena bukan ticket.', ephemeral: true });
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
    if (creatorIds.map(String).includes(String(user.id))) {
      await interaction.reply({ content: '❌ Kamu tidak bisa mengeluarkan *pembuat ticket*.', ephemeral: true });
      return;
    }
    await interaction.channel.permissionOverwrites.delete(user);
    await interaction.reply({ content: `🚫 ${user} telah **dikeluarkan** dari ticket ini.` });
    return;
  }

  if (commandName === 'resetcooldown') {
    const adminRole = interaction.guild.roles.cache.get(cfg.ADMIN_ROLE_ID);
    if (!adminRole || !interaction.member.roles.cache.has(adminRole.id)) {
      await interaction.reply({
        content: '❌ **Command ini hanya untuk Admin!**\nHanya admin yang bisa reset cooldown staff.',
        ephemeral: true
      });
      return;
    }
    const staff = interaction.options.getUser('staff', true);
    const member = await interaction.guild.members.fetch(staff.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '❌ Member tidak ditemukan.', ephemeral: true });
      return;
    }
    const staffRole = interaction.guild.roles.cache.get(cfg.STAFF_ROLE_ID);
    const helperRole = interaction.guild.roles.cache.get(cfg.HELPER_ROLE_ID);
    const isStaff =
      (staffRole && member.roles.cache.has(staffRole.id)) ||
      (helperRole && member.roles.cache.has(helperRole.id));
    if (!isStaff) {
      await interaction.reply({ content: `❌ ${member} bukan staff atau helper!`, ephemeral: true });
      return;
    }
    const staffKey = String(staff.id);
    if (!store.staffCooldowns[staffKey]) {
      await interaction.reply({
        content: `ℹ️ ${member} tidak memiliki cooldown aktif.\nStaff ini belum pernah claim ticket atau cooldown sudah expired.`,
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
      .setTitle('🔄 Cooldown Di-Reset')
      .setDescription(`Cooldown untuk ${member} telah berhasil di-reset!`)
      .setColor(0x00ff00);
    if (onCooldown && timeLeft) {
      const hours = Math.floor(timeLeft / 3600000);
      const minutes = Math.floor((timeLeft % 3600000) / 60000);
      embed.addFields({
        name: '📊 Status Sebelumnya',
        value: `Cooldown aktif: ${hours}j ${minutes}m tersisa\nClaim: ${currentCount}/${cfg.COOLDOWN_LIMIT}`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '📊 Status Sebelumnya',
        value: `Claim: ${currentCount}/${cfg.COOLDOWN_LIMIT}`,
        inline: false
      });
    }
    embed.addFields({
      name: '✅ Status Baru',
      value: `Claim: 0/${cfg.COOLDOWN_LIMIT}\nCooldown: Tidak ada\nStaff bisa claim ticket lagi!`,
      inline: false
    });
    embed.setFooter({ text: `Di-reset oleh ${interaction.user.username}` }).setTimestamp();
    await interaction.reply({ embeds: [embed] });
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🔄 Cooldown Kamu Di-Reset!')
        .setDescription(`Admin ${interaction.user} telah mereset cooldown kamu.`)
        .setColor(0x00ff00)
        .addFields({
          name: '✅ Status Baru',
          value: `Claim: 0/${cfg.COOLDOWN_LIMIT}\nKamu bisa claim ticket lagi!`,
          inline: false
        })
        .setFooter({ text: 'AlepzBot Cooldown System' });
      await member.send({ embeds: [dmEmbed] });
    } catch {
      await interaction.channel
        .send(`📢 ${member} Cooldown kamu telah di-reset oleh admin! Kamu bisa claim ticket lagi.`)
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
        await interaction.followUp({ content: `❌ Error: ${err.message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
      }
    } catch (_) {
      /* ignore */
    }
  }
});

client.login(TOKEN);
