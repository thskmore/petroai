// ============================================================================
// EXPENSE MANAGEMENT MODULE: Frontend Component & Controller
// Pages:
// 1. Expense Dashboard (KPIs, Charts, Category Budget, Today & Monthly Total)
// 2. Add / Edit Expense (INR, Shift, Category, Paid by/to, Method, Receipt upload)
// 3. Expense Register (Filterable table, Search, Status badges, Receipt preview)
// 4. Expense Approvals (Role-based: Review, Approve, Reject with Reason)
// 5. Expense Categories (Master management, Subcategories, Monthly Budget, Color)
// 6. Expense Reports (Daily, Monthly, Category-wise, Shift-wise & Printable statement)
// ============================================================================

(function () {
  "use strict";

  var EXP_SUBTAB = "dashboard"; // dashboard | add | register | approvals | categories | reports
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
    shift: "all",
    payment_method: "all",
    status: "all"
  };

  // State for Categories
  var EXP_CATEGORIES = [];
  var EXP_PENDING_LIST = [];
  var EXP_REPORTS_DATA = null;

  // Form draft state
  var EXP_EDIT_ID = null;

  // Lucide / Petro style icons
  var EXP_ICONS = {
    receipt: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-8"/><path d="M16 12h-8"/><path d="M10 16H8"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    clock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    printer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    tag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>',
    eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>'
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

  function getStatusPill(status) {
    if (status === "approved") {
      return '<span class="ops-pill ops-pill-ok">Approved</span>';
    } else if (status === "paid") {
      return '<span class="ops-pill ops-pill-ok" style="background:rgba(10,99,248,0.12);color:#0A63F8;border:1px solid rgba(10,99,248,0.25)">Paid / Disbursed</span>';
    } else if (status === "rejected") {
      return '<span class="ops-pill ops-pill-err">Rejected</span>';
    }
    return '<span class="ops-pill ops-pill-warn">Pending Approval</span>';
  }

  function getPaymentBadge(method) {
    var bg = "rgba(100,116,139,0.12)", col = "#475569";
    if (method === "Cash") { bg = "rgba(5,150,105,0.12)"; col = "var(--ok,#059669)"; }
    else if (method === "UPI") { bg = "rgba(10,99,248,0.12)"; col = "#0A63F8"; }
    else if (method === "Bank") { bg = "rgba(139,92,246,0.12)"; col = "#8B5CF6"; }
    else if (method === "Card") { bg = "rgba(236,72,153,0.12)"; col = "#EC4899"; }
    return '<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;background:' + bg + ';color:' + col + '">' + esc(method) + '</span>';
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
      A.innerHTML = nav() + '<div class="empty">The Expense Management Module requires the station server. Please log in.</div>';
      return;
    }

    if (!EXP_DATA && !EXP_LOADING) {
      A.innerHTML = nav() + '<div class="empty"><span style="display:inline-block;width:12px;height:12px;border:2px solid var(--btn);border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px"></span>Loading station expense records…</div>';
      loadExpensesOverview();
      return;
    }

    var h = nav();

    // Header Title & Actions
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h1 style="margin:0;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:#0A63F8">' + EXP_ICONS.receipt + '</span> Expense Management';
    h += '</h1>';
    h += '<div class="sub" style="margin-top:2px">Station operating expenditures, shift cash disbursements, approvals & multi-tier audits</div>';
    h += '</div>';

    h += '<div class="btns" style="margin:0;flex:none">';
    h += '<button onclick="openAddExpenseModal()" style="display:inline-flex;align-items:center;gap:6px">' + EXP_ICONS.plus + ' Add Expense</button>';
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
      { id: "add", label: "+ Add Expense" }
    ];

    if (!isWorker) {
      var pCnt = (EXP_DATA && EXP_DATA.kpi && EXP_DATA.kpi.pending_count) || 0;
      subtabs.push({ id: "approvals", label: "Approvals" + (pCnt > 0 ? " (" + pCnt + ")" : "") });
      subtabs.push({ id: "categories", label: "Categories" });
      subtabs.push({ id: "reports", label: "Expense Reports" });
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
  // SECTION 1: EXPENSE DASHBOARD
  // --------------------------------------------------------------------------
  function renderExpenseDashboard() {
    var d = EXP_DATA || { kpi: {}, category_breakdown: [], shift_totals: [], payment_methods: [], recent: [] };
    var k = d.kpi || {};
    var h = '';

    // KPI Summary Grid (Today, Pending, Approved, Cash Expenses, Monthly Total)
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
    h += '<div class="ops-kpi-lbl">Shift Cash Expenses</div>';
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

    // Two-column layout for Breakdowns (Category Breakdown & Shift/Payment Method)
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

    // Shift & Payment Modes Breakdown Card
    h += '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<b style="font-size:14px;display:block;margin-bottom:10px">⏱️ Shift & Payment Mode Breakdown</b>';

    // Shifts
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

    // Payment Methods
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

    // Recent Expenses Table
    h += '<div class="cust" style="cursor:default;margin:0;padding:14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h += '<b style="font-size:14px">📋 Recent Expense Vouchers</b>';
    h += '<button class="ghost" style="padding:4px 10px;font-size:12px" onclick="setExpenseSubtab(\'register\')">View All in Register →</button>';
    h += '</div>';

    var recent = d.recent || [];
    if (!recent.length) {
      h += '<div class="empty">No expense entries found. Click "+ Add Expense" to create the first voucher.</div>';
    } else {
      h += '<div class="tbl" style="margin:0"><table class="ops-table">';
      h += '<thead><tr>';
      h += '<th>Expense #</th><th>Date / Shift</th><th>Category</th><th>Description</th><th class="r">Amount</th><th>Method</th><th>Status</th><th class="noprint r">Actions</th>';
      h += '</tr></thead><tbody>';

      recent.forEach(function (r) {
        h += '<tr>';
        h += '<td style="font-weight:700;font-family:monospace;color:#0A63F8">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.d) + '</b><div class="sub" style="font-size:11px">' + esc(r.shift) + '</div></td>';
        h += '<td><b>' + esc(r.category) + '</b>' + (r.subcategory ? '<div class="sub" style="font-size:11px">' + esc(r.subcategory) + '</div>' : '') + '</td>';
        h += '<td style="max-width:240px;line-height:1.3">' + esc(r.description) + (r.paid_to ? '<div class="sub" style="font-size:11px">Paid to: ' + esc(r.paid_to) + '</div>' : '') + '</td>';
        h += '<td class="r" style="font-weight:800;font-size:13.5px">' + formatInr2(r.amount) + '</td>';
        h += '<td>' + getPaymentBadge(r.payment_method) + '</td>';
        h += '<td>' + getStatusPill(r.status) + '</td>';
        h += '<td class="noprint r">';
        h += '<button class="ghost" style="padding:3px 7px;font-size:11px" onclick="viewExpenseDetail(' + r.id + ')">View</button>';
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
    return '<div class="cust" style="cursor:default;margin:0;padding:18px;max-width:760px">' +
      getExpenseFormHtml(null) +
      '</div>';
  }

  function getExpenseFormHtml(exp) {
    var isEdit = Boolean(exp && exp.id);
    var cats = EXP_CATEGORIES.length ? EXP_CATEGORIES : [
      { name: "Electricity", subcategories: '["Power Bill","Lighting"]' },
      { name: "Salary & Wages", subcategories: '["Staff Salary","Overtime"]' },
      { name: "Tea & Refreshments", subcategories: '["Attendant Tea","Drinking Water"]' },
      { name: "Repairs & Maintenance", subcategories: '["Nozzle","Pump"]' },
      { name: "Cleaning & Housekeeping", subcategories: '["Soap","Phenyl"]' },
      { name: "Stationery & Printing", subcategories: '["Paper","Registers"]' },
      { name: "Transport & Conveyance", subcategories: '["Bank Transit","Auto"]' },
      { name: "Internet & Telecom", subcategories: '["Broadband","SIM"]' },
      { name: "Bank & POS Charges", subcategories: '["POS Rent","Cash Handling"]' },
      { name: "Equipment & Assets", subcategories: '["W&M 5L Measure","Fire Extinguisher"]' },
      { name: "Rent & Lease", subcategories: '["Ground Rent"]' },
      { name: "Statutory & License Fees", subcategories: '["PESO Renewal","Stamping"]' },
      { name: "Miscellaneous", subcategories: '["Sundry"]' }
    ];

    var curD = isEdit ? exp.d : (today ? today() : new Date().toISOString().slice(0, 10));
    var curShift = isEdit ? exp.shift : "Morning";
    var curCat = isEdit ? exp.category : (cats[0] ? cats[0].name : "Tea & Refreshments");
    var curSubcat = isEdit ? (exp.subcategory || "") : "";
    var curAmt = isEdit ? exp.amount : "";
    var curMethod = isEdit ? exp.payment_method : "Cash";
    var curIsShiftCash = isEdit ? (exp.is_shift_cash === 1) : true;
    var curPaidBy = isEdit ? exp.paid_by : (ME ? ME.name : "");
    var curPaidTo = isEdit ? exp.paid_to : "";
    var curDesc = isEdit ? exp.description : "";
    var curRemarks = isEdit ? (exp.remarks || "") : "";
    var curReceiptUrl = isEdit ? (exp.receipt_url || "") : "";
    var curReceiptName = isEdit ? (exp.receipt_name || "") : "";
    var curRef = isEdit ? (exp.payment_ref || "") : "";

    var h = '<h2>' + (isEdit ? 'Edit Expense Voucher #' + esc(exp.expense_no) : 'New Expense Voucher') + '</h2>';
    h += '<div class="sub" style="margin-bottom:14px">Record operational station disbursements. Cash expenses can be reconciled with shift collections.</div>';

    // Row 1: Date, Shift, Category
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Date<input id="ef_d" type="date" value="' + esc(curD) + '"></label>';
    h += '<label style="flex:1">Shift<select id="ef_shift">';
    ["Morning", "Evening", "Night", "General"].forEach(function (s) {
      h += '<option value="' + s + '" ' + (curShift === s ? 'selected' : '') + '>' + s + ' Shift</option>';
    });
    h += '</select></label>';
    h += '</div>';

    // Row 2: Category & Subcategory
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Category<select id="ef_cat" onchange="onCategorySelectChange()">';
    cats.forEach(function (c) {
      h += '<option value="' + esc(c.name) + '" ' + (curCat === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    });
    h += '</select></label>';
    h += '<label style="flex:1">Subcategory / Head<input id="ef_subcat" placeholder="e.g. Daily shift tea, MSEDCL bill" value="' + esc(curSubcat) + '"></label>';
    h += '</div>';

    // Row 3: Amount in INR & Payment Method
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Amount (₹ INR)<input id="ef_amt" inputmode="decimal" placeholder="0.00" value="' + esc(curAmt) + '" style="font-weight:700;font-size:16px"></label>';
    h += '<label style="flex:1">Payment Method<select id="ef_method" onchange="onPaymentMethodChange()">';
    ["Cash", "UPI", "Bank", "Card", "Other"].forEach(function (m) {
      h += '<option value="' + m + '" ' + (curMethod === m ? 'selected' : '') + '>' + m + '</option>';
    });
    h += '</select></label>';
    h += '</div>';

    // Shift Cash Reconciliation Checkbox (Crucial: only cash expenses deducted from shift register!)
    h += '<div id="ef_shift_cash_wrap" style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.25);border-radius:8px;padding:10px 12px;margin:8px 0">';
    h += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:600;font-size:13px;color:var(--ink)">';
    h += '<input type="checkbox" id="ef_is_shift_cash" ' + (curIsShiftCash ? 'checked' : '') + ' style="width:18px;height:18px;margin:0;accent-color:var(--ok)">';
    h += '<span>Deduct from physical Shift Cash Collection (Duty Reconciliation)</span>';
    h += '</label>';
    h += '<div class="sub" style="font-size:11.5px;margin-top:4px;margin-left:28px">When checked, this cash payout reduces expected cashier handovers for this shift. Non-cash expenses (UPI/Bank/Card) will never deduct physical cash.</div>';
    h += '</div>';

    // Row 4: Paid By and Paid To
    h += '<div class="row" style="gap:10px">';
    h += '<label style="flex:1">Paid By (Staff/Cashier)<input id="ef_paid_by" placeholder="e.g. Attendant Vikram" value="' + esc(curPaidBy) + '"></label>';
    h += '<label style="flex:1">Paid To (Vendor/Payee)<input id="ef_paid_to" placeholder="e.g. Hotel Annapurna, MSEDCL" value="' + esc(curPaidTo) + '"></label>';
    h += '</div>';

    // Payment Reference (Cheque / UTR / Txn ID) - for non-cash
    h += '<div id="ef_ref_wrap" style="display:' + (curMethod === "Cash" ? "none" : "block") + '">';
    h += '<label>Transaction / UTR / Reference ID<input id="ef_ref" placeholder="e.g. UPI Ref 3291823901, Cheque #0912" value="' + esc(curRef) + '"></label>';
    h += '</div>';

    // Description & Remarks
    h += '<label>Description & Purpose (Required)<textarea id="ef_desc" rows="2" placeholder="Explain the expense requirement...">' + esc(curDesc) + '</textarea></label>';
    h += '<label>Internal Remarks / Notes (Optional)<input id="ef_remarks" placeholder="Optional notes for manager/owner audit" value="' + esc(curRemarks) + '"></label>';

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
      h += '<input type="checkbox" id="ef_auto_approve" checked style="width:16px;height:16px;margin:0"> Auto-approve this expense immediately (Manager/Owner authorization)';
      h += '</label>';
    }

    h += '<div class="err" id="ef_err" style="margin-top:8px"></div>';

    // Action buttons
    h += '<div class="row" style="margin-top:16px;gap:10px;justify-content:flex-end">';
    if (isEdit) {
      h += '<button class="ghost" type="button" onclick="closeM()">Cancel</button>';
      h += '<button type="button" id="btnSaveExpense" onclick="submitExpenseForm(' + exp.id + ')">Update Expense</button>';
    } else {
      h += '<button class="ghost" type="button" onclick="setExpenseSubtab(\'dashboard\')">Cancel</button>';
      h += '<button type="button" id="btnSaveExpense" onclick="submitExpenseForm(null)">Submit Expense Voucher</button>';
    }
    h += '</div>';

    return h;
  }

  function onPaymentMethodChange() {
    var m = (document.getElementById("ef_method") || {}).value;
    var refWrap = document.getElementById("ef_ref_wrap");
    var shiftCashWrap = document.getElementById("ef_shift_cash_wrap");
    var chk = document.getElementById("ef_is_shift_cash");

    if (refWrap) refWrap.style.display = (m === "Cash" ? "none" : "block");
    if (shiftCashWrap) shiftCashWrap.style.display = (m === "Cash" ? "block" : "none");
    if (chk && m !== "Cash") chk.checked = false;
  }

  function onCategorySelectChange() {
    var cat = (document.getElementById("ef_cat") || {}).value;
    var subInput = document.getElementById("ef_subcat");
    if (!subInput) return;
    var found = EXP_CATEGORIES.find(function (c) { return c.name === cat; });
    if (found && found.subcategories) {
      try {
        var subs = typeof found.subcategories === "string" ? JSON.parse(found.subcategories) : found.subcategories;
        if (Array.isArray(subs) && subs.length) {
          subInput.placeholder = "e.g. " + subs.slice(0, 3).join(", ");
        }
      } catch (_) {}
    }
  }

  function handleReceiptFileSelect(input) {
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    if (file.size > 8 * 1024 * 1024) {
      toast("Receipt image must be under 8 MB.");
      input.value = "";
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      var preview = document.getElementById("ef_receipt_preview");
      if (preview) {
        preview.innerHTML = '<span style="color:var(--ok)">✓ Attached: ' + esc(file.name) + ' (' + Math.round(file.size / 1024) + ' KB)</span>';
      }

      // Upload to server
      api("POST", "/api/expenses/upload-receipt", { data_url: dataUrl, filename: file.name })
        .then(function (res) {
          var uEl = document.getElementById("ef_receipt_url");
          var nEl = document.getElementById("ef_receipt_name");
          if (uEl) uEl.value = res.url;
          if (nEl) nEl.value = res.filename;
          toast("✓ Receipt uploaded.");
        })
        .catch(function (err) {
          toast((err && err.error) || "Could not upload receipt to server. Draft kept.");
        });
    };
    reader.readAsDataURL(file);
  }

  function openAddExpenseModal() {
    openM(getExpenseFormHtml(null));
  }

  function submitExpenseForm(editId) {
    var errEl = document.getElementById("ef_err");
    if (errEl) errEl.textContent = "";

    var d = (document.getElementById("ef_d") || {}).value;
    var shift = (document.getElementById("ef_shift") || {}).value;
    var category = (document.getElementById("ef_cat") || {}).value;
    var subcategory = (document.getElementById("ef_subcat") || {}).value;
    var amt = parseFloat((document.getElementById("ef_amt") || {}).value);
    var payment_method = (document.getElementById("ef_method") || {}).value;
    var is_shift_cash = (document.getElementById("ef_is_shift_cash") || {}).checked ? 1 : 0;
    var paid_by = (document.getElementById("ef_paid_by") || {}).value;
    var paid_to = (document.getElementById("ef_paid_to") || {}).value;
    var description = (document.getElementById("ef_desc") || {}).value;
    var remarks = (document.getElementById("ef_remarks") || {}).value;
    var receipt_url = (document.getElementById("ef_receipt_url") || {}).value;
    var receipt_name = (document.getElementById("ef_receipt_name") || {}).value;
    var payment_ref = (document.getElementById("ef_ref") || {}).value;
    var auto_approve = (document.getElementById("ef_auto_approve") || {}).checked;

    if (!category) {
      if (errEl) errEl.textContent = "Please choose an expense category.";
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      if (errEl) errEl.textContent = "Enter a valid amount above zero.";
      return;
    }
    if (!description || !description.trim()) {
      if (errEl) errEl.textContent = "Please enter an expense description.";
      return;
    }

    var payload = {
      d: d,
      shift: shift,
      category: category,
      subcategory: subcategory,
      amount: amt,
      payment_method: payment_method,
      is_shift_cash: (payment_method === "Cash") ? is_shift_cash : 0,
      paid_by: paid_by,
      paid_to: paid_to,
      description: description.trim(),
      remarks: remarks.trim(),
      receipt_url: receipt_url,
      receipt_name: receipt_name,
      payment_ref: payment_ref,
      auto_approve: auto_approve
    };

    var btn = document.getElementById("btnSaveExpense");
    if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

    var method = editId ? "PUT" : "POST";
    var url = editId ? ("/api/expenses/" + editId) : "/api/expenses";

    api(method, url, payload)
      .then(function (res) {
        toast("✓ " + (res.message || "Expense saved successfully."));
        closeM();
        loadExpensesOverview(function () {
          setExpenseSubtab("register");
        });
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = "Submit Expense Voucher"; }
        if (errEl) errEl.textContent = (err && err.error) || "Could not save expense.";
      });
  }

  // --------------------------------------------------------------------------
  // SECTION 3: EXPENSE REGISTER (Filterable & Searchable)
  // --------------------------------------------------------------------------
  var REGISTER_DATA = null;
  var REGISTER_LOADING = false;

  function loadRegisterData(cb) {
    REGISTER_LOADING = true;
    var q = [];
    if (EXP_FILTER.search) q.push("search=" + encodeURIComponent(EXP_FILTER.search));
    if (EXP_FILTER.d) q.push("d=" + encodeURIComponent(EXP_FILTER.d));
    if (EXP_FILTER.date_from) q.push("date_from=" + encodeURIComponent(EXP_FILTER.date_from));
    if (EXP_FILTER.date_to) q.push("date_to=" + encodeURIComponent(EXP_FILTER.date_to));
    if (EXP_FILTER.category !== "all") q.push("category=" + encodeURIComponent(EXP_FILTER.category));
    if (EXP_FILTER.shift !== "all") q.push("shift=" + encodeURIComponent(EXP_FILTER.shift));
    if (EXP_FILTER.payment_method !== "all") q.push("payment_method=" + encodeURIComponent(EXP_FILTER.payment_method));
    if (EXP_FILTER.status !== "all") q.push("status=" + encodeURIComponent(EXP_FILTER.status));

    var url = "/api/expenses" + (q.length ? ("?" + q.join("&")) : "");
    api("GET", url)
      .then(function (res) {
        REGISTER_DATA = res;
        REGISTER_LOADING = false;
        if (cb) cb();
        else renderExpensesTab();
      })
      .catch(function (err) {
        REGISTER_LOADING = false;
        toast((err && err.error) || "Could not load expense register.");
      });
  }

  function renderExpenseRegister() {
    if (!REGISTER_DATA && !REGISTER_LOADING) {
      loadRegisterData();
      return '<div class="empty">Loading expense register…</div>';
    }

    var data = REGISTER_DATA || { expenses: [], summary: {} };
    var list = data.expenses || [];
    var sum = data.summary || {};
    var cats = EXP_CATEGORIES || [];

    var h = '';

    // Filter controls card
    h += '<div class="cust" style="cursor:default;margin:0 0 14px;padding:12px 14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
    h += '<b style="font-size:13px;display:flex;align-items:center;gap:6px">' + EXP_ICONS.filter + ' Filters & Search</b>';
    h += '<div style="display:flex;gap:6px">';
    h += '<button class="ghost" style="padding:4px 10px;font-size:11.5px" onclick="resetExpenseFilters()">Reset Filters</button>';
    h += '<button class="ghost" style="padding:4px 10px;font-size:11.5px" onclick="exportRegisterPdf()">' + EXP_ICONS.printer + ' Print Register</button>';
    h += '</div>';
    h += '</div>';

    // Filters Grid
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">';

    // Search text
    h += '<label style="margin:0;font-size:11.5px">Search<input id="rf_search" placeholder="Exp #, description, payee" value="' + esc(EXP_FILTER.search) + '" onkeydown="if(event.key===\'Enter\'){applyExpenseFilters()}"></label>';

    // Date From & To
    h += '<label style="margin:0;font-size:11.5px">From Date<input id="rf_from" type="date" value="' + esc(EXP_FILTER.date_from) + '" onchange="applyExpenseFilters()"></label>';
    h += '<label style="margin:0;font-size:11.5px">To Date<input id="rf_to" type="date" value="' + esc(EXP_FILTER.date_to) + '" onchange="applyExpenseFilters()"></label>';

    // Category
    h += '<label style="margin:0;font-size:11.5px">Category<select id="rf_cat" onchange="applyExpenseFilters()"><option value="all">All Categories</option>';
    cats.forEach(function (c) {
      h += '<option value="' + esc(c.name) + '" ' + (EXP_FILTER.category === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    });
    h += '</select></label>';

    // Shift
    h += '<label style="margin:0;font-size:11.5px">Shift<select id="rf_shift" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Shifts</option>';
    ["Morning", "Evening", "Night", "General"].forEach(function (s) {
      h += '<option value="' + s + '" ' + (EXP_FILTER.shift === s ? 'selected' : '') + '>' + s + '</option>';
    });
    h += '</select></label>';

    // Payment Method
    h += '<label style="margin:0;font-size:11.5px">Payment Method<select id="rf_method" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Methods</option>';
    ["Cash", "UPI", "Bank", "Card", "Other"].forEach(function (m) {
      h += '<option value="' + m + '" ' + (EXP_FILTER.payment_method === m ? 'selected' : '') + '>' + m + '</option>';
    });
    h += '</select></label>';

    // Status
    h += '<label style="margin:0;font-size:11.5px">Status<select id="rf_status" onchange="applyExpenseFilters()">';
    h += '<option value="all">All Statuses</option>';
    h += '<option value="approved" ' + (EXP_FILTER.status === "approved" ? 'selected' : '') + '>Approved</option>';
    h += '<option value="pending_approval" ' + (EXP_FILTER.status === "pending_approval" ? 'selected' : '') + '>Pending Approval</option>';
    h += '<option value="paid" ' + (EXP_FILTER.status === "paid" ? 'selected' : '') + '>Paid</option>';
    h += '<option value="rejected" ' + (EXP_FILTER.status === "rejected" ? 'selected' : '') + '>Rejected</option>';
    h += '</select></label>';

    h += '</div>';

    // Summary banner for current filter
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:8px;border-top:1px solid var(--line);flex-wrap:wrap;font-size:12px">';
    h += '<div>Found <b>' + (sum.count || list.length) + '</b> voucher(s) | Total: <b style="color:var(--ink);font-size:13px">' + formatInr2(sum.total) + '</b> (Physical Cash: <b style="color:#059669">' + formatInr2(sum.cash_total) + '</b>)</div>';
    h += '<button onclick="applyExpenseFilters()" style="padding:4px 12px;font-size:12px">Apply Filter</button>';
    h += '</div>';

    h += '</div>';

    // Register Table
    if (!list.length) {
      h += '<div class="empty">No expenses found matching the selected filters.</div>';
    } else {
      h += '<div class="tbl" style="margin:0"><table class="ops-table">';
      h += '<thead><tr>';
      h += '<th>Expense #</th><th>Date</th><th>Shift</th><th>Category</th><th>Description</th><th class="r">Amount (₹)</th><th>Method</th><th>Cash Reconciled?</th><th>Status</th><th class="noprint r">Actions</th>';
      h += '</tr></thead><tbody>';

      list.forEach(function (r) {
        var isCashReconciled = (r.is_shift_cash === 1 && r.payment_method === "Cash");
        h += '<tr>';
        h += '<td style="font-weight:700;font-family:monospace;color:#0A63F8">' + esc(r.expense_no) + '</td>';
        h += '<td><b>' + esc(r.d) + '</b></td>';
        h += '<td>' + esc(r.shift) + '</td>';
        h += '<td><b>' + esc(r.category) + '</b>' + (r.subcategory ? '<div class="sub" style="font-size:11px">' + esc(r.subcategory) + '</div>' : '') + '</td>';
        h += '<td style="max-width:220px;line-height:1.3">' + esc(r.description) + (r.paid_to ? '<div class="sub" style="font-size:11px">To: ' + esc(r.paid_to) + '</div>' : '') + '</td>';
        h += '<td class="r" style="font-weight:800;font-size:13.5px">' + formatInr2(r.amount) + '</td>';
        h += '<td>' + getPaymentBadge(r.payment_method) + '</td>';
        h += '<td>' + (isCashReconciled ? '<span style="color:var(--ok);font-size:11px;font-weight:700">✓ Yes (Shift Cash)</span>' : '<span style="color:var(--mute);font-size:11px">Direct / Non-cash</span>') + '</td>';
        h += '<td>' + getStatusPill(r.status) + '</td>';
        h += '<td class="noprint r" style="white-space:nowrap">';
        h += '<button class="ghost" style="padding:4px 8px;font-size:11px;margin-right:4px" onclick="viewExpenseDetail(' + r.id + ')">' + EXP_ICONS.eye + ' View</button>';
        // Only draft / pending or permitted records can be edited
        var canEdit = (r.status === "pending_approval" && (ME.role !== "worker" || r.created_by === ME.id)) ||
          ((r.status === "approved" || r.status === "paid") && (ME.role === "owner" || ME.role === "admin"));
        if (canEdit) {
          h += '<button class="ghost" style="padding:4px 8px;font-size:11px;margin-right:4px" onclick="openEditExpenseModal(' + r.id + ')">Edit</button>';
        }
        h += '</td>';
        h += '</tr>';
      });

      h += '</tbody></table></div>';
    }

    return h;
  }

  function applyExpenseFilters() {
    EXP_FILTER.search = (document.getElementById("rf_search") || {}).value || "";
    EXP_FILTER.date_from = (document.getElementById("rf_from") || {}).value || "";
    EXP_FILTER.date_to = (document.getElementById("rf_to") || {}).value || "";
    EXP_FILTER.category = (document.getElementById("rf_cat") || {}).value || "all";
    EXP_FILTER.shift = (document.getElementById("rf_shift") || {}).value || "all";
    EXP_FILTER.payment_method = (document.getElementById("rf_method") || {}).value || "all";
    EXP_FILTER.status = (document.getElementById("rf_status") || {}).value || "all";
    loadRegisterData();
  }

  function resetExpenseFilters() {
    EXP_FILTER = {
      search: "",
      d: "",
      date_from: "",
      date_to: "",
      category: "all",
      shift: "all",
      payment_method: "all",
      status: "all"
    };
    loadRegisterData();
  }

  // --------------------------------------------------------------------------
  // SECTION 4: EXPENSE APPROVALS (Manager & Owner Workflow)
  // --------------------------------------------------------------------------
  function renderExpenseApprovals() {
    var h = '';
    var list = EXP_PENDING_LIST || [];

    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h2 style="margin:0">🔍 Pending Approvals (' + list.length + ')</h2>';
    h += '<div class="sub">Operators submit expenses from the forecourt. Managers review, verify bills, and approve or reject with a mandatory reason.</div>';
    h += '</div>';
    h += '<button class="ghost" onclick="loadPendingApprovals()" style="padding:6px 12px">🔄 Refresh Pending</button>';
    h += '</div>';

    if (!list.length) {
      h += '<div class="cust" style="cursor:default;text-align:center;padding:32px 14px">';
      h += '<div style="font-size:32px;margin-bottom:8px">🎉</div>';
      h += '<b style="font-size:15px;color:var(--ok)">All caught up! No pending approvals.</b>';
      h += '<div class="sub" style="margin-top:4px">All submitted forecourt vouchers have been verified and processed.</div>';
      h += '</div>';
      return h;
    }

    h += '<div style="display:flex;flex-direction:column;gap:12px">';
    list.forEach(function (e) {
      h += '<div class="cust" style="cursor:default;margin:0;padding:14px;border-left:4px solid var(--warn,#D97706)">';
      h += '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">';

      h += '<div>';
      h += '<div style="display:flex;align-items:center;gap:8px">';
      h += '<b style="font-family:monospace;font-size:14px;color:#0A63F8">' + esc(e.expense_no) + '</b>';
      h += getStatusPill(e.status);
      h += getPaymentBadge(e.payment_method);
      if (e.is_shift_cash === 1 && e.payment_method === "Cash") {
        h += '<span style="font-size:11px;font-weight:700;color:var(--ok)">⚡ Shift Cash Reconciled</span>';
      }
      h += '</div>';

      h += '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--ink)">';
      h += esc(e.category) + (e.subcategory ? ' • ' + esc(e.subcategory) : '');
      h += '</div>';

      h += '<div style="margin-top:3px;font-size:13px;color:var(--mute)">' + esc(e.description) + '</div>';

      h += '<div class="sub" style="margin-top:6px;font-size:11.5px">';
      h += 'Date: <b>' + esc(e.d) + '</b> (' + esc(e.shift) + ' shift) • Submitted by: <b>' + esc(e.created_by_name || 'Staff') + '</b>';
      if (e.paid_to) h += ' • Payee: <b>' + esc(e.paid_to) + '</b>';
      h += '</div>';

      if (e.receipt_url) {
        h += '<div style="margin-top:6px">';
        h += '<a href="' + esc(e.receipt_url) + '" target="_blank" style="font-size:12px;font-weight:700;color:#0A63F8;display:inline-flex;align-items:center;gap:4px">📎 View Attached Bill / Receipt (' + esc(e.receipt_name || 'Bill') + ')</a>';
        h += '</div>';
      }
      h += '</div>';

      // Amount & Action buttons
      h += '<div style="text-align:right;min-width:160px">';
      h += '<div style="font-size:22px;font-weight:900;color:var(--ink);letter-spacing:-0.5px">' + formatInr2(e.amount) + '</div>';

      h += '<div class="btns" style="margin-top:10px;justify-content:flex-end;gap:6px">';
      h += '<button style="background:var(--ok,#059669);color:#fff;padding:6px 14px;font-size:12px;font-weight:700" onclick="approveExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\',' + e.amount + ')">✓ Approve</button>';
      h += '<button class="ghost" style="color:var(--due);border-color:var(--due);padding:6px 12px;font-size:12px" onclick="rejectExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\')">✕ Reject</button>';
      h += '</div>';

      h += '</div>';

      h += '</div>';
      h += '</div>';
    });
    h += '</div>';

    return h;
  }

  function approveExpensePrompt(id, expNo, amt) {
    var h = '<div style="max-width:440px">';
    h += '<h2>Approve Expense #' + esc(expNo) + '</h2>';
    h += '<div class="sub" style="margin-bottom:12px">Authorize payment voucher of <b>' + formatInr2(amt) + '</b>. Approved expenses are permanently logged in the audit ledger.</div>';
    h += '<label>Approval Note / Remarks (Optional)<input id="app_note" placeholder="e.g. Verified with store register"></label>';
    h += '<div class="err" id="app_err"></div>';
    h += '<div class="row" style="margin-top:14px;gap:8px;justify-content:flex-end">';
    h += '<button class="ghost" onclick="closeM()">Cancel</button>';
    h += '<button style="background:var(--ok);color:#fff" onclick="executeApproveExpense(' + id + ')">Confirm Approval</button>';
    h += '</div>';
    h += '</div>';
    openM(h);
  }

  function executeApproveExpense(id) {
    var note = (document.getElementById("app_note") || {}).value;
    api("POST", "/api/expenses/" + id + "/approve", { remarks: note })
      .then(function (res) {
        toast("✓ " + (res.message || "Expense approved."));
        closeM();
        loadPendingApprovals(function () {
          loadExpensesOverview(function () {
            renderExpensesTab();
          });
        });
      })
      .catch(function (err) {
        var eEl = document.getElementById("app_err");
        if (eEl) eEl.textContent = (err && err.error) || "Could not approve.";
      });
  }

  function rejectExpensePrompt(id, expNo) {
    var h = '<div style="max-width:440px">';
    h += '<h2 style="color:var(--due)">Reject Expense #' + esc(expNo) + '</h2>';
    h += '<div class="sub" style="margin-bottom:12px">Provide a mandatory reason for rejecting this voucher. The operator will be informed.</div>';
    h += '<label>Rejection Reason (Required)<textarea id="rej_reason" rows="3" placeholder="e.g. Duplicate bill submitted, unapproved purchase, bill missing..."></textarea></label>';
    h += '<div class="err" id="rej_err"></div>';
    h += '<div class="row" style="margin-top:14px;gap:8px;justify-content:flex-end">';
    h += '<button class="ghost" onclick="closeM()">Cancel</button>';
    h += '<button style="background:var(--due);color:#fff" onclick="executeRejectExpense(' + id + ')">Confirm Rejection</button>';
    h += '</div>';
    h += '</div>';
    openM(h);
  }

  function executeRejectExpense(id) {
    var reason = (document.getElementById("rej_reason") || {}).value;
    if (!reason || !reason.trim()) {
      var eEl = document.getElementById("rej_err");
      if (eEl) eEl.textContent = "Please enter a rejection reason.";
      return;
    }

    api("POST", "/api/expenses/" + id + "/reject", { reason: reason.trim() })
      .then(function (res) {
        toast("✓ " + (res.message || "Expense rejected."));
        closeM();
        loadPendingApprovals(function () {
          loadExpensesOverview(function () {
            renderExpensesTab();
          });
        });
      })
      .catch(function (err) {
        var eEl = document.getElementById("rej_err");
        if (eEl) eEl.textContent = (err && err.error) || "Could not reject.";
      });
  }

  // --------------------------------------------------------------------------
  // SECTION 5: EXPENSE CATEGORIES (Master Setup & Budget)
  // --------------------------------------------------------------------------
  function renderExpenseCategories() {
    var cats = EXP_CATEGORIES || [];
    var h = '';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap">';
    h += '<div>';
    h += '<h2 style="margin:0">🏷️ Expense Categories & Monthly Budgets</h2>';
    h += '<div class="sub">Configure station expense heads, forecourt subcategories, monthly spend limits, and reporting tags.</div>';
    h += '</div>';
    h += '<button onclick="openCategoryModal(null)" style="display:inline-flex;align-items:center;gap:6px">' + EXP_ICONS.plus + ' Add New Category</button>';
    h += '</div>';

    if (!cats.length) {
      h += '<div class="empty">No categories configured. Click "+ Add New Category" to initialize.</div>';
      return h;
    }

    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">';
    cats.forEach(function (c) {
      var subs = [];
      try {
        subs = typeof c.subcategories === "string" ? JSON.parse(c.subcategories) : c.subcategories;
      } catch (_) {}

      h += '<div class="cust" style="cursor:default;margin:0;padding:14px;border-top:3px solid ' + (c.color || '#0A63F8') + '">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
      h += '<b style="font-size:14.5px;color:var(--ink)">' + esc(c.name) + '</b>';
      h += '<div style="display:flex;gap:4px">';
      h += '<button class="ghost" style="padding:2px 7px;font-size:11px" onclick="openCategoryModal(' + c.id + ')">Edit</button>';
      h += '</div>';
      h += '</div>';

      h += '<div style="display:flex;align-items:center;justify-content:space-between;margin:8px 0;padding:6px 8px;background:var(--bg);border-radius:6px">';
      h += '<span class="sub" style="font-size:11.5px">Monthly Budget:</span>';
      h += '<b style="font-size:13px;color:var(--ink)">' + (c.budget_monthly ? formatInr(c.budget_monthly) : 'No limit') + '</b>';
      h += '</div>';

      h += '<div class="sub" style="font-size:11px;font-weight:700;margin-bottom:4px">Subcategories:</div>';
      if (subs && subs.length) {
        h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
        subs.forEach(function (s) {
          h += '<span style="font-size:11px;padding:2px 7px;border-radius:4px;background:var(--bg);border:1px solid var(--line);color:var(--ink)">' + esc(s) + '</span>';
        });
        h += '</div>';
      } else {
        h += '<div class="sub" style="font-size:11.5px">No subcategories defined</div>';
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
    var curBudget = isEdit ? cur.budget_monthly : "";
    var curColor = isEdit ? cur.color : "#0A63F8";
    var curSubsStr = "";
    if (isEdit && cur.subcategories) {
      try {
        var arr = typeof cur.subcategories === "string" ? JSON.parse(cur.subcategories) : cur.subcategories;
        curSubsStr = Array.isArray(arr) ? arr.join(", ") : "";
      } catch (_) {}
    }

    var h = '<div style="max-width:480px">';
    h += '<h2>' + (isEdit ? 'Edit Category' : 'New Expense Category') + '</h2>';
    h += '<div class="sub" style="margin-bottom:12px">Define category details, monthly budget limit, and comma-separated subcategories.</div>';

    h += '<label>Category Name<input id="cat_name" placeholder="e.g. Repairs & Maintenance" value="' + esc(curName) + '"></label>';
    h += '<label>Monthly Spend Budget (₹ INR)<input id="cat_budget" inputmode="decimal" placeholder="e.g. 20000" value="' + esc(curBudget) + '"></label>';
    h += '<label>Subcategories (Comma separated)<input id="cat_subs" placeholder="e.g. Nozzles, Delivery Hose, Paver blocks" value="' + esc(curSubsStr) + '"></label>';
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
  // SECTION 6: EXPENSE REPORTS (Daily, Monthly, Category-wise, Shift-wise)
  // --------------------------------------------------------------------------
  function renderExpenseReports() {
    var rep = EXP_REPORTS_DATA || { daily: [], by_category: [], by_shift: [], by_method: [], totals: {} };
    var tot = rep.totals || {};
    var fromD = rep.from || today().slice(0, 8) + "01";
    var toD = rep.to || today();

    var h = '';

    // Report Header & Date Selector
    h += '<div class="cust noprint" style="cursor:default;margin:0 0 14px;padding:12px 14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">';
    h += '<div>';
    h += '<b style="font-size:14px">📊 Operational Expense Statements & Breakdowns</b>';
    h += '<div class="sub">Audited statement from ' + esc(fromD) + ' to ' + esc(toD) + '</div>';
    h += '</div>';

    h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<label style="margin:0;font-size:12px">From<input type="date" id="rep_from" value="' + esc(fromD) + '" onchange="loadReportRange()"></label>';
    h += '<label style="margin:0;font-size:12px">To<input type="date" id="rep_to" value="' + esc(toD) + '" onchange="loadReportRange()"></label>';
    h += '<button class="ghost" onclick="printExpenseReport()" style="display:inline-flex;align-items:center;gap:6px">' + EXP_ICONS.printer + ' Print Statement</button>';
    h += '</div>';

    h += '</div>';
    h += '</div>';

    // Totals Banner
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">';
    h += '<div class="ops-kpi-card">';
    h += '<div class="ops-kpi-lbl">Total Period Outflow</div>';
    h += '<div class="ops-kpi-num" style="color:var(--ink)">' + formatInr(tot.grand_total) + '</div>';
    h += '</div>';

    h += '<div class="ops-kpi-card">';
    h += '<div class="ops-kpi-lbl">Total Shift Cash Disbursed</div>';
    h += '<div class="ops-kpi-num" style="color:#059669">' + formatInr(tot.cash_total) + '</div>';
    h += '</div>';

    h += '<div class="ops-kpi-card">';
    h += '<div class="ops-kpi-lbl">Operating Days</div>';
    h += '<div class="ops-kpi-num">' + (tot.days_count || 0) + '</div>';
    h += '</div>';
    h += '</div>';

    // Printable Statement Area
    h += '<div id="expenseStatementArea">';

    // 1. Category Breakdown Table
    h += '<h3 style="margin:16px 0 6px">1. Category-Wise Expenditures</h3>';
    var catRows = rep.by_category || [];
    if (!catRows.length) {
      h += '<div class="sub">No category expenses recorded in this period.</div>';
    } else {
      h += '<div class="tbl" style="margin-bottom:16px"><table class="ops-table">';
      h += '<thead><tr><th>Category Head</th><th class="r">Vouchers</th><th class="r">Total Amount</th><th class="r">Monthly Budget</th><th class="r">Budget Utilization</th></tr></thead><tbody>';
      catRows.forEach(function (c) {
        var budgetStr = c.monthly_budget ? formatInr(c.monthly_budget) : "—";
        var utilPct = c.monthly_budget ? Math.round((c.total_amount / c.monthly_budget) * 100) + "%" : "—";
        h += '<tr>';
        h += '<td><b>' + esc(c.category) + '</b></td>';
        h += '<td class="r">' + c.count + '</td>';
        h += '<td class="r" style="font-weight:700">' + formatInr2(c.total_amount) + '</td>';
        h += '<td class="r">' + budgetStr + '</td>';
        h += '<td class="r">' + utilPct + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    // 2. Daily Summary Table
    h += '<h3 style="margin:16px 0 6px">2. Daily Expense Audit Summary</h3>';
    var dailyRows = rep.daily || [];
    if (!dailyRows.length) {
      h += '<div class="sub">No daily records found.</div>';
    } else {
      h += '<div class="tbl" style="margin-bottom:16px"><table class="ops-table">';
      h += '<thead><tr><th>Date</th><th class="r">Total Vouchers</th><th class="r">Cash Outflow</th><th class="r">UPI / Bank / Card</th><th class="r">Daily Total (₹)</th></tr></thead><tbody>';
      dailyRows.forEach(function (dr) {
        var digital = (dr.total_amount - dr.cash_amount);
        h += '<tr>';
        h += '<td><b>' + esc(dr.d) + '</b></td>';
        h += '<td class="r">' + dr.total_count + '</td>';
        h += '<td class="r" style="color:#059669;font-weight:700">' + formatInr2(dr.cash_amount) + '</td>';
        h += '<td class="r">' + formatInr2(digital) + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(dr.total_amount) + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    // 3. Shift Breakdown
    h += '<h3 style="margin:16px 0 6px">3. Shift-Wise Operational Outflow</h3>';
    var shiftRows = rep.by_shift || [];
    if (shiftRows.length) {
      h += '<div class="tbl" style="margin-bottom:16px"><table class="ops-table">';
      h += '<thead><tr><th>Shift</th><th class="r">Vouchers</th><th class="r">Shift Cash Expense</th><th class="r">Total Spent</th></tr></thead><tbody>';
      shiftRows.forEach(function (sr) {
        h += '<tr>';
        h += '<td><b>' + esc(sr.shift) + ' Shift</b></td>';
        h += '<td class="r">' + sr.count + '</td>';
        h += '<td class="r" style="color:#059669">' + formatInr2(sr.cash_amount) + '</td>';
        h += '<td class="r" style="font-weight:800">' + formatInr2(sr.total_amount) + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    h += '</div>'; // end statement area

    return h;
  }

  function loadReportRange() {
    var f = (document.getElementById("rep_from") || {}).value;
    var t = (document.getElementById("rep_to") || {}).value;
    if (f) EXP_FILTER.date_from = f;
    if (t) EXP_FILTER.date_to = t;
    loadExpenseReports();
  }

  function printExpenseReport() {
    window.print();
  }

  // --------------------------------------------------------------------------
  // Expense Details & Audit Trail Modal
  // --------------------------------------------------------------------------
  function viewExpenseDetail(id) {
    api("GET", "/api/expenses/" + id)
      .then(function (res) {
        var e = res.expense;
        var logs = res.audit_logs || [];

        var h = '<div style="max-width:560px">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">';
        h += '<h2 style="margin:0;font-family:monospace;color:#0A63F8">Voucher #' + esc(e.expense_no) + '</h2>';
        h += getStatusPill(e.status);
        h += '</div>';

        // Summary details box
        h += '<div style="background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:14px">';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
        h += '<span style="font-size:13px;font-weight:700;color:var(--mute)">Disbursed Amount</span>';
        h += '<span style="font-size:22px;font-weight:900;color:var(--ink)">' + formatInr2(e.amount) + '</span>';
        h += '</div>';

        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">';
        h += '<div>Date / Shift: <b>' + esc(e.d) + ' (' + esc(e.shift) + ')</b></div>';
        h += '<div>Payment Method: <b>' + esc(e.payment_method) + '</b></div>';
        h += '<div>Category: <b>' + esc(e.category) + '</b></div>';
        h += '<div>Subcategory: <b>' + esc(e.subcategory || '—') + '</b></div>';
        h += '<div>Paid By: <b>' + esc(e.paid_by || '—') + '</b></div>';
        h += '<div>Paid To: <b>' + esc(e.paid_to || '—') + '</b></div>';
        h += '<div>Shift Cash Deducted: <b>' + (e.is_shift_cash ? '✓ Yes' : 'No') + '</b></div>';
        h += '<div>Ref / UTR: <b>' + esc(e.payment_ref || '—') + '</b></div>';
        h += '</div>';

        h += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:12.5px">';
        h += '<b>Description:</b><div style="margin-top:2px;color:var(--ink)">' + esc(e.description) + '</div>';
        if (e.remarks) {
          h += '<div style="margin-top:6px;color:var(--mute)"><b>Remarks:</b> ' + esc(e.remarks) + '</div>';
        }
        if (e.rejection_reason) {
          h += '<div style="margin-top:6px;color:var(--due);background:rgba(225,29,72,0.08);padding:6px 8px;border-radius:6px"><b>Rejection Reason:</b> ' + esc(e.rejection_reason) + '</div>';
        }
        h += '</div>';

        if (e.receipt_url) {
          h += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line)">';
          h += '<b>Attached Receipt:</b> ';
          h += '<a href="' + esc(e.receipt_url) + '" target="_blank" style="color:#0A63F8;font-weight:700">📎 ' + esc(e.receipt_name || 'View Bill Receipt') + '</a>';
          h += '</div>';
        }

        h += '</div>';

        // Audit Trail history
        h += '<div style="margin-bottom:12px">';
        h += '<b style="font-size:13px;display:block;margin-bottom:6px">🛡️ Audit & Approval History</b>';
        if (!logs.length) {
          h += '<div class="sub" style="font-size:11.5px">No audit events recorded.</div>';
        } else {
          h += '<div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;padding-right:4px">';
          logs.forEach(function (l) {
            h += '<div style="font-size:11.5px;padding:6px 8px;border-radius:6px;background:var(--bg);border:1px solid var(--line)">';
            h += '<div style="display:flex;justify-content:space-between">';
            h += '<b>' + esc(l.action) + ' by ' + esc(l.actor_name) + ' (' + esc(l.actor_role) + ')</b>';
            h += '<span class="sub">' + formatDateTime(l.timestamp) + '</span>';
            h += '</div>';
            h += '<div style="margin-top:2px;color:var(--mute)">' + esc(l.details) + '</div>';
            h += '</div>';
          });
          h += '</div>';
        }
        h += '</div>';

        // Buttons
        h += '<div class="row" style="gap:8px;justify-content:flex-end">';
        if (e.status === "pending_approval" && ME && (ME.role === "manager" || ME.role === "owner" || ME.role === "admin")) {
          h += '<button style="background:var(--ok);color:#fff;padding:6px 12px;font-size:12px" onclick="closeM();approveExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\',' + e.amount + ')">Approve</button>';
          h += '<button style="color:var(--due);padding:6px 12px;font-size:12px" class="ghost" onclick="closeM();rejectExpensePrompt(' + e.id + ',\'' + esc(e.expense_no) + '\')">Reject</button>';
        }
        h += '<button class="ghost" onclick="closeM()">Close</button>';
        h += '</div>';

        h += '</div>';
        openM(h);
      })
      .catch(function (err) {
        toast((err && err.error) || "Could not load expense details.");
      });
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

  // PDF Export helper
  function exportRegisterPdf() {
    window.print();
  }

  // --------------------------------------------------------------------------
  // Global Exports for window / router
  // --------------------------------------------------------------------------
  window.renderExpensesTab = renderExpensesTab;
  window.setExpenseSubtab = setExpenseSubtab;
  window.openAddExpenseModal = openAddExpenseModal;
  window.openEditExpenseModal = openEditExpenseModal;
  window.submitExpenseForm = submitExpenseForm;
  window.onPaymentMethodChange = onPaymentMethodChange;
  window.onCategorySelectChange = onCategorySelectChange;
  window.handleReceiptFileSelect = handleReceiptFileSelect;
  window.viewExpenseDetail = viewExpenseDetail;
  window.approveExpensePrompt = approveExpensePrompt;
  window.executeApproveExpense = executeApproveExpense;
  window.rejectExpensePrompt = rejectExpensePrompt;
  window.executeRejectExpense = executeRejectExpense;
  window.openCategoryModal = openCategoryModal;
  window.saveCategory = saveCategory;
  window.applyExpenseFilters = applyExpenseFilters;
  window.resetExpenseFilters = resetExpenseFilters;
  window.loadReportRange = loadReportRange;
  window.printExpenseReport = printExpenseReport;
  window.exportRegisterPdf = exportRegisterPdf;

})();
