/* ═══════════════════════════════════════════════════════════
   MERCHANT LOYALTY MODULE — shared mock data, state & helpers
   Loaded by loyalty-care-desk.html and loyalty-fulfilment.html.

   Everything here is demo data held in sessionStorage so a
   reward's lifecycle survives navigation between the two pages.
   Nothing is sent anywhere.
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── ROLES ──────────────────────────────────────────── */
  var ROLES = {
    'care-desk': { label: 'Care Desk',  icon: 'headphones',     email: 'meron.tesfaye@partner.safaricom.et' },
    'admin':     { label: 'Admin',      icon: 'shield',         email: 'aklilu.tamirat@partner.safaricom.et' },
    /* RSM assigns rewards to field agents; TDR fulfils what they were assigned. */
    'rsm':       { label: 'RSM',        icon: 'clipboard-list', email: 'dawit.alemu@partner.safaricom.et' },
    'tdr':       { label: 'TDR',        icon: 'truck',          email: 'samuel.girma@partner.safaricom.et' }
  };

  var ROLE_KEY = 'mpesa_loyalty_role';
  var STATE_KEY = 'mpesa_loyalty_state';

  /* ── RSM DIRECTORY ─────────────────────────────────── */
  /* An RSM owns a region. They take a redeemed reward, put it in the hands of
     one of their TDRs, and answer for it until the merchant has it. */
  var RSMS = [
    { id: 'RSM-01', name: 'Dawit Alemu',   region: 'Central Region', email: 'dawit.alemu@partner.safaricom.et' },
    { id: 'RSM-02', name: 'Meron Tesfaye', region: 'Eastern Region', email: 'meron.tesfaye@partner.safaricom.et' }
  ];

  /* ── TDR DIRECTORY ─────────────────────────────────── */
  /* Every TDR reports to exactly one RSM, so a record's RSM decides which TDRs
     it can be handed to — an RSM never allocates outside their own team. */
  var TDRS = [
    { id: 'TDR-01', name: 'Samuel Girma',  region: 'Addis Ababa', rsm: 'RSM-01', email: 'samuel.girma@partner.safaricom.et' },
    { id: 'TDR-02', name: 'Hanna Bekele',  region: 'Dire Dawa',   rsm: 'RSM-02', email: 'hanna.bekele@partner.safaricom.et' },
    { id: 'TDR-03', name: 'Yonas Kebede',  region: 'Hawassa',     rsm: 'RSM-01', email: 'yonas.kebede@partner.safaricom.et' },
    { id: 'TDR-04', name: 'Liya Getachew', region: 'Harar',       rsm: 'RSM-02', email: 'liya.getachew@partner.safaricom.et' }
  ];
  /* The signed-in TDR for the demo — records assigned here are "mine". */
  var CURRENT_TDR = 'TDR-01';
  /* The signed-in RSM for the demo — the manager who does the assigning. */
  var CURRENT_RSM = 'RSM-01';

  /* ── CAMPAIGN ───────────────────────────────────────── */
  var CAMPAIGN = 'Merchant Loyalty 2026';

  /* ── MERCHANT LOYALTY RECORDS (Care Desk source) ──────
     Identity, blacklist, campaign and points earned live here.
     Redemptions are NOT duplicated — they are derived from the shared
     redemption + fulfilment state by redemptionsFor(), so the Care Desk
     view and the fulfilment pipeline can never disagree.              */
  var MERCHANTS = {
    '10070': {
      name: 'Manna Hotel Ltd', category: 'Hospitality', region: 'Addis Ababa', cluster: 'Kality',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: true, earned: 12500 }
    },
    '10071': {
      name: 'Blessed Hotel Ltd', category: 'Hospitality', region: 'Addis Ababa', cluster: 'Kality',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: true, earned: 9000 }
    },
    '10072': {
      name: 'Star Cafe', category: 'Food & Beverage', region: 'Addis Ababa', cluster: 'Bole',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: true, earned: 20000 }
    },
    /* Eligible, but has never joined the campaign */
    '10073': {
      name: 'Golden Shop', category: 'Retail', region: 'Dire Dawa', cluster: 'Sabian',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: false, earned: 0 }
    },
    /* Merchant exists on the merchant database but has no loyalty record at all */
    '10074': {
      name: 'Blue Nile Mart', category: 'Retail', region: 'Hawassa', cluster: 'Tabor',
      status: 'Inactive', blacklisted: false,
      loyalty: null
    },
    '10075': {
      name: 'Blacklisted Merchant PLC', category: 'Retail', region: 'Bahir Dar', cluster: 'Belay Zeleke',
      status: 'Active', blacklisted: true,
      blacklist: {
        reason: 'Suspected fraudulent activity',
        dateAdded: '2026-06-18',
        validity: 'Active — under review until 2026-12-31',
        addedBy: 'aklilu.tamirat@partner.safaricom.et'
      },
      loyalty: { campaign: CAMPAIGN, eligible: false, participating: false, earned: 1500 }
    },
    '10076': {
      name: 'Lalibela Supermarket', category: 'Retail', region: 'Bahir Dar', cluster: 'Belay Zeleke',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: true, earned: 15200 }
    },
    /* Participating, holds points, has never redeemed — the "Not Redeemed" case */
    '10077': {
      name: 'Adama Electronics', category: 'Retail', region: 'Adama', cluster: 'Adama Central',
      status: 'Active', blacklisted: false,
      loyalty: { campaign: CAMPAIGN, eligible: true, participating: true, earned: 6400 }
    }
  };

  /* Short code that simulates a backend failure, for the error state */
  var FAILURE_CODE = '10099';

  /* ── REWARD INVENTORY ───────────────────────────────── */
  var INVENTORY_SEED = [
    { id: 'RWD-SP-01', item: 'Smartphone — Tecno Spark 20', category: 'Electronics', stock: 40, status: 'Active' },
    { id: 'RWD-SP-02', item: 'Smartphone — Samsung A06',    category: 'Electronics', stock: 25, status: 'Active' },
    { id: 'RWD-FL-01', item: 'Float Top-Up — 700 ETB',      category: 'Float',       stock: 500, status: 'Active' },
    { id: 'RWD-FL-02', item: 'Float Top-Up — 100 ETB',      category: 'Float',       stock: 800, status: 'Active' },
    { id: 'RWD-TV-01', item: 'Television — 32" LED',        category: 'Electronics', stock: 3,  status: 'Active' },
    /* Deliberately out of stock, to demonstrate the no-inventory rule */
    { id: 'RWD-FR-01', item: 'Refrigerator — 200L',         category: 'Appliances',  stock: 0,  status: 'Out of Stock' }
  ];

  /* ── REDEMPTIONS AWAITING / IN FULFILMENT ───────────── */
  /* A redemption with no matching fulfilment record is un-allocated. */
  var REDEMPTIONS_SEED = [
    { ref: 'RDM-2026-0070', shortCode: '10070', points: 8000,  item: 'Smartphone — Tecno Spark 20', rewardItemId: 'RWD-SP-01', date: '2026-08-12' },
    { ref: 'RDM-2026-0072', shortCode: '10072', points: 5000,  item: 'Smartphone — Samsung A06',    rewardItemId: 'RWD-SP-02', date: '2026-09-02' },
    { ref: 'RDM-2026-0076', shortCode: '10076', points: 15000, item: 'Smartphone — Tecno Spark 20', rewardItemId: 'RWD-SP-01', date: '2026-09-06' },
    { ref: 'RDM-2026-0088', shortCode: '10071', points: 3000,  item: 'Television — 32" LED',        rewardItemId: 'RWD-TV-01', date: '2026-09-09' },
    { ref: 'RDM-2026-0092', shortCode: '10072', points: 2500,  item: 'Float Top-Up — 700 ETB',      rewardItemId: 'RWD-FL-01', date: '2026-09-10' },
    { ref: 'RDM-2026-0093', shortCode: '10070', points: 1000,  item: 'Float Top-Up — 100 ETB',      rewardItemId: 'RWD-FL-02', date: '2026-09-12' },
    { ref: 'RDM-2026-0094', shortCode: '10072', points: 4500,  item: 'Smartphone — Samsung A06',    rewardItemId: 'RWD-SP-02', date: '2026-09-03' },
    /* Not yet allocated — the reward is out of stock, so allocation must be refused */
    { ref: 'RDM-2026-0091', shortCode: '10072', points: 6000,  item: 'Refrigerator — 200L',         rewardItemId: 'RWD-FR-01', date: '2026-09-11' },
    /* Not yet allocated — stock is available, so this one allocates cleanly */
    { ref: 'RDM-2026-0096', shortCode: '10071', points: 2500,  item: 'Float Top-Up — 700 ETB',      rewardItemId: 'RWD-FL-01', date: '2026-09-13' }
  ];

  /* ── FULFILMENT RECORDS ─────────────────────────────── */
  /* Lifecycle: allocated → dispatched → received → pending → fulfilled
     Off-path:  exception / cancelled                                   */
  var FULFILMENT_SEED = [
    {
      id: 'FUL-0001', redemptionRef: 'RDM-2026-0070', shortCode: '10070',
      rewardItemId: 'RWD-SP-01', item: 'Smartphone — Tecno Spark 20',
      rsm: 'RSM-01', tdr: 'TDR-01', status: 'fulfilled',
      allocatedAt: '2026-08-13', dispatchRef: 'DSP-2026-0041', dispatchedAt: '2026-08-15',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Kality Zone Office',
      receivedAt: '2026-08-18', handoverAt: '2026-08-21 14:32',
      txnRef: 'TXN-HND-88213', otpVerified: true, otp: null, otpExpiresAt: null, otpAttempts: 0
    },
    {
      id: 'FUL-0002', redemptionRef: 'RDM-2026-0072', shortCode: '10072',
      rewardItemId: 'RWD-SP-02', item: 'Smartphone — Samsung A06',
      rsm: 'RSM-01', tdr: 'TDR-01', status: 'received',
      allocatedAt: '2026-09-03', dispatchRef: 'DSP-2026-0052', dispatchedAt: '2026-09-05',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Bole Zone Office',
      receivedAt: '2026-09-08', handoverAt: null,
      txnRef: null, otpVerified: false, otp: null, otpExpiresAt: null, otpAttempts: 0
    },
    {
      /* Handover already started — a live OTP the merchant is holding right now */
      id: 'FUL-0003', redemptionRef: 'RDM-2026-0076', shortCode: '10076',
      rewardItemId: 'RWD-SP-01', item: 'Smartphone — Tecno Spark 20',
      rsm: 'RSM-01', tdr: 'TDR-01', status: 'pending',
      allocatedAt: '2026-09-07', dispatchRef: 'DSP-2026-0058', dispatchedAt: '2026-09-09',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Belay Zeleke Zone Office',
      receivedAt: '2026-09-12', handoverAt: null,
      txnRef: null, otpVerified: false, otp: '482913', otpExpiresAt: '+5m', otpAttempts: 0
    },
    {
      /* Handover started but the merchant's code has already lapsed */
      id: 'FUL-0004', redemptionRef: 'RDM-2026-0088', shortCode: '10071',
      rewardItemId: 'RWD-TV-01', item: 'Television — 32" LED',
      rsm: 'RSM-02', tdr: 'TDR-02', status: 'pending',
      allocatedAt: '2026-09-10', dispatchRef: 'DSP-2026-0061', dispatchedAt: '2026-09-11',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Sabian Zone Office',
      receivedAt: '2026-09-12', handoverAt: null,
      txnRef: null, otpVerified: false, otp: '771204', otpExpiresAt: '-2m', otpAttempts: 0
    },
    {
      id: 'FUL-0005', redemptionRef: 'RDM-2026-0092', shortCode: '10072',
      rewardItemId: 'RWD-FL-01', item: 'Float Top-Up — 700 ETB',
      rsm: 'RSM-01', tdr: 'TDR-03', status: 'dispatched',
      allocatedAt: '2026-09-11', dispatchRef: 'DSP-2026-0063', dispatchedAt: '2026-09-12',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Tabor Zone Office',
      receivedAt: null, handoverAt: null,
      txnRef: null, otpVerified: false, otp: null, otpExpiresAt: null, otpAttempts: 0
    },
    {
      id: 'FUL-0006', redemptionRef: 'RDM-2026-0093', shortCode: '10070',
      rewardItemId: 'RWD-FL-02', item: 'Float Top-Up — 100 ETB',
      rsm: 'RSM-01', tdr: 'TDR-01', status: 'allocated',
      allocatedAt: '2026-09-13', dispatchRef: null, dispatchedAt: null,
      fromLocation: null, toLocation: null,
      receivedAt: null, handoverAt: null,
      txnRef: null, otpVerified: false, otp: null, otpExpiresAt: null, otpAttempts: 0
    },
    {
      id: 'FUL-0007', redemptionRef: 'RDM-2026-0094', shortCode: '10072',
      rewardItemId: 'RWD-SP-02', item: 'Smartphone — Samsung A06',
      rsm: 'RSM-02', tdr: 'TDR-02', status: 'exception',
      exceptionType: 'Damaged reward', exceptionNote: 'Screen cracked in transit, returned to warehouse.',
      allocatedAt: '2026-09-04', dispatchRef: 'DSP-2026-0055', dispatchedAt: '2026-09-06',
      fromLocation: 'Central Warehouse — Addis Ababa', toLocation: 'Sabian Zone Office',
      receivedAt: '2026-09-08', handoverAt: null,
      txnRef: null, otpVerified: false, otp: null, otpExpiresAt: null, otpAttempts: 0
    }
  ];

  /* ── LIFECYCLE ──────────────────────────────────────── */
  var LIFECYCLE = [
    { key: 'available',  label: 'Available' },
    { key: 'allocated',  label: 'Allocated' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'received',   label: 'Received' },
    { key: 'pending',    label: 'Pending Handover' },
    { key: 'fulfilled',  label: 'Fulfilled' }
  ];

  var STATUS_LABELS = {
    available: 'Available', allocated: 'Allocated', dispatched: 'Dispatched',
    received: 'Received', pending: 'Pending Handover', fulfilled: 'Fulfilled',
    exception: 'Exception', cancelled: 'Cancelled'
  };

  var STATUS_ICONS = {
    available: 'package', allocated: 'user-check', dispatched: 'truck',
    received: 'package-check', pending: 'clock', fulfilled: 'check-circle',
    exception: 'alert-triangle', cancelled: 'x-circle'
  };

  var EXCEPTION_TYPES = [
    'Reward unavailable', 'Incorrect reward allocation', 'Damaged reward', 'Lost reward',
    'Failed handover', 'Expired OTP', 'Merchant unavailable', 'Incorrect merchant information'
  ];

  /* ── STATE (sessionStorage backed) ──────────────────── */
  var state = null;

  /* ── BLACKLIST ──────────────────────────────────────────
     The blacklist is admin-editable, so unlike the rest of MERCHANTS it lives
     in the persisted state rather than in the static seed above. It is seeded
     from whichever merchants start out blacklisted, then synced back onto
     MERCHANTS on every load so Care Desk and the blacklist page agree.      */
  /* Eligibility as seeded, so removing a merchant from the blacklist restores
     what they had rather than leaving them permanently ineligible. */
  var LOYALTY_BASELINE = (function () {
    var out = {};
    Object.keys(MERCHANTS).forEach(function (code) {
      var l = MERCHANTS[code].loyalty;
      if (l) out[code] = { eligible: l.eligible, participating: l.participating };
    });
    return out;
  })();

  function seedBlacklist() {
    var out = [];
    Object.keys(MERCHANTS).forEach(function (code) {
      var m = MERCHANTS[code];
      if (!m.blacklisted) return;
      var b = m.blacklist || {};
      out.push({
        shortCode: code,
        reason: (b.reason || 'Suspected fraudulent activity').toLowerCase(),
        dateAdded: b.dateAdded || today(),
        validity: b.validity || 'Active — under review',
        addedBy: b.addedBy || 'aklilu.tamirat@partner.safaricom.et',
        source: 'seed'
      });
    });
    return out;
  }

  /* Push the persisted blacklist onto MERCHANTS. MERCHANTS is rebuilt on every
     page load, so without this a merchant blacklisted on one page would look
     clean on the next. */
  function syncBlacklist() {
    var list = (state && state.blacklist) || [];
    var byCode = {};
    list.forEach(function (b) { byCode[b.shortCode] = b; });

    Object.keys(MERCHANTS).forEach(function (code) {
      var m = MERCHANTS[code];
      var b = byCode[code];
      if (b) {
        m.blacklisted = true;
        m.blacklist = {
          reason: b.reason,
          dateAdded: b.dateAdded,
          validity: b.validity,
          addedBy: b.addedBy
        };
        /* A blacklisted merchant cannot take part in the campaign. */
        if (m.loyalty) { m.loyalty.eligible = false; m.loyalty.participating = false; }
      } else {
        m.blacklisted = false;
        delete m.blacklist;
        var base = LOYALTY_BASELINE[code];
        if (m.loyalty && base) {
          m.loyalty.eligible = base.eligible;
          m.loyalty.participating = base.participating;
        }
      }
    });
  }

  function blacklistList() { return loadState().blacklist; }
  function blacklistEntry(code) {
    var list = blacklistList();
    for (var i = 0; i < list.length; i++) if (list[i].shortCode === code) return list[i];
    return null;
  }
  function isBlacklisted(code) { return !!blacklistEntry(code); }

  /* Add one merchant. Returns { ok: true } or { ok: false, error: '...' } so the
     caller can report per-row outcomes during a bulk import. */
  function addBlacklist(code, reason, source) {
    code = String(code == null ? '' : code).trim();
    reason = String(reason == null ? '' : reason).trim().toLowerCase();

    if (!code) return { ok: false, error: 'Missing short code' };
    if (!/^\d+$/.test(code)) return { ok: false, error: 'Short code must be digits only' };
    if (!reason) return { ok: false, error: 'Missing reason' };
    if (!MERCHANTS[code]) return { ok: false, error: 'Not in the loyalty register' };
    if (isBlacklisted(code)) return { ok: false, error: 'Already blacklisted' };

    var s = loadState();
    s.blacklist.unshift({
      shortCode: code,
      reason: reason,
      dateAdded: today(),
      validity: 'Active — under review',
      addedBy: currentUser(),
      source: source || 'manual'
    });
    saveState();
    syncBlacklist();
    return { ok: true };
  }

  function removeBlacklist(code) {
    var s = loadState();
    for (var i = 0; i < s.blacklist.length; i++) {
      if (s.blacklist[i].shortCode === code) {
        s.blacklist.splice(i, 1);
        saveState();
        syncBlacklist();
        return true;
      }
    }
    return false;
  }

  function seedState() {
    var now = Date.now();
    var fulfilment = FULFILMENT_SEED.map(function (r) {
      var rec = JSON.parse(JSON.stringify(r));
      /* Resolve the relative OTP expiry markers into real timestamps */
      if (rec.otpExpiresAt === '+5m') rec.otpExpiresAt = now + 5 * 60 * 1000;
      else if (rec.otpExpiresAt === '-2m') rec.otpExpiresAt = now - 2 * 60 * 1000;
      return rec;
    });
    return {
      inventory: JSON.parse(JSON.stringify(INVENTORY_SEED)),
      redemptions: JSON.parse(JSON.stringify(REDEMPTIONS_SEED)),
      fulfilment: fulfilment,
      blacklist: seedBlacklist(),
      audit: [],
      seq: { ful: 7, dsp: 63, rdm: 94, txn: 88213 }
    };
  }

  function loadState() {
    if (state) return state;
    try {
      var raw = sessionStorage.getItem(STATE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        /* A session stored before the blacklist existed has no such key */
        if (!state.blacklist) { state.blacklist = seedBlacklist(); saveState(); }
        syncBlacklist();
        return state;
      }
    } catch (e) { /* private mode or blocked storage — fall through to a fresh seed */ }
    state = seedState();
    saveState();
    syncBlacklist();
    return state;
  }

  function saveState() {
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* not fatal */ }
  }

  function resetState() {
    state = seedState();
    saveState();
  }

  /* ── AUTH / ROLE ────────────────────────────────────── */
  function getRole() {
    try { return sessionStorage.getItem(ROLE_KEY); } catch (e) { return null; }
  }
  function setRole(role) {
    try { sessionStorage.setItem(ROLE_KEY, role); } catch (e) { /* not fatal */ }
  }
  function clearRole() {
    try { sessionStorage.removeItem(ROLE_KEY); sessionStorage.removeItem(STATE_KEY); } catch (e) {}
    state = null;
  }
  function currentUser() {
    var r = getRole();
    return (ROLES[r] && ROLES[r].email) || 'unknown';
  }
  function roleLabel(r) {
    r = r || getRole();
    return (ROLES[r] && ROLES[r].label) || 'Unknown';
  }

  /* Loyalty lives inside the Merchant Portal — there is one login for the whole
     portal, and access to this module is a permission on the signed-in user.
     No session means not signed into the portal at all. */
  function requireLogin() {
    var r = getRole();
    if (!r || !ROLES[r]) { window.location.href = 'merchant-login.html'; return null; }
    return r;
  }
  function can(allowed) {
    return allowed.indexOf(getRole()) !== -1;
  }

  /* ── AUDIT ──────────────────────────────────────────── */
  function audit(action, target, outcome) {
    var s = loadState();
    s.audit.unshift({
      at: stamp(),
      user: currentUser(),
      role: roleLabel(),
      action: action,
      target: target || '—',
      outcome: outcome || 'Success'
    });
    if (s.audit.length > 400) s.audit.length = 400;
    saveState();
  }

  /* ── LOOKUPS ────────────────────────────────────────── */
  function merchant(code) { return MERCHANTS[code] || null; }
  function merchantName(code) { return MERCHANTS[code] ? MERCHANTS[code].name : 'Unknown Merchant'; }
  function tdr(id) {
    for (var i = 0; i < TDRS.length; i++) if (TDRS[i].id === id) return TDRS[i];
    return null;
  }
  function tdrName(id) { var t = tdr(id); return t ? t.name + ' (' + t.id + ')' : '—'; }
  function rsm(id) {
    for (var i = 0; i < RSMS.length; i++) if (RSMS[i].id === id) return RSMS[i];
    return null;
  }
  function rsmName(id) { var m = rsm(id); return m ? m.name + ' (' + m.id + ')' : '—'; }
  /* The TDRs one RSM may hand a reward to. */
  function tdrsFor(rsmId) {
    return TDRS.filter(function (t) { return t.rsm === rsmId; });
  }
  function inventoryItem(id) {
    var inv = loadState().inventory;
    for (var i = 0; i < inv.length; i++) if (inv[i].id === id) return inv[i];
    return null;
  }
  function redemption(ref) {
    var reds = loadState().redemptions;
    for (var i = 0; i < reds.length; i++) if (reds[i].ref === ref) return reds[i];
    return null;
  }
  function fulfilmentFor(ref) {
    var f = loadState().fulfilment;
    for (var i = 0; i < f.length; i++) if (f[i].redemptionRef === ref) return f[i];
    return null;
  }
  function record(id) {
    var f = loadState().fulfilment;
    for (var i = 0; i < f.length; i++) if (f[i].id === id) return f[i];
    return null;
  }

  /* A redemption's claim status is the live fulfilment status, so completing a
     handover on the fulfilment page immediately shows as Claimed on Care Desk. */
  function claimStatusOf(ful) {
    if (!ful) return { status: 'Not Allocated', date: null };
    switch (ful.status) {
      case 'fulfilled': return { status: 'Claimed', date: (ful.handoverAt || '').split(' ')[0] || null };
      case 'exception': return { status: 'Exception', date: null };
      case 'cancelled': return { status: 'Cancelled', date: null };
      default:          return { status: 'Pending Handover', date: null };
    }
  }

  /* Care Desk redemption rows for one merchant, built from shared state. */
  function redemptionsFor(shortCode) {
    return loadState().redemptions
      .filter(function (r) { return r.shortCode === shortCode; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; })
      .map(function (r) {
        var claim = claimStatusOf(fulfilmentFor(r.ref));
        return {
          ref: r.ref, date: r.date, points: r.points, item: r.item,
          status: 'Redeemed', claimStatus: claim.status, claimDate: claim.date
        };
      });
  }

  /* Points earned is fixed per merchant; redeemed and available follow the
     redemption records so the three figures always reconcile. */
  function pointsFor(shortCode) {
    var m = MERCHANTS[shortCode];
    if (!m || !m.loyalty) return null;
    var redeemed = redemptionsFor(shortCode).reduce(function (sum, r) { return sum + r.points; }, 0);
    var earned = m.loyalty.earned;
    return { earned: earned, redeemed: redeemed, available: Math.max(0, earned - redeemed) };
  }

  /* Inventory counts derived from fulfilment records, so the two tabs agree. */
  function inventoryCounts(itemId) {
    var f = loadState().fulfilment;
    var c = { allocated: 0, dispatched: 0, fulfilled: 0 };
    for (var i = 0; i < f.length; i++) {
      if (f[i].rewardItemId !== itemId) continue;
      if (f[i].status === 'allocated') c.allocated++;
      else if (f[i].status === 'dispatched' || f[i].status === 'received' || f[i].status === 'pending') c.dispatched++;
      else if (f[i].status === 'fulfilled') c.fulfilled++;
    }
    return c;
  }
  function availableStock(itemId) {
    var it = inventoryItem(itemId);
    if (!it) return 0;
    var c = inventoryCounts(itemId);
    return Math.max(0, it.stock - c.allocated - c.dispatched);
  }

  /* ── COUNTS FOR THE KPI STRIP ───────────────────────── */
  /* Counts follow whatever the current role can see, so a TDR's KPI strip
     reflects only their own workload. */
  function statusCounts() {
    var f = visibleRecords();
    var c = { allocated: 0, dispatched: 0, received: 0, pending: 0, fulfilled: 0, exception: 0, cancelled: 0 };
    for (var i = 0; i < f.length; i++) if (c[f[i].status] !== undefined) c[f[i].status]++;
    return c;
  }

  /* A TDR sees the records they must deliver; an RSM sees the records they own.
     Only admin sees the whole pipeline. */
  function visibleRecords() {
    var f = loadState().fulfilment;
    var r = getRole();
    if (r === 'tdr') return f.filter(function (x) { return x.tdr === CURRENT_TDR; });
    if (r === 'rsm') return f.filter(function (x) { return x.rsm === CURRENT_RSM; });
    return f.slice();
  }

  /* ── REFERENCE GENERATORS ───────────────────────────── */
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function nextFulfilmentId() { var s = loadState(); s.seq.ful++; saveState(); return 'FUL-' + pad(s.seq.ful, 4); }
  function nextDispatchRef() { var s = loadState(); s.seq.dsp++; saveState(); return 'DSP-2026-' + pad(s.seq.dsp, 4); }
  function nextTxnRef() { var s = loadState(); s.seq.txn++; saveState(); return 'TXN-HND-' + s.seq.txn; }

  /* ── FORMATTING ─────────────────────────────────────── */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }
  function stamp() {
    var d = new Date();
    return today() + ' ' + pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
  }
  function points(n) {
    if (n === null || n === undefined) return '—';
    return Number(n).toLocaleString('en-US');
  }
  function dash(v) { return (v === null || v === undefined || v === '') ? '—' : v; }

  /* Escape anything that reaches innerHTML. */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── CHIP MARKUP ────────────────────────────────────── */
  function chip(status) {
    var label = STATUS_LABELS[status] || status;
    var icon = STATUS_ICONS[status] || 'circle';
    return '<span class="lp-chip lp-chip-' + esc(status) + '">' +
           '<i data-lucide="' + icon + '"></i> ' + esc(label) + '</span>';
  }

  /* ── LIFECYCLE STEPPER MARKUP ───────────────────────── */
  function stepper(status) {
    var isException = (status === 'exception' || status === 'cancelled');
    var reached = ['available', 'allocated', 'dispatched', 'received', 'pending', 'fulfilled'].indexOf(status);
    if (isException) reached = -1;
    var html = '<div class="lp-steps">';
    for (var i = 0; i < LIFECYCLE.length; i++) {
      var cls = '';
      if (!isException) {
        if (i < reached) cls = 'done';
        else if (i === reached) cls = 'active';
      }
      var icon = (cls === 'done') ? 'check' : 'circle';
      html += '<div class="lp-step ' + cls + '">' +
                '<div class="lp-step-dot"><i data-lucide="' + icon + '"></i></div>' +
                '<div class="lp-step-lbl">' + esc(LIFECYCLE[i].label) + '</div>' +
              '</div>';
    }
    if (isException) {
      html += '<div class="lp-step exception">' +
                '<div class="lp-step-dot"><i data-lucide="alert-triangle"></i></div>' +
                '<div class="lp-step-lbl">' + esc(STATUS_LABELS[status]) + '</div>' +
              '</div>';
    }
    return html + '</div>';
  }

  /* ── ROW ACTION BUTTON ─────────────────── */
  /* An action cell can carry three controls. Spelled out they wrapped onto a
     second line and doubled the row height, so inside .lp-row-actions the
     button shows only its icon. The label stays in the markup — visually
     hidden, so it is still the button's accessible name and still matches a
     find-in-page — and data-tip surfaces it on hover or keyboard focus. */
  function rowBtn(label, icon, onclick, tone) {
    return '<button class="lp-row-btn ' + (tone || '') + '" onclick="' + onclick + '" ' +
             'data-tip="' + esc(label) + '">' +
             '<i data-lucide="' + esc(icon) + '"></i>' +
             '<span class="lp-btn-lbl">' + esc(label) + '</span>' +
           '</button>';
  }

  /* ── TOOLTIPS ──────────────────────────── */
  /* The bubble hangs off <body> rather than the cell: tables sit inside
     .table-responsive, whose overflow-x:auto makes the y axis clip too, so a
     tooltip nested in a row would be cut off on the first and last rows.
     Listeners are delegated, so re-rendering a table needs no rebinding. */
  var tipEl = null;

  function tipNode() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'lp-tip';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function showTip(host) {
    var text = host.getAttribute('data-tip');
    if (!text) return;
    var t = tipNode();
    t.textContent = text;
    t.classList.add('open');

    var b = host.getBoundingClientRect();
    var w = t.offsetWidth, h = t.offsetHeight;
    /* Centred over the control, pulled back inside the viewport at the edges
       — the action column sits hard against the right of the page. */
    var left = b.left + b.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = b.top - h - 8;
    if (top < 8) top = b.bottom + 8;       /* flip under when the row is at the top */
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }

  function hideTip() { if (tipEl) tipEl.classList.remove('open'); }

  function tipHost(e) {
    return (e.target && e.target.closest) ? e.target.closest('[data-tip]') : null;
  }

  function bindTips() {
    document.addEventListener('mouseover', function (e) {
      var host = tipHost(e);
      if (host) showTip(host); else hideTip();
    });
    document.addEventListener('focusin', function (e) {
      var host = tipHost(e);
      if (host) showTip(host);
    });
    document.addEventListener('focusout', hideTip);
    /* Scrolling slides the control out from under a fixed-position bubble. */
    window.addEventListener('scroll', hideTip, true);
  }
  bindTips();

  /* ── SHARED UI HELPERS ──────────────────────────────── */
  function icons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  function toast(title, message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast';
    if (type === 'error') el.style.borderLeftColor = '#e11d48';
    var iconName = (type === 'error') ? 'alert-triangle' : 'check-circle';
    var iconColor = (type === 'error') ? '#e11d48' : '#239150';
    el.innerHTML =
      '<div class="toast-icon"><i data-lucide="' + iconName + '" style="color:' + iconColor + ';width:19px;height:19px;"></i></div>' +
      '<div class="toast-content"><div class="toast-title">' + esc(title) + '</div>' +
      '<div class="toast-message">' + esc(message) + '</div></div>' +
      '<button class="toast-close" onclick="LP.closeToast(this)"><i data-lucide="x"></i></button>';
    container.appendChild(el);
    icons();
    void el.offsetHeight;
    el.classList.add('show');
    setTimeout(function () {
      if (el.parentNode) { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }
    }, 3500);
  }
  function closeToast(btn) {
    var t = btn.closest('.toast');
    t.classList.remove('show');
    setTimeout(function () { t.remove(); }, 300);
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (m) { m.classList.add('open'); icons(); }
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (m) m.classList.remove('open');
  }

  /* Topbar role chip + switcher.
     .portal-topbar sets overflow:hidden to clip its decorative glow, which would
     also clip a dropdown hanging below the bar. So the menu is appended to
     <body> and positioned with position:fixed against the chip instead of being
     nested inside the topbar. */
  function mountRoleChip(containerId) {
    var host = document.getElementById(containerId);
    if (!host) return;
    var r = getRole();

    host.insertAdjacentHTML('afterbegin',
      '<div class="lp-role-wrap">' +
        '<button class="lp-role-chip" id="lpRoleChip" onclick="LP.toggleRoleMenu(event)" ' +
                'aria-haspopup="true" aria-expanded="false" title="Change access level">' +
          '<i data-lucide="' + (ROLES[r] ? ROLES[r].icon : 'user') + '"></i> ' + esc(roleLabel(r)) +
          '<i data-lucide="chevron-down"></i>' +
        '</button>' +
      '</div>');

    var menu = '<div class="lp-role-menu" id="lpRoleMenu" role="menu">' +
               '<div class="lp-role-menu-lbl">Access level</div>';
    Object.keys(ROLES).forEach(function (key) {
      menu += '<button role="menuitem" class="' + (key === r ? 'active' : '') + '" ' +
                     'onclick="LP.switchRole(\'' + key + '\')">' +
                '<i data-lucide="' + ROLES[key].icon + '"></i> ' + esc(ROLES[key].label) +
              '</button>';
    });
    document.body.insertAdjacentHTML('beforeend', menu + '</div>');
    icons();

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.lp-role-wrap') && !e.target.closest('#lpRoleMenu')) closeRoleMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeRoleMenu(); });
    window.addEventListener('resize', positionRoleMenu);
    window.addEventListener('scroll', positionRoleMenu, true);
  }

  /* Anchor the fixed menu under the chip, right edges aligned, kept on screen. */
  function positionRoleMenu() {
    var menu = document.getElementById('lpRoleMenu');
    var chip = document.getElementById('lpRoleChip');
    if (!menu || !chip || !menu.classList.contains('open')) return;
    var c = chip.getBoundingClientRect();
    var width = menu.offsetWidth;
    var left = Math.max(12, Math.min(c.right - width, window.innerWidth - width - 12));
    menu.style.top = (c.bottom + 8) + 'px';
    menu.style.left = left + 'px';
  }

  function toggleRoleMenu(e) {
    e.stopPropagation();
    var menu = document.getElementById('lpRoleMenu');
    var chip = document.getElementById('lpRoleChip');
    if (!menu) return;
    /* sidebar.js moves body children into .portal-main after this mounts, so put
       the menu back on <body> — nothing there can clip or re-anchor it. */
    if (menu.parentElement !== document.body) document.body.appendChild(menu);

    var open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    if (chip) chip.setAttribute('aria-expanded', String(open));
    if (open) positionRoleMenu();
  }

  function closeRoleMenu() {
    var menu = document.getElementById('lpRoleMenu');
    var chip = document.getElementById('lpRoleChip');
    if (menu) menu.classList.remove('open');
    if (chip) chip.setAttribute('aria-expanded', 'false');
  }
  function switchRole(role) {
    setRole(role);
    audit('Role switched', roleLabel(role), 'Success');
    window.location.reload();
  }
  function logout() {
    clearRole();
    window.location.href = 'index.html';
  }

  /* Load once at module init so MERCHANTS carries the persisted blacklist
     before any page reads it — several pages call LP.merchant() without ever
     touching LP.state(), and would otherwise see the un-synced seed. */
  loadState();

  /* ── EXPORT ─────────────────────────────────────────── */
  global.LP = {
    ROLES: ROLES, TDRS: TDRS, RSMS: RSMS, CURRENT_TDR: CURRENT_TDR, CURRENT_RSM: CURRENT_RSM, CAMPAIGN: CAMPAIGN,
    MERCHANTS: MERCHANTS, FAILURE_CODE: FAILURE_CODE,
    LIFECYCLE: LIFECYCLE, STATUS_LABELS: STATUS_LABELS, STATUS_ICONS: STATUS_ICONS,
    EXCEPTION_TYPES: EXCEPTION_TYPES,

    state: loadState, save: saveState, reset: resetState,

    getRole: getRole, setRole: setRole, clearRole: clearRole, requireLogin: requireLogin,
    can: can, currentUser: currentUser, roleLabel: roleLabel,

    audit: audit,
    blacklistList: blacklistList, blacklistEntry: blacklistEntry,
    isBlacklisted: isBlacklisted, addBlacklist: addBlacklist, removeBlacklist: removeBlacklist,
    merchant: merchant, merchantName: merchantName,
    tdr: tdr, tdrName: tdrName, rsm: rsm, rsmName: rsmName, tdrsFor: tdrsFor,
    inventoryItem: inventoryItem, inventoryCounts: inventoryCounts, availableStock: availableStock,
    redemption: redemption, fulfilmentFor: fulfilmentFor, record: record,
    redemptionsFor: redemptionsFor, pointsFor: pointsFor, claimStatusOf: claimStatusOf,
    visibleRecords: visibleRecords, statusCounts: statusCounts,

    nextFulfilmentId: nextFulfilmentId, nextDispatchRef: nextDispatchRef, nextTxnRef: nextTxnRef,

    today: today, stamp: stamp, points: points, dash: dash, esc: esc, pad: pad,
    chip: chip, stepper: stepper, rowBtn: rowBtn,

    icons: icons, toast: toast, closeToast: closeToast,
    openModal: openModal, closeModal: closeModal,
    mountRoleChip: mountRoleChip, toggleRoleMenu: toggleRoleMenu, closeRoleMenu: closeRoleMenu,
    switchRole: switchRole, logout: logout
  };
})(window);
