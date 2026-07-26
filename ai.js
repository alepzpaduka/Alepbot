/**
 * AlepzBot — AI Module
 * Version: 2.0.1 (Stable)
 */

const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== CONFIGURATION =====
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const AI_MODEL = process.env.AI_MODEL || 'gemini-1.5-pro'; // Tukar ke pro

// ===== INITIALIZE CLIENTS =====
let openai = null;
let gemini = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  gemini = genAI;
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `Anda adalah AlepzBot, seorang asisten AI yang ramah dan membantu.
Anda beroperasi di server Discord untuk membantu pengguna dengan pelbagai pertanyaan.
Gunakan bahasa Melayu dalam setiap respons.
Jika ditanya tentang bot, perkenalkan diri sebagai AlepzBot.
Jawab dengan ringkas, jelas, dan membantu.`;

// ===== AI CHAT FUNCTION =====
async function chatWithAI(userMessage, history = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ];

  try {
    let response = '';

    // ===== OPENAI =====
    if (AI_PROVIDER === 'openai' && openai) {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      });
      response = completion.choices[0].message.content;
    }

    // ===== GOOGLE GEMINI =====
    else if (AI_PROVIDER === 'gemini' && gemini) {
      // Cuba dengan model yang berbeza
      const modelsToTry = [
        AI_MODEL || 'gemini-1.5-pro',
        'gemini-2.0-flash',
        'gemini-1.0-pro',
        'gemini-pro'
      ];
      
      let lastError = null;
      for (const modelName of modelsToTry) {
        try {
          const model = gemini.getGenerativeModel({ model: modelName });
          const chat = model.startChat({
            history: history.map(h => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            }))
          });
          const result = await chat.sendMessage(userMessage);
          response = result.response.text();
          break;
        } catch (error) {
          lastError = error;
          console.log(`[AI] Model ${modelName} gagal:`, error.message);
          continue;
        }
      }
      if (!response) throw lastError || new Error('Semua model Gemini gagal');
    }

    // ===== FALLBACK =====
    else {
      response = '🤖 **AlepzBot AI:** Maaf, perkhidmatan AI sedang tidak tersedia. Sila cuba lagi nanti.';
    }

    return response;

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
    global.aiHistory.delete(userId);
  }
}

// ===== TEST AI =====
async function testAI() {
  console.log('[AI] Testing AI connection...');
  const response = await chatWithAI('Hello, siapa awak?');
  console.log('[AI] Response:', response);
  return response;
}

module.exports = {
  chatWithAI,
  chatWithContext,
  clearAIHistory,
  testAI
};
