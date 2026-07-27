/**
 * AlepzBot — GetAvatar Module
 * Owner: fiqq
 * Version: 2.0.1
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function handleGetAvatar(interaction) {
  // Defer reply first untuk elak timeout
  await interaction.deferReply();
  
  const targetUser = interaction.options.getUser('user') || interaction.user;
  
  const avatarURL = targetUser.displayAvatarURL({ size: 1024, dynamic: true });
  const avatarURL512 = targetUser.displayAvatarURL({ size: 512, dynamic: true });
  const avatarURL256 = targetUser.displayAvatarURL({ size: 256, dynamic: true });
  const avatarURL128 = targetUser.displayAvatarURL({ size: 128, dynamic: true });
  
  let bannerURL = null;
  try {
    const user = await interaction.client.users.fetch(targetUser.id, { force: true });
    if (user.banner) {
      bannerURL = user.bannerURL({ size: 1024 });
    }
  } catch (_) {}
  
  const createdAt = targetUser.createdAt.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const embed = new EmbedBuilder()
    .setTitle(`🖼️ Avatar ${targetUser.username}`)
    .setDescription(
      `**Username:** ${targetUser}\n` +
      `**ID:** \`${targetUser.id}\`\n` +
      `**Akaun Dibuat:** ${createdAt}`
    )
    .setColor(0x3498db)
    .setImage(avatarURL)
    .setFooter({ 
      text: `Diminta oleh ${interaction.user.username}`, 
      iconURL: interaction.user.displayAvatarURL() 
    })
    .setTimestamp();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('128px')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL128),
      new ButtonBuilder()
        .setLabel('256px')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL256),
      new ButtonBuilder()
        .setLabel('512px')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL512),
      new ButtonBuilder()
        .setLabel('HD')
        .setStyle(ButtonStyle.Link)
        .setURL(avatarURL)
    );
  
  if (bannerURL) {
    embed.addFields({ 
      name: '🖼️ Banner', 
      value: `[📸 Klik untuk lihat](${bannerURL})`, 
      inline: false 
    });
  }
  
  await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { handleGetAvatar };
