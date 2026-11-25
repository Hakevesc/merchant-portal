(function () {
  'use strict';

  const state = {
    category: 'customer',
    method: 'msisdn',
    accounts: [],
    selectedAccount: null,
    rows: [],
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

  function updateSearchMethods() {
    const partner = state.category === 'partner';
    const methods = $$('#methodChoices .method-card');
    methods.forEach((button) => {
      const method = button.dataset.method;
      const visible = partner ? method === 'shortcode' : method !== 'shortcode';
      button.classList.toggle('hidden', !visible);
      button.setAttribute('aria-pressed', String(method === state.method));
      button.classList.toggle('selected', method === state.method);
    });
    const input = $('#accountSearchInput');
    const label = $('#searchLabel');
    const hint = $('#searchHint');
    const icon = $('#searchInputIcon');
    const copy = {
      msisdn: ['Customer mobile number', 'e.g. 2517XXXXXXX or 12345678', 'Enter the customer\'s mobile number. Use a registered number for account lookup.', '☎'],
      identity: ['Customer Identity ID', 'Enter National ID or approved identity number', 'For identity search, use the customer\'s registered identity number.', '▣'],
      shortcode: ['Partner short code', 'e.g. 400522', 'Enter the partner\'s registered M-PESA short code.', '▥']
    }[state.method];
    label.textContent = copy[0];
    input.placeholder = copy[1];
    hint.lastChild.textContent = copy[2];
    icon.textContent = copy[3];
  }

  function setCategory(category) {
    state.category = category;
    state.method = category === 'partner' ? 'shortcode' : 'msisdn';
    $$('.category-grid .choice-card').forEach((button) => {
      const selected = button.dataset.category === category;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updateSearchMethods();
  }

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
    const result = $('#accountResult');
    const isPartner = state.category === 'partner';
    const display = isPartner ? 'Safaricom Ethiopia Demo Partner' : 'Demo Customer';
    const idLabel = state.method === 'identity' ? 'Customer Identity ID' : (isPartner ? 'Short code' : 'MSISDN');
    const safeQuery = state.method === 'identity' ? '••••••••' : (query.length > 5 ? query.slice(0, 4) + '••••••' : '••••••');
    $('#resultHeading').textContent = display;
    $('#resultIdentifier').textContent = idLabel + ': ' + safeQuery;
    $('#statementHolder').textContent = display;
    $('#statementDetailsHeading').textContent = isPartner ? 'Partner Details' : 'Customer Details';
    $('#statementIdLabel').textContent = isPartner ? 'Short Code' : 'MSISDN';
    $('#statementMsisdn').textContent = isPartner ? 'Short code ' + safeQuery : (state.method === 'identity' ? '••••••••' : safeQuery);
    $('#statementIdentityLabel').classList.toggle('hidden', isPartner);
    $('#statementIdentityValue').classList.toggle('hidden', isPartner);
    state.accounts = accountList();
    state.selectedAccount = state.accounts[0];
    $('#accountOptions').replaceChildren();
    state.accounts.forEach((account, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'account-choice' + (index === 0 ? ' selected' : '');
      button.setAttribute('aria-pressed', String(index === 0));
      button.innerHTML = '<span class="account-radio" aria-hidden="true"></span><strong>' + html(account.name) + '</strong><small>' + html(account.type + ' account · ' + account.suffix) + '</small>';
      button.addEventListener('click', () => {
        state.selectedAccount = account;
        $$('.account-choice').forEach((item) => {
          const selected = item === button;
          item.classList.toggle('selected', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
      });
      $('#accountOptions').append(button);
    });
    result.classList.remove('hidden');
    $('#statementPreview').classList.add('hidden');
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function makeDemoRows(endDate) {
    const total = 333;
    const end = new Date(endDate + 'T00:00:00');
    let balance = 100000;
    return Array.from({ length: total }, (_, index) => {
      const paidIn = index % 3 === 0;
      const creditAmounts = [300, 1200, 500, 2500, 800];
      const debitAmounts = [75, 125, 300, 800, 120];
      const amount = paidIn ? creditAmounts[index % creditAmounts.length] : debitAmounts[index % debitAmounts.length];
      const credit = paidIn ? amount : 0;
      const debit = paidIn ? 0 : amount;
      balance += credit - debit;
      const date = addDays(end, -6 + Math.floor(index * 7 / total));
      date.setHours(7 + (index * 5) % 16, (index * 17) % 60, (index * 31) % 60, 0);
      const receipt = 'DEMO-RCPT-' + String(index + 1).padStart(4, '0');
      const savingTransaction = paidIn;
      const recipientSuffix = String(20 + (index * 13) % 79);
      return {
        receipt,
        details: savingTransaction ? 'Savings deposit · Demo Customer' : 'Payment to 09••••••' + recipientSuffix + ' · DEMO',
        status: 'Completed',
        paidIn: credit,
        withdrawn: debit,
        bill: savingTransaction ? 'RAINY DAY' : 'DEMO-' + String(100 + index % 900),
        type: savingTransaction ? 'Deposit to Savings account' : 'Payment from account',
        channel: 'M-PESA App',
        reason: savingTransaction ? 'M-PESA Savings · Money Deposited' : 'Customer initiated payment',
        bank: savingTransaction ? 'Cooperative Bank of Oromia' : '—',
        savingNumber: savingTransaction ? 'IS••••2501' : '—',
        savingName: savingTransaction ? 'Rainy Day' : '—',
        interest: savingTransaction ? '7% Interest' : '—',
        date,
        balance,
        name: 'Demo Customer',
        phone: '09••••••15'
      };
    });
  }

  function makeAmountWords(value) {
    const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function underThousand(number) {
      let words = '';
      if (number >= 100) { words += ones[Math.floor(number / 100)] + ' Hundred'; number %= 100; if (number) words += ' '; }
      if (number >= 20) { words += tens[Math.floor(number / 10)]; number %= 10; if (number) words += ' ' + ones[number]; }
      else if (number) words += ones[number];
      return words;
    }
    const amount = Math.floor(value);
    if (amount < 1000) return underThousand(amount) + ' Birr Only';
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    return underThousand(thousands) + ' Thousand' + (remainder ? ' ' + underThousand(remainder) : '') + ' Birr Only';
  }

  function renderReceipt(row) {
    state.currentReceipt = row;
    const amount = row.paidIn || row.withdrawn;
    const receiptId = row.receipt;
    $('#receiptName').textContent = row.name;
    $('#receiptPhone').textContent = row.phone;
    $('#receiptBank').textContent = row.bank;
    $('#receiptSavingNumber').textContent = row.savingNumber;
    $('#receiptSavingName').textContent = row.savingName;
    $('#receiptAmount').textContent = money(amount) + ' ETB';
    $('#receiptInterest').textContent = row.interest;
    $('#receiptType').textContent = row.type;
    $('#receiptId').textContent = receiptId;
    $('#receiptNo').textContent = receiptId;
    $('#receiptDate').textContent = receiptDate(row.date);
    $('#receiptDetailAmount').textContent = money(amount) + ' BIRR';
    $('#receiptTotal').textContent = money(amount) + ' BIRR';
    $('#receiptWords').textContent = makeAmountWords(amount);
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

  function drawLogo(context, x, y, width, height) {
    const logo = document.querySelector('.receipt-company img');
    if (logo && logo.complete && logo.naturalWidth) context.drawImage(logo, x, y, width, height);
    else {
      drawText(context, 'M-PESA', x, y + height - 5, { size: 24, weight: '700', color: '#138e4a' });
    }
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
    const amount = row.paidIn || row.withdrawn;
    ctx.save();
    ctx.translate(380, 670);
    ctx.rotate(-Math.PI / 7);
    ctx.globalAlpha = 0.11;
    drawText(ctx, 'SAMPLE PREVIEW', -275, 0, { size: 82, weight: '700', color: '#aeb4b7' });
    ctx.restore();

    drawLogo(ctx, 54, 42, 220, 51);
    drawText(ctx, 'Safaricom M-PESA Mobile Financial Services PLC', 54, 119, { size: 15, weight: '700' });
    drawText(ctx, 'TIN NO:', 54, 150, { size: 13, color: '#74777a' });
    drawText(ctx, '0084242753', 110, 150, { size: 13, weight: '700' });
    drawText(ctx, 'VAT REG NO:', 54, 180, { size: 13, color: '#74777a' });
    drawText(ctx, '22371880003', 135, 180, { size: 13, weight: '700' });
    drawText(ctx, 'Address:', 54, 210, { size: 13, color: '#74777a' });
    drawText(ctx, 'Addis Ababa, Kirkos Woreda 1', 110, 210, { size: 13, weight: '700' });
    drawText(ctx, 'Tel:', 54, 240, { size: 13, color: '#74777a' });
    drawText(ctx, '+251 756 765434', 83, 240, { size: 13, weight: '700' });
    ctx.strokeStyle = '#d9dddf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(54, 263); ctx.lineTo(740, 263); ctx.stroke();

    const qrX = 635, qrY = 49, qrSize = 86, cell = 7;
    ctx.fillStyle = '#fff'; ctx.fillRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);
    ctx.strokeStyle = '#1d272b'; ctx.lineWidth = 1.5; ctx.strokeRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6);
    for (let rowIndex = 0; rowIndex < 12; rowIndex++) {
      for (let colIndex = 0; colIndex < 12; colIndex++) {
        const finder = (rowIndex < 4 && colIndex < 4) || (rowIndex < 4 && colIndex > 7) || (rowIndex > 7 && colIndex < 4);
        const dark = finder ? (rowIndex % 3 !== 1 && colIndex % 3 !== 1) : ((rowIndex * 7 + colIndex * 11 + rowIndex * colIndex) % 4 < 2);
        if (dark) { ctx.fillStyle = '#15191b'; ctx.fillRect(qrX + colIndex * cell, qrY + rowIndex * cell, cell - 1, cell - 1); }
      }
    }
    drawText(ctx, 'DEMO QR · NOT SCANNABLE', qrX + qrSize / 2, qrY + qrSize + 20, { size: 8, weight: '700', align: 'center', color: '#43484b' });

    ctx.strokeStyle = '#f3434f'; ctx.lineWidth = 2; ctx.strokeRect(54, 290, 686, 44);
    drawText(ctx, 'TRANSACTION INFORMATION', 397, 318, { size: 17, weight: '700', align: 'center', color: '#f3434f' });
    const fields = [
      ['NAME', row.name], ['PHONE NUMBER', row.phone], ['PARTNER BANK', row.bank],
      ['SAVING ACCOUNT NUMBER', row.savingNumber], ['SAVING A/C NAME', row.savingName],
      ['AMOUNT', money(amount) + ' ETB'], ['INTEREST', row.interest], ['TRANSACTION TYPE', row.type], ['TRANSACTION ID', row.receipt]
    ];
    fields.forEach((field, index) => {
      const y = 375 + index * 28;
      drawText(ctx, field[0], 54, y, { size: 12 });
      drawText(ctx, field[1], 350, y, { size: 12, weight: '700', maxWidth: 385 });
    });

    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(54, 650, 686, 32);
    drawText(ctx, 'TRANSACTION DETAIL', 397, 671, { size: 14, weight: '700', align: 'center' });
    const colX = [54, 282, 514, 740];
    ctx.fillStyle = '#fafafa'; ctx.fillRect(54, 690, 686, 31);
    ctx.strokeStyle = '#d6d6d6'; ctx.lineWidth = 1;
    ctx.strokeRect(54, 690, 686, 31);
    colX.slice(1, -1).forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 690); ctx.lineTo(x, 785); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(54, 721); ctx.lineTo(740, 721); ctx.moveTo(54, 753); ctx.lineTo(740, 753); ctx.moveTo(54, 785); ctx.lineTo(740, 785); ctx.stroke();
    drawText(ctx, 'RECEIPT NO', 64, 710, { size: 11, weight: '700' });
    drawText(ctx, 'TRANSACTION DATE AND TIME', 292, 710, { size: 11, weight: '700' });
    drawText(ctx, 'AMOUNT', 730, 710, { size: 11, weight: '700', align: 'right' });
    drawText(ctx, row.receipt, 64, 742, { size: 11 });
    drawText(ctx, receiptDate(row.date), 292, 742, { size: 11 });
    drawText(ctx, money(amount) + ' BIRR', 730, 742, { size: 11, align: 'right' });
    ctx.fillStyle = '#fff0f1'; ctx.fillRect(55, 754, 684, 30);
    drawText(ctx, 'TOTAL AMOUNT', 500, 774, { size: 12, weight: '700', align: 'right', color: '#f13f49' });
    drawText(ctx, money(amount) + ' BIRR', 730, 774, { size: 12, weight: '700', align: 'right', color: '#f13f49' });
    ctx.strokeStyle = '#d6d6d6'; ctx.strokeRect(54, 753, 686, 32);

    ctx.strokeStyle = '#d9dddf'; ctx.beginPath(); ctx.moveTo(54, 811); ctx.lineTo(740, 811); ctx.stroke();
    const extras = [
      ['TOTAL AMOUNT IN WORD', makeAmountWords(amount)],
      ['USED CHANNEL', row.channel],
      ['TRANSACTION REASON', row.reason]
    ];
    extras.forEach((field, index) => {
      const y = 848 + index * 30;
      drawText(ctx, field[0], 54, y, { size: 12 });
      drawText(ctx, field[1], 350, y, { size: 12, weight: '700', maxWidth: 380 });
    });
    ctx.strokeStyle = '#5478d9'; ctx.lineWidth = 3; ctx.globalAlpha = 0.56; ctx.beginPath(); ctx.arc(642, 721, 55, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(642, 721, 46, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    drawText(ctx, 'M-PESA', 642, 718, { size: 16, weight: '700', align: 'center', color: '#5478d9' });
    drawText(ctx, 'DEMO RECEIPT', 642, 736, { size: 8, weight: '700', align: 'center', color: '#5478d9' });
    ctx.strokeStyle = '#d9dddf'; ctx.beginPath(); ctx.moveTo(54, 1030); ctx.lineTo(740, 1030); ctx.stroke();
    drawText(ctx, 'SAMPLE LAYOUT ONLY · NOT AN OFFICIAL RECEIPT · NOT VALID FOR VERIFICATION', 397, 1052, { size: 8, align: 'center', color: '#8c3239' });
    drawText(ctx, 'THANK YOU FOR USING M-PESA', 397, 1073, { size: 12, align: 'center' });
    ctx.fillStyle = '#f53c4c'; ctx.fillRect(0, 1090, 794, 33);
    drawText(ctx, 'm-PESA', 730, 1113, { size: 19, weight: '700', align: 'right', color: '#fff' });
    return canvas;
  }

  function drawStatementPage(rows, pageIndex, pageCount, pageRows, report) {
    const { canvas, context: ctx } = makeCanvas(842, 595);
    const firstPage = pageIndex === 0;
    drawLogo(ctx, 32, 10, 100, 28);
    drawText(ctx, 'Safaricom Ethiopia PLC', 810, 24, { size: 9, weight: '700', align: 'right', color: '#078248' });
    drawText(ctx, 'Operator: Demo Operator', 810, 39, { size: 7, align: 'right', color: '#607166' });
    ctx.fillStyle = '#078b47'; ctx.fillRect(32, 44, 778, 27);
    drawText(ctx, firstPage ? 'M-PESA TRANSACTION STATEMENT' : 'M-PESA TRANSACTION STATEMENT · CONTINUED', 421, 62, { size: 14, weight: '700', align: 'center', color: '#fff' });
    if (firstPage) {
      ctx.fillStyle = '#f2f8f2'; ctx.strokeStyle = '#b8dbc3'; ctx.lineWidth = 1; ctx.fillRect(32, 80, 778, 58); ctx.strokeRect(32, 80, 778, 58);
      ctx.beginPath(); ctx.moveTo(421, 87); ctx.lineTo(421, 132); ctx.stroke();
      drawText(ctx, 'ACCOUNT HOLDER', 45, 94, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.holder, 143, 94, { size: 8, weight: '700', maxWidth: 260 });
      drawText(ctx, report.idLabel, 45, 111, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.identifier, 143, 111, { size: 8, weight: '700', maxWidth: 260 });
      drawText(ctx, 'ACCOUNT', 45, 128, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.account, 143, 128, { size: 8, weight: '700', maxWidth: 260 });
      drawText(ctx, 'TIME PERIOD', 435, 94, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.period, 520, 94, { size: 8, weight: '700', maxWidth: 275 });
      drawText(ctx, 'DATE OF REPORT', 435, 111, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.reportDate, 520, 111, { size: 8, weight: '700', maxWidth: 275 });
      drawText(ctx, 'STATEMENT REF.', 435, 128, { size: 7, weight: '700', color: '#42624d' });
      drawText(ctx, report.reference, 520, 128, { size: 8, weight: '700', maxWidth: 275 });
      ctx.fillStyle = '#f6fbf7'; ctx.strokeStyle = '#cde4d2'; ctx.fillRect(32, 145, 778, 30); ctx.strokeRect(32, 145, 778, 30);
      const summaries = [
        ['OPENING BALANCE', report.opening], ['TOTAL PAID IN', report.paidIn], ['TOTAL WITHDRAWN', report.withdrawn], ['CLOSING BALANCE', report.closing]
      ];
      summaries.forEach((item, index) => {
        const x = 42 + index * 192;
        drawText(ctx, item[0], x, 157, { size: 6.5, weight: '700', color: '#607166' });
        drawText(ctx, money(item[1]) + ' ETB', x, 169, { size: 8, weight: '700', color: index === 3 ? '#087b3e' : '#26313a' });
      });
    } else {
      drawText(ctx, report.reference + ' · ' + report.account, 32, 86, { size: 8, weight: '700', color: '#46545c' });
      drawText(ctx, 'Period: ' + report.period, 810, 86, { size: 8, align: 'right', color: '#46545c' });
    }

    const columns = [
      { key: 'number', label: 'No.', width: 28 }, { key: 'receipt', label: 'Receipt No.', width: 76 },
      { key: 'time', label: 'Completion Time', width: 95 }, { key: 'details', label: 'Details', width: 193 },
      { key: 'status', label: 'Transaction Status', width: 63 }, { key: 'paidIn', label: 'Paid In (ETB)', width: 75 },
      { key: 'withdrawn', label: 'Withdrawn (ETB)', width: 75 }, { key: 'balance', label: 'Balance (ETB)', width: 75 },
      { key: 'bill', label: 'Bill reference', width: 98 }
    ];
    const tableX = 32;
    const tableY = firstPage ? 184 : 100;
    const headerH = 24;
    const rowH = firstPage ? 16.8 : 19.2;
    ctx.fillStyle = '#078b47'; ctx.fillRect(tableX, tableY, 778, headerH);
    let columnX = tableX;
    columns.forEach((column) => {
      const labelLines = wrapText(ctx, column.label, column.width - 8, '700 7px Arial');
      labelLines.slice(0, 2).forEach((line, lineIndex) => drawText(ctx, line, columnX + 4, tableY + 9 + lineIndex * 8, { size: 7, weight: '700', color: '#fff', maxWidth: column.width - 7 }));
      ctx.strokeStyle = '#ffffff60'; ctx.beginPath(); ctx.moveTo(columnX + column.width, tableY); ctx.lineTo(columnX + column.width, tableY + headerH); ctx.stroke();
      columnX += column.width;
    });
    let y = tableY + headerH;
    if (!pageRows.length) {
      ctx.fillStyle = '#fff'; ctx.fillRect(tableX, y, 778, rowH * 2);
      ctx.strokeStyle = '#d8dee1'; ctx.strokeRect(tableX, y, 778, rowH * 2);
      drawText(ctx, 'No demonstration transactions fall within this selected period.', tableX + 9, y + 21, { size: 9, color: '#5b6671' });
      y += rowH * 2;
    } else {
      pageRows.forEach((row, localIndex) => {
        const rowNumber = rows.indexOf(row) + 1;
        ctx.fillStyle = localIndex % 2 ? '#f7faf8' : '#fff'; ctx.fillRect(tableX, y, 778, rowH);
        ctx.strokeStyle = '#d8dee1'; ctx.lineWidth = .5; ctx.strokeRect(tableX, y, 778, rowH);
        let x = tableX;
        const time = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Addis_Ababa' }).format(row.date);
        const values = [
          String(rowNumber), row.receipt, time, row.details, row.status,
          row.paidIn ? money(row.paidIn) : '—', row.withdrawn ? money(row.withdrawn) : '—', money(row.balance), row.bill
        ];
        columns.forEach((column, columnIndex) => {
          const value = values[columnIndex];
          const alignRight = ['paidIn', 'withdrawn', 'balance'].includes(column.key);
          const font = (columnIndex === 1 ? '700 ' : '400 ') + (firstPage ? '6.7px' : '7.2px') + ' Arial';
          const lines = wrapText(ctx, value, column.width - 8, font);
          const maxLines = Math.max(1, Math.floor((rowH - 4) / (firstPage ? 7 : 7.5)));
          const shownLines = lines.slice(0, maxLines);
          shownLines.forEach((line, lineIndex) => drawText(ctx, line, alignRight ? x + column.width - 4 : x + 4, y + (firstPage ? 7.7 : 8.3) + lineIndex * (firstPage ? 7 : 7.5), { size: firstPage ? 6.7 : 7.2, weight: columnIndex === 1 ? '700' : '400', align: alignRight ? 'right' : 'left', maxWidth: column.width - 8 }));
          x += column.width;
        });
        y += rowH;
      });
    }
    ctx.strokeStyle = '#15924f'; ctx.beginPath(); ctx.moveTo(32, 579); ctx.lineTo(810, 579); ctx.stroke();
    drawText(ctx, 'SAMPLE DATA · NOT AN OFFICIAL M-PESA STATEMENT', 32, 590, { size: 7, color: '#647366' });
    drawText(ctx, 'Page ' + (pageIndex + 1) + ' of ' + pageCount, 810, 590, { size: 7, align: 'right', color: '#647366' });
    return canvas;
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
    if (!$('#statementPreview') || $('#statementPreview').classList.contains('hidden')) return;
    const rows = state.rows;
    const firstPageCapacity = 22;
    const continuedCapacity = 23;
    const pageCount = rows.length <= firstPageCapacity ? 1 : 1 + Math.ceil((rows.length - firstPageCapacity) / continuedCapacity);
    const start = $('#startDate').value;
    const end = $('#endDate').value;
    const report = {
      holder: $('#statementHolder').textContent,
      idLabel: $('#statementIdLabel').textContent,
      identifier: $('#statementMsisdn').textContent,
      account: $('#statementAccount').textContent + ' · ' + $('#statementType').textContent,
      period: $('#periodFrom').textContent + ' to ' + $('#periodTo').textContent,
      reference: $('#statementRef').textContent,
      reportDate: $('#reportDate').textContent,
      opening: Number($('#openingBalance').textContent.replace(/,/g, '')) || 0,
      paidIn: Number($('#totalPaidIn').textContent.replace(/,/g, '')) || 0,
      withdrawn: Number($('#totalWithdrawn').textContent.replace(/,/g, '')) || 0,
      closing: Number($('#closingBalance').textContent.replace(/,/g, '')) || 0
    };
    const pages = [];
    let cursor = 0;
    for (let page = 0; page < pageCount; page++) {
      const capacity = page === 0 ? firstPageCapacity : continuedCapacity;
      const pageRows = rows.slice(cursor, cursor + capacity);
      pages.push(drawStatementPage(rows, page, pageCount, pageRows, report));
      cursor += capacity;
    }
    const safeStart = start.replace(/[^0-9-]/g, '');
    const safeEnd = end.replace(/[^0-9-]/g, '');
    triggerDownload(pdfBlobFromCanvases(pages, '841.89', '595.28'), 'M-PESA-Statement-' + safeStart + '-to-' + safeEnd + '.pdf');
  }

  function renderStatement() {
    const start = $('#startDate').value;
    const end = $('#endDate').value;
    const error = $('#dateError');
    error.textContent = '';
    if (!start || !end) { error.textContent = 'Choose both a start date and an end date.'; return; }
    if (start > end) { error.textContent = 'The start date must be on or before the end date.'; return; }
    const allRows = makeDemoRows(end);
    state.rows = allRows.filter((row) => {
      const day = dateInput(row.date);
      return day >= start && day <= end;
    });
    const opening = 1000 + allRows.filter((row) => dateInput(row.date) < start).reduce((sum, row) => sum + row.paidIn - row.withdrawn, 0);
    const paidIn = state.rows.reduce((sum, row) => sum + row.paidIn, 0);
    const withdrawn = state.rows.reduce((sum, row) => sum + row.withdrawn, 0);
    const closing = opening + paidIn - withdrawn;
    const account = state.selectedAccount || state.accounts[0] || { name: 'Main M-PESA Account', type: 'Main', suffix: '•••• 7184' };
    const holder = $('#resultHeading').textContent || 'Demo Customer';
    $('#statementRecordCount').textContent = 'STATEMENT PREVIEW · DEMO · ' + state.rows.length + ' TRANSACTIONS';
    const refDate = dateInput(new Date());
    const refToken = refDate.replaceAll('-', '');
    $('#statementHolder').textContent = holder;
    $('#statementAccount').textContent = account.name + ' ' + account.suffix;
    $('#statementType').textContent = account.type + ' Account';
    $('#periodFrom').textContent = displayDate(start);
    $('#periodTo').textContent = displayDate(end);
    $('#reportDate').textContent = dateTime(new Date());
    $('#statementRef').textContent = 'DEMO-STMT-' + refToken + '-0001';
    $('#openingBalance').textContent = money(opening);
    $('#totalPaidIn').textContent = money(paidIn);
    $('#totalWithdrawn').textContent = money(withdrawn);
    $('#closingBalance').textContent = money(closing);
    const rows = $('#transactionRows');
    if (!state.rows.length) {
      rows.innerHTML = '<tr><td class="empty-row" colspan="10">No demonstration transactions fall within this selected period.</td></tr>';
    } else {
      rows.innerHTML = state.rows.map((row, index) => '<tr>' +
        '<td>' + (index + 1) + '</td>' +
        '<td><strong>' + html(row.receipt) + '</strong></td>' +
        '<td>' + html(new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Africa/Addis_Ababa' }).format(row.date)) + '</td>' +
        '<td>' + html(row.details) + '</td>' +
        '<td>' + html(row.status) + '</td>' +
        '<td>' + (row.paidIn ? money(row.paidIn) : '—') + '</td>' +
        '<td>' + (row.withdrawn ? money(row.withdrawn) : '—') + '</td>' +
        '<td>' + money(row.balance) + '</td>' +
        '<td>' + html(row.bill) + '</td>' +
        '<td><button type="button" class="table-receipt-button" data-receipt-index="' + index + '">View</button></td>' +
        '</tr>').join('');
    }
    $('#statementPreview').classList.remove('hidden');
    $('#statementPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showReceipt(row) {
    if (!row) return;
    renderReceipt(row);
    $('#receiptDialog').showModal();
  }

  $$('.category-grid .choice-card').forEach((button) => button.addEventListener('click', () => setCategory(button.dataset.category)));
  $$('#methodChoices .method-card').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.method === 'shortcode' && state.category !== 'partner') return;
    if (button.dataset.method !== 'shortcode' && state.category === 'partner') return;
    state.method = button.dataset.method;
    updateSearchMethods();
  }));
  $('#accountSearchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = $('#accountSearchInput').value.trim();
    const error = $('#searchError');
    error.textContent = '';
    if (!query) { error.textContent = 'Enter a search value to continue.'; $('#accountSearchInput').focus(); return; }
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
  $('#transactionRows').addEventListener('click', (event) => {
    const button = event.target.closest('[data-receipt-index]');
    if (!button) return;
    showReceipt(state.rows[Number(button.dataset.receiptIndex)]);
  });
  $('#openReceipt').addEventListener('click', () => showReceipt(state.rows[0]));
  $('#closeReceipt').addEventListener('click', () => $('#receiptDialog').close());
  $('#receiptDialog').addEventListener('click', (event) => {
    if (event.target === $('#receiptDialog')) $('#receiptDialog').close();
  });
  $('#printStatement').addEventListener('click', () => {
    document.body.classList.add('print-statement');
    $('#statementPreview').classList.add('print-target');
    window.print();
  });
  $('#printReceipt').addEventListener('click', () => {
    document.body.classList.add('print-receipt');
    window.print();
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-receipt', 'print-statement');
    $('#statementPreview').classList.remove('print-target');
  });

  $('#startDate').value = dateInput(addDays(today, -6));
  $('#endDate').value = dateInput(today);
  $('#receiptDate').textContent = receiptDate(today);
  updateSearchMethods();
}());
