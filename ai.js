/**
 * AlepzBot — AI Module (Ngrok Gateway)
 * Owner: fiqq
 * Version: 2.0.0
 */

const { OpenAI } = require('openai');

// ===== CONFIGURATION =====
const AI_MODEL = process.env.AI_MODEL || 'gpt-5.6-luna'; 
const AI_PROVIDER = process.env.AI_PROVIDER || 'ngrok';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// ===== INITIALIZE CLIENT =====
let aiClient = null;

if (process.env.NGROK_AI_TOKEN) {
  aiClient = new OpenAI({
    apiKey: process.env.NGROK_AI_TOKEN,
    baseURL: process.env.NGROK_BASE_URL || 'https://gateway.ngrok.ai/v1'
  });
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `Anda adalah AlepzBot, seorang asisten AI yang ramah dan membantu.
Anda beroperasi di server Discord untuk membantu pengguna dengan pelbagai pertanyaan.
Gunakan bahasa Melayu dalam setiap respons.
Jika ditanya tentang bot, perkenalkan diri sebagai AlepzBot.
Jawab dengan ringkas, jelas, dan membantu.`;

// ===== AI CHAT FUNCTION =====
async function chatWithAI(userMessage, history = []) {
  if (!aiClient) {
    return '🤖 **AlepzBot AI:** Maaf, perkhidmatan AI tidak dikonfigurasi. Sila semak .env';
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const completion = await aiClient.chat.completions.create({
      model: AI_MODEL,
      messages: messages,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error('[AI] Error:', error);
    return `🤖 **AlepzBot AI:** Maaf, berlaku ralat: ${error.message || 'Sila cuba lagi'}`;
  }
}

// ===== CHAT WITH CONTEXT =====
async function chatWithContext(userId, userMessage) {
  if (!global.aiHistory) global.aiHistory = new Map();
  if (!global.aiHistory.has(userId)) {
    global.aiHistory.set(userId, []);
  }

  const history = global.aiHistory.get(userId);
  const response = await chatWithAI(userMessage, history);

  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: response });

  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  return response;
}

// ===== CLEAR HISTORY =====
function clearAIHistory(userId) {
  if (global.aiHistory) {
    return global.aiHistory.delete(userId);
  }
  return false;
}

// ===== TEST AI =====
async function testAI() {
  console.log('[AI] 🧪 Testing AI connection...');
  console.log(`[AI] Provider: Ngrok Gateway`);
  console.log(`[AI] Model: ${AI_MODEL}`);
  console.log(`[AI] Base URL: ${process.env.NGROK_BASE_URL || 'https://gateway.ngrok.ai/v1'}`);

  try {
    const response = await chatWithAI('Hello, siapa awak dan apa nama awak?');
    console.log('[AI] ✅ Test berjaya!');
    console.log('[AI] Response:', response);
    return response;
  } catch (error) {
    console.error('[AI] ❌ Test gagal:', error.message);
    throw error;
  }
}

module.exports = {
  chatWithAI,
  chatWithContext,
  clearAIHistory,
  testAI
};
