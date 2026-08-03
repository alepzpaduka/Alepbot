/**
 * AlepzBot — AI Channel Module
 * Owner: fiqq
 * Version: 2.0.0
 */

const cfg = require('./config');
const fs = require('fs');
const path = require('path');

const AI_CONFIG_FILE = path.join(__dirname, 'ai_channel.json');

// ===== LOAD/SAVE AI CHANNEL CONFIG =====
function loadAIChannelConfig() {
    try {
        if (fs.existsSync(AI_CONFIG_FILE)) {
            const data = JSON.parse(fs.readFileSync(AI_CONFIG_FILE, 'utf8'));
            return data;
        }
    } catch (error) {
        console.error('[AI CHANNEL] Error loading config:', error);
    }
    return { channelId: null };
}

function saveAIChannelConfig(channelId) {
    try {
        fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify({ channelId }, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('[AI CHANNEL] Error saving config:', error);
        return false;
    }
}

// ===== GET AI RESPONSE =====
async function getAIResponse(message) {
    try {
        const url = `${cfg.AI_API_URL}?q=${encodeURIComponent(message)}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status && data.data && data.data.message) {
            return data.data.message;
        } else {
            return 'Maaf, saya tak faham. Boleh ulang?';
        }
    } catch (error) {
        console.error('[AI CHANNEL] Error:', error);
        return 'Maaf, saya ada masalah teknikal. Cuba lagi nanti.';
    }
}

// ===== HANDLE MESSAGE =====
async function handleAIMessage(message) {
    // Ignore bot messages
    if (message.author.bot) return;
    
    // Check if AI channel is set
    const config = loadAIChannelConfig();
    if (!config.channelId) return;
    
    // Check if message is in AI channel
    if (message.channel.id !== config.channelId) return;
    
    // Check if message starts with prefix (optional - to avoid spam)
    // You can remove this check if you want all messages to be replied
    // if (!message.content.startsWith('!ai') && !message.content.startsWith('!')) return;
    
    // Get user's message
    const userMessage = message.content;
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    // Get AI response
    const response = await getAIResponse(userMessage);
    
    // Send response
    await message.reply(response);
}

// ===== SET AI CHANNEL =====
async function setAIChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    if (!channel || channel.type !== 0) {
        await interaction.reply({
            content: '❌ Sila pilih channel teks yang sah.',
            ephemeral: true
        });
        return;
    }
    
    const success = saveAIChannelConfig(channel.id);
    
    if (success) {
        await interaction.reply({
            content: `✅ Channel AI telah ditetapkan ke ${channel}!\n\nSekarang semua mesej di channel tersebut akan dibalas oleh AI.`,
            ephemeral: false
        });
    } else {
        await interaction.reply({
            content: '❌ Gagal menyimpan config. Sila cuba lagi.',
            ephemeral: true
        });
    }
}

// ===== GET AI CHANNEL STATUS =====
async function getAIChannelStatus(interaction) {
    const config = loadAIChannelConfig();
    
    if (config.channelId) {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (channel) {
            await interaction.reply({
                content: `✅ Channel AI sedang aktif di ${channel}.\n\nSemua mesej di channel tersebut akan dibalas oleh AI.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: '⚠️ Channel AI telah ditetapkan tetapi tidak dijumpai. Sila set semula dengan `/setchannelai`.',
                ephemeral: true
            });
        }
    } else {
        await interaction.reply({
            content: '❌ Tiada channel AI yang ditetapkan.\n\nGuna `/setchannelai <channel>` untuk tetapkan.',
            ephemeral: true
        });
    }
}

module.exports = {
    loadAIChannelConfig,
    saveAIChannelConfig,
    getAIResponse,
    handleAIMessage,
    setAIChannel,
    getAIChannelStatus
};
