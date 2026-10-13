// ============================================================================
// VYAPAR EXPENSE MANAGEMENT MODULE: Frontend Component & Controller
// 1. Dashboard: KPIs, Direct vs Indirect, Cash Outflow, Category Progress
// 2. Add / Edit Expense: Direct/Indirect toggle, GST Tax Breakdown, Payment Voucher
// 3. Expense Register: Multi-filter, Search, Status, Mobile Cards & Actions
// 4. Approvals Queue: Multi-tier review, 1-click Approve / Reject with Reason
// 5. Category Master: Direct/Indirect Head, Monthly Budget Limits, Colors
// 6. Vyapar Multi-Report Hub: 7 Full Audit Reports with PDF, CSV & Print:
//    - Report 1: All Expenses Transaction Ledger
//    - Report 2: Category-Wise Expense Report
//    - Report 3: Item / Subcategory-Wise Report
//    - Report 4: Day-Wise & Month-Wise Trend Report
//    - Report 5: Party / Vendor-Wise Report
//    - Report 6: Payment Mode Outflow Report
//    - Report 7: GST / Tax Input Credit (ITC) Report (GSTR-3B Ready)
// 7. Vyapar Payment Voucher View & PDF Download
// ============================================================================

(function () {
  "use strict";

  var EXP_SUBTAB = "dashboard"; // dashboard | register | add | approvals | categories | reports
  var EXP_REP_TYPE = "all"; // all | category | item | daily | party | mode | tax
  var EXP_DATA = null;
  var EXP_LOADING = false;
  var EXP_ERROR = null;

  // Filter state for Register
  var EXP_FILTER = {
    search: "",
    d: "",
    date_from: "",
    date_to: "",
    category: "all",
    expense_type: "all", // all | Direct | Indirect
    shift: "all",
    payment_method: "all",
    status: "all"
  };

  // State
  var EXP_CATEGORIES = [];
  var EXP_PENDING_LIST = [];
  var EXP_REPORTS_DATA = null;
  var EXP_EDIT_ID = null;

  // Icons
  var EXP_ICONS = {
    receipt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M10 16H8"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    printer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    tag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>',
    fileText: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
    excel: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8l8 8"/><path d="M16 8l-8 8"/></svg>'
  };

  // Helper formatting functions
  function formatInr(val) {
    var n = parseFloat(val) || 0;
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  function formatInr2(val) {
    var n = parseFloat(val) || 0;
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    var d = new Date(ts * 1000);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  // Indian Currency Words Generator (Famous Vyapar hallmark)
  function numberToWordsIndian(numVal) {
    var num = Math.round(Math.abs(parseFloat(numVal) || 0));
    if (num === 0) return "Rupees Zero Only";
    var a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    var b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    function convert(n) {
      if (n === 0) return "";
      if (n < 20) return a[n] + " ";
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "") + " ";
      return a[Math.floor(n / 100)] + " Hundred " + (n % 100 !== 0 ? convert(n % 100) : "");
    }
    var crore = Math.floor(num / 10000000);
    num %= 10000000;
    var lakh = Math.floor(num / 100000);
    num %= 100000;
    var thousand = Math.floor(num / 1000);
    num %= 1000;
    var rem = num;
    var res = "";
    if (crore > 0) res += convert(crore) + "Crore ";
    if (lakh > 0) res += convert(lakh) + "Lakh ";
    if (thousand > 0) res += convert(thousand) + "Thousand ";
    if (rem > 0) res += convert(rem);
    return "Rupees " + res.trim() + " Only";
  }

  function getStatusPill(status) {
    if (status === "approved") {
      return '<span class="ops-pill ops-pill-ok">Approved</span>';
    } else if (status === "paid") {
      return '<span class="ops-pill ops-pill-ok" style="background:rgba(10,99,248,0.12);color:#0A63F8;border:1px solid rgba(10,99,248,0.25)">Paid</span>';
    } else if (status === "rejected") {
      return '<span class="ops-pill ops-pill-err">Rejected</span>';
    }
    return '<span class="ops-pill ops-pill-warn">Pending</span>';
  }

  function getTypeBadge(type) {
    if (type === "Direct") {
      return '<span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(234,88,12,0.12);color:#EA580C;border:1px solid rgba(234,88,12,0.25)">Direct</span>';
    }
    return '<span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(139,92,246,0.12);color:#8B5CF6;border:1px solid rgba(139,92,246,0.25)">Indirect</span>';
  }

  function getPaymentBadge(method) {
    var bg = "rgba(100,116,139,0.12)", col = "#475569";
    if (method === "Cash") { bg = "rgba(5,150,105,0.12)"; col = "var(--ok,#059669)"; }
    else if (method === "UPI") { bg = "rgba(10,99,248,0.12)"; col = "#0A63F8"; }
    else if (method === "Bank") { bg = "rgba(139,92,246,0.12)"; col = "#8B5CF6"; }
    else if (method === "Card") { bg = "rgba(236,72,153,0.12)"; col = "#EC4899"; }
    else if (method === "Cheque") { bg = "rgba(217,119,6,0.12)"; col = "#D97706"; }
    return '<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:' + bg + ';color:' + col + '">' + esc(method || "Cash") + '</span>';
  }

  // --------------------------------------------------------------------------
  // Data Loaders
  // --------------------------------------------------------------------------
  function loadExpensesOverview(cb) {
    EXP_LOADING = true;
    api("GET", "/api/expenses/overview")
      .then(function (res) {
        EXP_DATA = res;
        EXP_CATEGORIES = res.categories || [];
        EXP_LOADING = false;
        EXP_ERROR = null;
        if (cb) cb();
        else if (tab === "expenses") renderExpensesTab();
      })
      .catch(function (err) {
        EXP_LOADING = false;
        EXP_ERROR = (err && err.error) || "Could not load expense overview.";
        if (tab === "expenses") renderExpensesTab();
      });
  }

  function loadPendingApprovals(cb) {
    api("GET", "/api/expenses/pending")
      .then(function (res) {
        EXP_PENDING_LIST = res.pending || [];
        if (cb) cb();
        else if (tab === "expenses" && EXP_SUBTAB === "approvals") renderExpensesTab();
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not load pending approvals.");
      });
  }

  function loadExpenseReports(cb) {
    var from = (EXP_FILTER.date_from || today().slice(0, 8) + "01");
    var to = (EXP_FILTER.date_to || today());
    api("GET", "/api/expenses/reports?from=" + from + "&to=" + to)
      .then(function (res) {
        EXP_REPORTS_DATA = res;
        if (cb) cb();
        else if (tab === "expenses" && EXP_SUBTAB === "reports") renderExpensesTab();
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not load expense reports.");
      });
  }

  // --------------------------------------------------------------------------
  // Main Tab Renderer
  // --------------------------------------------------------------------------
  function renderExpensesTab() {
    tab = "expenses";
    var A = document.getElementById("app");
    if (!A) return;

    if (!SRV) {
      A.innerHTML = nav() + '<div class="empty">The Vyapar Expense Management Module requires the station server. Please log in.</div>';
      return;
    }

    if (!EXP_DATA && !EXP_LOADING) {
      A.innerHTML = nav() + '<div class="empty"><span style="display:inline-block;width:12px;height:12px;border:2px solid var(--btn);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px"></span>Loading Vyapar expense records…</div>';
      loadExpensesOverview();
      return;
    }

    var h = nav();

    // Header Title & Actions
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h1 style="margin:0;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:#0A63F8">' + EXP_ICONS.receipt + '</span> Vyapar Expense Management';
    h += '</h1>';
    h += '<div class="sub" style="margin-top:2px">Direct & Indirect operating expenditures, shift till disbursements, approvals & Vyapar reports</div>';
    h += '</div>';

    h += '<div class="btns" style="margin:0;flex:none">';
    h += '<button onclick="openAddExpenseModal()" style="display:inline-flex;align-items:center;gap:6px">' + EXP_ICONS.plus + ' Record Expense</button>';
    if (ME && (ME.role === "manager" || ME.role === "owner" || ME.role === "admin")) {
      var pendCount = (EXP_DATA && EXP_DATA.kpi && EXP_DATA.kpi.pending_count) || 0;
      h += '<button class="ghost" onclick="setExpenseSubtab(\'approvals\')" style="display:inline-flex;align-items:center;gap:6px;position:relative">';
      h += EXP_ICONS.clock + ' Approvals';
      if (pendCount > 0) {
        h += '<span style="background:var(--warn);color:#fff;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px;margin-left:4px">' + pendCount + '</span>';
      }
      h += '</button>';
    }
    h += '<button class="ghost" onclick="loadExpensesOverview()" title="Refresh records" style="padding:8px 12px">🔄</button>';
    h += '</div>';
    h += '</div>';

    // Subtabs bar
    var isWorker = ME && ME.role === "worker";
    var subtabs = [
      { id: "dashboard", label: "Dashboard" },
      { id: "register", label: "Expense Register" },
      { id: "add", label: "+ Record Expense" }
    ];

    if (!isWorker) {
      var pCnt = (EXP_DATA && EXP_DATA.kpi && EXP_DATA.kpi.pending_count) || 0;
      subtabs.push({ id: "approvals", label: "Approvals" + (pCnt > 0 ? " (" + pCnt + ")" : "") });
      subtabs.push({ id: "categories", label: "Categories" });
      subtabs.push({ id: "reports", label: "Vyapar Reports" });
    } else {
      subtabs.push({ id: "reports", label: "My Shift Reports" });
    }

    h += '<div class="ops-subtabs">';
    subtabs.forEach(function (st) {
      var act = (EXP_SUBTAB === st.id) ? "active" : "";
      h += '<button type="button" class="ops-subtab-btn ' + act + '" onclick="setExpenseSubtab(\'' + st.id + '\')">' + esc(st.label) + '</button>';
    });
    h += '</div>';

    // Section Content Router
    if (EXP_SUBTAB === "dashboard") {
      h += renderExpenseDashboard();
    } else if (EXP_SUBTAB === "register") {
      h += renderExpenseRegister();
    } else if (EXP_SUBTAB === "add") {
      h += renderAddExpenseFormInline();
    } else if (EXP_SUBTAB === "approvals") {
      h += renderExpenseApprovals();
    } else if (EXP_SUBTAB === "categories") {
      h += renderExpenseCategories();
    } else if (EXP_SUBTAB === "reports") {
      h += renderExpenseReports();
    }

    A.innerHTML = h;
  }

  function setExpenseSubtab(st) {
    EXP_SUBTAB = st;
    if (st === "approvals") loadPendingApprovals();
    if (st === "reports") loadExpenseReports();
    renderExpensesTab();
  }

  // --------------------------------------------------------------------------
  // SECTION 1: EXPENSE DASHBOARD (Vyapar Style)
  // --------------------------------------------------------------------------
  function renderExpenseDashboard() {
    var d = EXP_DATA || { kpi: {}, category_breakdown: [], shift_totals: [], payment_methods: [], recent: [] };
    var k = d.kpi || {};
    var h = '';

    // KPI Summary Grid (Today, Month-to-date, Shift Cash, Pending, Approved)
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">';

    // 1. Today's Total
    h += '<div class="ops-kpi-card" style="border-left:4px solid #0A63F8">';
    h += '<div class="ops-kpi-lbl">Today\'s Expenses (' + esc(d.today || "Today") + ')</div>';
    h += '<div class="ops-kpi-num" style="color:#0A63F8">' + formatInr(k.today_total) + '</div>';
    h += '<div class="sub" style="margin-top:4px">' + (k.today_count || 0) + ' voucher(s) recorded</div>';
    h += '</div>';

    // 2. Pending Approvals
    h += '<div class="ops-kpi-card" style="border-left:4px solid var(--warn,#D97706);cursor:pointer" onclick="setExpenseSubtab(\'approvals\')">';
    h += '<div class="ops-kpi-lbl">Pending Approvals</div>';
    h += '<div class="ops-kpi-num" style="color:var(--warn,#D97706)">' + (k.pending_count || 0) + '</div>';
    h += '<div class="sub" style="margin-top:4px">Value: ' + formatInr(k.pending_total) + ' awaiting sign-off</div>';
    h += '</div>';

    // 3. Approved / Disbursed
    h += '<div class="ops-kpi-card" style="border-left:4px solid var(--ok,#059669)">';
    h += '<div class="ops-kpi-lbl">Approved Expenses</div>';
    h += '<div class="ops-kpi-num" style="color:var(--ok,#059669)">' + formatInr(k.approved_total) + '</div>';
    h += '<div class="sub" style="margin-top:4px">' + (k.approved_count || 0) + ' authorized records</div>';
    h += '</div>';

    // 4. Cash Expenses (Shift Cash Deduction)
    h += '<div class="ops-kpi-card" style="border-left:4px solid #EF4444">';
    h += '<div class="ops-kpi-lbl">Shift Till Cash Outflow</div>';
    h += '<div class="ops-kpi-num" style="color:#EF4444">' + formatInr(k.cash_total) + '</div>';
    h += '<div class="sub" style="margin-top:4px">' + (k.cash_count || 0) + ' physical cash payouts</div>';
    h += '</div>';

    // 5. Monthly Total
    h += '<div class="ops-kpi-card" style="border-left:4px solid #8B5CF6">';
    h += '<div class="ops-kpi-lbl">Month-to-Date (' + esc(d.month || "Current") + ')</div>';
    h += '<div class="ops-kpi-num" style="color:#8B5CF6">' + formatInr(k.month_total) + '</div>';
    h += '<div class="sub" style="margin-top:4px">' + (k.month_count || 0) + ' cumulative entries</div>';
    h += '</div>';

    h += '</div>';

    // Direct vs Indirect Analysis & Category Breakdown
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:16px">';

    // Category Breakdown Card
    h += '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h += '<b style="font-size:14px">📁 Category Breakdown (This Month)</b>';
    h += '<button class="ghost" style="padding:3px 8px;font-size:11.5px" onclick="setExpenseSubtab(\'categories\')">Manage Budgets</button>';
    h += '</div>';

    var cats = d.category_breakdown || [];
    if (!cats.length) {
      h += '<div class="sub" style="padding:14px 0;text-align:center">No approved expenses recorded this month yet.</div>';
    } else {
      var maxCatTotal = Math.max.apply(null, cats.map(function (c) { return c.total || 0; })) || 1;
      h += '<div style="display:flex;flex-direction:column;gap:10px">';
      cats.slice(0, 7).forEach(function (c) {
        var pct = Math.min(100, Math.round((c.total / maxCatTotal) * 100));
        h += '<div>';
        h += '<div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;margin-bottom:3px">';
        h += '<span>' + esc(c.category) + ' <span class="sub" style="font-size:11px">(' + c.count + ')</span></span>';
        h += '<span style="font-weight:700">' + formatInr(c.total) + '</span>';
        h += '</div>';
        h += '<div style="height:6px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden">';
        h += '<div style="width:' + pct + '%;height:100%;background:#0A63F8;border-radius:4px"></div>';
        h += '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // Shifts & Channels Card
    h += '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<b style="font-size:14px;display:block;margin-bottom:10px">⏱️ Shift & Payment Channels</b>';

    h += '<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--mute);letter-spacing:0.5px;margin-bottom:6px">Today\'s Shift Totals</div>';
    var shifts = d.shift_totals || [];
    if (!shifts.length) {
      h += '<div class="sub" style="font-size:12px;margin-bottom:12px">No shift-wise expenses recorded today.</div>';
    } else {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
      shifts.forEach(function (st) {
        h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 12px;flex:1;min-width:100px">';
        h += '<div class="sub" style="font-size:11px;font-weight:700">' + esc(st.shift) + ' Shift</div>';
        h += '<div style="font-size:15px;font-weight:800;color:var(--ink)">' + formatInr(st.total) + '</div>';
        h += '<div class="sub" style="font-size:10px">' + st.count + ' voucher(s)</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--mute);letter-spacing:0.5px;margin-bottom:6px">Payment Channels (This Month)</div>';
    var methods = d.payment_methods || [];
    if (!methods.length) {
      h += '<div class="sub" style="font-size:12px">No payment records yet.</div>';
    } else {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      methods.forEach(function (pm) {
        h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 10px;flex:1;min-width:90px">';
        h += '<div style="margin-bottom:3px">' + getPaymentBadge(pm.payment_method) + '</div>';
        h += '<div style="font-size:14px;font-weight:800;color:var(--ink)">' + formatInr(pm.total) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';

    h += '</div>';

    // Recent Vouchers Table (Vyapar style)
    h += '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h += '<b style="font-size:14px">Recent Expense Vouchers</b>';
    h += '<button class="ghost" style="padding:3px 8px;font-size:11.5px" onclick="setExpenseSubtab(\'register\')">View Full Register →</button>';
    h += '</div>';

    var recent = d.recent || [];
    if (!recent.length) {
      h += '<div class="sub" style="padding:14px 0;text-align:center">No recent expenses found. Click "+ Record Expense" to create one.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table">';
      h += '<thead><tr><th>Voucher #</th><th>Date</th><th>Category</th><th>Party / Payee</th><th class="r">Amount</th><th>Mode</th><th>Status</th><th class="noprint r">Actions</th></tr></thead><tbody>';
      recent.forEach(function (r) {
        h += '<tr>';
        h += '<td style="font-weight:700;font-family:monospace;color:#0A63F8">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.d) + '</b><div class="sub" style="font-size:11px">' + esc(r.shift) + '</div></td>';
        h += '<td><b>' + esc(r.category) + '</b>' + (r.expense_type ? ' ' + getTypeBadge(r.expense_type) : '') + '</td>';
        h += '<td>' + esc(r.paid_to || "Cash Counter") + '</td>';
        h += '<td class="r" style="font-weight:800;font-size:13.5px">' + formatInr2(r.amount) + '</td>';
        h += '<td>' + getPaymentBadge(r.payment_method) + '</td>';
        h += '<td>' + getStatusPill(r.status) + '</td>';
        h += '<td class="noprint r" style="white-space:nowrap">';
        h += '<button class="ghost" style="padding:3px 8px;font-size:11px;margin-right:4px" onclick="viewExpenseDetail(' + r.id + ')">Voucher</button>';
        h += '<button class="ghost" style="padding:3px 8px;font-size:11px" onclick="downloadVoucherPdf(' + r.id + ')">PDF</button>';
        h += '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    return h;
  }

  // --------------------------------------------------------------------------
  // SECTION 2: ADD / EDIT EXPENSE (Inline form or Modal)
  // --------------------------------------------------------------------------
  function renderAddExpenseFormInline() {
    return '<div class="cust" style="cursor:default;margin:0;padding:18px;max-width:820px">' +
      getExpenseFormHtml(null) +
      '</div>';
  }

  function getExpenseFormHtml(exp) {
    var isEdit = Boolean(exp && exp.id);
    var cats = EXP_CATEGORIES.length ? EXP_CATEGORIES : [
      { name: "Electricity", expense_type: "Direct", subcategories: '["MSEDCL Power Bill","Canopy Lighting"]' },
      { name: "Salary & Wages", expense_type: "Indirect", subcategories: '["Attendant Salary","Overtime"]' },
      { name: "Tea & Refreshments", expense_type: "Indirect", subcategories: '["Daily Shift Tea","Drinking Water"]' },
      { name: "Repairs & Maintenance", expense_type: "Direct", subcategories: '["Dispenser Nozzle","Delivery Hose","Paver Block"]' },
      { name: "Cleaning & Housekeeping", expense_type: "Direct", subcategories: '["Detergent & Phenyl","Brooms & Mops"]' },
      { name: "Stationery & Printing", expense_type: "Indirect", subcategories: '["POS Thermal Paper","Handover Sheets"]' },
      { name: "Transport & Conveyance", expense_type: "Indirect", subcategories: '["Bank Transit","Local Run"]' },
      { name: "Internet & Telecom", expense_type: "Indirect", subcategories: '["Broadband","EDC SIM Cards"]' },
      { name: "Bank & POS Charges", expense_type: "Indirect", subcategories: '["EDC Rent","Cash Handling Fee"]' },
      { name: "Equipment & Assets", expense_type: "Direct", subcategories: '["W&M 5L Measure","Fire Extinguisher"]' },
      { name: "Rent & Lease", expense_type: "Indirect", subcategories: '["Ground Lease"]' },
      { name: "Statutory & License Fees", expense_type: "Indirect", subcategories: '["PESO Renewal","Stamping Fee"]' },
      { name: "Miscellaneous", expense_type: "Indirect", subcategories: '["Sundry"]' }
    ];

    var curD = isEdit ? exp.d : (today ? today() : new Date().toISOString().slice(0, 10));
    var curShift = isEdit ? exp.shift : "Morning";
    var curCat = isEdit ? exp.category : (cats[0] ? cats[0].name : "Repairs & Maintenance");
    var curSubcat = isEdit ? (exp.subcategory || "") : "";
    var curType = isEdit ? (exp.expense_type || "Direct") : "Direct";
    var curAmt = isEdit ? exp.amount : "";
    var curTaxRate = isEdit ? (exp.tax_rate || 0) : 0;
    var curTaxableAmt = isEdit ? (exp.taxable_amount || "") : "";
    var curTaxAmt = isEdit ? (exp.tax_amount || "") : "";
    var curGstin = isEdit ? (exp.gstin || "") : "";
    var curInvoiceNo = isEdit ? (exp.invoice_no || "") : "";
    var curInvoiceDate = isEdit ? (exp.invoice_date || "") : "";
    var curMethod = isEdit ? exp.payment_method : "Cash";
    var curIsShiftCash = isEdit ? (exp.is_shift_cash === 1) : true;
    var curPaidBy = isEdit ? exp.paid_by : (ME ? ME.name : "");
    var curPaidTo = isEdit ? exp.paid_to : "";
    var curDesc = isEdit ? exp.description : "";
    var curRemarks = isEdit ? (exp.remarks || "") : "";
    var curReceiptUrl = isEdit ? (exp.receipt_url || "") : "";
    var curReceiptName = isEdit ? (exp.receipt_name || "") : "";
    var curRef = isEdit ? (exp.payment_ref || "") : "";

    var h = '<h2>' + (isEdit ? 'Edit Payment Voucher #' + esc(exp.expense_no) : 'New Payment Voucher (Expense)') + '</h2>';
    h += '<div class="sub" style="margin-bottom:14px">Record forecourt disbursements with Vyapar accounting standards (Direct/Indirect, GST & Shift Till Cash).</div>';

    // Type Toggle: Direct Expense vs Indirect Expense (Vyapar Standard)
    h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:14px">';
    h += '<div style="font-size:12px;font-weight:700;color:var(--mute);margin-bottom:6px">EXPENSE TYPE (ACCOUNTING CLASSIFICATION)</div>';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    h += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-weight:700;font-size:13px">';
    h += '<input type="radio" name="ef_type" value="Direct" ' + (curType === "Direct" ? 'checked' : '') + ' style="margin:0;accent-color:#EA580C"> Direct Expense (Forecourt operations, dispensing, repairs, generator, loss)';
    h += '</label>';
    h += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;font-weight:700;font-size:13px">';
    h += '<input type="radio" name="ef_type" value="Indirect" ' + (curType === "Indirect" ? 'checked' : '') + ' style="margin:0;accent-color:#8B5CF6"> Indirect Expense (Office, admin, tea, salary, rent, bank charges)';
    h += '</label>';
    h += '</div>';
    h += '</div>';

    // Row 1: Date, Shift
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Voucher Date<input id="ef_d" type="date" value="' + esc(curD) + '"></label>';
    h += '<label style="flex:1">Duty Shift<select id="ef_shift">';
    ["Morning", "Evening", "Night", "General"].forEach(function (s) {
      h += '<option value="' + s + '" ' + (curShift === s ? 'selected' : '') + '>' + s + ' Shift</option>';
    });
    h += '</select></label>';
    h += '</div>';

    // Row 2: Category & Subcategory / Item
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Category<select id="ef_cat" onchange="onCategorySelectChange()">';
    cats.forEach(function (c) {
      h += '<option value="' + esc(c.name) + '" ' + (curCat === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    });
    h += '</select></label>';
    h += '<label style="flex:1">Item / Subcategory<input id="ef_subcat" placeholder="e.g. Dispenser nozzle Z-swivel, MSEDCL bill" value="' + esc(curSubcat) + '"></label>';
    h += '</div>';

    // Row 3: Total Amount in INR & Payment Method
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Total Voucher Amount (₹ INR)<input id="ef_amt" inputmode="decimal" placeholder="0.00" value="' + esc(curAmt) + '" style="font-weight:800;font-size:16px" oninput="calculateTaxBreakdown()"></label>';
    h += '<label style="flex:1">Payment Mode<select id="ef_method" onchange="onPaymentMethodChange()">';
    ["Cash", "UPI", "Bank", "Card", "Cheque", "Other"].forEach(function (m) {
      h += '<option value="' + m + '" ' + (curMethod === m ? 'selected' : '') + '>' + m + '</option>';
    });
    h += '</select></label>';
    h += '</div>';

    // GST & Tax Breakdown Section (Vyapar Feature)
    h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0">';
    h += '<div style="font-size:12px;font-weight:700;color:var(--mute);margin-bottom:8px">TAX & GST DETAILS (INPUT TAX CREDIT - GSTR-3B)</div>';
    h += '<div class="row" style="gap:10px;margin-bottom:8px">';
    h += '<label style="flex:1">GST Rate<select id="ef_tax_rate" onchange="calculateTaxBreakdown()">';
    [
      { rate: 0, label: "0% / None (Non-GST / Exempt)" },
      { rate: 5, label: "5% GST" },
      { rate: 12, label: "12% GST" },
      { rate: 18, label: "18% GST (Standard Services & Spares)" },
      { rate: 28, label: "28% GST" }
    ].forEach(function (t) {
      h += '<option value="' + t.rate + '" ' + (parseFloat(curTaxRate) === t.rate ? 'selected' : '') + '>' + t.label + '</option>';
    });
    h += '</select></label>';
    h += '<label style="flex:1">Taxable Value (₹)<input id="ef_taxable_amt" inputmode="decimal" placeholder="0.00" value="' + esc(curTaxableAmt) + '"></label>';
    h += '<label style="flex:1">Total Tax / GST (₹)<input id="ef_tax_amt" inputmode="decimal" placeholder="0.00" value="' + esc(curTaxAmt) + '"></label>';
    h += '</div>';

    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Supplier GSTIN (Optional)<input id="ef_gstin" placeholder="e.g. 27AAAAA0000A1Z5" value="' + esc(curGstin) + '" style="text-transform:uppercase"></label>';
    h += '<label style="flex:1">Vendor Bill / Invoice #<input id="ef_inv_no" placeholder="e.g. INV-9102" value="' + esc(curInvoiceNo) + '"></label>';
    h += '<label style="flex:1">Invoice Date<input id="ef_inv_date" type="date" value="' + esc(curInvoiceDate) + '"></label>';
    h += '</div>';
    h += '</div>';

    // Shift Cash Reconciliation Checkbox (Crucial: only cash expenses deducted from shift register!)
    h += '<div id="ef_shift_cash_wrap" style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.25);border-radius:8px;padding:10px 12px;margin:8px 0">';
    h += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:600;font-size:13px;color:var(--ink)">';
    h += '<input type="checkbox" id="ef_is_shift_cash" ' + (curIsShiftCash ? 'checked' : '') + ' style="width:18px;height:18px;margin:0;accent-color:var(--ok)">';
    h += '<span>Deduct from physical Shift Cash Till (Duty Cash Book Reconciliation)</span>';
    h += '</label>';
    h += '<div class="sub" style="font-size:11.5px;margin-top:4px;margin-left:28px">When checked, this cash payout reduces expected cashier handovers for this shift. Non-cash expenses (UPI/Bank/Card) will never deduct physical cash.</div>';
    h += '</div>';

    // Row 4: Paid By and Paid To
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Paid By (Account / Staff)<input id="ef_paid_by" placeholder="e.g. Forecourt Till, Attendant Vikram, Owner" value="' + esc(curPaidBy) + '"></label>';
    h += '<label style="flex:1">Paid To (Party / Payee / Supplier)<input id="ef_paid_to" placeholder="e.g. MSEDCL, Shree Ganesh Traders, Petro Mech" value="' + esc(curPaidTo) + '"></label>';
    h += '</div>';

    // Payment Reference (Cheque / UTR / Txn ID) - for non-cash
    h += '<div id="ef_ref_wrap" style="display:' + (curMethod === "Cash" ? "none" : "block") + '">';
    h += '<label>Transaction / UTR / Cheque Reference #<input id="ef_ref" placeholder="e.g. UPI Ref 3291823901, Cheque #0912" value="' + esc(curRef) + '"></label>';
    h += '</div>';

    // Description & Remarks
    h += '<label>Description & Purpose (Narration)<textarea id="ef_desc" rows="2" placeholder="Explain the expense requirement...">' + esc(curDesc) + '</textarea></label>';
    h += '<label>Internal Remarks / Audit Notes<input id="ef_remarks" placeholder="Optional notes for manager/owner audit" value="' + esc(curRemarks) + '"></label>';

    // Receipt / Bill Attachment (Data URL or file picker)
    h += '<div style="margin:12px 0;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px">';
    h += '<div style="font-size:12.5px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px">' + EXP_ICONS.receipt + ' Receipt or Bill Attachment</div>';
    h += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
    h += '<input type="file" id="ef_file_input" accept="image/*,application/pdf" style="font-size:12px;padding:4px" onchange="handleReceiptFileSelect(this)">';
    h += '<input type="hidden" id="ef_receipt_url" value="' + esc(curReceiptUrl) + '">';
    h += '<input type="hidden" id="ef_receipt_name" value="' + esc(curReceiptName) + '">';
    h += '</div>';
    h += '<div id="ef_receipt_preview" style="margin-top:8px;font-size:12px;color:var(--mute)">' +
      (curReceiptUrl ? ('Attached: <a href="' + esc(curReceiptUrl) + '" target="_blank" style="color:#0A63F8;font-weight:600">📎 ' + esc(curReceiptName || 'View attached receipt') + '</a>') : 'No bill/voucher attached yet.') +
      '</div>';
    h += '</div>';

    // Manager / Owner fast approve option
    if (ME && (ME.role === "manager" || ME.role === "owner" || ME.role === "admin") && !isEdit) {
      h += '<label style="display:flex;align-items:center;gap:8px;margin:10px 0;font-weight:600;font-size:13px">';
      h += '<input type="checkbox" id="ef_auto_approve" checked style="width:16px;height:16px;margin:0"> Auto-approve this payment voucher immediately (Manager/Owner sign-off)';
      h += '</label>';
    }

    h += '<div class="err" id="ef_err" style="margin-top:8px"></div>';

    // Action buttons
    h += '<div class="row" style="margin-top:16px;gap:10px;justify-content:flex-end">';
    if (isEdit) {
      h += '<button class="ghost" type="button" onclick="closeM()">Cancel</button>';
      h += '<button type="button" id="btnSaveExpense" onclick="submitExpenseForm(' + exp.id + ')">Update Expense Voucher</button>';
    } else {
      h += '<button class="ghost" type="button" onclick="setExpenseSubtab(\'dashboard\')">Cancel</button>';
      h += '<button type="button" id="btnSaveExpense" onclick="submitExpenseForm(null)">Record Expense Voucher</button>';
    }
    h += '</div>';

    return h;
  }

  function calculateTaxBreakdown() {
    var amtEl = document.getElementById("ef_amt");
    var rateEl = document.getElementById("ef_tax_rate");
    var taxValEl = document.getElementById("ef_taxable_amt");
    var taxAmtEl = document.getElementById("ef_tax_amt");
    if (!amtEl || !rateEl || !taxValEl || !taxAmtEl) return;

    var amt = parseFloat(amtEl.value) || 0;
    var rate = parseFloat(rateEl.value) || 0;
    if (rate <= 0 || amt <= 0) {
      taxValEl.value = amt > 0 ? amt.toFixed(2) : "";
      taxAmtEl.value = "0.00";
      return;
    }

    var taxable = amt / (1 + rate / 100);
    var tax = amt - taxable;
    taxValEl.value = taxable.toFixed(2);
    taxAmtEl.value = tax.toFixed(2);
  }

  function onPaymentMethodChange() {
    var methodEl = document.getElementById("ef_method");
    var refWrap = document.getElementById("ef_ref_wrap");
    var shiftCashWrap = document.getElementById("ef_shift_cash_wrap");
    var shiftCashChk = document.getElementById("ef_is_shift_cash");
    if (!methodEl) return;

    var m = methodEl.value;
    if (refWrap) refWrap.style.display = (m === "Cash") ? "none" : "block";
    if (shiftCashWrap) shiftCashWrap.style.display = (m === "Cash") ? "block" : "none";
    if (shiftCashChk && m !== "Cash") shiftCashChk.checked = false;
    else if (shiftCashChk && m === "Cash") shiftCashChk.checked = true;
  }

  function onCategorySelectChange() {
    var catEl = document.getElementById("ef_cat");
    var subcatEl = document.getElementById("ef_subcat");
    if (!catEl) return;

    var selCat = EXP_CATEGORIES.find(function (c) { return c.name === catEl.value; });
    if (selCat) {
      if (selCat.expense_type) {
        var radios = document.getElementsByName("ef_type");
        for (var i = 0; i < radios.length; i++) {
          if (radios[i].value === selCat.expense_type) radios[i].checked = true;
        }
      }
      try {
        var subs = JSON.parse(selCat.subcategories || "[]");
        if (subs && subs.length && subcatEl && !subcatEl.value) {
          subcatEl.value = subs[0];
        }
      } catch (_) {}
    }
  }

  function handleReceiptFileSelect(input) {
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      api("POST", "/api/expenses/upload-receipt", { data_url: dataUrl, filename: file.name })
        .then(function (res) {
          var urlEl = document.getElementById("ef_receipt_url");
          var nameEl = document.getElementById("ef_receipt_name");
          var prevEl = document.getElementById("ef_receipt_preview");
          if (urlEl) urlEl.value = res.url;
          if (nameEl) nameEl.value = res.filename;
          if (prevEl) {
            prevEl.innerHTML = '✓ Attached: <a href="' + esc(res.url) + '" target="_blank" style="color:#0A63F8;font-weight:700">📎 ' + esc(res.filename) + '</a>';
          }
          toast("✓ Receipt uploaded.");
        })
        .catch(function (err) {
          toast((err && err.error) || "Could not upload receipt.");
        });
    };
    reader.readAsDataURL(file);
  }

  function submitExpenseForm(editId) {
    var btn = document.getElementById("btnSaveExpense");
    var errEl = document.getElementById("ef_err");
    if (errEl) errEl.textContent = "";

    var d = (document.getElementById("ef_d") || {}).value;
    var shift = (document.getElementById("ef_shift") || {}).value || "Morning";
    var cat = (document.getElementById("ef_cat") || {}).value;
    var subcat = (document.getElementById("ef_subcat") || {}).value;
    var amt = parseFloat((document.getElementById("ef_amt") || {}).value);
    var method = (document.getElementById("ef_method") || {}).value || "Cash";
    var isShiftCash = Boolean((document.getElementById("ef_is_shift_cash") || {}).checked);
    var paidBy = (document.getElementById("ef_paid_by") || {}).value;
    var paidTo = (document.getElementById("ef_paid_to") || {}).value;
    var ref = (document.getElementById("ef_ref") || {}).value;
    var desc = (document.getElementById("ef_desc") || {}).value;
    var remarks = (document.getElementById("ef_remarks") || {}).value;
    var receiptUrl = (document.getElementById("ef_receipt_url") || {}).value;
    var receiptName = (document.getElementById("ef_receipt_name") || {}).value;
    var autoApprove = Boolean((document.getElementById("ef_auto_approve") || {}).checked);

    var taxRate = parseFloat((document.getElementById("ef_tax_rate") || {}).value) || 0;
    var taxableAmt = parseFloat((document.getElementById("ef_taxable_amt") || {}).value) || 0;
    var taxAmt = parseFloat((document.getElementById("ef_tax_amt") || {}).value) || 0;
    var gstin = ((document.getElementById("ef_gstin") || {}).value || "").trim().toUpperCase();
    var invNo = ((document.getElementById("ef_inv_no") || {}).value || "").trim();
    var invDate = (document.getElementById("ef_inv_date") || {}).value || "";

    var expType = "Direct";
    var typeRadios = document.getElementsByName("ef_type");
    for (var i = 0; i < typeRadios.length; i++) {
      if (typeRadios[i].checked) expType = typeRadios[i].value;
    }

    if (isNaN(amt) || amt <= 0) {
      if (errEl) errEl.textContent = "Please enter an expense amount greater than 0.";
      return;
    }
    if (!cat || !cat.trim()) {
      if (errEl) errEl.textContent = "Please select an expense category.";
      return;
    }
    if (!desc || !desc.trim()) {
      if (errEl) errEl.textContent = "Please provide description / narration.";
      return;
    }

    var payload = {
      d: d,
      shift: shift,
      category: cat.trim(),
      subcategory: subcat ? subcat.trim() : "",
      amount: amt,
      expense_type: expType,
      tax_rate: taxRate,
      taxable_amount: taxableAmt || amt,
      tax_amount: taxAmt,
      gstin: gstin,
      invoice_no: invNo,
      invoice_date: invDate,
      payment_method: method,
      is_shift_cash: isShiftCash,
      paid_by: paidBy ? paidBy.trim() : (ME ? ME.name : ""),
      paid_to: paidTo ? paidTo.trim() : "",
      payment_ref: ref ? ref.trim() : "",
      description: desc.trim(),
      remarks: remarks ? remarks.trim() : "",
      receipt_url: receiptUrl,
      receipt_name: receiptName,
      auto_approve: autoApprove
    };

    if (btn) btn.disabled = true;

    var apiCall = editId ? api("PUT", "/api/expenses/" + editId, payload) : api("POST", "/api/expenses", payload);

    apiCall
      .then(function (res) {
        toast("✓ " + (res.message || "Expense voucher saved."));
        if (editId) closeM();
        loadExpensesOverview(function () {
          setExpenseSubtab("register");
        });
      })
      .catch(function (err) {
        if (btn) btn.disabled = false;
        if (errEl) errEl.textContent = (err && err.error) || "Could not save expense.";
      });
  }

  function openAddExpenseModal() {
    openM(getExpenseFormHtml(null));
  }

  function openEditExpenseModal(id) {
    api("GET", "/api/expenses/" + id)
      .then(function (res) {
        openM(getExpenseFormHtml(res.expense));
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not load expense for editing.");
      });
  }

  // --------------------------------------------------------------------------
  // SECTION 3: EXPENSE REGISTER (Vyapar Style)
  // --------------------------------------------------------------------------
  function renderExpenseRegister() {
    var h = '';

    // Quick Date Range Presets Bar (Vyapar Hallmark)
    h += '<div class="cust noprint" style="cursor:default;margin:0 0 12px;padding:10px 12px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">';
    h += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
    h += '<span style="font-size:12px;font-weight:700;color:var(--mute)">DATE PRESETS:</span>';
    var presets = [
      { id: "today", label: "Today" },
      { id: "yesterday", label: "Yesterday" },
      { id: "this_week", label: "This Week" },
      { id: "this_month", label: "This Month" },
      { id: "last_month", label: "Last Month" },
      { id: "this_quarter", label: "This Quarter" },
      { id: "this_fy", label: "This FY" }
    ];
    presets.forEach(function (p) {
      h += '<button type="button" class="ghost" style="padding:3px 9px;font-size:11.5px;font-weight:600" onclick="applyDatePreset(\'' + p.id + '\')">' + p.label + '</button>';
    });
    h += '</div>';

    h += '<div style="display:flex;gap:8px">';
    h += '<button class="ghost" onclick="exportRegisterPdf()" style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;font-size:12px">' + EXP_ICONS.download + ' PDF Register</button>';
    h += '<button class="ghost" onclick="exportRegisterCsv()" style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;font-size:12px">' + EXP_ICONS.excel + ' Export CSV</button>';
    h += '</div>';
    h += '</div>';
    h += '</div>';

    // Filters Bar
    h += '<div class="cust noprint" style="cursor:default;margin:0 0 14px;padding:12px 14px">';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">';

    h += '<label style="margin:0;font-size:12px">Search<input id="rf_search" placeholder="Voucher #, Payee, Note" value="' + esc(EXP_FILTER.search) + '" oninput="debounceApplyFilters()"></label>';
    h += '<label style="margin:0;font-size:12px">From<input type="date" id="rf_from" value="' + esc(EXP_FILTER.date_from) + '" onchange="applyExpenseFilters()"></label>';
    h += '<label style="margin:0;font-size:12px">To<input type="date" id="rf_to" value="' + esc(EXP_FILTER.date_to) + '" onchange="applyExpenseFilters()"></label>';

    h += '<label style="margin:0;font-size:12px">Type<select id="rf_type" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Types</option>';
    h += '<option value="Direct" ' + (EXP_FILTER.expense_type === "Direct" ? 'selected' : '') + '>Direct Expense</option>';
    h += '<option value="Indirect" ' + (EXP_FILTER.expense_type === "Indirect" ? 'selected' : '') + '>Indirect Expense</option>';
    h += '</select></label>';

    h += '<label style="margin:0;font-size:12px">Category<select id="rf_cat" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Categories</option>';
    EXP_CATEGORIES.forEach(function (c) {
      h += '<option value="' + esc(c.name) + '" ' + (EXP_FILTER.category === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    });
    h += '</select></label>';

    h += '<label style="margin:0;font-size:12px">Payment Mode<select id="rf_method" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Modes</option>';
    ["Cash", "UPI", "Bank", "Card", "Cheque"].forEach(function (m) {
      h += '<option value="' + m + '" ' + (EXP_FILTER.payment_method === m ? 'selected' : '') + '>' + m + '</option>';
    });
    h += '</select></label>';

    h += '<label style="margin:0;font-size:12px">Status<select id="rf_status" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Statuses</option>';
    h += '<option value="pending_approval" ' + (EXP_FILTER.status === "pending_approval" ? 'selected' : '') + '>Pending</option>';
    h += '<option value="approved" ' + (EXP_FILTER.status === "approved" ? 'selected' : '') + '>Approved</option>';
    h += '<option value="paid" ' + (EXP_FILTER.status === "paid" ? 'selected' : '') + '>Paid</option>';
    h += '<option value="rejected" ' + (EXP_FILTER.status === "rejected" ? 'selected' : '') + '>Rejected</option>';
    h += '</select></label>';

    h += '</div>';

    h += '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">';
    h += '<button class="ghost" style="padding:4px 10px;font-size:12px" onclick="resetExpenseFilters()">Reset Filters</button>';
    h += '</div>';
    h += '</div>';

    // Summary Ribbon
    var d = EXP_DATA || {};
    var rows = d.filtered_expenses || d.recent || [];
    var sum = d.filtered_summary || { count: rows.length, total: 0, cash_total: 0, approved_total: 0 };

    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap">';
    h += '<div style="font-size:13px;font-weight:700">';
    h += 'Showing ' + rows.length + ' vouchers • Total: <span style="color:#0A63F8;font-size:15px">' + formatInr(sum.total) + '</span>';
    if (sum.cash_total > 0) {
      h += ' • Cash: <span style="color:var(--ok)">' + formatInr(sum.cash_total) + '</span>';
    }
    h += '</div>';
    h += '</div>';

    // Table / Responsive Cards
    if (!rows.length) {
      h += '<div class="empty">No expenses match the selected filters.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table">';
      h += '<thead><tr><th>Voucher #</th><th>Date</th><th>Category</th><th>Party / Payee</th><th class="r">Amount</th><th>Mode</th><th>Type</th><th>Status</th><th class="noprint r">Actions</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        h += '<tr>';
        h += '<td style="font-weight:700;font-family:monospace;color:#0A63F8">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.d) + '</b><div class="sub" style="font-size:11px">' + esc(r.shift) + '</div></td>';
        h += '<td><b>' + esc(r.category) + '</b>' + (r.subcategory ? '<div class="sub" style="font-size:11px">' + esc(r.subcategory) + '</div>' : '') + '</td>';
        h += '<td>' + esc(r.paid_to || "Cash Counter") + '</td>';
        h += '<td class="r" style="font-weight:800;font-size:13.5px">' + formatInr2(r.amount) + '</td>';
        h += '<td>' + getPaymentBadge(r.payment_method) + '</td>';
        h += '<td>' + getTypeBadge(r.expense_type || "Direct") + '</td>';
        h += '<td>' + getStatusPill(r.status) + '</td>';
        h += '<td class="noprint r" style="white-space:nowrap">';
        h += '<button class="ghost" style="padding:3px 8px;font-size:11px;margin-right:4px" onclick="viewExpenseDetail(' + r.id + ')">Voucher</button>';
        h += '<button class="ghost" style="padding:3px 8px;font-size:11px;margin-right:4px" onclick="downloadVoucherPdf(' + r.id + ')">PDF</button>';
        if (ME && (ME.role === "owner" || ME.role === "manager" || (ME.role === "worker" && r.status === "pending_approval"))) {
          h += '<button class="ghost" style="padding:3px 8px;font-size:11px" onclick="openEditExpenseModal(' + r.id + ')">Edit</button>';
        }
        h += '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    return h;
  }

  var searchTimer = null;
  function debounceApplyFilters() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyExpenseFilters, 300);
  }

  function applyDatePreset(preset) {
    var todayStr = today();
    var curYear = parseInt(todayStr.slice(0, 4), 10);
    var curMonth = parseInt(todayStr.slice(5, 7), 10);
    var fromD = todayStr, toD = todayStr;

    if (preset === "today") {
      fromD = todayStr; toD = todayStr;
    } else if (preset === "yesterday") {
      var yD = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      fromD = yD; toD = yD;
    } else if (preset === "this_week") {
      var dt = new Date();
      var day = dt.getDay() || 7;
      if (day !== 1) dt.setHours(-24 * (day - 1));
      fromD = dt.toISOString().slice(0, 10);
      toD = todayStr;
    } else if (preset === "this_month") {
      fromD = todayStr.slice(0, 8) + "01";
      toD = todayStr;
    } else if (preset === "last_month") {
      var prevMonth = curMonth - 1;
      var prevYear = curYear;
      if (prevMonth === 0) { prevMonth = 12; prevYear--; }
      var pmStr = String(prevMonth).padStart(2, "0");
      fromD = prevYear + "-" + pmStr + "-01";
      var lastDay = new Date(prevYear, prevMonth, 0).getDate();
      toD = prevYear + "-" + pmStr + "-" + String(lastDay).padStart(2, "0");
    } else if (preset === "this_quarter") {
      var qStartMonth = Math.floor((curMonth - 1) / 3) * 3 + 1;
      fromD = curYear + "-" + String(qStartMonth).padStart(2, "0") + "-01";
      toD = todayStr;
    } else if (preset === "this_fy") {
      var fyStartYear = (curMonth >= 4) ? curYear : (curYear - 1);
      fromD = fyStartYear + "-04-01";
      toD = todayStr;
    }

    EXP_FILTER.date_from = fromD;
    EXP_FILTER.date_to = toD;

    var fromEl = document.getElementById("rf_from");
    var toEl = document.getElementById("rf_to");
    if (fromEl) fromEl.value = fromD;
    if (toEl) toEl.value = toD;

    var repFromEl = document.getElementById("rep_from");
    var repToEl = document.getElementById("rep_to");
    if (repFromEl) repFromEl.value = fromD;
    if (repToEl) repToEl.value = toD;

    if (EXP_SUBTAB === "register") applyExpenseFilters();
    else if (EXP_SUBTAB === "reports") loadExpenseReports();
  }

  function applyExpenseFilters() {
    var search = (document.getElementById("rf_search") || {}).value || "";
    var dFrom = (document.getElementById("rf_from") || {}).value || "";
    var dTo = (document.getElementById("rf_to") || {}).value || "";
    var cat = (document.getElementById("rf_cat") || {}).value || "all";
    var expType = (document.getElementById("rf_type") || {}).value || "all";
    var method = (document.getElementById("rf_method") || {}).value || "all";
    var status = (document.getElementById("rf_status") || {}).value || "all";

    EXP_FILTER.search = search;
    EXP_FILTER.date_from = dFrom;
    EXP_FILTER.date_to = dTo;
    EXP_FILTER.category = cat;
    EXP_FILTER.expense_type = expType;
    EXP_FILTER.payment_method = method;
    EXP_FILTER.status = status;

    var queryParams = [];
    if (search) queryParams.push("search=" + encodeURIComponent(search));
    if (dFrom) queryParams.push("date_from=" + dFrom);
    if (dTo) queryParams.push("date_to=" + dTo);
    if (cat !== "all") queryParams.push("category=" + encodeURIComponent(cat));
    if (method !== "all") queryParams.push("payment_method=" + encodeURIComponent(method));
    if (status !== "all") queryParams.push("status=" + encodeURIComponent(status));

    var url = "/api/expenses?" + queryParams.join("&");
    api("GET", url)
      .then(function (res) {
        var rows = res.expenses || [];
        if (expType !== "all") {
          rows = rows.filter(function (r) { return (r.expense_type || "Direct") === expType; });
        }
        if (!EXP_DATA) EXP_DATA = {};
        EXP_DATA.filtered_expenses = rows;
        EXP_DATA.filtered_summary = res.summary || { count: rows.length, total: 0 };
        renderExpensesTab();
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not filter expenses.");
      });
  }

  function resetExpenseFilters() {
    EXP_FILTER = {
      search: "",
      d: "",
      date_from: "",
      date_to: "",
      category: "all",
      expense_type: "all",
      shift: "all",
      payment_method: "all",
      status: "all"
    };
    applyExpenseFilters();
  }

  // --------------------------------------------------------------------------
  // SECTION 4: APPROVALS QUEUE
  // --------------------------------------------------------------------------
  function renderExpenseApprovals() {
    var list = EXP_PENDING_LIST || [];
    var h = '';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h2 style="margin:0">Pending Expense Sign-Off Queue</h2>';
    h += '<div class="sub">Review forecourt cash and digital disbursements submitted by shift attendants.</div>';
    h += '</div>';
    h += '<button class="ghost" onclick="loadPendingApprovals()">🔄 Refresh Queue</button>';
    h += '</div>';

    if (!list.length) {
      h += '<div class="cust" style="cursor:default;padding:24px;text-align:center">';
      h += '<div style="font-size:28px;margin-bottom:6px">🎉</div>';
      h += '<b style="font-size:15px;color:var(--ok)">All caught up! No pending approvals.</b>';
      h += '<div class="sub" style="margin-top:4px">All shift attendant disbursements have been authorized.</div>';
      h += '</div>';
      return h;
    }

    h += '<div style="display:flex;flex-direction:column;gap:10px">';
    list.forEach(function (e) {
      h += '<div class="cust" style="cursor:default;border-left:4px solid var(--warn);padding:14px">';
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">';
      h += '<div>';
      h += '<div style="display:flex;align-items:center;gap:8px">';
      h += '<span style="font-weight:700;font-family:monospace;color:#0A63F8;font-size:14px">#' + esc(e.expense_no) + '</span>';
      h += '<b>' + esc(e.category) + '</b>';
      h += getTypeBadge(e.expense_type || "Direct");
      h += '</div>';
      h += '<div class="sub" style="margin-top:2px">Created by <b>' + esc(e.created_by_name) + '</b> on ' + esc(e.d) + ' (' + esc(e.shift) + ' Shift)</div>';
      h += '<div style="margin-top:6px;font-size:13px;line-height:1.4">' + esc(e.description) + '</div>';
      if (e.paid_to) {
        h += '<div class="sub" style="margin-top:2px">Paid to: <b>' + esc(e.paid_to) + '</b> • Mode: ' + getPaymentBadge(e.payment_method) + '</div>';
      }
      h += '</div>';

      h += '<div style="text-align:right">';
      h += '<div style="font-size:20px;font-weight:900;color:var(--ink)">' + formatInr2(e.amount) + '</div>';
      h += '<div class="sub" style="margin-top:2px">' + (e.is_shift_cash ? 'Shift Cash Deducted' : 'Bank/Digital Outflow') + '</div>';
      h += '<div class="row" style="gap:6px;margin-top:10px;justify-content:flex-end">';
      h += '<button style="background:var(--ok);color:#fff;padding:6px 14px;font-size:12px;font-weight:700" onclick="approveExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\',' + e.amount + ')">✓ Approve</button>';
      h += '<button class="ghost" style="color:var(--due);padding:6px 12px;font-size:12px" onclick="rejectExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\')">✕ Reject</button>';
      h += '</div>';
      h += '</div>';

      h += '</div>';
      h += '</div>';
    });
    h += '</div>';

    return h;
  }

  function approveExpensePrompt(id, expNo, amt) {
    if (confirm("Approve expense voucher " + expNo + " for " + formatInr(amt) + "?")) {
      executeApproveExpense(id);
    }
  }

  function executeApproveExpense(id) {
    api("POST", "/api/expenses/" + id + "/approve")
      .then(function (res) {
        toast("✓ " + (res.message || "Expense approved."));
        loadPendingApprovals();
        loadExpensesOverview();
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not approve expense.");
      });
  }

  function rejectExpensePrompt(id, expNo) {
    var reason = prompt("Enter rejection reason for voucher " + expNo + ":", "Incorrect amount / missing bill");
    if (reason && reason.trim()) {
      executeRejectExpense(id, reason.trim());
    }
  }

  function executeRejectExpense(id, reason) {
    api("POST", "/api/expenses/" + id + "/reject", { reason: reason })
      .then(function (res) {
        toast("✓ " + (res.message || "Expense rejected."));
        loadPendingApprovals();
        loadExpensesOverview();
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not reject expense.");
      });
  }

  // --------------------------------------------------------------------------
  // SECTION 5: CATEGORIES MANAGEMENT
  // --------------------------------------------------------------------------
  function renderExpenseCategories() {
    var cats = EXP_CATEGORIES || [];
    var h = '';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h2 style="margin:0">Expense Categories & Budgets</h2>';
    h += '<div class="sub">Configure Direct and Indirect expenditure heads, monthly budget limits, and subcategories.</div>';
    h += '</div>';
    h += '<button onclick="openCategoryModal(null)">+ Add Category</button>';
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
    cats.forEach(function (c) {
      var subs = [];
      try { subs = JSON.parse(c.subcategories || "[]"); } catch (_) {}
      var budget = parseFloat(c.budget_monthly) || 0;
      var spent = parseFloat(c.total_spent) || 0;
      var utilPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

      h += '<div class="cust" style="cursor:default;margin:0;padding:14px;border-top:3px solid ' + esc(c.color || "#0A63F8") + '">';
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">';
      h += '<div>';
      h += '<b style="font-size:14px;color:var(--ink)">' + esc(c.name) + '</b>';
      h += '<div style="margin-top:2px">' + getTypeBadge(c.expense_type || "Indirect") + '</div>';
      h += '</div>';
      h += '<button class="ghost" style="padding:2px 8px;font-size:11px" onclick="openCategoryModal(' + c.id + ')">Edit</button>';
      h += '</div>';

      h += '<div style="margin:8px 0;font-size:12px">';
      h += '<div style="display:flex;justify-content:space-between;margin-bottom:3px">';
      h += '<span class="sub">Monthly Budget:</span>';
      h += '<b>' + (budget > 0 ? formatInr(budget) : "No limit set") + '</b>';
      h += '</div>';
      if (budget > 0) {
        h += '<div style="display:flex;justify-content:space-between;margin-bottom:3px">';
        h += '<span class="sub">Utilization:</span>';
        h += '<span style="font-weight:700;' + (utilPct > 90 ? 'color:var(--due)' : '') + '">' + utilPct + '% (' + formatInr(spent) + ')</span>';
        h += '</div>';
        h += '<div style="height:5px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden">';
        h += '<div style="width:' + utilPct + '%;height:100%;background:' + (utilPct > 90 ? 'var(--due)' : (c.color || '#0A63F8')) + '"></div>';
        h += '</div>';
      }
      h += '</div>';

      if (subs && subs.length) {
        h += '<div style="margin-top:8px;font-size:11px;color:var(--mute)">';
        h += '<b>Items:</b> ' + subs.slice(0, 4).map(function (s) { return esc(s); }).join(", ");
        if (subs.length > 4) h += ' +' + (subs.length - 4) + ' more';
        h += '</div>';
      }

      h += '</div>';
    });
    h += '</div>';

    return h;
  }

  function openCategoryModal(catId) {
    var cur = catId ? EXP_CATEGORIES.find(function (c) { return c.id === catId; }) : null;
    var isEdit = Boolean(cur);

    var curName = isEdit ? cur.name : "";
    var curType = isEdit ? (cur.expense_type || "Indirect") : "Indirect";
    var curBudget = isEdit ? (cur.budget_monthly || "") : "";
    var curColor = isEdit ? (cur.color || "#0A63F8") : "#0A63F8";
    var curSubsStr = "";
    if (isEdit && cur.subcategories) {
      try { curSubsStr = JSON.parse(cur.subcategories).join(", "); } catch (_) { curSubsStr = cur.subcategories; }
    }

    var h = '<div style="max-width:480px">';
    h += '<h2>' + (isEdit ? 'Edit Category' : 'New Expense Category') + '</h2>';
    h += '<div class="sub" style="margin-bottom:12px">Define category details, Direct/Indirect classification, and monthly budget limit.</div>';

    h += '<label>Category Name<input id="cat_name" placeholder="e.g. Repairs & Maintenance" value="' + esc(curName) + '"></label>';

    h += '<label>Classification<select id="cat_type">';
    h += '<option value="Direct" ' + (curType === "Direct" ? 'selected' : '') + '>Direct Expense (Forecourt operations, dispensing, repairs, generator)</option>';
    h += '<option value="Indirect" ' + (curType === "Indirect" ? 'selected' : '') + '>Indirect Expense (Office, admin, tea, salary, rent, bank)</option>';
    h += '</select></label>';

    h += '<label>Monthly Spend Budget (₹ INR)<input id="cat_budget" inputmode="decimal" placeholder="e.g. 20000" value="' + esc(curBudget) + '"></label>';
    h += '<label>Subcategories / Items (Comma separated)<input id="cat_subs" placeholder="e.g. Nozzles, Delivery Hose, Paver blocks" value="' + esc(curSubsStr) + '"></label>';
    h += '<label>Badge Color<input id="cat_color" type="color" value="' + esc(curColor) + '" style="height:38px;padding:2px"></label>';

    h += '<div class="err" id="cat_err"></div>';

    h += '<div class="row" style="margin-top:16px;gap:8px;justify-content:flex-end">';
    h += '<button class="ghost" onclick="closeM()">Cancel</button>';
    h += '<button onclick="saveCategory(' + (isEdit ? cur.id : 'null') + ')">' + (isEdit ? 'Save Changes' : 'Create Category') + '</button>';
    h += '</div>';
    h += '</div>';

    openM(h);
  }

  function saveCategory(catId) {
    var name = (document.getElementById("cat_name") || {}).value;
    var expType = (document.getElementById("cat_type") || {}).value || "Indirect";
    var budget = parseFloat((document.getElementById("cat_budget") || {}).value) || 0;
    var subsRaw = (document.getElementById("cat_subs") || {}).value || "";
    var color = (document.getElementById("cat_color") || {}).value || "#0A63F8";
    var errEl = document.getElementById("cat_err");

    if (!name || !name.trim()) {
      if (errEl) errEl.textContent = "Category name is required.";
      return;
    }

    var subsArray = subsRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    var payload = {
      name: name.trim(),
      expense_type: expType,
      budget_monthly: budget,
      subcategories: subsArray,
      color: color
    };

    var method = catId ? "PUT" : "POST";
    var url = catId ? ("/api/expense-categories/" + catId) : "/api/expense-categories";

    api(method, url, payload)
      .then(function (res) {
        toast("✓ " + (res.message || "Category saved."));
        closeM();
        loadExpensesOverview(function () {
          setExpenseSubtab("categories");
        });
      })
      .catch(function (err) {
        if (errEl) errEl.textContent = (err && err.error) || "Could not save category.";
      });
  }

  // --------------------------------------------------------------------------
  // SECTION 6: VYAPAR MULTI-REPORT HUB (7 Complete Audit Reports)
  // --------------------------------------------------------------------------
  function renderExpenseReports() {
    var rep = EXP_REPORTS_DATA || { daily: [], by_category: [], by_shift: [], by_method: [], by_item: [], by_party: [], by_type: [], by_tax: [], all_transactions: [], totals: {} };
    var tot = rep.totals || {};
    var fromD = rep.from || today().slice(0, 8) + "01";
    var toD = rep.to || today();

    var h = '';

    // Vyapar Reports Switcher Tabs
    var reportTabs = [
      { id: "all", label: "📑 1. All Expenses Ledger" },
      { id: "category", label: "🏷️ 2. Category-Wise" },
      { id: "item", label: "📦 3. Item-Wise" },
      { id: "daily", label: "📈 4. Day-Wise Trend" },
      { id: "party", label: "👥 5. Party / Vendor-Wise" },
      { id: "mode", label: "💳 6. Payment Modes" },
      { id: "tax", label: "🏛️ 7. GST / Tax ITC" }
    ];

    h += '<div class="ops-subtabs noprint" style="margin-bottom:12px;background:var(--bg);border-radius:10px;padding:4px">';
    reportTabs.forEach(function (rt) {
      var act = (EXP_REP_TYPE === rt.id) ? "active" : "";
      h += '<button type="button" class="ops-subtab-btn ' + act + '" onclick="setExpenseReportType(\'' + rt.id + '\')">' + esc(rt.label) + '</button>';
    });
    h += '</div>';

    // Report Header & Controls Bar
    h += '<div class="cust noprint" style="cursor:default;margin:0 0 14px;padding:12px 14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">';
    h += '<div>';
    h += '<b style="font-size:15px;display:flex;align-items:center;gap:6px">' + EXP_ICONS.chart + ' Vyapar Report: ' + esc(getReportTitle(EXP_REP_TYPE)) + '</b>';
    h += '<div class="sub">Audited statement from <b>' + esc(fromD) + '</b> to <b>' + esc(toD) + '</b></div>';
    h += '</div>';

    h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<label style="margin:0;font-size:12px">From<input type="date" id="rep_from" value="' + esc(fromD) + '" onchange="loadReportRange()"></label>';
    h += '<label style="margin:0;font-size:12px">To<input type="date" id="rep_to" value="' + esc(toD) + '" onchange="loadReportRange()"></label>';
    h += '<button onclick="downloadReportPdf()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px">' + EXP_ICONS.download + ' Download PDF Report</button>';
    h += '<button class="ghost" onclick="exportReportCsv()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px">' + EXP_ICONS.excel + ' Export CSV</button>';
    h += '<button class="ghost" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px">' + EXP_ICONS.printer + ' Print</button>';
    h += '</div>';

    h += '</div>';

    // Quick Date Presets Row
    h += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px solid var(--line)">';
    h += '<span style="font-size:11px;font-weight:700;color:var(--mute)">PRESETS:</span>';
    ["today", "yesterday", "this_week", "this_month", "last_month", "this_quarter", "this_fy"].forEach(function (p) {
      h += '<button type="button" class="ghost" style="padding:2px 8px;font-size:11px" onclick="applyDatePreset(\'' + p + '\')">' + p.replace("_", " ").toUpperCase() + '</button>';
    });
    h += '</div>';
    h += '</div>';

    // Executive KPI Summary Banner
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">';
    h += '<div class="ops-kpi-card" style="border-left:4px solid #0A63F8">';
    h += '<div class="ops-kpi-lbl">Total Period Expenditure</div>';
    h += '<div class="ops-kpi-num" style="color:#0A63F8">' + formatInr(tot.grand_total) + '</div>';
    h += '<div class="sub" style="margin-top:2px">' + (tot.vouchers_count || 0) + ' authorized vouchers</div>';
    h += '</div>';

    h += '<div class="ops-kpi-card" style="border-left:4px solid #059669">';
    h += '<div class="ops-kpi-lbl">Shift Till Cash Outflow</div>';
    h += '<div class="ops-kpi-num" style="color:#059669">' + formatInr(tot.cash_total) + '</div>';
    h += '<div class="sub" style="margin-top:2px">Deducted from forecourt cash</div>';
    h += '</div>';

    h += '<div class="ops-kpi-card" style="border-left:4px solid #8B5CF6">';
    h += '<div class="ops-kpi-lbl">Bank / Digital Outflow</div>';
    h += '<div class="ops-kpi-num" style="color:#8B5CF6">' + formatInr(tot.digital_total) + '</div>';
    h += '<div class="sub" style="margin-top:2px">NEFT, UPI, Cards</div>';
    h += '</div>';

    h += '<div class="ops-kpi-card" style="border-left:4px solid #EA580C">';
    h += '<div class="ops-kpi-lbl">Direct vs Indirect Split</div>';
    h += '<div class="ops-kpi-num" style="font-size:15px;color:var(--ink)">D: ' + formatInr(tot.direct_total) + ' <span class="sub">•</span> InD: ' + formatInr(tot.indirect_total) + '</div>';
    h += '<div class="sub" style="margin-top:2px">Operating vs Overhead</div>';
    h += '</div>';

    if (tot.tax_total > 0) {
      h += '<div class="ops-kpi-card" style="border-left:4px solid #06B6D4">';
      h += '<div class="ops-kpi-lbl">Total GST / ITC Claimable</div>';
      h += '<div class="ops-kpi-num" style="color:#06B6D4">' + formatInr(tot.tax_total) + '</div>';
      h += '<div class="sub" style="margin-top:2px">Input Tax Credit for GSTR-3B</div>';
      h += '</div>';
    }
    h += '</div>';

    // Statement Container for Table & Printing
    h += '<div id="vyaparReportContainer">';

    if (EXP_REP_TYPE === "all") {
      h += renderReportAllTransactions(rep);
    } else if (EXP_REP_TYPE === "category") {
      h += renderReportCategoryWise(rep);
    } else if (EXP_REP_TYPE === "item") {
      h += renderReportItemWise(rep);
    } else if (EXP_REP_TYPE === "daily") {
      h += renderReportDailyTrend(rep);
    } else if (EXP_REP_TYPE === "party") {
      h += renderReportPartyWise(rep);
    } else if (EXP_REP_TYPE === "mode") {
      h += renderReportPaymentMode(rep);
    } else if (EXP_REP_TYPE === "tax") {
      h += renderReportTaxITC(rep);
    }

    h += '</div>';

    return h;
  }

  function setExpenseReportType(rt) {
    EXP_REP_TYPE = rt;
    renderExpensesTab();
  }

  function getReportTitle(t) {
    if (t === "all") return "All Expenses Transaction Ledger";
    if (t === "category") return "Category-Wise Expense Statement";
    if (t === "item") return "Item & Subcategory Breakdown";
    if (t === "daily") return "Day-Wise Expense Trend Report";
    if (t === "party") return "Party & Vendor Outflow Statement";
    if (t === "mode") return "Payment Channel & Outflow Report";
    if (t === "tax") return "GST Input Tax Credit (ITC) Report";
    return "Expense Statement";
  }

  // 1. All Transactions Report
  function renderReportAllTransactions(rep) {
    var rows = rep.all_transactions || [];
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">1. All Expenses Transaction Ledger</h3>';
    if (!rows.length) {
      h += '<div class="sub">No transactions recorded in this period.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportAll">';
      h += '<thead><tr><th>Date</th><th>Voucher #</th><th>Category & Item</th><th>Party / Payee</th><th>Mode</th><th>Type</th><th class="r">Taxable (₹)</th><th class="r">GST (₹)</th><th class="r">Total (₹)</th><th>Status</th></tr></thead><tbody>';
      var totAmt = 0, totTaxable = 0, totTax = 0;
      rows.forEach(function (r) {
        if (r.status === "approved" || r.status === "paid") {
          totAmt += r.amount || 0;
          totTaxable += r.taxable_amount || r.amount || 0;
          totTax += r.tax_amount || 0;
        }
        h += '<tr>';
        h += '<td><b>' + esc(r.d) + '</b></td>';
        h += '<td style="font-family:monospace;color:#0A63F8;font-weight:700">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.category) + '</b>' + (r.subcategory ? '<div class="sub" style="font-size:11px">' + esc(r.subcategory) + '</div>' : '') + '</td>';
        h += '<td>' + esc(r.paid_to || "Cash Counter") + '</td>';
        h += '<td>' + getPaymentBadge(r.payment_method) + '</td>';
        h += '<td>' + getTypeBadge(r.expense_type || "Direct") + '</td>';
        h += '<td class="r">' + (r.taxable_amount ? formatInr2(r.taxable_amount) : formatInr2(r.amount)) + '</td>';
        h += '<td class="r">' + (r.tax_amount ? formatInr2(r.tax_amount) : "—") + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(r.amount) + '</td>';
        h += '<td>' + getStatusPill(r.status) + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td colspan="6">TOTAL (' + rows.length + ' Vouchers)</td>';
      h += '<td class="r">' + formatInr2(totTaxable) + '</td>';
      h += '<td class="r">' + formatInr2(totTax) + '</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(totAmt) + '</td>';
      h += '<td></td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 2. Category-Wise Report
  function renderReportCategoryWise(rep) {
    var rows = rep.by_category || [];
    var grandTotal = (rep.totals && rep.totals.grand_total) || 1;
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">2. Category-Wise Expense Statement</h3>';
    if (!rows.length) {
      h += '<div class="sub">No category records found in this period.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportCat">';
      h += '<thead><tr><th>Category Head</th><th>Type</th><th class="r">Vouchers</th><th class="r">Total Spent (₹)</th><th class="r">% of Total</th><th class="r">Monthly Budget</th><th class="r">Utilization %</th></tr></thead><tbody>';
      var sumSpent = 0;
      rows.forEach(function (c) {
        sumSpent += c.total_amount;
        var sharePct = Math.round((c.total_amount / grandTotal) * 100);
        var budgetStr = c.monthly_budget ? formatInr(c.monthly_budget) : "—";
        var utilPct = c.monthly_budget ? Math.round((c.total_amount / c.monthly_budget) * 100) + "%" : "—";
        h += '<tr>';
        h += '<td><b>' + esc(c.category) + '</b></td>';
        h += '<td>' + getTypeBadge(c.expense_type || "Direct") + '</td>';
        h += '<td class="r">' + c.count + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(c.total_amount) + '</td>';
        h += '<td class="r">' + sharePct + '%</td>';
        h += '<td class="r">' + budgetStr + '</td>';
        h += '<td class="r">' + utilPct + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td colspan="3">TOTAL</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumSpent) + '</td>';
      h += '<td class="r">100%</td>';
      h += '<td colspan="2"></td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 3. Item-Wise Report
  function renderReportItemWise(rep) {
    var rows = rep.by_item || [];
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">3. Item & Subcategory Breakdown</h3>';
    if (!rows.length) {
      h += '<div class="sub">No item records found.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportItem">';
      h += '<thead><tr><th>Category</th><th>Item / Subcategory</th><th class="r">Vouchers</th><th class="r">Total Spent (₹)</th><th class="r">Average per Entry</th></tr></thead><tbody>';
      var sumTotal = 0;
      rows.forEach(function (r) {
        sumTotal += r.total_amount;
        var avg = r.count ? (r.total_amount / r.count) : 0;
        h += '<tr>';
        h += '<td><b>' + esc(r.category) + '</b></td>';
        h += '<td>' + esc(r.item_name) + '</td>';
        h += '<td class="r">' + r.count + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(r.total_amount) + '</td>';
        h += '<td class="r">' + formatInr2(avg) + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td colspan="3">TOTAL</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumTotal) + '</td>';
      h += '<td></td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 4. Day-Wise Trend Report
  function renderReportDailyTrend(rep) {
    var rows = rep.daily || [];
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">4. Day-Wise Expense Trend Report</h3>';
    if (!rows.length) {
      h += '<div class="sub">No daily records found.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportDaily">';
      h += '<thead><tr><th>Date</th><th class="r">Vouchers</th><th class="r">Cash Outflow</th><th class="r">UPI / Bank / Card</th><th class="r">Daily Total (₹)</th></tr></thead><tbody>';
      var sumCash = 0, sumTotal = 0;
      rows.forEach(function (dr) {
        sumCash += dr.cash_amount;
        sumTotal += dr.total_amount;
        var digital = dr.total_amount - dr.cash_amount;
        h += '<tr>';
        h += '<td><b>' + esc(dr.d) + '</b></td>';
        h += '<td class="r">' + dr.total_count + '</td>';
        h += '<td class="r" style="color:#059669;font-weight:700">' + formatInr2(dr.cash_amount) + '</td>';
        h += '<td class="r">' + formatInr2(digital) + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(dr.total_amount) + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td>TOTAL</td>';
      h += '<td class="r">' + (rep.totals.vouchers_count || rows.length) + '</td>';
      h += '<td class="r" style="color:#059669">' + formatInr2(sumCash) + '</td>';
      h += '<td class="r">' + formatInr2(sumTotal - sumCash) + '</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumTotal) + '</td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 5. Party / Vendor-Wise Report
  function renderReportPartyWise(rep) {
    var rows = rep.by_party || [];
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">5. Party & Vendor Outflow Statement</h3>';
    if (!rows.length) {
      h += '<div class="sub">No party records found.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportParty">';
      h += '<thead><tr><th>Party / Vendor Name</th><th class="r">Vouchers</th><th class="r">Total Disbursed (₹)</th><th>Last Transaction Date</th><th>Payment Modes Used</th></tr></thead><tbody>';
      var sumAmt = 0;
      rows.forEach(function (p) {
        sumAmt += p.total_amount;
        h += '<tr>';
        h += '<td><b>' + esc(p.party_name) + '</b></td>';
        h += '<td class="r">' + p.count + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(p.total_amount) + '</td>';
        h += '<td>' + esc(p.last_date || "—") + '</td>';
        h += '<td>' + esc(p.payment_methods || "Cash") + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td>TOTAL</td>';
      h += '<td class="r">' + rows.length + ' Parties</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumAmt) + '</td>';
      h += '<td colspan="2"></td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 6. Payment Mode Report
  function renderReportPaymentMode(rep) {
    var rows = rep.by_method || [];
    var grandTotal = (rep.totals && rep.totals.grand_total) || 1;
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">6. Payment Channel & Outflow Report</h3>';
    if (!rows.length) {
      h += '<div class="sub">No payment mode records found.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportMode">';
      h += '<thead><tr><th>Payment Mode</th><th class="r">Vouchers</th><th class="r">Total Amount (₹)</th><th class="r">% of Total</th><th>Forecourt Cash Book Impact</th></tr></thead><tbody>';
      var sumTotal = 0;
      rows.forEach(function (m) {
        sumTotal += m.total_amount;
        var pct = Math.round((m.total_amount / grandTotal) * 100);
        var isCash = m.payment_method === "Cash";
        h += '<tr>';
        h += '<td>' + getPaymentBadge(m.payment_method) + '</td>';
        h += '<td class="r">' + m.count + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(m.total_amount) + '</td>';
        h += '<td class="r">' + pct + '%</td>';
        h += '<td>' + (isCash ? '<span style="color:#059669;font-weight:700">✓ Physical Shift Cash Deduction</span>' : '<span style="color:var(--mute)">Direct Bank Outflow (Zero Cash Impact)</span>') + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td>TOTAL</td>';
      h += '<td></td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumTotal) + '</td>';
      h += '<td class="r">100%</td>';
      h += '<td></td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  // 7. GST / Tax ITC Report
  function renderReportTaxITC(rep) {
    var rows = rep.by_tax || [];
    var h = '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<h3 style="margin:0 0 10px">7. GST Input Tax Credit (ITC) Report (GSTR-3B Ready)</h3>';
    h += '<div class="sub" style="margin-bottom:12px">Summary of business expenses eligible for Input Tax Credit claims on GSTR-3B monthly filing.</div>';
    if (!rows.length) {
      h += '<div class="sub">No GST-registered expenses with tax breakdown found in this period.</div>';
    } else {
      h += '<div class="tbl"><table class="ops-table" id="tblReportTax">';
      h += '<thead><tr><th>Date</th><th>Voucher #</th><th>Party / Supplier</th><th>Supplier GSTIN</th><th>Bill #</th><th class="r">Taxable Value (₹)</th><th class="r">GST Rate</th><th class="r">ITC Claimable (₹)</th><th class="r">Total (₹)</th></tr></thead><tbody>';
      var sumTaxable = 0, sumTax = 0, sumTot = 0;
      rows.forEach(function (r) {
        sumTaxable += r.taxable_amount || 0;
        sumTax += r.tax_amount || 0;
        sumTot += r.amount || 0;
        h += '<tr>';
        h += '<td>' + esc(r.d) + '</td>';
        h += '<td style="font-family:monospace;color:#0A63F8;font-weight:700">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.paid_to || "—") + '</b></td>';
        h += '<td style="font-family:monospace">' + esc(r.gstin || "—") + '</td>';
        h += '<td>' + esc(r.invoice_no || "—") + '</td>';
        h += '<td class="r">' + formatInr2(r.taxable_amount || 0) + '</td>';
        h += '<td class="r">' + (r.tax_rate ? r.tax_rate + '%' : '—') + '</td>';
        h += '<td class="r" style="font-weight:800;color:#06B6D4">' + formatInr2(r.tax_amount || 0) + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(r.amount) + '</td>';
        h += '</tr>';
      });
      h += '</tbody>';
      h += '<tfoot><tr style="font-weight:800;background:var(--bg)">';
      h += '<td colspan="5">TOTAL ITC CLAIMABLE</td>';
      h += '<td class="r">' + formatInr2(sumTaxable) + '</td>';
      h += '<td></td>';
      h += '<td class="r" style="color:#06B6D4">' + formatInr2(sumTax) + '</td>';
      h += '<td class="r" style="color:#0A63F8">' + formatInr2(sumTot) + '</td>';
      h += '</tr></tfoot>';
      h += '</table></div>';
    }
    h += '</div>';
    return h;
  }

  function loadReportRange() {
    var f = (document.getElementById("rep_from") || {}).value;
    var t = (document.getElementById("rep_to") || {}).value;
    if (f) EXP_FILTER.date_from = f;
    if (t) EXP_FILTER.date_to = t;
    loadExpenseReports();
  }

  // --------------------------------------------------------------------------
  // PDF REPORT GENERATOR (Vyapar Standard using jsPDF + autoTable)
  // --------------------------------------------------------------------------
  function downloadReportPdf() {
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) {
      toast("PDF engine is initializing, please try again.");
      return;
    }

    var doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    var runAutoTable = function (opts) {
      if (typeof doc.autoTable === "function") doc.autoTable(opts);
      else if (window.jspdf && typeof window.jspdf.autoTable === "function") window.jspdf.autoTable(doc, opts);
      else if (typeof window.jspdfAutoTable === "function") window.jspdfAutoTable(doc, opts);
    };

    var bName = (S && S.biz && S.biz.name) ? S.biz.name : "Rituraj Petrolieum Mahud bk";
    var bAddr = (S && S.biz && S.biz.addr) ? S.biz.addr : "A/P Mahud, Taluka Sangola, Solapur, Maharashtra";
    var bGst = (S && S.biz && S.biz.gst) ? S.biz.gst : "27AAACR9182C1Z2";
    var rep = EXP_REPORTS_DATA || { totals: {} };
    var fromD = rep.from || today().slice(0, 8) + "01";
    var toD = rep.to || today();
    var repTitle = getReportTitle(EXP_REP_TYPE);

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(10, 99, 248);
    doc.text(bName, 40, 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(bAddr + " | GSTIN: " + bGst, 40, 60);

    // Report Title & Period
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(1);
    doc.line(40, 72, 555, 72);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text(repTitle, 40, 92);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Period: " + fromD + " to " + toD + "  |  Generated: " + new Date().toLocaleDateString("en-IN"), 40, 107);

    // Summary Box
    doc.setFillColor(245, 247, 252);
    doc.rect(40, 118, 515, 34, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    var tot = rep.totals || {};
    var summaryLine = "Total Outflow: " + formatInr(tot.grand_total) + "   |   Cash: " + formatInr(tot.cash_total) + "   |   Digital: " + formatInr(tot.digital_total) + "   |   Vouchers: " + (tot.vouchers_count || 0);
    doc.text(summaryLine, 50, 139);

    // Table mapping
    var head = [];
    var body = [];

    if (EXP_REP_TYPE === "all") {
      head = [["Date", "Voucher #", "Category", "Party / Payee", "Mode", "Type", "Tax (₹)", "Total (₹)"]];
      (rep.all_transactions || []).forEach(function (r) {
        body.push([
          r.d,
          r.expense_no,
          r.category,
          r.paid_to || "Cash Counter",
          r.payment_method,
          r.expense_type || "Direct",
          r.tax_amount ? formatInr2(r.tax_amount) : "—",
          formatInr2(r.amount)
        ]);
      });
    } else if (EXP_REP_TYPE === "category") {
      head = [["Category Head", "Type", "Count", "Total Spent (₹)", "% Share", "Monthly Budget", "Utilization"]];
      var gt = rep.totals.grand_total || 1;
      (rep.by_category || []).forEach(function (c) {
        body.push([
          c.category,
          c.expense_type || "Direct",
          String(c.count),
          formatInr2(c.total_amount),
          Math.round((c.total_amount / gt) * 100) + "%",
          c.monthly_budget ? formatInr(c.monthly_budget) : "—",
          c.monthly_budget ? Math.round((c.total_amount / c.monthly_budget) * 100) + "%" : "—"
        ]);
      });
    } else if (EXP_REP_TYPE === "item") {
      head = [["Category", "Item / Subcategory", "Vouchers", "Total Spent (₹)", "Average per Entry (₹)"]];
      (rep.by_item || []).forEach(function (r) {
        body.push([r.category, r.item_name, String(r.count), formatInr2(r.total_amount), formatInr2(r.total_amount / r.count)]);
      });
    } else if (EXP_REP_TYPE === "daily") {
      head = [["Date", "Vouchers", "Cash Outflow (₹)", "Digital Outflow (₹)", "Daily Total (₹)"]];
      (rep.daily || []).forEach(function (d) {
        body.push([d.d, String(d.total_count), formatInr2(d.cash_amount), formatInr2(d.total_amount - d.cash_amount), formatInr2(d.total_amount)]);
      });
    } else if (EXP_REP_TYPE === "party") {
      head = [["Party / Payee", "Vouchers", "Total Paid (₹)", "Last Date", "Payment Modes"]];
      (rep.by_party || []).forEach(function (p) {
        body.push([p.party_name, String(p.count), formatInr2(p.total_amount), p.last_date || "—", p.payment_methods || "Cash"]);
      });
    } else if (EXP_REP_TYPE === "mode") {
      head = [["Payment Mode", "Vouchers", "Total Disbursed (₹)", "% Share", "Forecourt Cash Impact"]];
      var gtm = rep.totals.grand_total || 1;
      (rep.by_method || []).forEach(function (m) {
        body.push([m.payment_method, String(m.count), formatInr2(m.total_amount), Math.round((m.total_amount / gtm) * 100) + "%", m.payment_method === "Cash" ? "Till Deduction" : "Bank Only"]);
      });
    } else if (EXP_REP_TYPE === "tax") {
      head = [["Date", "Voucher #", "Supplier / Party", "GSTIN", "Taxable Value (₹)", "Rate", "ITC Claimable (₹)", "Total (₹)"]];
      (rep.by_tax || []).forEach(function (t) {
        body.push([t.d, t.expense_no, t.paid_to || "—", t.gstin || "—", formatInr2(t.taxable_amount || 0), (t.tax_rate ? t.tax_rate + "%" : "—"), formatInr2(t.tax_amount || 0), formatInr2(t.amount)]);
      });
    }

    runAutoTable({
      head: head,
      body: body,
      startY: 165,
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [10, 99, 248], textColor: 255, fontStyle: "bold" },
      margin: { left: 40, right: 40 }
    });

    var finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 450;
    if (finalY > 720) {
      doc.addPage();
      finalY = 60;
    }

    // Signatures footer
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Prepared by Accountant", 60, finalY + 45);
    doc.text("Checked by Manager", 240, finalY + 45);
    doc.text("Station Owner / Authorized Signatory", 400, finalY + 45);

    doc.setDrawColor(180, 180, 180);
    doc.setLineDash([2, 2], 0);
    doc.line(40, finalY + 40, 160, finalY + 40);
    doc.line(220, finalY + 40, 340, finalY + 40);
    doc.line(390, finalY + 40, 530, finalY + 40);

    var fileName = "Vyapar_Expense_Report_" + EXP_REP_TYPE + "_" + fromD + "_" + toD + ".pdf";
    doc.save(fileName);
    toast("✓ Report downloaded: " + fileName);
  }

  // CSV Export for spreadsheets
  function exportReportCsv() {
    var rep = EXP_REPORTS_DATA || {};
    var rows = [];
    var filename = "Vyapar_Expense_Report_" + EXP_REP_TYPE + ".csv";

    if (EXP_REP_TYPE === "all") {
      rows.push(["Date", "Voucher No", "Category", "Subcategory", "Party / Payee", "Payment Method", "Expense Type", "Taxable (INR)", "Tax (INR)", "Total (INR)", "Status"]);
      (rep.all_transactions || []).forEach(function (r) {
        rows.push([r.d, r.expense_no, r.category, r.subcategory || "", r.paid_to || "", r.payment_method, r.expense_type || "Direct", r.taxable_amount || r.amount, r.tax_amount || 0, r.amount, r.status]);
      });
    } else if (EXP_REP_TYPE === "category") {
      rows.push(["Category", "Type", "Count", "Total Spent (INR)", "Monthly Budget (INR)"]);
      (rep.by_category || []).forEach(function (c) {
        rows.push([c.category, c.expense_type || "Direct", c.count, c.total_amount, c.monthly_budget || 0]);
      });
    } else if (EXP_REP_TYPE === "item") {
      rows.push(["Category", "Item / Subcategory", "Vouchers Count", "Total Spent (INR)"]);
      (rep.by_item || []).forEach(function (r) {
        rows.push([r.category, r.item_name, r.count, r.total_amount]);
      });
    } else if (EXP_REP_TYPE === "daily") {
      rows.push(["Date", "Vouchers Count", "Cash Outflow (INR)", "Digital Outflow (INR)", "Daily Total (INR)"]);
      (rep.daily || []).forEach(function (d) {
        rows.push([d.d, d.total_count, d.cash_amount, d.total_amount - d.cash_amount, d.total_amount]);
      });
    } else if (EXP_REP_TYPE === "party") {
      rows.push(["Party / Vendor Name", "Vouchers Count", "Total Paid (INR)", "Last Date", "Payment Modes"]);
      (rep.by_party || []).forEach(function (p) {
        rows.push([p.party_name, p.count, p.total_amount, p.last_date || "", p.payment_methods || "Cash"]);
      });
    } else if (EXP_REP_TYPE === "mode") {
      rows.push(["Payment Mode", "Vouchers Count", "Total Disbursed (INR)"]);
      (rep.by_method || []).forEach(function (m) {
        rows.push([m.payment_method, m.count, m.total_amount]);
      });
    } else if (EXP_REP_TYPE === "tax") {
      rows.push(["Date", "Voucher No", "Party / Supplier", "GSTIN", "Invoice No", "Taxable Value (INR)", "Tax Rate (%)", "ITC Claimable Tax (INR)", "Total Amount (INR)"]);
      (rep.by_tax || []).forEach(function (t) {
        rows.push([t.d, t.expense_no, t.paid_to || "", t.gstin || "", t.invoice_no || "", t.taxable_amount || 0, t.tax_rate || 0, t.tax_amount || 0, t.amount]);
      });
    }

    var csvContent = "\uFEFF" + rows.map(function (row) {
      return row.map(function (val) {
        var str = String(val == null ? "" : val).replace(/"/g, '""');
        return '"' + str + '"';
      }).join(",");
    }).join("\r\n");

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("✓ Exported CSV: " + filename);
  }

  function exportRegisterPdf() {
    EXP_REP_TYPE = "all";
    downloadReportPdf();
  }

  function exportRegisterCsv() {
    EXP_REP_TYPE = "all";
    exportReportCsv();
  }

  // --------------------------------------------------------------------------
  // SECTION 7: VYAPAR PAYMENT VOUCHER MODAL & PDF DOWNLOAD
  // --------------------------------------------------------------------------
  function viewExpenseDetail(id) {
    api("GET", "/api/expenses/" + id)
      .then(function (res) {
        var e = res.expense;
        var logs = res.audit_logs || [];
        var bName = (S && S.biz && S.biz.name) ? S.biz.name : "Rituraj Petrolieum Mahud bk";
        var bAddr = (S && S.biz && S.biz.addr) ? S.biz.addr : "A/P Mahud, Taluka Sangola, Solapur, Maharashtra";
        var bGst = (S && S.biz && S.biz.gst) ? S.biz.gst : "27AAACR9182C1Z2";

        var h = '<div style="max-width:620px">';

        // Vyapar Voucher Header Box
        h += '<div style="border:2px solid var(--line);border-radius:10px;padding:16px;background:var(--card);margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,0.03)">';
        h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:12px">';
        h += '<div>';
        h += '<div style="font-size:16px;font-weight:900;color:#0A63F8">' + esc(bName) + '</div>';
        h += '<div class="sub" style="font-size:11.5px">' + esc(bAddr) + '</div>';
        h += '<div class="sub" style="font-size:11px;font-weight:700">GSTIN: ' + esc(bGst) + '</div>';
        h += '</div>';

        h += '<div style="text-align:right">';
        h += '<div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--mute)">PAYMENT VOUCHER</div>';
        h += '<div style="font-size:15px;font-weight:900;font-family:monospace;color:#0A63F8;margin-top:2px">' + esc(e.expense_no) + '</div>';
        h += '<div style="margin-top:4px">' + getStatusPill(e.status) + '</div>';
        h += '</div>';
        h += '</div>';

        // Voucher Meta
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px;margin-bottom:12px">';
        h += '<div>Date: <b>' + esc(e.d) + ' (' + esc(e.shift) + ' Shift)</b></div>';
        h += '<div>Payment Mode: <b>' + esc(e.payment_method) + '</b></div>';
        h += '<div>Paid To (Party): <b>' + esc(e.paid_to || "Cash Counter / Staff") + '</b></div>';
        h += '<div>Paid By: <b>' + esc(e.paid_by || "—") + '</b></div>';
        h += '<div>Category: <b>' + esc(e.category) + '</b></div>';
        h += '<div>Type: ' + getTypeBadge(e.expense_type || "Direct") + '</div>';
        if (e.payment_ref) {
          h += '<div>Reference / UTR: <b>' + esc(e.payment_ref) + '</b></div>';
        }
        if (e.gstin) {
          h += '<div>Party GSTIN: <b>' + esc(e.gstin) + '</b></div>';
        }
        h += '</div>';

        // Voucher Amount Highlight
        h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center">';
        h += '<span style="font-size:13px;font-weight:700;color:var(--mute)">Total Amount Disbursed</span>';
        h += '<span style="font-size:24px;font-weight:900;color:var(--ink)">' + formatInr2(e.amount) + '</span>';
        h += '</div>';
        h += '<div style="font-size:12px;color:var(--mute);margin-top:4px;font-style:italic">';
        h += '<b>In Words:</b> ' + numberToWordsIndian(e.amount);
        h += '</div>';

        // Tax details if applicable
        if (e.tax_amount > 0 || e.tax_rate > 0) {
          h += '<div style="display:flex;gap:14px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);font-size:11.5px;color:var(--mute)">';
          h += '<div>Taxable: <b>' + formatInr2(e.taxable_amount || e.amount) + '</b></div>';
          h += '<div>GST Rate: <b>' + (e.tax_rate || 0) + '%</b></div>';
          h += '<div>GST Tax Amount: <b>' + formatInr2(e.tax_amount || 0) + '</b></div>';
          h += '</div>';
        }
        h += '</div>';

        // Description / Narration
        h += '<div style="font-size:12.5px;margin-bottom:12px">';
        h += '<b>Narration / Details:</b>';
        h += '<div style="margin-top:2px;color:var(--ink);background:var(--bg);padding:8px 10px;border-radius:6px;border:1px solid var(--line)">' + esc(e.description) + '</div>';
        if (e.remarks) {
          h += '<div class="sub" style="margin-top:4px">Remarks: ' + esc(e.remarks) + '</div>';
        }
        h += '</div>';

        // Attached Receipt
        if (e.receipt_url) {
          h += '<div style="margin-bottom:12px;font-size:12px">';
          h += '<b>Attached Voucher/Bill:</b> ';
          h += '<a href="' + esc(e.receipt_url) + '" target="_blank" style="color:#0A63F8;font-weight:700">📎 ' + esc(e.receipt_name || "View attached document") + '</a>';
          h += '</div>';
        }

        // Signature Blocks
        h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:16px;padding-top:12px;border-top:1px solid var(--line);text-align:center;font-size:11px;color:var(--mute)">';
        h += '<div><div style="height:28px"></div><div style="border-top:1px dashed var(--line);padding-top:4px">Prepared By: ' + esc(e.created_by_name) + '</div></div>';
        h += '<div><div style="height:28px"></div><div style="border-top:1px dashed var(--line);padding-top:4px">Authorized Signatory</div></div>';
        h += '<div><div style="height:28px"></div><div style="border-top:1px dashed var(--line);padding-top:4px">Receiver Signature</div></div>';
        h += '</div>';

        h += '</div>'; // End voucher box

        // Audit Trail history
        h += '<div style="margin-bottom:12px">';
        h += '<b style="font-size:12.5px;display:block;margin-bottom:6px">🛡️ Audit & Approval History</b>';
        if (!logs.length) {
          h += '<div class="sub" style="font-size:11.5px">No audit events recorded.</div>';
        } else {
          h += '<div style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto">';
          logs.forEach(function (l) {
            h += '<div style="font-size:11px;padding:5px 8px;border-radius:6px;background:var(--bg);border:1px solid var(--line)">';
            h += '<b>' + esc(l.action) + ' by ' + esc(l.actor_name) + ' (' + esc(l.actor_role) + ')</b> • <span class="sub">' + formatDateTime(l.timestamp) + '</span>';
            h += '<div style="color:var(--mute);margin-top:1px">' + esc(l.details) + '</div>';
            h += '</div>';
          });
          h += '</div>';
        }
        h += '</div>';

        // Action Buttons
        h += '<div class="row" style="gap:8px;justify-content:flex-end">';
        h += '<button onclick="downloadVoucherPdf(' + e.id + ')" style="display:inline-flex;align-items:center;gap:6px;font-size:12px">' + EXP_ICONS.download + ' Download PDF Voucher</button>';
        h += '<button class="ghost" onclick="window.print()" style="display:inline-flex;align-items:center;gap:6px;font-size:12px">' + EXP_ICONS.printer + ' Print Voucher</button>';
        h += '<button class="ghost" onclick="closeM()">Close</button>';
        h += '</div>';

        h += '</div>';
        openM(h);
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not load expense details.");
      });
  }

  // Generate and Download PDF Payment Voucher (Vyapar standard)
  function downloadVoucherPdf(id) {
    api("GET", "/api/expenses/" + id)
      .then(function (res) {
        var e = res.expense;
        var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDF) {
          toast("PDF engine is initializing, please try again.");
          return;
        }

        var doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a5" }); // A5 standard payment voucher size

        var bName = (S && S.biz && S.biz.name) ? S.biz.name : "Rituraj Petrolieum Mahud bk";
        var bAddr = (S && S.biz && S.biz.addr) ? S.biz.addr : "A/P Mahud, Taluka Sangola, Solapur, Maharashtra";
        var bGst = (S && S.biz && S.biz.gst) ? S.biz.gst : "27AAACR9182C1Z2";

        // Outer border
        doc.setDrawColor(180, 190, 210);
        doc.setLineWidth(1.5);
        doc.rect(20, 20, 380, 555);

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(10, 99, 248);
        doc.text(bName, 35, 45);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        doc.text(bAddr, 35, 58);
        doc.text("GSTIN: " + bGst, 35, 70);

        doc.setDrawColor(210, 220, 240);
        doc.setLineWidth(1);
        doc.line(35, 78, 385, 78);

        // Voucher Banner
        doc.setFillColor(245, 247, 252);
        doc.rect(35, 85, 350, 24, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text("PAYMENT VOUCHER", 45, 101);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(10, 99, 248);
        doc.text(e.expense_no, 305, 101);

        // Meta Fields
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);

        doc.text("Date: " + e.d + " (" + e.shift + " Shift)", 40, 126);
        doc.text("Payment Mode: " + e.payment_method, 240, 126);

        doc.text("Paid To: " + (e.paid_to || "Cash Counter / Petty"), 40, 142);
        doc.text("Paid By: " + (e.paid_by || "Staff"), 240, 142);

        doc.text("Category: " + e.category + (e.subcategory ? " - " + e.subcategory : ""), 40, 158);
        doc.text("Type: " + (e.expense_type || "Direct") + " Expense", 240, 158);

        if (e.payment_ref) {
          doc.text("Ref / UTR #: " + e.payment_ref, 40, 174);
        }

        // Table Box for Particulars
        var tblY = e.payment_ref ? 186 : 172;
        doc.setDrawColor(200, 200, 200);
        doc.rect(35, tblY, 350, 120);
        doc.setFillColor(240, 242, 248);
        doc.rect(35, tblY, 350, 20, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text("Particulars / Purpose", 45, tblY + 14);
        doc.text("Amount (INR)", 310, tblY + 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 50);
        var splitDesc = doc.splitTextToSize(e.description || e.category, 250);
        doc.text(splitDesc, 45, tblY + 34);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text(formatInr2(e.amount), 305, tblY + 34);

        if (e.tax_amount > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.text("Taxable: " + formatInr2(e.taxable_amount) + " | GST @ " + (e.tax_rate || 0) + "%: " + formatInr2(e.tax_amount), 45, tblY + 70);
        }

        // Amount in words
        var wordsY = tblY + 134;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        doc.text("Amount in Words:", 35, wordsY);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(70, 70, 70);
        var words = numberToWordsIndian(e.amount);
        doc.text(doc.splitTextToSize(words, 340), 35, wordsY + 13);

        // Signatures block
        var sigY = 490;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.8);
        doc.setLineDash([2, 2], 0);

        doc.line(40, sigY, 130, sigY);
        doc.line(165, sigY, 255, sigY);
        doc.line(290, sigY, 380, sigY);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text("Prepared By: " + (e.created_by_name || "Staff"), 42, sigY + 12);
        doc.text("Checked By: Manager", 170, sigY + 12);
        doc.text("Receiver Signature", 295, sigY + 12);

        var voucherFileName = "Voucher_" + e.expense_no + ".pdf";
        doc.save(voucherFileName);
        toast("✓ Voucher downloaded: " + voucherFileName);
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not download voucher.");
      });
  }

  // --------------------------------------------------------------------------
  // Global Exports for window / router
  // --------------------------------------------------------------------------
  window.renderExpensesTab = renderExpensesTab;
  window.setExpenseSubtab = setExpenseSubtab;
  window.setExpenseReportType = setExpenseReportType;
  window.openAddExpenseModal = openAddExpenseModal;
  window.openEditExpenseModal = openEditExpenseModal;
  window.submitExpenseForm = submitExpenseForm;
  window.onPaymentMethodChange = onPaymentMethodChange;
  window.onCategorySelectChange = onCategorySelectChange;
  window.calculateTaxBreakdown = calculateTaxBreakdown;
  window.handleReceiptFileSelect = handleReceiptFileSelect;
  window.viewExpenseDetail = viewExpenseDetail;
  window.downloadVoucherPdf = downloadVoucherPdf;
  window.approveExpensePrompt = approveExpensePrompt;
  window.executeApproveExpense = executeApproveExpense;
  window.rejectExpensePrompt = rejectExpensePrompt;
  window.executeRejectExpense = executeRejectExpense;
  window.openCategoryModal = openCategoryModal;
  window.saveCategory = saveCategory;
  window.applyDatePreset = applyDatePreset;
  window.applyExpenseFilters = applyExpenseFilters;
  window.resetExpenseFilters = resetExpenseFilters;
  window.debounceApplyFilters = debounceApplyFilters;
  window.loadReportRange = loadReportRange;
  window.downloadReportPdf = downloadReportPdf;
  window.exportReportCsv = exportReportCsv;
  window.exportRegisterPdf = exportRegisterPdf;
  window.exportRegisterCsv = exportRegisterCsv;

})();
