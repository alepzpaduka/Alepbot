/**
 * AlepzBot — Configuration
 * Owner: Fiq
 * Version: 2.0.0 (Clean)
 */

const path = require('path');

const BASE_DIR = __dirname;

module.exports = {
  BASE_DIR,

  // ===== TICKET CHANNELS =====
  TICKET_PANEL_CHANNEL_ID: '1531043111009124352',
  TICKET_PANEL_PURCHASE_CHANNEL_ID: '',
  TICKET_LOG_CHANNEL_ID: '1531043352320016574',

  // ===== AI CHANNEL CONFIG =====
AI_CHANNEL_ID: null,  // Akan di set melalui command /setchannelai
AI_API_URL: 'https://api.nexadev.my.id/ai/chatgptpro?q=Hai%20alepzbot',
AI_BOT_NAME: 'AlepzBot',

  // ===== TICKET CATEGORIES =====
  TICKET_CATEGORY_ID: '1531043528438714538',
  TICKET2_CATEGORY_ID: '1531043528438714538',
  TICKET_CATEGORY_ID_X8: '1461709088118407412',

  // ===== TICKET PANEL CHANNELS =====
  TICKET_PANEL_CHANNEL_ID_X8: '1461688996081176628',

  // Tambah dalam config.js
WELCOME_CHANNEL_ID: '1483617883929051208',
LEAVE_LOG_CHANNEL_ID: '1531051521842876447',


  // ===== CUSTOM IDs (Components V2) =====
  CID_TICKET_CREATOR: 'p_285420741510303745',
  CID_TICKET_SUPPORT: 'p_285420744656031746',
  CID_TICKET_REPORT: 'p_285420749127159811',
  CID_TICKET_PURCHASE: 'p_285420567106949121',
  CID_CLAIM_PREMIUM: 'p_285420887040069633',
  CID_PAY_PREMIUM: 'p_285420890231934977',
  CID_CLOSE_PREMIUM: 'p_285420895088939010',
  CID_CLOSE_CREATOR: 'p_285421314284457985',
  CID_CLOSE_SUPPORT: 'p_285421369590550530',
  CID_CLOSE_REPORT: 'p_285421205471629322',

  // ===== ROLES =====
  STAFF_ROLE_ID: '1483807255399759912',
  HELPER_ROLE_ID: '1483807255399759912',
  ADMIN_ROLE_ID: '1483807255399759912',
  UNVERIFIED_ROLE_ID: '',
  MEMBER_ROLE_ID: '',
  WL_ROLE_ID: '',
  PREMIUM_ROLE_ID: '',

  // ===== COOLDOWN SYSTEM =====
  COOLDOWN_LIMIT: 5,
  RESET_MINUTES: 20,
  COOLDOWN_HOURS: 2,

  // ===== PROTECTED USERS =====
  IMMUNE_USER_IDS: ['706872385844019200', '768832997125259315'],

  // ===== FILE STORAGE =====
  files: {
    tickets: path.join(BASE_DIR, 'tickets.json'),
    x8Tickets: path.join(BASE_DIR, 'x8ticket.json'),
    claims: path.join(BASE_DIR, 'claims.json'),
    doneTickets: path.join(BASE_DIR, 'done_tickets.json'),
    cooldowns: path.join(BASE_DIR, 'cooldowns.json')
  }
};
