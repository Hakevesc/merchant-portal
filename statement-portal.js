(function () {
  'use strict';

  const state = {
    category: 'customer',
    accounts: [],
    rows: [],
    page: 1,
    report: null,
    currentReceipt: null
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const today = new Date();
  const dateInput = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const addDays = (date, amount) => {
    const value = new Date(date);
    value.setDate(value.getDate() + amount);
    return value;
  };
  const money = (amount) => Number(amount).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const displayDate = (value) => {
    if (!value) return '—';
    const date = new Date(value + 'T00:00:00');
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  };
  const dateTime = (date) => new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Africa/Addis_Ababa'
  }).format(date) + ' EAT';
  const receiptDate = (date) => new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Addis_Ababa'
  }).format(date).replace(',', ' at');


  const PAGE_SIZE = 20;
  const METHODS = {
    customer: [['msisdn', 'MSISDN', 'Mobile number, e.g. 2517XXXXXXXX'], ['identity', 'Customer Identity ID', 'National ID or registered identity number']],
    partner: [['shortcode', 'Partner Short Code', 'Short code, e.g. 400522']]
  };
  const icons = () => { if (window.lucide && lucide.createIcons) lucide.createIcons(); };

  /* Customer / Partner tabs drive which search methods are offered. */
  function setCategory(category) {
    state.category = category;
    $$('[data-category]').forEach((b) => b.classList.toggle('active', b.dataset.category === category));
    $('#searchMethod').innerHTML = METHODS[category].map((m) => '<option value="' + m[0] + '">Search by ' + m[1] + '</option>').join('');
    updatePlaceholder();
    $('#accountResult').classList.add('hidden');
    $('#statementPreview').classList.add('hidden');
  }
  function method() { return METHODS[state.category].find((m) => m[0] === $('#searchMethod').value) || METHODS[state.category][0]; }
  function updatePlaceholder() { $('#accountSearchInput').placeholder = method()[2]; }

  function accountList() {
    if (state.category === 'partner') {
      return [
        { name: 'Working Account', type: 'Working', suffix: '•••• 0522' },
        { name: 'Utility Account', type: 'Utility', suffix: '•••• 2276' },
        { name: 'Merchant Account', type: 'Merchant', suffix: '•••• 1048' },
        { name: 'Float Account', type: 'Float', suffix: '•••• 3301' },
        { name: 'Commission Account', type: 'Commission', suffix: '•••• 6819' }
      ];
    }
    return [
      { name: 'Main M-PESA Account', type: 'Main', suffix: '•••• 7184' },
      { name: 'Reward Account', type: 'Reward', suffix: '•••• 0092' }
    ];
  }

  function revealAccountResult(query) {
    const m = method();
    const holder = state.category === 'partner' ? 'Safaricom Ethiopia Demo Partner' : 'Demo Customer';
    const masked = m[0] === 'identity' ? '••••••••' : (query.length > 5 ? query.slice(0, 4) + '••••••' : '••••••');
    state.holder = holder;
    state.idLabel = m[1];
    state.identifier = masked;
    $('#resultHeading').textContent = holder;
    $('#resultIdentifier').textContent = m[1] + ': ' + masked;
    state.accounts = accountList();
    $('#accountSelect').innerHTML = state.accounts.map((a, i) => '<option value="' + i + '">' + html(a.name + ' · ' + a.suffix) + '</option>').join('');
    $('#accountResult').classList.remove('hidden');
    $('#statementPreview').classList.add('hidden');
    $('#accountResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Demo transactions ─────────────────────────────────────
     A mix of the transaction types a statement really carries. Each type
     says which way the money moves, its fee, and the fields its receipt
     shows, so every receipt matches its own transaction. */
  const PEOPLE = ['Abebe Kebede', 'Hana Tesfaye', 'Dawit Bekele', 'Selam Girma', 'Yonas Alemu', 'Meron Haile', 'Biruk Tadesse', 'Liya Mekonnen'];
  const MERCHANTS = [['Kaldi\'s Coffee Bole', '512244'], ['Shoa Supermarket', '508831'], ['Lucy Pharmacy', '531907'], ['Bambis Mart', '544120']];
  const BILLERS = [['Ethiopian Electric Utility', '400200'], ['Ethio telecom Postpaid', '400100'], ['DSTV Ethiopia', '400310'], ['AAWSA Water', '400420']];
  const AGENTS = [['Betty Merhat Agency', '876543'], ['Kidus Shop Agent', '871204'], ['Tana Mobile Agent', '879932']];
  const BANKS = ['CBE', 'Awash Bank', 'Dashen Bank', 'Cooperative Bank of Oromia'];
  const phoneOf = (i) => '09••••••' + String(10 + (i * 37) % 89);
  const acctOf = (i) => '••••' + String(1000 + (i * 733) % 9000);

  /* in: true = paid in. fields(i, who) returns the receipt's own lines. */
  const CUSTOMER_TYPES = [
    { key: 'receive', name: 'Receive Money', in: true, fee: 0, amounts: [500, 1500, 2000, 750], reason: 'Money Received',
      details: (i) => 'Received from ' + PEOPLE[i % 8] + ' ' + phoneOf(i),
      fields: (i, who) => [['SENDER NAME', PEOPLE[i % 8]], ['SENDER PHONE NUMBER', phoneOf(i)], ['RECEIVER NAME', who.name], ['RECEIVER PHONE NUMBER', who.phone]] },
    { key: 'send', name: 'Send Money', in: false, fee: 5, amounts: [200, 350, 1000, 450], reason: 'Send Money',
      details: (i) => 'Sent to ' + PEOPLE[(i + 3) % 8] + ' ' + phoneOf(i + 5),
      fields: (i, who) => [['SENDER NAME', who.name], ['SENDER PHONE NUMBER', who.phone], ['RECEIVER NAME', PEOPLE[(i + 3) % 8]], ['RECEIVER PHONE NUMBER', phoneOf(i + 5)]] },
    { key: 'buygoods', name: 'Buy Goods', in: false, fee: 0, amounts: [85, 240, 560, 130], reason: 'Payment for goods and services',
      details: (i) => 'Paid to ' + MERCHANTS[i % 4][0] + ' · Till ' + MERCHANTS[i % 4][1],
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['MERCHANT NAME', MERCHANTS[i % 4][0]], ['TILL NUMBER', MERCHANTS[i % 4][1]]] },
    { key: 'paybill', name: 'Pay Bill', in: false, fee: 2, amounts: [320, 650, 899, 180], reason: 'Utility Bill Payment',
      details: (i) => BILLERS[i % 4][0] + ' · Acc ' + acctOf(i),
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['BILLER NAME', BILLERS[i % 4][0]], ['BUSINESS NUMBER', BILLERS[i % 4][1]], ['BILL ACCOUNT NUMBER', acctOf(i)]] },
    { key: 'airtime', name: 'Buy Airtime', in: false, fee: 0, amounts: [50, 100, 25, 200], reason: 'Airtime Purchase',
      details: (i) => 'Airtime for ' + phoneOf(i + 2),
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['RECIPIENT PHONE NUMBER', phoneOf(i + 2)], ['OPERATOR', 'Safaricom Ethiopia']] },
    { key: 'cashin', name: 'Cash In', in: true, fee: 0, amounts: [1000, 2500, 5000, 800], reason: 'Cash Deposit',
      details: (i) => 'Deposit at ' + AGENTS[i % 3][0] + ' · ' + AGENTS[i % 3][1],
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['AGENT NAME', AGENTS[i % 3][0]], ['AGENT SHORT CODE', AGENTS[i % 3][1]]] },
    { key: 'cashout', name: 'Cash Out', in: false, fee: 10, amounts: [500, 1000, 2000, 300], reason: 'Cash Withdrawal',
      details: (i) => 'Withdrawal at ' + AGENTS[(i + 1) % 3][0] + ' · ' + AGENTS[(i + 1) % 3][1],
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['AGENT NAME', AGENTS[(i + 1) % 3][0]], ['AGENT SHORT CODE', AGENTS[(i + 1) % 3][1]]] },
    { key: 'bankin', name: 'Bank to M-PESA', in: true, fee: 0, amounts: [3000, 1200, 4500, 2000], reason: 'Bank Transfer to Wallet',
      details: (i) => 'From ' + BANKS[i % 4] + ' A/C ' + acctOf(i + 7),
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['SENDER BANK', BANKS[i % 4]], ['SENDER BANK ACCOUNT', acctOf(i + 7)]] },
    { key: 'bankout', name: 'M-PESA to Bank', in: false, fee: 3, amounts: [1500, 700, 2200, 1000], reason: 'Wallet Transfer to Bank',
      details: (i) => 'To ' + BANKS[(i + 1) % 4] + ' A/C ' + acctOf(i + 3),
      fields: (i, who) => [['CUSTOMER NAME', who.name], ['CUSTOMER PHONE NUMBER', who.phone], ['RECEIVER BANK', BANKS[(i + 1) % 4]], ['RECEIVER BANK ACCOUNT', acctOf(i + 3)]] },
    { key: 'savings', name: 'Deposit to Savings account', in: false, fee: 0, amounts: [300, 1200, 500, 800], reason: 'M-PESA Savings · Money Deposited',
      details: () => 'Savings deposit · Rainy Day',
      fields: (i, who) => [['NAME', who.name], ['PHONE NUMBER', who.phone], ['PARTNER BANK', 'Cooperative Bank of Oromia'], ['SAVING ACCOUNT NUMBER', 'IS••••2501'], ['SAVING A/C NAME', 'Rainy Day'], ['INTEREST', '7% Interest']] }
  ];
  const PARTNER_TYPES = [
    { key: 'c2b', name: 'Customer Payment', in: true, fee: 0, amounts: [240, 1350, 560, 85, 2100], reason: 'Payment for goods and services',
      details: (i) => 'Payment from ' + PEOPLE[i % 8] + ' ' + phoneOf(i),
      fields: (i, who) => [['CUSTOMER NAME', PEOPLE[i % 8]], ['CUSTOMER PHONE NUMBER', phoneOf(i)], ['RECEIVER NAME', who.name], ['RECEIVER SHORT CODE', who.phone]] },
    { key: 'm2b', name: 'Merchant to Bank', in: false, fee: 0, amounts: [8000, 15000, 5000], reason: 'Settlement to Bank Account',
      details: (i) => 'Transfer to ' + BANKS[i % 4] + ' A/C ' + acctOf(i + 4),
      fields: (i, who) => [['SENDER NAME', who.name], ['SENDER SHORT CODE', who.phone], ['RECEIVER BANK', BANKS[i % 4]], ['RECEIVER BANK ACCOUNT', acctOf(i + 4)]] },
    { key: 'm2m', name: 'Merchant to Merchant Transfer', in: false, fee: 0, amounts: [2500, 4000, 1800], reason: 'Business Payment',
      details: (i) => 'Paid ' + MERCHANTS[i % 4][0] + ' · ' + MERCHANTS[i % 4][1],
      fields: (i, who) => [['SENDER NAME', who.name], ['SENDER SHORT CODE', who.phone], ['RECEIVER NAME', MERCHANTS[i % 4][0]], ['RECEIVER SHORT CODE', MERCHANTS[i % 4][1]]] },
    { key: 'commission', name: 'Commission Payment', in: true, fee: 0, amounts: [420, 615, 280], reason: 'Partner Commission',
      details: () => 'Commission payout · Safaricom M-PESA',
      fields: (i, who) => [['PARTNER NAME', who.name], ['PARTNER SHORT CODE', who.phone], ['PAID BY', 'Safaricom M-PESA Mobile Financial Services PLC']] }
  ];

  function makeDemoRows(endDate, who) {
    const total = 333;
    const types = who.partner ? PARTNER_TYPES : CUSTOMER_TYPES;
    const end = new Date(endDate + 'T00:00:00');
    let balance = 100000;
    return Array.from({ length: total }, (_, index) => {
      /* Weighted so money in roughly keeps pace with money out. */
      const type = types[(index * 7 + Math.floor(index / types.length)) % types.length];
      const amount = type.amounts[index % type.amounts.length];
      const paidIn = type.in ? amount : 0;
      const withdrawn = type.in ? 0 : amount + type.fee;
      balance += paidIn - withdrawn;
      const date = addDays(end, -6 + Math.floor(index * 7 / total));
      date.setHours(7 + (index * 5) % 16, (index * 17) % 60, (index * 31) % 60, 0);
      return {
        receipt: 'DEMO-RCPT-' + String(index + 1).padStart(4, '0'),
        details: type.details(index),
        status: 'Completed',
        paidIn, withdrawn, amount, fee: type.fee,
        type: type.name,
        channel: who.partner ? 'M-PESA Business App' : 'M-PESA App',
        reason: type.reason,
        fields: type.fields(index, who),
        date,
        balance
      };
    });
  }

  /* "1,250.50" -> "One Thousand Two Hundred Fifty Birr and Fifty Cents Only" */
  function makeAmountWords(value) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function underThousand(n) {
      const out = [];
      if (n >= 100) { out.push(ones[Math.floor(n / 100)] + ' Hundred'); n %= 100; }
      if (n >= 20) out.push(tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : ''));
      else if (n) out.push(ones[n]);
      return out.join(' ');
    }
    function words(n) {
      if (!n) return 'Zero';
      const parts = [];
      [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']].forEach(([unit, label]) => {
        if (n >= unit) { parts.push(underThousand(Math.floor(n / unit)) + ' ' + label); n %= unit; }
      });
      if (n) parts.push(underThousand(n));
      return parts.join(' ');
    }
    const cents = Math.round(value * 100);
    const rest = cents % 100;
    return words(Math.floor(cents / 100)) + ' Birr' + (rest ? ' and ' + words(rest) + ' Cents' : '') + ' Only';
  }

  /* The receipt's lines for one row: its own fields, then amount, type and ID. */
  function receiptFields(row) {
    return row.fields.concat([['AMOUNT', money(row.amount) + ' ETB'], ['TRANSACTION TYPE', row.type], ['TRANSACTION ID', row.receipt]]);
  }
  function receiptExtras(row) {
    return [['TOTAL AMOUNT IN WORD', makeAmountWords(row.amount + row.fee)], ['USED CHANNEL', row.channel], ['TRANSACTION REASON', row.reason]];
  }

  function renderReceipt(row) {
    state.currentReceipt = row;
    const pair = (f) => '<dt>' + html(f[0]) + '</dt><dd>' + html(f[1]) + '</dd>';
    $('#receiptFields').innerHTML = receiptFields(row).map(pair).join('');
    $('#receiptDetailBody').innerHTML =
      '<tr><td>' + html(row.receipt) + '</td><td>' + html(receiptDate(row.date)) + '</td><td>' + money(row.amount) + ' BIRR</td></tr>' +
      (row.fee ? '<tr><td colspan="2" class="receipt-sub">SERVICE FEE</td><td>' + money(row.fee) + ' BIRR</td></tr>' : '') +
      '<tr class="receipt-total"><td colspan="2">TOTAL AMOUNT</td><td>' + money(row.amount + row.fee) + ' BIRR</td></tr>';
    $('#receiptExtra').innerHTML = receiptExtras(row).map(pair).join('');
  }

  function setCanvasFont(context, size, weight) {
    context.font = (weight || '400') + ' ' + size + 'px Arial, Helvetica, sans-serif';
  }

  function drawText(context, value, x, y, options) {
    const settings = options || {};
    context.fillStyle = settings.color || '#20252a';
    setCanvasFont(context, settings.size || 9, settings.weight || '400');
    context.textAlign = settings.align || 'left';
    context.textBaseline = settings.baseline || 'alphabetic';
    context.fillText(String(value == null ? '' : value), x, y, settings.maxWidth);
  }

  function wrapText(context, value, width, font) {
    context.font = font;
    const words = String(value == null ? '' : value).split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? line + ' ' + word : word;
      if (line && context.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }

  function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    return { canvas, context };
  }

  function drawReceiptCanvas(row) {
    const { canvas, context: ctx } = makeCanvas(794, 1123);
    const total = row.amount + row.fee;
    ctx.save();
    ctx.translate(397, 600);
    ctx.rotate(-Math.PI / 7);
    ctx.globalAlpha = 0.07;
    drawText(ctx, 'M-PESA', 0, 50, { size: 150, weight: '900', align: 'center', color: '#8a8a8a' });
    ctx.restore();

    drawFittedLogo(ctx, 54, 40, 54);
    drawText(ctx, 'Safaricom M-PESA Mobile Financial Services PLC', 54, 125, { size: 15, weight: '700' });
    [['TIN NO: ', '0084242753'], ['VAT REG NO: ', '22371880003'], ['Address: ', 'Addis Ababa, Kirkos Woreda 1'], ['Tel: ', '+251 756 765434']].forEach((pair, i) => {
      const y = 155 + i * 28;
      drawText(ctx, pair[0], 54, y, { size: 13, color: '#74777a' });
      setCanvasFont(ctx, 13, '400');
      drawText(ctx, pair[1], 54 + ctx.measureText(pair[0]).width, y, { size: 13, weight: '700' });
    });
    if (ready(PDF_IMAGES.qr)) ctx.drawImage(PDF_IMAGES.qr, 642, 40, 98, 98);
    drawText(ctx, 'SCAN TO VERIFY', 691, 154, { size: 9, weight: '700', align: 'center' });
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(54, 268); ctx.lineTo(740, 268); ctx.stroke();

    ctx.strokeStyle = '#fe353d'; ctx.lineWidth = 2; ctx.strokeRect(54, 292, 686, 44);
    drawText(ctx, 'TRANSACTION INFORMATION', 397, 320, { size: 17, weight: '700', align: 'center', color: '#fe353d' });
    const fields = receiptFields(row);
    fields.forEach((field, index) => {
      const y = 375 + index * 28;
      drawText(ctx, field[0], 54, y, { size: 12 });
      drawText(ctx, field[1], 350, y, { size: 12, weight: '700', maxWidth: 385 });
    });

    /* Detail table: amount, then the fee when there is one, then the total. */
    let y = 375 + fields.length * 28 + 6;
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(54, y, 686, 32);
    drawText(ctx, 'TRANSACTION DETAIL', 397, y + 21, { size: 14, weight: '700', align: 'center' });
    y += 40;
    const lines = [[row.receipt, receiptDate(row.date), money(row.amount) + ' BIRR']];
    if (row.fee) lines.push(['', 'SERVICE FEE', money(row.fee) + ' BIRR']);
    ctx.strokeStyle = '#d9d9d9'; ctx.lineWidth = 1;
    ctx.fillStyle = '#fafafa'; ctx.fillRect(54, y, 686, 32); ctx.strokeRect(54, y, 686, 32);
    drawText(ctx, 'RECEIPT NO', 64, y + 21, { size: 11, weight: '700' });
    drawText(ctx, 'TRANSACTION DATE AND TIME', 292, y + 21, { size: 11, weight: '700' });
    drawText(ctx, 'AMOUNT', 730, y + 21, { size: 11, weight: '700', align: 'right' });
    y += 32;
    lines.forEach((line) => {
      ctx.strokeRect(54, y, 686, 32);
      drawText(ctx, line[0], 64, y + 21, { size: 11 });
      drawText(ctx, line[1], line[0] ? 292 : 500, y + 21, { size: 11, align: line[0] ? 'left' : 'right' });
      drawText(ctx, line[2], 730, y + 21, { size: 11, align: 'right' });
      y += 32;
    });
    ctx.fillStyle = '#fff1f2'; ctx.fillRect(54, y, 686, 32); ctx.strokeRect(54, y, 686, 32);
    drawText(ctx, 'TOTAL AMOUNT', 500, y + 21, { size: 12, weight: '700', align: 'right', color: '#fe353d' });
    drawText(ctx, money(total) + ' BIRR', 730, y + 21, { size: 12, weight: '700', align: 'right', color: '#fe353d' });
    if (ready(PDF_IMAGES.stamp)) { ctx.save(); ctx.translate(630, y - 20); ctx.rotate(-12 * Math.PI / 180); ctx.drawImage(PDF_IMAGES.stamp, -80, -80, 160, 160); ctx.restore(); }
    y += 58;

    ctx.strokeStyle = '#e0e0e0'; ctx.beginPath(); ctx.moveTo(54, y - 18); ctx.lineTo(740, y - 18); ctx.stroke();
    receiptExtras(row).forEach((field, index) => {
      drawText(ctx, field[0], 54, y + 12 + index * 30, { size: 12 });
      drawText(ctx, field[1], 350, y + 12 + index * 30, { size: 12, weight: '700', maxWidth: 385 });
    });

    ctx.strokeStyle = '#e0e0e0'; ctx.beginPath(); ctx.moveTo(54, 1030); ctx.lineTo(740, 1030); ctx.stroke();
    drawText(ctx, 'SAMPLE LAYOUT ONLY · NOT AN OFFICIAL RECEIPT', 397, 1050, { size: 8, align: 'center', color: '#8a8f94' });
    drawText(ctx, 'THANK YOU FOR USING M-PESA', 397, 1068, { size: 12, align: 'center' });
    ctx.fillStyle = '#fe353d'; ctx.fillRect(0, 1079, 794, 44);
    const white = PDF_IMAGES.white;
    if (ready(white)) { const w = 26 * white.naturalWidth / white.naturalHeight; ctx.drawImage(white, 740 - w, 1088, w, 26); }
    return canvas;
  }

  /* ── Statement PDF ─────────────────────────────────────────
     Portrait A4 in the M-PESA receipt layout (company header and QR,
     red-outlined title, grey section bars, pink total row, stamp, red
     footer bar) carrying the statement: holder and period details, the
     transaction table over as many pages as it needs, then the account
     summary and important information on the last page. */
  const PAGE_W = 794, PAGE_H = 1123, LEFT = 46, RIGHT = 748;
  const RED = '#fe353d', INK = '#1c1c21', MUTED = '#74777a', LINE = '#d9d9d9';
  const TABLE_BOTTOM = 1010, CLOSING_H = 330, HEAD_H = 34;
  const COLUMNS = [
    { key: 'no', label: ['NO.'], width: 34, center: true },
    { key: 'receipt', label: ['RECEIPT NO.'], width: 100 },
    { key: 'time', label: ['COMPLETION', 'TIME'], width: 108 },
    { key: 'details', label: ['DETAILS'], width: 162 },
    { key: 'status', label: ['TRANSACTION', 'STATUS'], width: 78 },
    { key: 'paidIn', label: ['PAID IN', '(ETB)'], width: 73, right: true },
    { key: 'withdrawn', label: ['WITHDRAWN', '(ETB)'], width: 74, right: true },
    { key: 'balance', label: ['BALANCE', '(ETB)'], width: 73, right: true }
  ];
  const pdfImage = (src) => { const img = new Image(); img.src = src; return img; };
  const ASSETS = window.STATEMENT_ASSETS || {};
  const PDF_IMAGES = { logo: pdfImage(ASSETS.logo || 'M-Pesa-Logo.png'), white: pdfImage(ASSETS.white || 'assets/M-PESA-white-logo.svg'), stamp: pdfImage(ASSETS.stamp || 'assets/M-PESA-official_stamp.png'), qr: pdfImage(ASSETS.qr || 'assets/qr-placeholder.svg') };
  const ready = (img) => img.complete && img.naturalWidth;

  function drawFittedLogo(ctx, x, y, height) {
    const logo = PDF_IMAGES.logo;
    if (!ready(logo)) { drawText(ctx, 'M-PESA', x, y + height - 6, { size: 26, weight: '700', color: '#1fa855' }); return; }
    ctx.drawImage(logo, x, y, height * logo.naturalWidth / logo.naturalHeight, height);
  }
  function hr(ctx, y, color) { ctx.strokeStyle = color || '#e0e0e0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(LEFT, y); ctx.lineTo(RIGHT, y); ctx.stroke(); }
  function greyBar(ctx, y, title) {
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(LEFT, y, RIGHT - LEFT, 32);
    drawText(ctx, title, PAGE_W / 2, y + 21, { size: 14, weight: '700', align: 'center', color: INK });
    return y + 40;
  }

  function drawWatermark(ctx) {
    ctx.save(); ctx.translate(PAGE_W / 2, PAGE_H / 2); ctx.rotate(-25 * Math.PI / 180); ctx.globalAlpha = 0.1;
    drawText(ctx, 'M-PESA', 0, 50, { size: 140, weight: '900', align: 'center', color: '#b4b4b4' });
    ctx.restore();
  }

  /* Company header, QR and the red-outlined title; returns where content starts. */
  function drawHeader(ctx) {
    drawFittedLogo(ctx, LEFT, 36, 54);
    drawText(ctx, 'Safaricom M-PESA Mobile Financial Services PLC', LEFT, 122, { size: 15, weight: '700', color: INK });
    [['TIN NO: ', '0084242753'], ['VAT REG NO: ', '22371880003'], ['Address: ', 'Addis Ababa, Kirkos Woreda 1'], ['Tel: ', '+251 756 765434']].forEach((pair, i) => {
      const y = 152 + i * 28;
      drawText(ctx, pair[0], LEFT, y, { size: 13, color: MUTED });
      setCanvasFont(ctx, 13, '400');
      drawText(ctx, pair[1], LEFT + ctx.measureText(pair[0]).width, y, { size: 13, weight: '700', color: INK });
    });
    ctx.strokeStyle = '#e0e0e0'; ctx.strokeRect(RIGHT - 96, 36, 96, 96);
    if (ready(PDF_IMAGES.qr)) ctx.drawImage(PDF_IMAGES.qr, RIGHT - 95, 37, 94, 94);
    drawText(ctx, 'SCAN TO VERIFY', RIGHT - 48, 148, { size: 9, weight: '700', align: 'center', color: INK });
    hr(ctx, 262);
    ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.strokeRect(LEFT, 280, RIGHT - LEFT, 42);
    drawText(ctx, 'M-PESA TRANSACTION STATEMENT', PAGE_W / 2, 307, { size: 16, weight: '700', align: 'center', color: RED });
    return 344;
  }

  function drawContinuedHeader(ctx, report) {
    drawFittedLogo(ctx, LEFT, 32, 40);
    ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.strokeRect(LEFT, 90, RIGHT - LEFT, 36);
    drawText(ctx, 'M-PESA TRANSACTION STATEMENT · CONTINUED', PAGE_W / 2, 113, { size: 13, weight: '700', align: 'center', color: RED });
    drawText(ctx, report.holder + '  ·  ' + report.reference, RIGHT, 60, { size: 10, align: 'right', color: MUTED });
    return 142;
  }

  /* Holder details on the left, period and report details on the right. */
  function drawDetails(ctx, y, report) {
    const left = [['ACCOUNT HOLDER', report.holder], [report.idLabel.toUpperCase(), report.identifier]];
    if (!report.partner) left.push(['CUSTOMER IDENTITY ID', report.identityId]);
    left.push(['ACCOUNT', report.accountName], ['ACCOUNT TYPE', report.accountType]);
    const right = [['FROM', report.from], ['TO', report.to], ['OPERATOR', report.operator], ['DATE OF REPORT', report.reportDate], ['STATEMENT REF.', report.reference]];
    drawText(ctx, report.partner ? 'PARTNER DETAILS' : 'CUSTOMER DETAILS', LEFT, y, { size: 11, weight: '700', color: MUTED });
    drawText(ctx, 'TIME PERIOD', 410, y, { size: 11, weight: '700', color: MUTED });
    left.forEach((row, i) => {
      drawText(ctx, row[0], LEFT, y + 26 + i * 23, { size: 11.5, color: INK });
      drawText(ctx, row[1], LEFT + 150, y + 26 + i * 23, { size: 11.5, weight: '700', color: INK, maxWidth: 200 });
    });
    right.forEach((row, i) => {
      drawText(ctx, row[0], 410, y + 26 + i * 23, { size: 11.5, color: INK });
      drawText(ctx, row[1], 530, y + 26 + i * 23, { size: 11.5, weight: '700', color: INK, maxWidth: RIGHT - 530 });
    });
    return y + 26 + 5 * 23 + 8;
  }

  function drawTableHead(ctx, y) {
    ctx.fillStyle = '#fafafa'; ctx.fillRect(LEFT, y, RIGHT - LEFT, HEAD_H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    let x = LEFT;
    COLUMNS.forEach((col) => {
      ctx.strokeRect(x, y, col.width, HEAD_H);
      const cx = col.center ? x + col.width / 2 : col.right ? x + col.width - 7 : x + 7;
      col.label.forEach((line, li) => drawText(ctx, line, cx, y + (col.label.length === 1 ? 21 : 15 + li * 12), { size: 9.5, weight: '700', color: INK, align: col.center ? 'center' : col.right ? 'right' : 'left' }));
      x += col.width;
    });
    return y + HEAD_H;
  }

  /* A row grows to two lines when the details wrap. */
  function rowLines(ctx, row) { return wrapText(ctx, row.details, COLUMNS[3].width - 14, '400 10px Arial').slice(0, 2); }
  function rowHeight(lines) { return lines.length > 1 ? 38 : 26; }

  function drawRow(ctx, row, number, y, lines) {
    const h = rowHeight(lines);
    const time = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Africa/Addis_Ababa' }).format(row.date).replace(',', '');
    const values = { no: String(number), receipt: row.receipt, time, status: row.status, paidIn: row.paidIn ? money(row.paidIn) : '-', withdrawn: row.withdrawn ? money(row.withdrawn) : '-', balance: money(row.balance) };
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    let x = LEFT;
    COLUMNS.forEach((col) => {
      ctx.strokeRect(x, y, col.width, h);
      if (col.key === 'details') lines.forEach((line, li) => drawText(ctx, line, x + 7, y + 17 + li * 13, { size: 10, color: INK, maxWidth: col.width - 12 }));
      else drawText(ctx, values[col.key], col.center ? x + col.width / 2 : col.right ? x + col.width - 7 : x + 7, y + 17, { size: 10, weight: col.key === 'balance' ? '700' : '400', color: INK, align: col.center ? 'center' : col.right ? 'right' : 'left', maxWidth: col.width - 12 });
      x += col.width;
    });
    return y + h;
  }

  /* Account summary (closing balance in the pink total row), stamp and notes. */
  function drawClosing(ctx, y, report) {
    y = greyBar(ctx, y, 'ACCOUNT SUMMARY');
    const lines = [['OPENING BALANCE', report.opening], ['TOTAL PAID IN', report.paidIn], ['TOTAL WITHDRAWN', report.withdrawn]];
    const top = y;
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    lines.forEach((line) => {
      ctx.strokeRect(LEFT, y, RIGHT - LEFT, 32);
      drawText(ctx, line[0], LEFT + 10, y + 21, { size: 11.5, color: INK });
      drawText(ctx, money(line[1]) + ' BIRR', RIGHT - 10, y + 21, { size: 11.5, weight: '700', align: 'right', color: INK });
      y += 32;
    });
    ctx.fillStyle = '#fff1f2'; ctx.fillRect(LEFT, y, RIGHT - LEFT, 34); ctx.strokeRect(LEFT, y, RIGHT - LEFT, 34);
    drawText(ctx, 'CLOSING BALANCE', LEFT + 10, y + 22, { size: 12.5, weight: '700', color: RED });
    drawText(ctx, money(report.closing) + ' BIRR', RIGHT - 10, y + 22, { size: 12.5, weight: '700', align: 'right', color: RED });
    y += 34;
    if (ready(PDF_IMAGES.stamp)) { ctx.save(); ctx.translate(500, top + 40); ctx.rotate(-12 * Math.PI / 180); ctx.globalAlpha = 0.95; ctx.drawImage(PDF_IMAGES.stamp, -88, -88, 176, 176); ctx.restore(); }

    y += 22; hr(ctx, y); y += 26;
    drawText(ctx, 'IMPORTANT INFORMATION', LEFT, y, { size: 11, weight: '700', color: MUTED });
    y += 22;
    [
      'This statement includes all completed M-PESA transactions within the selected period.',
      'For any discrepancies, please contact Safaricom Customer Care on 700 or visit your nearest M-PESA agent.',
      'This is a computer generated statement and does not require a signature.'
    ].forEach((note) => {
      drawText(ctx, '•', LEFT + 4, y, { size: 12, color: INK });
      wrapText(ctx, note, RIGHT - LEFT - 30, '400 11.5px Arial').forEach((line, li) => drawText(ctx, line, LEFT + 20, y + li * 16, { size: 11.5, color: INK }));
      y += 16 * wrapText(ctx, note, RIGHT - LEFT - 30, '400 11.5px Arial').length + 6;
    });
  }

  function drawPageFooter(ctx, pageIndex, pageCount, last) {
    hr(ctx, 1030);
    if (last) drawText(ctx, 'THANK YOU FOR USING M-PESA', PAGE_W / 2, 1054, { size: 11.5, align: 'center', color: INK });
    drawText(ctx, 'Page ' + (pageIndex + 1) + ' of ' + pageCount, RIGHT, 1054, { size: 9, align: 'right', color: MUTED });
    drawText(ctx, 'Sample data · not official', LEFT, 1054, { size: 8, color: '#9aa3a8' });
    ctx.fillStyle = RED; ctx.fillRect(0, PAGE_H - 48, PAGE_W, 48);
    drawText(ctx, 'M-PESA ' + (state.category === 'partner' ? 'Partner' : 'Customer') + ' Statement', 24, PAGE_H - 19, { size: 11, weight: '700', color: '#fff' });
    const white = PDF_IMAGES.white;
    if (ready(white)) { const w = 30 * white.naturalWidth / white.naturalHeight; ctx.drawImage(white, PAGE_W - 24 - w, PAGE_H - 39, w, 30); }
  }

  /* Lay the rows out page by page; the summary goes after the last row,
     on a page of its own when it doesn't fit underneath. */
  function buildStatementPages(rows, report) {
    const measure = makeCanvas(10, 10).context;
    const laid = rows.map((row, i) => { const lines = rowLines(measure, row); return { row, number: i + 1, lines, h: rowHeight(lines) }; });
    const firstTop = 344 + 26 + 5 * 23 + 8 + 14 + 40 + HEAD_H;
    const nextTop = 142 + 40 + HEAD_H;
    const pages = [];
    let page = { first: true, items: [] }, y = firstTop;
    laid.forEach((item) => {
      if (y + item.h > TABLE_BOTTOM) { pages.push(page); page = { first: false, items: [] }; y = nextTop; }
      page.items.push(item); y += item.h;
    });
    pages.push(page);
    if (y + 24 + CLOSING_H > TABLE_BOTTOM + 10) pages.push({ first: false, items: null });

    return pages.map((p, pageIndex) => {
      const { canvas, context: ctx } = makeCanvas(PAGE_W, PAGE_H);
      const last = pageIndex === pages.length - 1;
      drawWatermark(ctx);
      let top = p.first ? drawHeader(ctx) : drawContinuedHeader(ctx, report);
      if (p.first) top = drawDetails(ctx, top + 10, report) + 14;
      if (p.items) {
        let ty = drawTableHead(ctx, greyBar(ctx, top, 'TRANSACTION DETAIL'));
        if (!p.items.length) {
          ctx.strokeStyle = LINE; ctx.strokeRect(LEFT, ty, RIGHT - LEFT, 32);
          drawText(ctx, 'No transactions fall within this period.', PAGE_W / 2, ty + 21, { size: 11, align: 'center', color: MUTED });
          ty += 32;
        }
        p.items.forEach((item) => { ty = drawRow(ctx, item.row, item.number, ty, item.lines); });
        top = ty + 24;
      }
      if (last) drawClosing(ctx, top, report);
      drawPageFooter(ctx, pageIndex, pages.length, last);
      return canvas;
    });
  }

  function pdfBlobFromCanvases(canvases, pageWidth, pageHeight) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = new Array(3 + canvases.length * 3).fill(0);
    let byteOffset = 0;
    function append(value) {
      const bytes = typeof value === 'string' ? encoder.encode(value) : value;
      chunks.push(bytes);
      byteOffset += bytes.length;
    }
    function object(number, contents) {
      offsets[number] = byteOffset;
      append(number + ' 0 obj\n' + contents + '\nendobj\n');
    }
    append('%PDF-1.4\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    const pageIds = canvases.map((_, index) => 3 + index * 3);
    object(2, '<< /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + canvases.length + ' >>');
    canvases.forEach((canvas, index) => {
      const pageId = 3 + index * 3;
      const contentId = pageId + 1;
      const imageId = pageId + 2;
      const base64 = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
      const binary = atob(base64);
      const imageBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
      object(pageId, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /XObject << /Im0 ' + imageId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>');
      const content = 'q\n' + pageWidth + ' 0 0 ' + pageHeight + ' 0 0 cm\n/Im0 Do\nQ';
      object(contentId, '<< /Length ' + encoder.encode(content).length + ' >>\nstream\n' + content + '\nendstream');
      offsets[imageId] = byteOffset;
      append(imageId + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imageBytes.length + ' >>\nstream\n');
      append(imageBytes);
      append('\nendstream\nendobj\n');
    });
    const xrefOffset = byteOffset;
    append('xref\n0 ' + offsets.length + '\n0000000000 65535 f \n');
    for (let index = 1; index < offsets.length; index++) append(String(offsets[index]).padStart(10, '0') + ' 00000 n \n');
    append('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function downloadReceiptPdf() {
    const row = state.currentReceipt || state.rows[0];
    if (!row) return;
    const canvas = drawReceiptCanvas(row);
    triggerDownload(pdfBlobFromCanvases([canvas], '595.28', '841.89'), row.receipt + '.pdf');
  }

  function downloadStatementPdf() {
    const report = state.report;
    if (!report) return;
    const pages = buildStatementPages(state.rows, report);
    triggerDownload(pdfBlobFromCanvases(pages, '595.28', '841.89'), 'M-PESA-Statement-' + report.start + '-to-' + report.end + '.pdf');
  }

  function rowHtml(row) {
    const index = state.rows.indexOf(row);
    const time = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Africa/Addis_Ababa' }).format(row.date).replace(',', '');
    return '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td><button type="button" class="rcpt" data-receipt-index="' + index + '" title="View receipt">' + html(row.receipt) + '</button></td>' +
      '<td class="nowrap">' + html(time) + '</td>' +
      '<td>' + html(row.details) + '</td>' +
      '<td>' + html(row.status) + '</td>' +
      '<td class="num">' + (row.paidIn ? money(row.paidIn) : '-') + '</td>' +
      '<td class="num">' + (row.withdrawn ? money(row.withdrawn) : '-') + '</td>' +
      '<td class="num">' + money(row.balance) + '</td>' +
      '</tr>';
  }

  /* One page of the table at a time; printing shows every row. */
  function renderRows(all) {
    const total = state.rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pages);
    const shown = all ? state.rows : state.rows.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    $('#transactionRows').innerHTML = total ? shown.map(rowHtml).join('')
      : '<tr><td colspan="8"><div class="empty-state"><h3>No transactions</h3><p>No demonstration transactions fall within this period.</p></div></td></tr>';
    const from = total ? (state.page - 1) * PAGE_SIZE + 1 : 0;
    const to = Math.min(state.page * PAGE_SIZE, total);
    $('#statementPagination').innerHTML = total <= PAGE_SIZE ? '' :
      '<span class="pg-info">Showing ' + from + '–' + to + ' of ' + total + '</span>' +
      '<div class="lp-pager">' +
        '<button class="pg-btn" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '><i data-lucide="chevron-left"></i> Prev</button>' +
        '<span class="pg-info">Page ' + state.page + ' of ' + pages + '</span>' +
        '<button class="pg-btn" data-page="' + (state.page + 1) + '"' + (state.page >= pages ? ' disabled' : '') + '>Next <i data-lucide="chevron-right"></i></button>' +
      '</div>';
    icons();
  }

  function renderStatement() {
    const start = $('#startDate').value;
    const end = $('#endDate').value;
    const error = $('#dateError');
    error.textContent = '';
    if (!start || !end) { error.textContent = 'Choose both a start date and an end date.'; return; }
    if (start > end) { error.textContent = 'The start date must be on or before the end date.'; return; }
    const allRows = makeDemoRows(end, { name: state.holder, phone: state.identifier, partner: state.category === 'partner' });
    state.rows = allRows.filter((row) => {
      const day = dateInput(row.date);
      return day >= start && day <= end;
    });
    const opening = 1000 + allRows.filter((row) => dateInput(row.date) < start).reduce((sum, row) => sum + row.paidIn - row.withdrawn, 0);
    const paidIn = state.rows.reduce((sum, row) => sum + row.paidIn, 0);
    const withdrawn = state.rows.reduce((sum, row) => sum + row.withdrawn, 0);
    const closing = opening + paidIn - withdrawn;
    const account = state.accounts[Number($('#accountSelect').value)] || state.accounts[0];
    const reference = 'DEMO-STMT-' + dateInput(new Date()).replaceAll('-', '') + '-0001';
    state.report = {
      partner: state.category === 'partner', holder: state.holder,
      idLabel: state.category === 'partner' ? 'Short Code' : 'MSISDN',
      identifier: state.idLabel === 'Customer Identity ID' ? '2517••••••' : state.identifier,
      identityId: state.idLabel === 'Customer Identity ID' ? state.identifier : '••••••••',
      accountName: account.name + ' ' + account.suffix, accountType: account.type + ' Account',
      from: displayDate(start), to: displayDate(end), period: displayDate(start) + ' to ' + displayDate(end),
      operator: 'Demo Operator', reference, reportDate: dateTime(new Date()),
      opening, paidIn, withdrawn, closing, start, end
    };
    $('#statementMeta').textContent = state.holder + ' · ' + account.name + ' ' + account.suffix + ' · ' + state.report.period + ' · Ref ' + reference;
    $('#statementRecordCount').textContent = state.rows.length + ' transactions';
    const r = state.report;
    const holderRows = [['Account Holder', r.holder], [r.idLabel, r.identifier]];
    if (!r.partner) holderRows.push(['Customer Identity ID', r.identityId]);
    holderRows.push(['Account', r.accountName], ['Account Type', r.accountType]);
    $('#docDetailsTitle').textContent = r.partner ? 'PARTNER DETAILS' : 'CUSTOMER DETAILS';
    $('#docHolder').innerHTML = holderRows.map((x) => '<dt>' + html(x[0].toUpperCase()) + '</dt><dd>' + html(x[1]) + '</dd>').join('');
    $('#periodFrom').textContent = r.from;
    $('#periodTo').textContent = r.to;
    $('#reportDate').textContent = r.reportDate;
    $('#statementRef').textContent = r.reference;
    $('#docFooter').textContent = 'M-PESA ' + (r.partner ? 'Partner' : 'Customer') + ' Statement';
    $('#openingBalance').textContent = money(opening) + ' BIRR';
    $('#totalPaidIn').textContent = money(paidIn) + ' BIRR';
    $('#totalWithdrawn').textContent = money(withdrawn) + ' BIRR';
    $('#closingBalance').textContent = money(closing) + ' BIRR';
    state.page = 1;
    renderRows();
    $('#statementPreview').classList.remove('hidden');
    $('#statementPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showReceipt(row) {
    if (!row) return;
    renderReceipt(row);
    $('#receiptDialog').showModal();
  }

  /* ── Statement period picker ──────────────────────────────
     One field that opens quick ranges plus a range calendar. The chosen
     dates live in the hidden #startDate / #endDate inputs (yyyy-mm-dd). */
  const RP_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fromIso = (v) => new Date(v + 'T00:00:00');
  const prettyDate = (v) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(fromIso(v));
  const rp = { open: false, start: null, end: null, hover: null, view: null };

  function rpPresets() {
    const t = dateInput(today), d = new Date(today);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastMonthEnd = new Date(d.getFullYear(), d.getMonth(), 0);
    return [
      ['Today', t, t],
      ['Yesterday', dateInput(addDays(today, -1)), dateInput(addDays(today, -1))],
      ['Last 7 days', dateInput(addDays(today, -6)), t],
      ['Last 30 days', dateInput(addDays(today, -29)), t],
      ['This month', dateInput(monthStart), t],
      ['Last month', dateInput(lastMonthStart), dateInput(lastMonthEnd)]
    ];
  }

  function rpLabel() {
    const s = $('#startDate').value, e = $('#endDate').value;
    const preset = rpPresets().find((p) => p[1] === s && p[2] === e);
    $('#periodText').textContent = s === e ? prettyDate(s) : prettyDate(s) + ' – ' + prettyDate(e);
    $('#periodHint').textContent = preset ? preset[0] : '';
  }

  function rpRender() {
    const t = dateInput(today);
    const lo = rp.end ? rp.start : (rp.hover && rp.hover < rp.start ? rp.hover : rp.start);
    const hi = rp.end ? rp.end : (rp.hover && rp.hover > rp.start ? rp.hover : rp.start);
    $('#rpPresets').innerHTML = rpPresets().map((p) =>
      '<button type="button" class="rp-preset' + (rp.end && p[1] === rp.start && p[2] === rp.end ? ' on' : '') + '" data-from="' + p[1] + '" data-to="' + p[2] + '">' + p[0] + '</button>').join('');

    const y = rp.view.getFullYear(), m = rp.view.getMonth();
    $('#rpMonth').textContent = RP_MONTHS[m] + ' ' + y;
    $('#rpNext').disabled = y > today.getFullYear() || (y === today.getFullYear() && m >= today.getMonth());
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; /* weeks start on Monday */
    const days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const v = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const cls = ['rp-day'];
      if (v === t) cls.push('today');
      if (lo && hi && v > lo && v < hi) cls.push('in');
      if (v === lo) cls.push('edge', 'start');
      if (v === hi) cls.push('edge', 'end');
      cells += '<button type="button" class="' + cls.join(' ') + '" data-day="' + v + '"' + (v > t ? ' disabled' : '') + '>' + d + '</button>';
    }
    $('#rpGrid').innerHTML = cells;
    $('#rpSummary').textContent = !rp.end ? 'Select the end date' :
      (rp.start === rp.end ? prettyDate(rp.start) : prettyDate(rp.start) + ' – ' + prettyDate(rp.end)) +
      ' · ' + (Math.round((fromIso(rp.end) - fromIso(rp.start)) / 864e5) + 1) + ' days';
    $('#rpApply').disabled = !rp.end;
  }

  function rpToggle(open) {
    rp.open = open;
    $('#periodPop').classList.toggle('hidden', !open);
    $('#periodField').setAttribute('aria-expanded', String(open));
    if (!open) return;
    rp.start = $('#startDate').value;
    rp.end = $('#endDate').value;
    rp.hover = null;
    const e = fromIso(rp.end);
    rp.view = new Date(e.getFullYear(), e.getMonth(), 1);
    rpRender();
  }

  $('#periodField').addEventListener('click', () => rpToggle(!rp.open));
  $('#rpPrev').addEventListener('click', () => { rp.view.setMonth(rp.view.getMonth() - 1); rpRender(); });
  $('#rpNext').addEventListener('click', () => { rp.view.setMonth(rp.view.getMonth() + 1); rpRender(); });
  $('#rpPresets').addEventListener('click', (event) => {
    const b = event.target.closest('[data-from]');
    if (!b) return;
    rp.start = b.dataset.from; rp.end = b.dataset.to;
    const e = fromIso(rp.end); rp.view = new Date(e.getFullYear(), e.getMonth(), 1);
    rpRender();
  });
  /* First click sets the start, second the end (either order). */
  $('#rpGrid').addEventListener('click', (event) => {
    const b = event.target.closest('[data-day]');
    if (!b || b.disabled) return;
    const v = b.dataset.day;
    if (rp.end || !rp.start) { rp.start = v; rp.end = null; }
    else if (v < rp.start) { rp.end = rp.start; rp.start = v; }
    else rp.end = v;
    rpRender();
  });
  $('#rpGrid').addEventListener('mouseover', (event) => {
    const b = event.target.closest('[data-day]');
    if (!b || rp.end || b.dataset.day === rp.hover) return;
    rp.hover = b.dataset.day; rpRender();
  });
  $('#rpCancel').addEventListener('click', () => rpToggle(false));
  $('#rpApply').addEventListener('click', () => {
    $('#startDate').value = rp.start; $('#endDate').value = rp.end;
    $('#dateError').textContent = '';
    rpLabel(); rpToggle(false);
  });
  document.addEventListener('mousedown', (event) => {
    if (rp.open && !event.target.closest('#periodPicker')) rpToggle(false);
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && rp.open) rpToggle(false); });

  $$('[data-category]').forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.category)));
  $('#searchMethod').addEventListener('change', updatePlaceholder);
  $('#accountSearchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = $('#accountSearchInput').value.trim();
    $('#searchError').textContent = '';
    if (!query) { $('#searchError').textContent = 'Enter a search value to continue.'; $('#accountSearchInput').focus(); return; }
    revealAccountResult(query);
  });
  $('#changeSearch').addEventListener('click', () => {
    $('#accountResult').classList.add('hidden');
    $('#statementPreview').classList.add('hidden');
    $('#accountSearchInput').focus();
  });
  $('#generateStatement').addEventListener('click', renderStatement);
  $('#downloadStatementPdf').addEventListener('click', downloadStatementPdf);
  $('#downloadReceiptPdf').addEventListener('click', downloadReceiptPdf);
  $('#statementPagination').addEventListener('click', (event) => {
    const button = event.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    renderRows();
  });
  $('#transactionRows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-receipt-index]');
    if (button) showReceipt(state.rows[Number(button.dataset.receiptIndex)]);
  });
  $('#closeReceipt').addEventListener('click', () => $('#receiptDialog').close());
  $('#receiptDialog').addEventListener('click', (event) => {
    if (event.target === $('#receiptDialog')) $('#receiptDialog').close();
  });
  $('#printStatement').addEventListener('click', () => {
    document.body.classList.add('print-statement');
    renderRows(true);
    window.print();
  });
  $('#printReceipt').addEventListener('click', () => {
    document.body.classList.add('print-receipt');
    window.print();
  });
  window.addEventListener('afterprint', () => {
    if (document.body.classList.contains('print-statement')) renderRows();
    document.body.classList.remove('print-receipt', 'print-statement');
  });

  $('#startDate').value = dateInput(addDays(today, -6));
  $('#endDate').value = dateInput(today);
  rpLabel();
  setCategory('customer');
  icons();
}());
