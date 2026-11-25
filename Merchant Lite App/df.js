/* Distribute Float — shared demo data and state for the df-*.html screens.
   Loaded after cm.js, which supplies the icons, money formatting, sheets,
   toasts and the PDF receipt download. */
window.DF = (function () {
  var DRAFT_KEY = 'df_draft_v1', LAST_KEY = 'df_last_v1';

  /* Business numbers in the merchant's own organisation. Float can only
     move between these. */
  var ORG = {
    '701457843': { name: 'BETTY SHOP', balance: 42678.23 },
    '125216612': { name: 'BETTY SHOP 2', balance: 18240.5 },
    '125216634': { name: 'BETTY SHOP BOLE', balance: 9310 },
    '125216658': { name: 'BETTY SHOP PIASSA', balance: 27455.75 }
  };

  function digits(v) { return String(v || '').replace(/\D/g, ''); }
  function lookup(number) { var n = digits(number); return ORG[n] ? { number: n, name: ORG[n].name, balance: ORG[n].balance } : null; }
  /* 701457843 -> "701 457 843" */
  function spaced(number) { return digits(number).replace(/(\d{3})(?=\d)/g, '$1 '); }
  function initials(name) {
    return String(name || '').split(/\s+/).filter(function (w) { return /[A-Za-z]/.test(w); })
      .slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || 'MA';
  }

  function read(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function write(key, v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

  function getDraft() { return read(DRAFT_KEY) || { sender: '', receiver: '', amount: '', description: '' }; }
  function saveDraft(d) { write(DRAFT_KEY, d); }

  /* What's wrong with a draft, by field; empty when it can be sent. */
  function problems(d) {
    var p = {}, s = lookup(d.sender), r = lookup(d.receiver), amt = +d.amount;
    if (!digits(d.sender)) p.sender = 'required';
    else if (!s) p.sender = 'This business number is not in your organisation.';
    if (!digits(d.receiver)) p.receiver = 'required';
    else if (!r) p.receiver = 'This business number is not in your organisation.';
    else if (s && r.number === s.number) p.receiver = 'Choose a different business number from the sender.';
    if (!(amt > 0)) p.amount = 'required';
    else if (s && amt > s.balance) p.amount = 'Amount is more than the sender’s working account balance.';
    return p;
  }

  /* Record the completed transfer for the success screen and receipt. */
  function complete(d) {
    var now = new Date(), M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = now.getHours(), id = '';
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    var s = lookup(d.sender), r = lookup(d.receiver);
    var last = {
      sender: s, receiver: r, amount: +d.amount, description: d.description || 'DISTRIBUTE FLOAT',
      ref: '2' + id.slice(1), date: now.getDate() + ' ' + M[now.getMonth()] + ' ' + now.getFullYear(),
      time: (h % 12 || 12) + ':' + String(now.getMinutes()).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM')
    };
    write(LAST_KEY, last);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
    return last;
  }
  function last() { return read(LAST_KEY); }

  return { ORG: ORG, digits: digits, lookup: lookup, spaced: spaced, initials: initials,
    getDraft: getDraft, saveDraft: saveDraft, problems: problems, complete: complete, last: last };
})();
