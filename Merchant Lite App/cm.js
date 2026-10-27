/* ==========================================================================
   Cash Management (Automated Cash Sweep) — shared state and helpers
   Everything lives in sessionStorage so the prototype journey hangs
   together: the active configuration, the draft being edited in the
   set-up flow, the bank accounts the Onboarding team has added, and the
   sweep batches. Nothing here talks to a server.
   ========================================================================== */
var CM = (function () {
  'use strict';

  var KEY = 'cm_state_v1';
  var DRAFT_KEY = 'cm_draft_v1';

  var MERCHANT = { name: 'London Cafe', initials: 'LC', shortCode: '344100' };
  /* Same figure the Home screen shows as the Working Account Balance. */
  var WORKING_BALANCE = 24605.00;
  var MAX_ACCOUNTS = 10;

  /* Accounts are added and validated by the M-PESA Onboarding team; the
     merchant can only use the validated ones. */
  var SEED_BANKS = [
    { id: 'b1', bank: 'Commercial Bank of Ethiopia', short: 'CBE', color: '#6b2c91',
      acct: '1000244127788', holder: 'London Cafe PLC', status: 'active', validatedAt: '02 Sep 2026' },
    { id: 'b2', bank: 'Awash Bank', short: 'AB', color: '#f26b21',
      acct: '01320412447881', holder: 'London Cafe PLC', status: 'active', validatedAt: '02 Sep 2026' },
    { id: 'b3', bank: 'Dashen Bank', short: 'DB', color: '#1e4fa8',
      acct: '5012339988201', holder: 'London Cafe PLC', status: 'pending', requestedAt: '24 Oct 2026' },
    { id: 'b4', bank: 'Bank of Abyssinia', short: 'BOA', color: '#c59a1c',
      acct: '22091877350', holder: 'London Cafe', status: 'failed',
      reason: 'Account holder name does not match the merchant profile.' }
  ];

  var SEED_CONFIG = {
    type: 'fixed',                 /* fixed | percent */
    alloc: { b1: 10000 },          /* per-account amount (ETB) or percentage */
    primary: 'b2',                 /* receives whatever is left */
    freq: 'daily',                 /* daily | weekly | monthly */
    weekday: 5,                    /* 0 = Sunday, used when weekly */
    monthday: 1,                   /* 1–28 or 'last', used when monthly */
    time: '18:00',
    start: 'immediately',          /* immediately | a yyyy-mm-dd date */
    enabled: true,
    ref: 'CSW-2026-104271',
    activatedAt: '20 Oct 2026, 09:14 AM'
  };

  function t(id, bank, amount, status, ref, reason) {
    return { bank: bank, amount: amount, status: status, ref: ref, reason: reason || null };
  }
  var SEED_HISTORY = [
    { ref: 'CSB-2026-102618', date: '26 Oct 2026', time: '6:00 PM', status: 'successful', eligible: 31420.00,
      transfers: [t(1, 'b1', 10000, 'successful', 'TRF9KQ27XL01'), t(2, 'b2', 21420, 'successful', 'TRF9KQ27XL02')] },
    { ref: 'CSB-2026-102518', date: '25 Oct 2026', time: '6:00 PM', status: 'partial', eligible: 28960.00,
      transfers: [t(1, 'b1', 10000, 'successful', 'TRF9KP18AA11'),
                  t(2, 'b2', 18960, 'failed', 'TRF9KP18AA12', 'Bank unavailable — Awash Bank did not respond within 60 seconds. The amount stays in your M-PESA account and is queued for reprocessing.')] },
    { ref: 'CSB-2026-102418', date: '24 Oct 2026', time: '6:00 PM', status: 'failed', eligible: 22105.50,
      transfers: [t(1, 'b1', 10000, 'failed', 'TRF9KN04CC21', 'Payment switch unavailable. No funds left your M-PESA account.'),
                  t(2, 'b2', 12105.50, 'failed', 'TRF9KN04CC22', 'Payment switch unavailable. No funds left your M-PESA account.')] },
    { ref: 'CSB-2026-102318', date: '23 Oct 2026', time: '6:00 PM', status: 'successful', eligible: 26300.00,
      transfers: [t(1, 'b1', 10000, 'successful', 'TRF9KM77DD31'), t(2, 'b2', 16300, 'successful', 'TRF9KM77DD32')] },
    { ref: 'CSB-2026-102218', date: '22 Oct 2026', time: '6:00 PM', status: 'cancelled', eligible: 0,
      note: 'You paused the sweep before 6:00 PM, so nothing was transferred.', transfers: [] },
    { ref: 'CSB-2026-102118', date: '21 Oct 2026', time: '6:00 PM', status: 'successful', eligible: 19840.25,
      transfers: [t(1, 'b1', 10000, 'successful', 'TRF9KL52EE41'), t(2, 'b2', 9840.25, 'successful', 'TRF9KL52EE42')] }
  ];

  /* ---------- storage ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { banks: clone(SEED_BANKS), config: clone(SEED_CONFIG), history: clone(SEED_HISTORY) };
  }
  var state = load();
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function getDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return startDraft();
  }
  /* Editing always starts from the live configuration, so backing out of
     the flow leaves the active sweep untouched. */
  function startDraft() {
    var d = state.config ? clone(state.config)
      : { type: 'fixed', alloc: {}, primary: null, freq: 'daily', weekday: 5, monthday: 1,
          time: null, start: 'immediately', enabled: true };
    saveDraft(d);
    return d;
  }
  function saveDraft(d) { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {} }
  function clearDraft() { try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {} }

  function activate(d) {
    d.ref = 'CSW-2026-' + String(Math.floor(100000 + Math.random() * 900000));
    d.activatedAt = stamp();
    state.config = clone(d);
    save();
    clearDraft();
    return state.config;
  }
  function setEnabled(on) {
    if (!state.config) return;
    state.config.enabled = !!on;
    save();
  }

  /* ---------- lookups ---------- */
  function bank(id) {
    for (var i = 0; i < state.banks.length; i++) if (state.banks[i].id === id) return state.banks[i];
    return null;
  }
  function activeBanks() { return state.banks.filter(function (b) { return b.status === 'active'; }); }
  function batch(ref) {
    for (var i = 0; i < state.history.length; i++) if (state.history[i].ref === ref) return state.history[i];
    return null;
  }

  /* ---------- formatting ---------- */
  function money(n) {
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function moneyHtml(n) { return money(n) + '<small class="cur">ETB</small>'; }
  function mask(acct) { return '•••• ' + String(acct).slice(-4); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function time12(hhmm) {
    if (!hhmm) return '';
    var p = hhmm.split(':'), h = +p[0], m = p[1];
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ap;
  }
  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function freqLabel(c) {
    if (c.freq === 'weekly') return 'Weekly · every ' + WEEKDAYS[c.weekday];
    if (c.freq === 'monthly') return 'Monthly · ' + (c.monthday === 'last' ? 'last day' : ordinal(c.monthday));
    return 'Daily';
  }
  function dateLabel(iso) {
    if (!iso || iso === 'immediately') return 'Immediately';
    var d = new Date(iso + 'T00:00:00');
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function stamp() {
    var d = new Date();
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' +
      (h % 12 || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap;
  }

  /* Next execution time for a configuration, from now. */
  function nextRun(c) {
    if (!c || !c.time) return null;
    var p = c.time.split(':');
    var now = new Date();
    var from = (c.start && c.start !== 'immediately') ? new Date(c.start + 'T00:00:00') : new Date(now);
    if (from < now) from = new Date(now);
    for (var i = 0; i < 62; i++) {
      var d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, +p[0], +p[1]);
      if (d <= now) continue;
      if (c.freq === 'weekly' && d.getDay() !== c.weekday) continue;
      if (c.freq === 'monthly') {
        var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        var want = c.monthday === 'last' ? last : Math.min(c.monthday, last);
        if (d.getDate() !== want) continue;
      }
      return d;
    }
    return null;
  }
  function runLabel(d) {
    if (!d) return '—';
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((day - today) / 86400000);
    var when = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.getDate() + ' ' + MONTHS[d.getMonth()];
    return when + ', ' + time12(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
  }

  /* ---------- allocation ----------
     Fixed amounts are paid largest first, so if the balance runs short it is
     the smaller allocations that go unpaid; percentages are taken from the
     eligible balance at sweep time; the Primary/Remainder account receives
     whatever is left after everything else. */
  function split(c, eligible) {
    var rows = [], left = Math.round(eligible * 100) / 100;
    var ids = Object.keys(c.alloc || {}).filter(function (id) { return id !== c.primary && +c.alloc[id] > 0; });
    if (c.type === 'fixed') {
      ids.sort(function (a, b) { return c.alloc[b] - c.alloc[a]; });
      ids.forEach(function (id) {
        var amt = Math.min(+c.alloc[id], left);
        left = Math.round((left - amt) * 100) / 100;
        rows.push({ id: id, value: +c.alloc[id], amount: amt, primary: false, short: amt < +c.alloc[id] });
      });
    } else {
      ids.forEach(function (id) {
        var amt = Math.floor(eligible * +c.alloc[id]) / 100;
        left = Math.round((left - amt) * 100) / 100;
        rows.push({ id: id, value: +c.alloc[id], amount: amt, primary: false });
      });
    }
    if (c.primary) rows.push({ id: c.primary, value: null, amount: Math.max(0, left), primary: true });
    else if (left > 0) rows.push({ id: null, value: null, amount: left, unallocated: true });
    return rows;
  }

  /* What stops a configuration from being activated (empty = valid). */
  function problems(c) {
    var out = [];
    var ids = Object.keys(c.alloc || {}).filter(function (id) { return id !== c.primary && +c.alloc[id] > 0; });
    var total = ids.reduce(function (s, id) { return s + +c.alloc[id]; }, 0);
    if (!ids.length && !c.primary) out.push('Allocate to at least one bank account.');
    if (c.type === 'percent') {
      if (total > 100) out.push('Percentages add up to ' + total + '% — they cannot exceed 100%.');
      if (total < 100 && !c.primary) out.push('Choose a Primary/Remainder account for the remaining ' + (100 - total) + '%.');
    } else if (!c.primary) {
      out.push('Choose a Primary/Remainder account to receive the balance left after fixed amounts.');
    }
    return out;
  }

  function batchTotals(b) {
    var ok = 0, bad = 0, nOk = 0, nBad = 0;
    b.transfers.forEach(function (x) {
      if (x.status === 'successful') { ok += x.amount; nOk++; } else if (x.status === 'failed') { bad += x.amount; nBad++; }
    });
    return { ok: ok, bad: bad, nOk: nOk, nBad: nBad };
  }

  var STATUS = {
    scheduled:  ['Scheduled', 'info'],
    processing: ['Processing', 'info'],
    successful: ['Successful', 'ok'],
    partial:    ['Partially Successful', 'warn'],
    failed:     ['Failed', 'bad'],
    cancelled:  ['Cancelled', 'idle'],
    active:     ['Active', 'ok'],
    pending:    ['Pending validation', 'warn'],
    paused:     ['Paused', 'idle']
  };
  function chip(status) {
    var s = STATUS[status] || [status, 'idle'];
    return '<span class="chip ' + s[1] + '">' + s[0] + '</span>';
  }
  function bankAv(b, small) {
    if (!b) return '<span class="bank-av' + (small ? ' sm' : '') + '" style="background:#9aa0a6">?</span>';
    return '<span class="bank-av' + (small ? ' sm' : '') + '" style="background:' + b.color + '">' + esc(b.short) + '</span>';
  }


  /* Status pill with an icon, and the one-line sweep row the simple screens
     share. Partial is shortened so the date beside it stays on one line;
     the sweep's own page spells it out. */
  var PILL = {
    successful: ['ok', 'check'], partial: ['warn', 'alert'], failed: ['bad', 'x'],
    cancelled: ['idle', 'x'], scheduled: ['info', 'clock'], processing: ['info', 'clock'],
    active: ['ok', 'check'], paused: ['idle', 'pause'], pending: ['warn', 'clock'], invalid: ['bad', 'alert']
  };
  var PILL_LABEL = { partial: 'Partial', active: 'Active', paused: 'Paused', pending: 'Pending', invalid: 'Invalid' };
  function pill(status, full) {
    var p = PILL[status] || ['idle', 'info'];
    var label = (!full && PILL_LABEL[status]) || (STATUS[status] ? STATUS[status][0] : status);
    if (status === 'invalid') label = 'Invalid';
    return '<span class="st ' + p[0] + '">' + ICON[p[1]] + label + '</span>';
  }
  function tone(status) { var p = PILL[status]; return p ? (p[0] === 'ok' ? '' : p[0]) : 'idle'; }
  function sweepRow(b) {
    var tt = batchTotals(b);
    return '<span class="tile-ico ' + tone(b.status) + '">' + ICON.swap + '</span>' +
      '<div class="tile-main"><div class="tile-title">' + b.date + ' • ' + b.time + '</div>' +
        '<div class="tile-amt">' + money(tt.ok) + '<span class="cur">ETB</span></div></div>' +
      pill(b.status) + ICON.chev;
  }

  /* ---------- icons ---------- */
  var ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    percent: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m9 15 6-6M9.5 9.5h.01M14.5 14.5h.01"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8L6.7 19.6l1-6L3.3 9.4l6-.9z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6M5 10v8M19 10v8M9.5 10v8M14.5 10v8M3 20h18"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8.2"/><path d="M3 3.5v4.7h4.7M12 7.5V12l3 2"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M21 6H8l-5 6 5 6h13zM12 10l4 4M16 10l-4 4"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>'
  };

  /* ---------- UI helpers ---------- */
  function goBack(fallback) {
    if (history.length > 1) history.back(); else location.href = fallback;
  }
  function openSheet(id) {
    document.body.classList.add('sheet-open');
    document.getElementById(id).classList.add('open');
  }
  function closeSheet() {
    document.body.classList.remove('sheet-open');
    document.querySelectorAll('.sheet.open').forEach(function (s) { s.classList.remove('open'); });
  }
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.innerHTML = ICON.check + '<span>' + msg + '</span>';
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }
  function copy(text, label) {
    function done() { toast((label || 'Reference') + ' copied.'); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* Scroll-snap wheel. items: [{label, value}]; returns { get(), set(value) }. */
  function wheel(el, items, value) {
    var ROW = 40;
    el.innerHTML = '<div class="pad"></div><div class="pad"></div>' +
      items.map(function (it) { return '<div>' + esc(it.label) + '</div>'; }).join('') +
      '<div class="pad"></div><div class="pad"></div>';
    var cells = el.querySelectorAll('div:not(.pad)');
    function index() { return Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW))); }
    function mark() {
      var i = index();
      cells.forEach(function (c, k) { c.classList.toggle('sel', k === i); });
    }
    function set(v) {
      var i = 0;
      for (var k = 0; k < items.length; k++) if (items[k].value === v) i = k;
      el.scrollTop = i * ROW;
      mark();
    }
    el.addEventListener('scroll', mark, { passive: true });
    cells.forEach(function (c, k) {
      c.addEventListener('click', function () { el.scrollTo({ top: k * ROW, behavior: 'smooth' }); });
    });
    requestAnimationFrame(function () { set(value); });
    return { get: function () { return items[index()].value; }, set: set };
  }

  return {
    MERCHANT: MERCHANT, WORKING_BALANCE: WORKING_BALANCE, MAX_ACCOUNTS: MAX_ACCOUNTS,
    WEEKDAYS: WEEKDAYS, MONTHS: MONTHS, ICON: ICON, STATUS: STATUS,
    state: state, save: save, bank: bank, activeBanks: activeBanks, batch: batch,
    getDraft: getDraft, startDraft: startDraft, saveDraft: saveDraft, clearDraft: clearDraft,
    activate: activate, setEnabled: setEnabled,
    money: money, moneyHtml: moneyHtml, mask: mask, esc: esc, time12: time12, ordinal: ordinal,
    freqLabel: freqLabel, dateLabel: dateLabel, nextRun: nextRun, runLabel: runLabel, stamp: stamp,
    split: split, problems: problems, batchTotals: batchTotals, chip: chip, bankAv: bankAv,
    pill: pill, tone: tone, sweepRow: sweepRow,
    goBack: goBack, openSheet: openSheet, closeSheet: closeSheet, toast: toast, copy: copy, wheel: wheel
  };
})();
