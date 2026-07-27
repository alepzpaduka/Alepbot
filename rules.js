/**
 * AlepzBot — Rules Panel Module (Components V2)
 * Owner: fiqq
 * Version: 2.0.0
 */

const cfg = require('./config');

// ===== ALEPBOT ICON =====
const ALEPBOT_ICON = 'https://www.image2url.com/r2/default/images/1779079676715-cb48ada2-85fe-4f0f-bba8-411ce270c94d.jpg';

// ===== RULES DATA =====
const RULES = [
    { number: '1', rule: 'Patuhi semua peraturan Discord dan komuniti.' },
    { number: '2', rule: 'Hormati semua ahli. Tiada buli, kecaman, atau diskriminasi.' },
    { number: '3', rule: 'Tiada spam, promosi, atau pautan luar tanpa kebenaran.' },
    { number: '4', rule: 'Gunakan saluran yang betul untuk setiap perbincangan.' },
    { number: '5', rule: 'Tiada bahasa kesat, lucah, atau kandungan tidak sesuai.' },
    { number: '6', rule: 'Patuhi arahan staff. Mereka ada di sini untuk membantu.' },
    { number: '7', rule: 'Gunakan bahasa yang difahami oleh semua (Bahasa Melayu/Inggeris).' },
    { number: '8', rule: 'Tiada cheat, exploit, atau aktiviti mencurigakan.' }
];

// ===== BUILD RULES PANEL PAYLOAD (COMPONENTS V2 - MACAM TICKET) =====
function buildRulesPanelPayload() {
    const rulesText = RULES
        .map(r => `**${r.number}.** ${r.rule}`)
        .join('\n');

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
                                content: `# 📜 PERATURAN SERVER\n\nSila baca dan patuhi semua peraturan di bawah:\n\n${rulesText}\n\n⚠️ **Ingat:**\n• Staff berhak mengambil tindakan jika peraturan dilanggar\n• Jika ada pertanyaan, sila buka tiket di <#1434769506798010480>`
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: {
                                url: ALEPBOT_ICON
                            }
                        }
                    },
                    { type: 14, spacing: 2 }
                ]
            }
        ]
    };
}

// ===== SEND RULES PANEL =====
async function sendRulesPanel(interaction) {
    const token = interaction.client.token;
    const channelId = interaction.channelId;

    await interaction.deferReply({ ephemeral: true });

    const payload = buildRulesPanelPayload();
    
    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 200 || res.status === 201) {
            await interaction.editReply({ content: '✅ Panel peraturan telah dihantar!' });
        } else {
            const err = await res.text();
            await interaction.editReply({ content: `❌ Gagal: ${err}` });
        }
    } catch (error) {
        await interaction.editReply({ content: `❌ Error: ${error.message}` });
    }
}

// ===== BUTTON HANDLER (KOSONG) =====
async function handleRulesButtons(interaction) {
    return false;
}

module.exports = {
    sendRulesPanel,
    handleRulesButtons,
    RULES,
    ALEPBOT_ICON
};
