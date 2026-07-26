/**
 * AlepzBot — AI Module
 * Owner: Mr. Kholis
 * Version: 2.0.3 (Full - DeepSeek + Fallback)
 * Support: DeepSeek, OpenAI, Google Gemini
 */

const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ===== CONFIGURATION =====
const AI_PROVIDER = process.env.AI_PROVIDER || 'deepseek';
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v4-flash';

// ===== INITIALIZE CLIENTS =====
let openai = null;
let gemini = null;
let deepseek = null;

// OpenAI
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Google Gemini
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  gemini = genAI;
}

// DeepSeek (guna OpenAI SDK dengan baseURL)
if (process.env.DEEPSEEK_API_KEY) {
  deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
  });
}

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `Anda adalah AlepzBot, seorang asisten AI yang ramah dan membantu.
Anda beroperasi di server Discord untuk membantu pengguna dengan pelbagai pertanyaan.
Gunakan bahasa Melayu dalam setiap respons.
Jika ditanya tentang bot, perkenalkan diri sebagai AlepzBot.
Jawab dengan ringkas, jelas, dan membantu.`;

// ===== GEMINI MODELS LIST (fallback) =====
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro'
];

// ===== AI CHAT FUNCTION =====
async function chatWithAI(userMessage, history = []) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage }
  ];

  try {
    let response = '';
    let lastError = null;

    // ===== DEEPSEEK (Primary) =====
    if (AI_PROVIDER === 'deepseek' && deepseek) {
      try {
        console.log(`[AI] 🚀 Menggunakan DeepSeek model: ${AI_MODEL}`);
        
        const completion = await deepseek.chat.completions.create({
          model: AI_MODEL || 'deepseek-v4-flash',
          messages: messages,
          max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
          temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
        });
        response = completion.choices[0].message.content;
        console.log(`[AI] ✅ DeepSeek berjaya!`);
        return response;
        
      } catch (error) {
        lastError = error;
        console.log(`[AI] ❌ DeepSeek gagal:`, error.message);
        
        // Handle 402 Insufficient Balance - Cuba fallback ke Gemini
        if (error.status === 402 || error.message?.includes('Insufficient Balance')) {
          console.log(`[AI] 💰 Baki DeepSeek habis! Cuba fallback ke Gemini...`);
          
          if (gemini) {
            try {
              console.log(`[AI] 🔄 Fallback ke Gemini...`);
              for (const modelName of GEMINI_MODELS) {
                try {
                  const model = gemini.getGenerativeModel({ model: modelName });
                  const geminiHistory = history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                  }));
                  const chat = model.startChat({ history: geminiHistory });
                  const result = await chat.sendMessage(userMessage);
                  response = result.response.text();
                  console.log(`[AI] ✅ Gemini ${modelName} berjaya!`);
                  return response;
                } catch (geminiError) {
                  console.log(`[AI] ❌ Gemini ${modelName} gagal:`, geminiError.message);
                  continue;
                }
              }
              throw new Error('Semua model Gemini gagal');
            } catch (fallbackError) {
              lastError = fallbackError;
            }
          } else {
            throw new Error('Baki DeepSeek habis dan tiada fallback provider. Sila topup atau tambah GEMINI_API_KEY di .env');
          }
        }
        
        throw error;
      }
    }

    // ===== OPENAI =====
    else if (AI_PROVIDER === 'openai' && openai) {
      try {
        console.log(`[AI] 🚀 Menggunakan OpenAI model: ${AI_MODEL}`);
        
        const completion = await openai.chat.completions.create({
          model: AI_MODEL || 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
          temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
        });
        response = completion.choices[0].message.content;
        console.log(`[AI] ✅ OpenAI berjaya!`);
        return response;
        
      } catch (error) {
        lastError = error;
        console.log(`[AI] ❌ OpenAI gagal:`, error.message);
        
        // Cuba fallback ke Gemini jika OpenAI gagal
        if (gemini) {
          console.log(`[AI] 🔄 Fallback ke Gemini...`);
          try {
            for (const modelName of GEMINI_MODELS) {
              try {
                const model = gemini.getGenerativeModel({ model: modelName });
                const geminiHistory = history.map(h => ({
                  role: h.role === 'user' ? 'user' : 'model',
                  parts: [{ text: h.content }]
                }));
                const chat = model.startChat({ history: geminiHistory });
                const result = await chat.sendMessage(userMessage);
                response = result.response.text();
                console.log(`[AI] ✅ Gemini ${modelName} berjaya!`);
                return response;
              } catch (geminiError) {
                continue;
              }
            }
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }
        throw error;
      }
    }

    // ===== GOOGLE GEMINI =====
    else if (AI_PROVIDER === 'gemini' && gemini) {
      try {
        console.log(`[AI] 🚀 Menggunakan Gemini...`);
        let modelSuccess = false;

        for (const modelName of GEMINI_MODELS) {
          try {
            console.log(`[AI] Mencuba model: ${modelName}...`);
            const model = gemini.getGenerativeModel({ model: modelName });
            const geminiHistory = history.map(h => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content }]
            }));
            const chat = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(userMessage);
            response = result.response.text();
            modelSuccess = true;
            console.log(`[AI] ✅ Model ${modelName} berjaya!`);
            break;
          } catch (error) {
            console.log(`[AI] ❌ Model ${modelName} gagal:`, error.message);
            continue;
          }
        }

        if (!modelSuccess || !response) {
          throw new Error('Semua model Gemini gagal');
        }
        return response;
        
      } catch (error) {
        lastError = error;
        throw error;
      }
    }

    // ===== FALLBACK =====
    else {
      return '🤖 **AlepzBot AI:** Maaf, perkhidmatan AI sedang tidak tersedia. Sila semak konfigurasi API key di .env';
    }

  } catch (error) {
    console.error('[AI] ❌ Error:', error.message);
    
    let userMessage = 'Maaf, berlaku ralat. Sila cuba lagi nanti.';
    
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      userMessage = 'Maaf, API key tidak sah. Sila semak konfigurasi .env';
    } else if (error.message?.includes('quota') || error.message?.includes('insufficient') || error.message?.includes('balance')) {
      userMessage = 'Maaf, baki atau kuota API telah habis. Sila topup atau tukar provider.';
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      userMessage = 'Maaf, masalah sambungan internet. Sila semak sambungan anda.';
    } else if (error.message?.includes('404') || error.message?.includes('not found')) {
      userMessage = 'Maaf, model AI tidak ditemui. Sila semak konfigurasi model.';
    } else if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      userMessage = 'Maaf, terlalu banyak permintaan. Sila tunggu sebentar.';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'Maaf, permintaan mengambil masa terlalu lama. Sila cuba lagi.';
    }
    
    return `🤖 **AlepzBot AI:** ${userMessage}`;
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
  console.log(`[AI] Provider: ${AI_PROVIDER}`);
  console.log(`[AI] Model: ${AI_MODEL}`);
  
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

// ===== GET CURRENT MODEL =====
function getCurrentModel() {
  return {
    provider: AI_PROVIDER,
    model: AI_MODEL,
    availableModels: {
      deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat'],
      gemini: GEMINI_MODELS,
      openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
    }
  };
}

module.exports = {
  chatWithAI,
  chatWithContext,
  clearAIHistory,
  testAI,
  getCurrentModel
};
