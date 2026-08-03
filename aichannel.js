/**
 * AlepzBot — AI Channel Module
 * Owner: fiqq
 * Version: 2.1.0
 * Description: AI auto-reply with image generation support
 */

const cfg = require('./config');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

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

// ===== CHECK IF MESSAGE ASKS FOR IMAGE =====
function isImageRequest(message) {
    const imageKeywords = [
        'gambar', 'image', 'picture', 'photo', 'foto',
        'draw', 'lukis', 'create image', 'generate image',
        'buatkan gambar', 'hasilkan gambar', 'cipta gambar',
        'show me', 'tunjukkan', 'visual'
    ];
    const lowerMsg = message.toLowerCase();
    return imageKeywords.some(keyword => lowerMsg.includes(keyword));
}

// ===== CHECK IF MESSAGE ASKS ABOUT CREATOR =====
function isCreatorQuestion(message) {
    const creatorKeywords = [
        'siapa cipta', 'who created', 'who made', 'creator',
        'pembuat', 'owner', 'siapa buat', 'dibuat oleh',
        'fiqqzr7', 'developer', 'pencipta'
    ];
    const lowerMsg = message.toLowerCase();
    return creatorKeywords.some(keyword => lowerMsg.includes(keyword));
}

// ===== GET AI RESPONSE (TEXT) =====
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

