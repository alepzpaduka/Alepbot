/**
 * Staff claim cooldown — same logic as bot.py (cooldowns.json via store.staffCooldowns)
 */
const cfg = require('./config');

function addClaimToCooldown(store, staffId) {
  const staffKey = String(staffId);
  const now = new Date();

  if (!store.staffCooldowns[staffKey]) {
    store.staffCooldowns[staffKey] = {
      cycle_start: now.toISOString(),
      claims_in_cycle: 0,
      exhausted_cooldown_until: null
    };
  }

  const exhaustedUntilStr = store.staffCooldowns[staffKey].exhausted_cooldown_until;
  if (exhaustedUntilStr) {
    const exhaustedUntil = new Date(exhaustedUntilStr);
    if (now >= exhaustedUntil) {
      store.staffCooldowns[staffKey] = {
        cycle_start: now.toISOString(),
        claims_in_cycle: 1,
        exhausted_cooldown_until: null
      };
      store.saveCooldowns();
      return;
    }
  }

  const cycleStart = new Date(store.staffCooldowns[staffKey].cycle_start);
  const timeSinceStart = now - cycleStart;
  const resetMs = cfg.RESET_MINUTES * 60 * 1000;

  if (timeSinceStart >= resetMs) {
    store.staffCooldowns[staffKey] = {
      cycle_start: now.toISOString(),
      claims_in_cycle: 1,
      exhausted_cooldown_until: null
    };
  } else {
    store.staffCooldowns[staffKey].claims_in_cycle += 1;
    if (store.staffCooldowns[staffKey].claims_in_cycle >= cfg.COOLDOWN_LIMIT) {
      const exhaustedUntil = new Date(now.getTime() + cfg.COOLDOWN_HOURS * 3600 * 1000);
      store.staffCooldowns[staffKey].exhausted_cooldown_until = exhaustedUntil.toISOString();
    }
  }

  store.saveCooldowns();
}

function isStaffOnCooldown(store, staffId) {
  const staffKey = String(staffId);
  const now = new Date();

  if (!store.staffCooldowns[staffKey]) {
    return [false, null, 0];
  }

  const exhaustedUntilStr = store.staffCooldowns[staffKey].exhausted_cooldown_until;
  if (exhaustedUntilStr) {
    const exhaustedUntil = new Date(exhaustedUntilStr);
    if (now < exhaustedUntil) {
      const timeLeft = exhaustedUntil - now;
      return [true, timeLeft, cfg.COOLDOWN_LIMIT];
    }
    store.staffCooldowns[staffKey] = {
      cycle_start: now.toISOString(),
      claims_in_cycle: 0,
      exhausted_cooldown_until: null
    };
    store.saveCooldowns();
    return [false, null, 0];
  }

  const cycleStart = new Date(store.staffCooldowns[staffKey].cycle_start);
  const timeSinceStart = now - cycleStart;
  const resetMs = cfg.RESET_MINUTES * 60 * 1000;

  if (timeSinceStart >= resetMs) {
    store.staffCooldowns[staffKey] = {
      cycle_start: now.toISOString(),
      claims_in_cycle: 0,
      exhausted_cooldown_until: null
    };
    store.saveCooldowns();
    return [false, null, 0];
  }

  const currentClaims = store.staffCooldowns[staffKey].claims_in_cycle;
  return [false, null, currentClaims];
}

function getClaimCount(store, staffId) {
  const staffKey = String(staffId);
  const now = new Date();

  if (!store.staffCooldowns[staffKey]) {
    return 0;
  }

  const exhaustedUntilStr = store.staffCooldowns[staffKey].exhausted_cooldown_until;
  if (exhaustedUntilStr) {
    const exhaustedUntil = new Date(exhaustedUntilStr);
    if (now < exhaustedUntil) {
      return cfg.COOLDOWN_LIMIT;
    }
  }

  const cycleStart = new Date(store.staffCooldowns[staffKey].cycle_start);
  const timeSinceStart = now - cycleStart;
  const resetMs = cfg.RESET_MINUTES * 60 * 1000;

  if (timeSinceStart >= resetMs) {
    store.staffCooldowns[staffKey] = {
      cycle_start: now.toISOString(),
      claims_in_cycle: 0,
      exhausted_cooldown_until: null
    };
    store.saveCooldowns();
    return 0;
  }

  return store.staffCooldowns[staffKey].claims_in_cycle;
}

module.exports = { addClaimToCooldown, isStaffOnCooldown, getClaimCount };
