/**
 * Constants mirrored from bot.py — adjust IDs as needed.
 */
const path = require('path');

const BASE_DIR = __dirname;

module.exports = {
  BASE_DIR,
  VORA_BLUE: 0x3498db,

  TICKET_PANEL_CHANNEL_ID: '1434769506798010480',
  TICKET_PANEL_PURCHASE_CHANNEL_ID: '1487824775991525596',
  TICKET_LOG_CHANNEL_ID: '1452681875029102624',

  // New ticket panel custom IDs (Components V2)
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

  STAFF_ROLE_ID: '1434818807368519755',
  HELPER_ROLE_ID: '1457350924958695455',
  TICKET_CATEGORY_ID: '1434818160577609840',
  TICKET2_CATEGORY_ID: '1463498104257904721',
  TICKET_CATEGORY_ID_MIDMAN: '1462046059143630984',
  TICKET_PANEL_CHANNEL_ID_MIDMAN: '1462045378324205590',
  MIDMAN_ROLE_ID: '1462063370189537280',
  TICKET_PANEL_CHANNEL_ID_X8: '1461688996081176628',
  TICKET_CATEGORY_ID_X8: '1461709088118407412',
  UNVERIFIED_ROLE_ID: '1434816903439843359',
  MEMBER_ROLE_ID: '1434816903439843359',
  WL_ROLE_ID: '1452500424551567360',
  PREMIUM_ROLE_ID: '1434842978932752405',
  ADMIN_ROLE_ID: '1458390940959117356',

  GAME_STATUS_TARGET_CHANNEL_ID: '1470696141241848033',
  GAME_STATUS_IMAGE_URL:
    'https://cdn.discordapp.com/attachments/1453678754558906440/1486605947919929445/BG_5_ACC.png',

  GAME_STATUS_EMOJIS: {
    working: '<a:unknown:1486616532686733333>',
    not_working: '<a:unknown:1486616116792000573>',
    outdated: '<:unknown:1486616438704836619>',
    in_progress: '<a:unknown:1486616529549262949>'
  },

  GAME_STATUS_LEGEND_TEXT:
    '**<a:unknown:1486616532686733333>  = Script Working**\n' +
    '**<a:unknown:1486616116792000573>  = Script Not Working**\n' +
    ' **<:unknown:1486616438704836619> = Script Maybe Outdated**\n' +
    ' **<a:unknown:1486616529549262949> = Script Working In Progress**',

  CHANGELOG_CHANNEL_ID: '1434555092383563777',
  MEMBER_TAG_ID: '1434816903439843359',
  BUGREPORT_CHANNEL_ID: '1434769709928284232',
  SUGGESTION_CHANNEL_ID: '1434782966533324872',
  GUILD_ICON_URL:
    'https://cdn.discordapp.com/attachments/1428725603355328573/1480932024737992836/image.png',
  GUILD_ID_FOR_LINKS: '1434540370284384338',

  SALARY_CAP: 30000,
  COMMISSION_RATE: 0.1,

  COOLDOWN_LIMIT: 5,
  RESET_MINUTES: 20,
  COOLDOWN_HOURS: 2,

  IMMUNE_USER_IDS: ['706872385844019200', '768832997125259315', '987654321098765432'],

  MIDMAN_SUCCESS_CHANNEL_ID: '1487054708634816512',

  GAME_LIST: [
    'Abyss',
    'The Forge',
    'Escape Tsunami Brainrot',
    'Fisch',
    'Fish It',
    'Blox Fruits',
    '99 Nights In The Forest',
    'Tap-Tap Simulator',
    'Evade',
    'Blade Ball',
    'Garden Horizons',
    'Drag Drive Simulator',
    'Car Driving Indonesia',
    'Indo Strike',
    'Sailor Piece',
    'Fish Zar',
    'Sawah Indo',
    'Violence District',
    'Sambung Kata'
  ],

  files: {
    warns: path.join(BASE_DIR, 'warns.json'),
    tickets: path.join(BASE_DIR, 'tickets.json'),
    midmanTickets: path.join(BASE_DIR, 'midmanticket.json'),
    x8Tickets: path.join(BASE_DIR, 'x8ticket.json'),
    claims: path.join(BASE_DIR, 'claims.json'),
    sales: path.join(BASE_DIR, 'sales.json'),
    gameStatus: path.join(BASE_DIR, 'game_status.json'),
    doneTickets: path.join(BASE_DIR, 'done_tickets.json'),
    cooldowns: path.join(BASE_DIR, 'cooldowns.json')
  }
};
