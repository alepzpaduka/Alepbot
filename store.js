/**
 * AlepzBot — Storage Handler
 * Owner: fiqq
 * Version: 2.0.0 (Clean)
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

// ===== TICKETS =====
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

// ===== X8 TICKETS =====
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

// ===== CLAIMS =====
let ticketClaims = readJson(cfg.files.claims, {});
function saveClaims() {
  writeJson(cfg.files.claims, ticketClaims);
}

// ===== DONE TICKETS =====
let doneTickets = readJson(cfg.files.doneTickets, []);
function saveDoneTickets() {
  writeJson(cfg.files.doneTickets, doneTickets);
}

// ===== COOLDOWNS =====
let staffCooldowns = readJson(cfg.files.cooldowns, {});
function saveCooldowns() {
  writeJson(cfg.files.cooldowns, staffCooldowns);
}

// ===== EXPORTS =====
module.exports = {
  // Tickets
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
    for (const [, data] of Object.entries(activeTickets)) {
      if (typeof data === 'object' && data.channel_id === channelId) return !!data.is_premium;
      if (data === channelId) return false;
    }
    return false;
  },

  // X8 Tickets
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

  // Claims
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
    return ticketClaims[String(channelId)] || null;
  },

  // Done Tickets
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

  // Cooldowns
  staffCooldowns,
  saveCooldowns
};
