/**
 * JSON persistence — same files as bot.py (same folder as bot.js).
 */
const fs = require('fs');
const cfg = require('./config');

function readJson(path, fallback) {
  try {
    if (!fs.existsSync(path)) return typeof fallback === 'function' ? fallback() : fallback;
    const raw = fs.readFileSync(path, 'utf8');
    return JSON.parse(raw);
  } catch {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 4), 'utf8');
}

// --- warns ---
let warns = readJson(cfg.files.warns, {});
function saveWarns() {
  writeJson(cfg.files.warns, warns);
}

// --- tickets ---
let ticketData = readJson(cfg.files.tickets, { counter: 0, tickets: {} });
let activeTickets = {};
let ticketCount = 0;
if (ticketData.tickets) {
  activeTickets = Object.fromEntries(Object.entries(ticketData.tickets).map(([k, v]) => [Number(k), v]));
  ticketCount = ticketData.counter || 0;
} else {
  activeTickets = { ...ticketData };
}

function saveTickets() {
  writeJson(cfg.files.tickets, { counter: ticketCount, tickets: activeTickets });
}

// --- midman ---
let midmanData = readJson(cfg.files.midmanTickets, { counter: 0, tickets: {} });
let midmanTickets = {};
let midmanTicketCount = 0;
if (midmanData.tickets) {
  midmanTickets = Object.fromEntries(Object.entries(midmanData.tickets).map(([k, v]) => [Number(k), v]));
  midmanTicketCount = midmanData.counter || 0;
}

function saveMidmanTickets() {
  writeJson(cfg.files.midmanTickets, { counter: midmanTicketCount, tickets: midmanTickets });
}

const midmanSessions = new Map();
const midmanTicketContext = new Map();

// --- x8 ---
let x8Data = readJson(cfg.files.x8Tickets, { counter: 0, tickets: {} });
let x8Tickets = {};
let x8TicketCount = 0;
if (x8Data.tickets) {
  x8Tickets = Object.fromEntries(Object.entries(x8Data.tickets).map(([k, v]) => [Number(k), v]));
  x8TicketCount = x8Data.counter || 0;
}

function saveX8Tickets() {
  writeJson(cfg.files.x8Tickets, { counter: x8TicketCount, tickets: x8Tickets });
}

// --- claims ---
let ticketClaims = readJson(cfg.files.claims, {});
function saveClaims() {
  writeJson(cfg.files.claims, ticketClaims);
}

// --- done tickets ---
let doneTickets = readJson(cfg.files.doneTickets, []);
function saveDoneTickets() {
  writeJson(cfg.files.doneTickets, doneTickets);
}

// --- sales ---
let salesData = readJson(cfg.files.sales, {});
function saveSales() {
  writeJson(cfg.files.sales, salesData);
}

// --- cooldowns ---
let staffCooldowns = readJson(cfg.files.cooldowns, {});
function saveCooldowns() {
  writeJson(cfg.files.cooldowns, staffCooldowns);
}

// --- game status ---
const defaultGameStatus = () => ({
  message_id: null,
  overall_status: 'working',
  statuses: Object.fromEntries(cfg.GAME_LIST.map((g) => [g, 'working']))
});

let gameStatusData = readJson(cfg.files.gameStatus, defaultGameStatus);
function syncGameListFromStatuses() {
  const st = gameStatusData.statuses || {};
  for (const name of Object.keys(st)) {
    if (!cfg.GAME_LIST.includes(name)) cfg.GAME_LIST.push(name);
  }
}
syncGameListFromStatuses();

function saveGameStatus() {
  if (!gameStatusData.statuses) gameStatusData.statuses = {};
  if (!gameStatusData.overall_status) gameStatusData.overall_status = 'working';
  if (gameStatusData.message_id === undefined) gameStatusData.message_id = null;
  for (const g of cfg.GAME_LIST) {
    if (gameStatusData.statuses[g] === undefined) gameStatusData.statuses[g] = 'working';
  }
  writeJson(cfg.files.gameStatus, gameStatusData);
}

module.exports = {
  warns,
  saveWarns,
  get warnsRef() {
    return warns;
  },
  setWarns(w) {
    warns = w;
  },

  activeTickets,
  ticketCount,
  saveTickets,
  incrementTicketCounter() {
    ticketCount += 1;
    saveTickets();
    return ticketCount;
  },
  addTicket(userId, channelId, isPremium = false) {
    activeTickets[userId] = { channel_id: channelId, is_premium: isPremium };
    saveTickets();
  },
  removeTicket(userId) {
    delete activeTickets[userId];
    saveTickets();
  },
  getTicketChannel(userId) {
    const data = activeTickets[userId];
    if (data == null) return null;
    if (typeof data === 'object' && data.channel_id != null) return data.channel_id;
    return data;
  },
  isTicketPremium(channelId) {
    for (const [uid, data] of Object.entries(activeTickets)) {
      if (typeof data === 'object' && data.channel_id === channelId) return !!data.is_premium;
      if (data === channelId) return false;
    }
    return false;
  },

  midmanTickets,
  midmanTicketCount,
  saveMidmanTickets,
  incrementMidmanTicketCounter() {
    midmanTicketCount += 1;
    saveMidmanTickets();
    return midmanTicketCount;
  },
  addMidmanTicket(userId, channelId) {
    midmanTickets[userId] = channelId;
    saveMidmanTickets();
  },
  removeMidmanTicket(userId) {
    delete midmanTickets[userId];
    saveMidmanTickets();
  },

  x8Tickets,
  x8TicketCount,
  saveX8Tickets,
  incrementX8TicketCounter() {
    x8TicketCount += 1;
    saveX8Tickets();
    return x8TicketCount;
  },
  addX8Ticket(userId, channelId) {
    x8Tickets[userId] = channelId;
    saveX8Tickets();
  },
  removeX8Ticket(userId) {
    delete x8Tickets[userId];
    saveX8Tickets();
  },

  ticketClaims,
  saveClaims,
  addClaim(channelId, staffId) {
    ticketClaims[String(channelId)] = String(staffId);
    saveClaims();
  },
  removeClaim(channelId) {
    delete ticketClaims[String(channelId)];
    saveClaims();
  },
  getClaim(channelId) {
    const id = ticketClaims[String(channelId)];
    return id ? id : null;
  },

  doneTickets,
  saveDoneTickets,
  isTicketDone(channelId) {
    return doneTickets.includes(channelId);
  },
  markTicketDone(channelId) {
    if (!doneTickets.includes(channelId)) {
      doneTickets.push(channelId);
      saveDoneTickets();
    }
  },
  removeDoneTicket(channelId) {
    const i = doneTickets.indexOf(channelId);
    if (i >= 0) {
      doneTickets.splice(i, 1);
      saveDoneTickets();
    }
  },

  salesData,
  saveSales,
  addSale(staffId, amount, description = 'Premium Sale') {
    const key = String(staffId);
    if (!salesData[key]) salesData[key] = { total: 0, sales: [] };
    salesData[key].sales.push({
      amount,
      description,
      timestamp: new Date().toISOString()
    });
    salesData[key].total += amount;
    saveSales();
  },
  getSales(staffId) {
    return salesData[String(staffId)] || { total: 0, sales: [] };
  },
  resetSales(staffId) {
    const key = String(staffId);
    if (salesData[key]) {
      salesData[key] = { total: 0, sales: [] };
      saveSales();
      return true;
    }
    return false;
  },

  staffCooldowns,
  saveCooldowns,

  gameStatusData,
  saveGameStatus,

  midmanSessions,
  midmanTicketContext
};