// ===== GENERATE IMAGE (Using Pollinations API - FREE) =====
async function generateImage(prompt) {
    try {
        // Clean prompt for image generation
        const cleanPrompt = prompt
            .replace(/gambar|image|picture|photo|foto|draw|lukis|create|generate|buatkan|hasilkan|cipta|show|tunjukkan|visual/gi, '')
            .replace(/please|tolong|saya|nak|minta/gi, '')
            .trim() || 'beautiful landscape';
        
        // Use Pollinations.ai free image generation API
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true`;
        
        // Test if image is accessible
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
            return {
                success: true,
                url: imageUrl,
                prompt: cleanPrompt
            };
        } else {
            // Fallback to another free API
            const fallbackUrl = `https://api.nexadev.my.id/ai/text2image?prompt=${encodeURIComponent(cleanPrompt)}`;
            const fallbackResponse = await fetch(fallbackUrl);
            if (fallbackResponse.ok) {
                const data = await fallbackResponse.json();
                if (data.status && data.data && data.data.url) {
                    return {
                        success: true,
                        url: data.data.url,
                        prompt: cleanPrompt
                    };
                }
            }
            throw new Error('Image generation failed');
        }
    } catch (error) {
        console.error('[AI CHANNEL] Image generation error:', error);
        return {
            success: false,
            error: error.message
        };
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
    
    // Get user's message
    const userMessage = message.content;
    if (!userMessage || userMessage.trim() === '') return;
    
    // Show typing indicator
    await message.channel.sendTyping();
    
    // ===== CHECK FOR CREATOR QUESTION =====
    if (isCreatorQuestion(userMessage)) {
        const creatorEmbed = new EmbedBuilder()
            .setTitle('🤖 Tentang AlepzBot')
            .setDescription([
                '**Saya dicipta oleh fiqqzr7!**',
                '',
                'fiqqzr7 adalah seorang developer yang berbakat dan kreatif.',
                'Beliau telah membangunkan saya untuk membantu anda semua.',
                '',
                '📌 **Info:**',
                '• Nama: AlepzBot',
                '• Versi: 2.1.0',
                '• Owner: fiqqzr7',
                '• Platform: Discord',
                '',
                '💡 *Ada apa-apa lagi yang boleh saya bantu?*'
            ].join('\n'))
            .setColor(0xA855F7)
            .setThumbnail('https://www.image2url.com/r2/default/gifs/1781644461860-b9ab6b79-4444-4495-9c2f-c43dbde8a3a4.gif')
            .setFooter({ text: 'AlepzBot • Created by fiqqzr7' })
            .setTimestamp();
        
        await message.reply({ embeds: [creatorEmbed] });
        return;
    }
    
    // ===== CHECK FOR IMAGE REQUEST =====
    if (isImageRequest(userMessage)) {
        await message.reply('🎨 **Sedang menghasilkan gambar...** Sila tunggu sebentar.');
        
        const imageResult = await generateImage(userMessage);
        
        if (imageResult.success) {
            const imageEmbed = new EmbedBuilder()
                .setTitle('🖼️ Gambar Dihasilkan')
                .setDescription([
                    `**Prompt:** ${imageResult.prompt}`,
                    '',
                    '🔽 *Klik pada gambar untuk melihat saiz penuh*'
                ].join('\n'))
                .setColor(0xA855F7)
                .setImage(imageResult.url)
                .setFooter({ text: 'AlepzBot • AI Image Generator • by fiqqzr7' })
                .setTimestamp();
            
            await message.reply({ embeds: [imageEmbed] });
        } else {
            await message.reply(`❌ **Maaf, saya gagal menghasilkan gambar.**\n\nRalat: ${imageResult.error || 'Sila cuba lagi nanti.'}`);
        }
        return;
    }
    
    // ===== NORMAL AI RESPONSE =====
    const response = await getAIResponse(userMessage);
    
    // Check if response is too long
    if (response.length > 2000) {
        const chunks = response.match(/[\s\S]{1,1990}/g) || [response];
        for (const chunk of chunks) {
            await message.reply(chunk);
        }
    } else {
        await message.reply(response);
    }
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
        const embed = new EmbedBuilder()
            .setTitle('✅ Channel AI Ditetapkan')
            .setDescription([
                `Channel AI telah ditetapkan ke ${channel}!`,
                '',
                '📌 **Cara Guna:**',
                '• Hantar sebarang mesej di channel ini',
                '• AI akan membalas secara automatik',
                '• Taip "gambar [description]" untuk hasilkan gambar',
                '• Tanya "siapa cipta awak" untuk info owner',
                '',
                '💡 *Mulakan perbualan sekarang!*'
            ].join('\n'))
            .setColor(0x22C55E)
            .setFooter({ text: 'AlepzBot • AI Channel' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
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
    const embed = new EmbedBuilder()
        .setTitle('📊 Status Channel AI')
        .setColor(0x3B82F6)
        .setFooter({ text: 'AlepzBot • AI Channel' })
        .setTimestamp();
    
    if (config.channelId) {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (channel) {
            embed.setDescription([
                `✅ Channel AI sedang aktif di ${channel}.`,
                '',
                '📌 **Ciri-ciri:**',
                '• 💬 Auto-reply untuk semua mesej',
                '• 🖼️ Hasilkan gambar dengan kata kunci "gambar"',
                '• 👤 Tanya "siapa cipta" untuk info owner',
                '',
                '💡 *Taip apa-apa untuk berinteraksi!*'
            ].join('\n'));
            embed.addFields(
                { name: '📊 Status', value: '🟢 Aktif', inline: true },
                { name: '📌 Channel', value: `${channel}`, inline: true }
            );
        } else {
            embed.setDescription('⚠️ Channel AI telah ditetapkan tetapi tidak dijumpai. Sila set semula dengan `/setchannelai`.');
            embed.setColor(0xFBBF08);
        }
    } else {
        embed.setDescription('❌ Tiada channel AI yang ditetapkan.\n\nGuna `/setchannelai <channel>` untuk tetapkan.');
        embed.setColor(0xEF4444);
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ===== RESET AI CHANNEL =====
async function resetAIChannel(interaction) {
    const success = saveAIChannelConfig(null);
    
    if (success) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Channel AI Direset')
            .setDescription('Channel AI telah direset. Tiada lagi auto-reply sehingga anda tetapkan semula dengan `/setchannelai`.')
            .setColor(0xFBBF08)
            .setFooter({ text: 'AlepzBot • AI Channel' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({
            content: '❌ Gagal mereset config. Sila cuba lagi.',
            ephemeral: true
        });
    }
}

module.exports = {
    loadAIChannelConfig,
    saveAIChannelConfig,
    getAIResponse,
    generateImage,
    handleAIMessage,
    setAIChannel,
    getAIChannelStatus,
    resetAIChannel,
    isImageRequest,
    isCreatorQuestion
};
