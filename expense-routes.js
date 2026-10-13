// ============================================================================
// EXPENSE MANAGEMENT MODULE: Backend API Router
// Role-based permissions: Operator (worker), Manager, Owner / Admin
// Shift cash reconciliation integration & audit logging
// ============================================================================

const fs = require("fs");
const path = require("path");

function registerExpenseRoutes(app, dbOrGetDb, need, now, r2, num, getStationId, bizDate) {
  const getDb = typeof dbOrGetDb === "function" ? dbOrGetDb : () => dbOrGetDb;

  // Helper to ensure expenses directory for uploads exists
  const uploadsDir = path.join(__dirname, "public", "uploads", "expenses");
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (_) {}

  // Helper to log audit trail entries
  function logAudit(expenseId, expenseNo, action, user, details) {
    try {
      getDb().prepare(`
        INSERT INTO expense_audit_logs (expense_id, expense_no, action, actor_id, actor_name, actor_role, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(expenseId, expenseNo, action, user.id, user.name || "User", user.role || "staff", details, now());
    } catch (e) {
      console.warn("[Expense Audit] Failed to log:", e.message);
    }
  }

  // Generate next sequential expense number: EXP-YYYYMM-XXXX
  function nextExpenseNo(stationId) {
    const curMonthStr = new Date().toISOString().slice(0, 7).replace("-", ""); // e.g. 202610
    const prefix = `EXP-${curMonthStr}-`;
    try {
      const row = getDb().prepare(`
        SELECT expense_no FROM station_expenses 
        WHERE expense_no LIKE ? AND station_id=? 
        ORDER BY id DESC LIMIT 1
      `).get(`${prefix}%`, stationId);
      if (row && row.expense_no) {
        const parts = row.expense_no.split("-");
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
        }
      }
    } catch (_) {}
    return `${prefix}001`;
  }

  // --------------------------------------------------------------------------
  // 1. GET /api/expenses/overview
  // Returns summary KPIs, breakdown, pending approvals count, and recent list
  // --------------------------------------------------------------------------
  app.get("/api/expenses/overview", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const todayStr = (bizDate ? bizDate() : new Date().toISOString().slice(0, 10));
    const curMonthStr = todayStr.slice(0, 7); // YYYY-MM
    const userRole = q.user ? q.user.role : "worker";
    const userId = q.user ? q.user.id : 0;

    try {
      // Today's total (approved or paid)
      const todayTotal = getDb().prepare(`
        SELECT COALESCE(SUM(amount), 0) as tot, COUNT(*) as cnt
        FROM station_expenses
        WHERE station_id=? AND d=? AND status IN ('approved', 'paid')
      `).get(stationId, todayStr);

      // Pending approvals (all or user-specific count)
      const pendingRow = getDb().prepare(`
        SELECT COALESCE(SUM(amount), 0) as tot, COUNT(*) as cnt
        FROM station_expenses
        WHERE station_id=? AND status='pending_approval'
      `).get(stationId);

      // Approved (all approved + paid)
      const approvedRow = getDb().prepare(`
        SELECT COALESCE(SUM(amount), 0) as tot, COUNT(*) as cnt
        FROM station_expenses
        WHERE station_id=? AND status IN ('approved', 'paid')
      `).get(stationId);

      // Cash expenses (physical shift cash outflow)
      const cashRow = getDb().prepare(`
        SELECT COALESCE(SUM(amount), 0) as tot, COUNT(*) as cnt
        FROM station_expenses
        WHERE station_id=? AND payment_method='Cash' AND status IN ('approved', 'paid')
      `).get(stationId);

      // Monthly total
      const monthRow = getDb().prepare(`
        SELECT COALESCE(SUM(amount), 0) as tot, COUNT(*) as cnt
        FROM station_expenses
        WHERE station_id=? AND d LIKE ? AND status IN ('approved', 'paid')
      `).get(stationId, `${curMonthStr}%`);

      // Category breakdown (current month)
      const catBreakdown = getDb().prepare(`
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM station_expenses
        WHERE station_id=? AND d LIKE ? AND status IN ('approved', 'paid')
        GROUP BY category
        ORDER BY total DESC
      `).all(stationId, `${curMonthStr}%`);

      // Shift-wise totals (today)
      const shiftTotals = getDb().prepare(`
        SELECT shift, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM station_expenses
        WHERE station_id=? AND d=? AND status IN ('approved', 'paid')
        GROUP BY shift
        ORDER BY total DESC
      `).all(stationId, todayStr);

      // Payment method breakdown (current month)
      const methodBreakdown = getDb().prepare(`
        SELECT payment_method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM station_expenses
        WHERE station_id=? AND d LIKE ? AND status IN ('approved', 'paid')
        GROUP BY payment_method
      `).all(stationId, `${curMonthStr}%`);

      // Recent expenses
      let recentSql = `
        SELECT * FROM station_expenses
        WHERE station_id=?
      `;
      const params = [stationId];
      if (userRole === "worker") {
        recentSql += " AND created_by=? ";
        params.push(userId);
      }
      recentSql += " ORDER BY id DESC LIMIT 15";
      const recent = getDb().prepare(recentSql).all(...params);

      // Active categories with budget
      const categories = getDb().prepare(`
        SELECT * FROM expense_categories WHERE is_active=1 ORDER BY name ASC
      `).all();

      s.json({
        ok: true,
        today: todayStr,
        month: curMonthStr,
        kpi: {
          today_total: r2(todayTotal.tot || 0),
          today_count: todayTotal.cnt || 0,
          pending_count: pendingRow.cnt || 0,
          pending_total: r2(pendingRow.tot || 0),
          approved_total: r2(approvedRow.tot || 0),
          approved_count: approvedRow.cnt || 0,
          cash_total: r2(cashRow.tot || 0),
          cash_count: cashRow.cnt || 0,
          month_total: r2(monthRow.tot || 0),
          month_count: monthRow.cnt || 0
        },
        category_breakdown: catBreakdown.map(c => ({ ...c, total: r2(c.total) })),
        shift_totals: shiftTotals.map(st => ({ ...st, total: r2(st.total) })),
        payment_methods: methodBreakdown.map(pm => ({ ...pm, total: r2(pm.total) })),
        recent,
        categories
      });
    } catch (err) {
      console.error("[Expenses Overview] Error:", err);
      s.status(500).json({ error: "Could not load expense overview: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 2. GET /api/expenses
  // Full searchable, filterable expense register
  // --------------------------------------------------------------------------
  app.get("/api/expenses", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const { d, date_from, date_to, category, shift, payment_method, status, created_by, search } = q.query || {};
    const userRole = q.user ? q.user.role : "worker";
    const userId = q.user ? q.user.id : 0;

    try {
      let sql = "SELECT * FROM station_expenses WHERE station_id=? ";
      const params = [stationId];

      // Operators/workers can only view records permitted to them (their own + approved station expenses for transparency)
      if (userRole === "worker") {
        if (q.query.my_only === "1") {
          sql += " AND created_by=? ";
          params.push(userId);
        } else {
          sql += " AND (created_by=? OR status IN ('approved', 'paid')) ";
          params.push(userId);
        }
      }

      if (d) {
        sql += " AND d=? ";
        params.push(d);
      }
      if (date_from) {
        sql += " AND d>=? ";
        params.push(date_from);
      }
      if (date_to) {
        sql += " AND d<=? ";
        params.push(date_to);
      }
      if (category && category !== "all") {
        sql += " AND category=? ";
        params.push(category);
      }
      if (shift && shift !== "all") {
        sql += " AND shift=? ";
        params.push(shift);
      }
      if (payment_method && payment_method !== "all") {
        sql += " AND payment_method=? ";
        params.push(payment_method);
      }
      if (status && status !== "all") {
        sql += " AND status=? ";
        params.push(status);
      }
      if (created_by) {
        sql += " AND created_by=? ";
        params.push(parseInt(created_by, 10));
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        sql += " AND (expense_no LIKE ? OR description LIKE ? OR paid_to LIKE ? OR paid_by LIKE ? OR remarks LIKE ? OR category LIKE ?) ";
        params.push(term, term, term, term, term, term);
      }

      sql += " ORDER BY id DESC LIMIT 500";
      const rows = getDb().prepare(sql).all(...params);

      // Compute aggregate totals for current filter
      let filterTotal = 0;
      let filterCash = 0;
      let filterApproved = 0;
      rows.forEach(r => {
        filterTotal += r.amount || 0;
        if (r.payment_method === "Cash") filterCash += r.amount || 0;
        if (r.status === "approved" || r.status === "paid") filterApproved += r.amount || 0;
      });

      s.json({
        ok: true,
        expenses: rows,
        summary: {
          count: rows.length,
          total: r2(filterTotal),
          cash_total: r2(filterCash),
          approved_total: r2(filterApproved)
        }
      });
    } catch (err) {
      console.error("[Expenses Register] Error:", err);
      s.status(500).json({ error: "Could not load expense register: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 3. GET /api/expenses/pending
  // Expenses waiting for manager/owner review & approval
  // --------------------------------------------------------------------------
  app.get("/api/expenses/pending", need("owner", "manager", "admin"), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    try {
      const rows = getDb().prepare(`
        SELECT * FROM station_expenses
        WHERE station_id=? AND status='pending_approval'
        ORDER BY id ASC
      `).all(stationId);
      s.json({ ok: true, pending: rows });
    } catch (err) {
      s.status(500).json({ error: "Could not load pending expenses: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 3b. GET /api/expenses/reports
  // Full Vyapar Reports Suite (7 Reports + Summary Totals)
  // --------------------------------------------------------------------------
  app.get("/api/expenses/reports", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const { type, from, to } = q.query || {};
    const dFrom = (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) ? from : (bizDate ? bizDate().slice(0, 7) + "-01" : "2026-10-01");
    const dTo = (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) ? to : (bizDate ? bizDate() : "2026-10-31");

    try {
      // 1. Daily breakdown report
      const dailyRows = getDb().prepare(`
        SELECT d,
               COUNT(*) as total_count,
               COALESCE(SUM(amount), 0) as total_amount,
               COALESCE(SUM(CASE WHEN payment_method='Cash' THEN amount ELSE 0 END), 0) as cash_amount,
               COALESCE(SUM(CASE WHEN payment_method='UPI' THEN amount ELSE 0 END), 0) as upi_amount,
               COALESCE(SUM(CASE WHEN payment_method='Bank' THEN amount ELSE 0 END), 0) as bank_amount,
               COALESCE(SUM(CASE WHEN payment_method='Card' THEN amount ELSE 0 END), 0) as card_amount,
               COALESCE(SUM(CASE WHEN status='approved' OR status='paid' THEN amount ELSE 0 END), 0) as approved_amount,
               COALESCE(SUM(CASE WHEN status='pending_approval' THEN amount ELSE 0 END), 0) as pending_amount
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=?
        GROUP BY d
        ORDER BY d DESC
      `).all(stationId, dFrom, dTo);

      // 2. Category-wise breakdown report with monthly budget comparison & direct/indirect type
      const categoryRows = getDb().prepare(`
        SELECT e.category,
               COALESCE(c.expense_type, e.expense_type, 'Direct') as expense_type,
               COUNT(e.id) as count,
               COALESCE(SUM(e.amount), 0) as total_amount,
               COALESCE(c.budget_monthly, 0) as monthly_budget,
               c.color,
               c.icon
        FROM station_expenses e
        LEFT JOIN expense_categories c ON c.name = e.category
        WHERE e.station_id=? AND e.d>=? AND e.d<=? AND e.status IN ('approved', 'paid')
        GROUP BY e.category
        ORDER BY total_amount DESC
      `).all(stationId, dFrom, dTo);

      // 3. Shift-wise report
      const shiftRows = getDb().prepare(`
        SELECT shift,
               COUNT(*) as count,
               COALESCE(SUM(amount), 0) as total_amount,
               COALESCE(SUM(CASE WHEN payment_method='Cash' THEN amount ELSE 0 END), 0) as cash_amount
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=? AND status IN ('approved', 'paid')
        GROUP BY shift
        ORDER BY total_amount DESC
      `).all(stationId, dFrom, dTo);

      // 4. Payment method breakdown
      const methodRows = getDb().prepare(`
        SELECT payment_method,
               COUNT(*) as count,
               COALESCE(SUM(amount), 0) as total_amount
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=? AND status IN ('approved', 'paid')
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `).all(stationId, dFrom, dTo);

      // 5. Item / Subcategory-wise breakdown (Vyapar granular item expense report)
      const itemRows = getDb().prepare(`
        SELECT e.category,
               CASE WHEN e.subcategory IS NOT NULL AND e.subcategory != '' THEN e.subcategory ELSE 'General / Unspecified' END as item_name,
               COUNT(*) as count,
               COALESCE(SUM(e.amount), 0) as total_amount
        FROM station_expenses e
        WHERE e.station_id=? AND e.d>=? AND e.d<=? AND e.status IN ('approved', 'paid')
        GROUP BY e.category, item_name
        ORDER BY total_amount DESC
      `).all(stationId, dFrom, dTo);

      // 6. Party / Vendor-wise expense report (Vyapar payee ledger)
      const partyRows = getDb().prepare(`
        SELECT CASE WHEN paid_to IS NOT NULL AND TRIM(paid_to) != '' THEN TRIM(paid_to) ELSE 'Cash Counter / Petty Vendor' END as party_name,
               COUNT(*) as count,
               COALESCE(SUM(amount), 0) as total_amount,
               MAX(d) as last_date,
               GROUP_CONCAT(DISTINCT payment_method) as payment_methods
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=? AND status IN ('approved', 'paid')
        GROUP BY party_name
        ORDER BY total_amount DESC
      `).all(stationId, dFrom, dTo);

      // 7. Direct vs Indirect expense analysis (Vyapar gross margin impact)
      const typeRows = getDb().prepare(`
        SELECT COALESCE(expense_type, 'Direct') as expense_type,
               COUNT(*) as count,
               COALESCE(SUM(amount), 0) as total_amount
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=? AND status IN ('approved', 'paid')
        GROUP BY expense_type
      `).all(stationId, dFrom, dTo);

      // 8. GST / Tax Expense Report (Input Tax Credit / ITC claiming for GSTR-3B)
      const taxRows = getDb().prepare(`
        SELECT id, expense_no, d, category, subcategory, paid_to, gstin, invoice_no, invoice_date,
               amount, taxable_amount, tax_rate, tax_amount, payment_method, status
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=? AND status IN ('approved', 'paid')
          AND (tax_amount > 0 OR tax_rate > 0 OR (gstin IS NOT NULL AND gstin != ''))
        ORDER BY d DESC, id DESC
      `).all(stationId, dFrom, dTo);

      // 9. All Transactions detailed ledger for the report period
      const allTxRows = getDb().prepare(`
        SELECT id, expense_no, d, shift, category, subcategory, amount, payment_method, is_shift_cash,
               paid_by, paid_to, description, status, expense_type, tax_rate, taxable_amount,
               tax_amount, gstin, invoice_no, invoice_date, payment_status, payment_ref, created_at
        FROM station_expenses
        WHERE station_id=? AND d>=? AND d<=?
        ORDER BY d DESC, id DESC
        LIMIT 1000
      `).all(stationId, dFrom, dTo);

      // Overall aggregates
      let grandTotal = 0;
      let grandCash = 0;
      let grandDigital = 0;
      let grandDirect = 0;
      let grandIndirect = 0;
      let grandTax = 0;
      let grandTaxable = 0;
      let vouchersCount = 0;

      allTxRows.forEach(r => {
        if (r.status === "approved" || r.status === "paid") {
          grandTotal += r.amount || 0;
          if (r.payment_method === "Cash") grandCash += r.amount || 0;
          else grandDigital += r.amount || 0;

          if (r.expense_type === "Indirect") grandIndirect += r.amount || 0;
          else grandDirect += r.amount || 0;

          grandTax += r.tax_amount || 0;
          grandTaxable += r.taxable_amount || (r.amount || 0);
          vouchersCount++;
        }
      });

      s.json({
        ok: true,
        from: dFrom,
        to: dTo,
        totals: {
          grand_total: r2(grandTotal),
          cash_total: r2(grandCash),
          digital_total: r2(grandDigital),
          direct_total: r2(grandDirect),
          indirect_total: r2(grandIndirect),
          tax_total: r2(grandTax),
          taxable_total: r2(grandTaxable),
          days_count: dailyRows.length,
          vouchers_count: vouchersCount
        },
        daily: dailyRows.map(r => ({ ...r, total_amount: r2(r.total_amount), cash_amount: r2(r.cash_amount) })),
        by_category: categoryRows.map(r => ({ ...r, total_amount: r2(r.total_amount) })),
        by_shift: shiftRows.map(r => ({ ...r, total_amount: r2(r.total_amount), cash_amount: r2(r.cash_amount) })),
        by_method: methodRows.map(r => ({ ...r, total_amount: r2(r.total_amount) })),
        by_item: itemRows.map(r => ({ ...r, total_amount: r2(r.total_amount) })),
        by_party: partyRows.map(r => ({ ...r, total_amount: r2(r.total_amount) })),
        by_type: typeRows.map(r => ({ ...r, total_amount: r2(r.total_amount) })),
        by_tax: taxRows.map(r => ({ ...r, amount: r2(r.amount), taxable_amount: r2(r.taxable_amount || 0), tax_amount: r2(r.tax_amount || 0) })),
        all_transactions: allTxRows
      });
    } catch (err) {
      console.error("[Expense Reports] Error:", err);
      s.status(500).json({ error: "Could not generate expense reports: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 4. GET /api/expenses/:id
  // Single expense detail with audit history
  // --------------------------------------------------------------------------
  app.get("/api/expenses/:id(\\d+)", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);
    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense not found." });

      // Worker permission check
      if (q.user.role === "worker" && exp.created_by !== q.user.id && exp.status === "pending_approval") {
        return s.status(403).json({ error: "Access denied." });
      }

      const logs = getDb().prepare(`
        SELECT * FROM expense_audit_logs 
        WHERE expense_id=? 
        ORDER BY timestamp DESC, id DESC
      `).all(expId);

      s.json({ ok: true, expense: exp, audit_logs: logs });
    } catch (err) {
      s.status(500).json({ error: "Could not load expense detail: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 5. POST /api/expenses
  // Create a new expense record (Operator/Worker, Manager, Owner, Admin)
  // --------------------------------------------------------------------------
  app.post("/api/expenses", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const b = q.body || {};
    const amt = num(b.amount);

    if (isNaN(amt) || amt <= 0) {
      return s.status(400).json({ error: "Please enter a valid expense amount greater than 0." });
    }
    if (!b.category || !String(b.category).trim()) {
      return s.status(400).json({ error: "Please choose an expense category." });
    }
    if (!b.description || !String(b.description).trim()) {
      return s.status(400).json({ error: "Please provide a description for the expense." });
    }

    const dVal = (b.d && /^\d{4}-\d{2}-\d{2}$/.test(b.d)) ? b.d : (bizDate ? bizDate() : new Date().toISOString().slice(0, 10));
    const shiftVal = String(b.shift || "Morning").trim();
    const categoryVal = String(b.category).trim();
    const subcategoryVal = String(b.subcategory || "").trim();
    const payMethodVal = ["Cash", "UPI", "Bank", "Card", "Other"].includes(b.payment_method) ? b.payment_method : "Cash";
    const isShiftCashVal = (payMethodVal === "Cash" && b.is_shift_cash !== 0 && b.is_shift_cash !== false) ? 1 : 0;
    const paidByVal = String(b.paid_by || q.user.name || "").trim();
    const paidToVal = String(b.paid_to || "").trim();
    const descVal = String(b.description).trim();
    const remarksVal = String(b.remarks || "").trim();
    const receiptUrlVal = String(b.receipt_url || "").trim();
    const receiptNameVal = String(b.receipt_name || "").trim();
    const paymentRefVal = String(b.payment_ref || "").trim();
    const dutyIdVal = b.duty_id ? parseInt(b.duty_id, 10) : null;
    const expenseTypeVal = b.expense_type === "Indirect" ? "Indirect" : "Direct";
    const taxRateVal = num(b.tax_rate) || 0;
    const taxableAmtVal = num(b.taxable_amount) || (taxRateVal > 0 ? r2(amt / (1 + taxRateVal / 100)) : amt);
    const taxAmtVal = num(b.tax_amount) || (taxRateVal > 0 ? r2(amt - taxableAmtVal) : 0);
    const gstinVal = String(b.gstin || "").trim().toUpperCase();
    const invoiceNoVal = String(b.invoice_no || "").trim();
    const invoiceDateVal = String(b.invoice_date || "").trim();
    const payStatusVal = b.payment_status === "unpaid" ? "unpaid" : "paid";

    // Status: if created by Manager or Owner, they can choose to auto-approve directly,
    // otherwise default to 'pending_approval' for Operator/worker
    let initialStatus = "pending_approval";
    let approvedBy = null;
    let approvedByName = null;
    let approvedAt = null;

    if (q.user.role === "owner" || q.user.role === "admin" || (q.user.role === "manager" && b.auto_approve)) {
      initialStatus = b.status === "paid" ? "paid" : "approved";
      approvedBy = q.user.id;
      approvedByName = q.user.name;
      approvedAt = now();
    }

    const expNo = nextExpenseNo(stationId);
    const createdAt = now();

    try {
      const stmt = getDb().prepare(`
        INSERT INTO station_expenses (
          station_id, expense_no, d, shift, duty_id, category, subcategory,
          amount, payment_method, is_shift_cash, paid_by, paid_to,
          description, remarks, receipt_url, receipt_name, status,
          created_by, created_by_name, approved_by, approved_by_name, approved_at,
          rejection_reason, payment_ref, expense_type, tax_rate, taxable_amount,
          tax_amount, gstin, invoice_no, invoice_date, payment_status,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          NULL, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?
        )
      `);

      const info = stmt.run(
        stationId, expNo, dVal, shiftVal, dutyIdVal, categoryVal, subcategoryVal,
        r2(amt), payMethodVal, isShiftCashVal, paidByVal, paidToVal,
        descVal, remarksVal, receiptUrlVal, receiptNameVal, initialStatus,
        q.user.id, q.user.name || "Operator", approvedBy, approvedByName, approvedAt,
        paymentRefVal, expenseTypeVal, taxRateVal, r2(taxableAmtVal),
        r2(taxAmtVal), gstinVal, invoiceNoVal, invoiceDateVal, payStatusVal,
        createdAt, createdAt
      );

      const expId = info.lastInsertRowid;

      // Audit Log
      logAudit(
        expId,
        expNo,
        "CREATE",
        q.user,
        `Expense record ${expNo} created for INR ${amt} (${categoryVal}) via ${payMethodVal}. Status: ${initialStatus}`
      );

      if (approvedBy) {
        logAudit(
          expId,
          expNo,
          "APPROVE",
          q.user,
          `Expense ${expNo} auto-approved at creation by ${q.user.name} (${q.user.role})`
        );
      }

      s.json({
        ok: true,
        id: expId,
        expense_no: expNo,
        status: initialStatus,
        message: `Expense ${expNo} recorded successfully.`
      });
    } catch (err) {
      console.error("[Create Expense] Error:", err);
      s.status(500).json({ error: "Could not record expense: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 6. PUT /api/expenses/:id
  // Edit permitted draft / pending expenses (Operators can edit own pending; Manager/Owner can edit)
  // Approved records must not be silently changed
  // --------------------------------------------------------------------------
  app.put("/api/expenses/:id", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);
    const b = q.body || {};

    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense not found." });

      // Check modification permissions:
      // Approved or Paid records cannot be silently changed
      if (exp.status === "approved" || exp.status === "paid") {
        // Only owner/admin can amend approved records, and it creates a prominent audit log
        if (q.user.role !== "owner" && q.user.role !== "admin") {
          return s.status(403).json({
            error: "This expense has already been approved/paid and cannot be modified by staff. Contact Owner."
          });
        }
      } else if (q.user.role === "worker" && exp.created_by !== q.user.id) {
        return s.status(403).json({ error: "You can only modify expenses submitted by yourself." });
      }

      const amt = (b.amount !== undefined) ? num(b.amount) : exp.amount;
      if (isNaN(amt) || amt <= 0) {
        return s.status(400).json({ error: "Invalid amount." });
      }

      const dVal = b.d || exp.d;
      const shiftVal = b.shift || exp.shift;
      const categoryVal = b.category || exp.category;
      const subcategoryVal = b.subcategory !== undefined ? b.subcategory : exp.subcategory;
      const payMethodVal = b.payment_method || exp.payment_method;
      const isShiftCashVal = (payMethodVal === "Cash" && b.is_shift_cash !== 0 && b.is_shift_cash !== false) ? 1 : 0;
      const paidByVal = b.paid_by !== undefined ? b.paid_by : exp.paid_by;
      const paidToVal = b.paid_to !== undefined ? b.paid_to : exp.paid_to;
      const descVal = b.description !== undefined ? b.description : exp.description;
      const remarksVal = b.remarks !== undefined ? b.remarks : exp.remarks;
      const receiptUrlVal = b.receipt_url !== undefined ? b.receipt_url : exp.receipt_url;
      const receiptNameVal = b.receipt_name !== undefined ? b.receipt_name : exp.receipt_name;
      const paymentRefVal = b.payment_ref !== undefined ? b.payment_ref : exp.payment_ref;
      const expenseTypeVal = b.expense_type !== undefined ? (b.expense_type === "Indirect" ? "Indirect" : "Direct") : (exp.expense_type || "Direct");
      const taxRateVal = b.tax_rate !== undefined ? (num(b.tax_rate) || 0) : (exp.tax_rate || 0);
      const taxableAmtVal = b.taxable_amount !== undefined ? (num(b.taxable_amount) || 0) : (exp.taxable_amount || amt);
      const taxAmtVal = b.tax_amount !== undefined ? (num(b.tax_amount) || 0) : (exp.tax_amount || 0);
      const gstinVal = b.gstin !== undefined ? String(b.gstin).trim().toUpperCase() : (exp.gstin || "");
      const invoiceNoVal = b.invoice_no !== undefined ? String(b.invoice_no).trim() : (exp.invoice_no || "");
      const invoiceDateVal = b.invoice_date !== undefined ? String(b.invoice_date).trim() : (exp.invoice_date || "");
      const payStatusVal = b.payment_status !== undefined ? (b.payment_status === "unpaid" ? "unpaid" : "paid") : (exp.payment_status || "paid");

      getDb().prepare(`
        UPDATE station_expenses SET
          d=?, shift=?, category=?, subcategory=?, amount=?, payment_method=?, is_shift_cash=?,
          paid_by=?, paid_to=?, description=?, remarks=?, receipt_url=?, receipt_name=?,
          payment_ref=?, expense_type=?, tax_rate=?, taxable_amount=?, tax_amount=?,
          gstin=?, invoice_no=?, invoice_date=?, payment_status=?, updated_at=?
        WHERE id=? AND station_id=?
      `).run(
        dVal, shiftVal, categoryVal, subcategoryVal, r2(amt), payMethodVal, isShiftCashVal,
        paidByVal, paidToVal, descVal, remarksVal, receiptUrlVal, receiptNameVal,
        paymentRefVal, expenseTypeVal, taxRateVal, r2(taxableAmtVal), r2(taxAmtVal),
        gstinVal, invoiceNoVal, invoiceDateVal, payStatusVal, now(), expId, stationId
      );

      logAudit(
        expId,
        exp.expense_no,
        "EDIT",
        q.user,
        `Expense updated by ${q.user.name} (${q.user.role}). Amount: INR ${amt}, Cat: ${categoryVal}`
      );

      s.json({ ok: true, message: `Expense ${exp.expense_no} updated successfully.` });
    } catch (err) {
      console.error("[Update Expense] Error:", err);
      s.status(500).json({ error: "Could not update expense: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 7. POST /api/expenses/:id/approve
  // Manager or Owner reviews & approves expense
  // --------------------------------------------------------------------------
  app.post("/api/expenses/:id/approve", need("owner", "manager", "admin"), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);
    const { remarks } = q.body || {};

    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense record not found." });
      if (exp.status === "approved" || exp.status === "paid") {
        return s.status(409).json({ error: `Expense is already ${exp.status}.` });
      }

      const approveTime = now();
      const updatedRemarks = remarks ? (exp.remarks ? `${exp.remarks} · [Approval Note: ${remarks}]` : remarks) : exp.remarks;

      getDb().prepare(`
        UPDATE station_expenses SET
          status='approved',
          approved_by=?,
          approved_by_name=?,
          approved_at=?,
          rejection_reason=NULL,
          remarks=?,
          updated_at=?
        WHERE id=? AND station_id=?
      `).run(q.user.id, q.user.name || "Manager", approveTime, updatedRemarks, approveTime, expId, stationId);

      logAudit(
        expId,
        exp.expense_no,
        "APPROVE",
        q.user,
        `Expense approved for INR ${exp.amount} by ${q.user.name} (${q.user.role}). ${remarks ? 'Note: ' + remarks : ''}`
      );

      s.json({ ok: true, message: `Expense ${exp.expense_no} approved successfully.` });
    } catch (err) {
      console.error("[Approve Expense] Error:", err);
      s.status(500).json({ error: "Could not approve expense: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 8. POST /api/expenses/:id/reject
  // Manager or Owner rejects expense with mandatory reason
  // --------------------------------------------------------------------------
  app.post("/api/expenses/:id/reject", need("owner", "manager", "admin"), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);
    const { reason } = q.body || {};

    if (!reason || !String(reason).trim()) {
      return s.status(400).json({ error: "A rejection reason is mandatory." });
    }

    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense record not found." });
      if (exp.status === "approved" || exp.status === "paid") {
        if (q.user.role !== "owner" && q.user.role !== "admin") {
          return s.status(403).json({ error: "Only Owner can revoke/reject an already approved expense." });
        }
      }

      const updateTime = now();
      const reasonClean = String(reason).trim();

      getDb().prepare(`
        UPDATE station_expenses SET
          status='rejected',
          rejection_reason=?,
          updated_at=?
        WHERE id=? AND station_id=?
      `).run(reasonClean, updateTime, expId, stationId);

      logAudit(
        expId,
        exp.expense_no,
        "REJECT",
        q.user,
        `Expense rejected by ${q.user.name} (${q.user.role}). Reason: ${reasonClean}`
      );

      s.json({ ok: true, message: `Expense ${exp.expense_no} rejected.` });
    } catch (err) {
      console.error("[Reject Expense] Error:", err);
      s.status(500).json({ error: "Could not reject expense: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 9. POST /api/expenses/:id/mark-paid
  // Mark approved expense as actually disbursed/paid
  // --------------------------------------------------------------------------
  app.post("/api/expenses/:id/mark-paid", need("owner", "manager", "admin"), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);
    const { payment_ref, payment_method } = q.body || {};

    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense record not found." });

      const pRef = payment_ref ? String(payment_ref).trim() : exp.payment_ref;
      const pMethod = payment_method || exp.payment_method;

      getDb().prepare(`
        UPDATE station_expenses SET
          status='paid',
          payment_ref=?,
          payment_method=?,
          updated_at=?
        WHERE id=? AND station_id=?
      `).run(pRef, pMethod, now(), expId, stationId);

      logAudit(
        expId,
        exp.expense_no,
        "PAY",
        q.user,
        `Expense marked as paid/disbursed by ${q.user.name}. Ref: ${pRef || 'N/A'}`
      );

      s.json({ ok: true, message: `Expense ${exp.expense_no} marked as paid.` });
    } catch (err) {
      s.status(500).json({ error: "Could not update payment status: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 10. DELETE /api/expenses/:id
  // Delete draft/pending or rejected expenses.
  // Approved records must not be silently changed or deleted!
  // --------------------------------------------------------------------------
  app.delete("/api/expenses/:id", need(), (q, s) => {
    const stationId = getStationId ? getStationId(q) : 1;
    const expId = parseInt(q.params.id, 10);

    try {
      const exp = getDb().prepare("SELECT * FROM station_expenses WHERE id=? AND station_id=?").get(expId, stationId);
      if (!exp) return s.status(404).json({ error: "Expense not found." });

      // Protection: Approved or paid records cannot be deleted
      if (exp.status === "approved" || exp.status === "paid") {
        return s.status(403).json({
          error: "Approved or paid expenses cannot be deleted. Reject or archive the record instead to preserve audit history."
        });
      }

      if (q.user.role === "worker" && exp.created_by !== q.user.id) {
        return s.status(403).json({ error: "Permission denied." });
      }

      logAudit(
        expId,
        exp.expense_no,
        "DELETE",
        q.user,
        `Unapproved expense record ${exp.expense_no} deleted by ${q.user.name} (${q.user.role})`
      );

      getDb().prepare("DELETE FROM station_expenses WHERE id=? AND station_id=?").run(expId, stationId);

      s.json({ ok: true, message: `Expense ${exp.expense_no} deleted.` });
    } catch (err) {
      s.status(500).json({ error: "Could not delete expense: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 11. CATEGORIES MANAGEMENT: GET, POST, PUT, DELETE
  // --------------------------------------------------------------------------
  app.get("/api/expense-categories", need(), (q, s) => {
    try {
      const rows = getDb().prepare(`
        SELECT c.*, 
               (SELECT COUNT(*) FROM station_expenses e WHERE e.category=c.name AND e.status IN ('approved','paid')) as usage_count,
               (SELECT COALESCE(SUM(amount), 0) FROM station_expenses e WHERE e.category=c.name AND e.status IN ('approved','paid')) as total_spent
        FROM expense_categories c
        ORDER BY c.name ASC
      `).all();
      s.json({ ok: true, categories: rows });
    } catch (err) {
      s.status(500).json({ error: "Could not load categories: " + err.message });
    }
  });

  app.post("/api/expense-categories", need("owner", "manager", "admin"), (q, s) => {
    const { name, subcategories, icon, color, budget_monthly } = q.body || {};
    if (!name || !String(name).trim()) {
      return s.status(400).json({ error: "Category name is required." });
    }

    try {
      const cleanName = String(name).trim();
      const subs = Array.isArray(subcategories) ? JSON.stringify(subcategories) : (subcategories ? String(subcategories) : "[]");
      const iconVal = icon || "tag";
      const colorVal = color || "#0A63F8";
      const budgetVal = budget_monthly ? r2(num(budget_monthly)) : 0;

      const info = getDb().prepare(`
        INSERT INTO expense_categories (name, subcategories, icon, color, budget_monthly, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(cleanName, subs, iconVal, colorVal, budgetVal, now());

      s.json({ ok: true, id: info.lastInsertRowid, message: `Category '${cleanName}' created.` });
    } catch (err) {
      if (err.message && err.message.includes("UNIQUE")) {
        return s.status(409).json({ error: "A category with this name already exists." });
      }
      s.status(500).json({ error: "Could not create category: " + err.message });
    }
  });

  app.put("/api/expense-categories/:id", need("owner", "manager", "admin"), (q, s) => {
    const catId = parseInt(q.params.id, 10);
    const { name, subcategories, icon, color, budget_monthly, is_active } = q.body || {};

    try {
      const cur = getDb().prepare("SELECT * FROM expense_categories WHERE id=?").get(catId);
      if (!cur) return s.status(404).json({ error: "Category not found." });

      const nameVal = name ? String(name).trim() : cur.name;
      const subsVal = subcategories !== undefined ? (Array.isArray(subcategories) ? JSON.stringify(subcategories) : String(subcategories)) : cur.subcategories;
      const iconVal = icon || cur.icon;
      const colorVal = color || cur.color;
      const budgetVal = budget_monthly !== undefined ? r2(num(budget_monthly)) : cur.budget_monthly;
      const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : cur.is_active;

      getDb().prepare(`
        UPDATE expense_categories SET
          name=?, subcategories=?, icon=?, color=?, budget_monthly=?, is_active=?
        WHERE id=?
      `).run(nameVal, subsVal, iconVal, colorVal, budgetVal, activeVal, catId);

      s.json({ ok: true, message: `Category updated.` });
    } catch (err) {
      s.status(500).json({ error: "Could not update category: " + err.message });
    }
  });

  app.delete("/api/expense-categories/:id", need("owner", "admin"), (q, s) => {
    const catId = parseInt(q.params.id, 10);
    try {
      const cur = getDb().prepare("SELECT * FROM expense_categories WHERE id=?").get(catId);
      if (!cur) return s.status(404).json({ error: "Category not found." });

      // Check if any expenses are using this category
      const usage = getDb().prepare("SELECT COUNT(*) as c FROM station_expenses WHERE category=?").get(cur.name);
      if (usage && usage.c > 0) {
        // Soft delete / deactivate instead of deleting to protect historical integrity
        getDb().prepare("UPDATE expense_categories SET is_active=0 WHERE id=?").run(catId);
        return s.json({ ok: true, message: `Category '${cur.name}' has ${usage.c} expenses, so it was deactivated to preserve reports.` });
      }

      getDb().prepare("DELETE FROM expense_categories WHERE id=?").run(catId);
      s.json({ ok: true, message: `Category '${cur.name}' deleted.` });
    } catch (err) {
      s.status(500).json({ error: "Could not delete category: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 13. POST /api/expenses/upload-receipt
  // Base64 / data-URI receipt attachment handler
  // --------------------------------------------------------------------------
  app.post("/api/expenses/upload-receipt", need(), (q, s) => {
    const { data_url, filename } = q.body || {};
    if (!data_url || !String(data_url).startsWith("data:")) {
      return s.status(400).json({ error: "Please provide a valid image data URL." });
    }

    try {
      const matches = data_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return s.status(400).json({ error: "Invalid base64 payload." });
      }

      const ext = matches[1].includes("pdf") ? "pdf" : (matches[1].includes("png") ? "png" : "jpg");
      const safeName = `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      const filePath = path.join(uploadsDir, safeName);
      const buffer = Buffer.from(matches[2], "base64");

      fs.writeFileSync(filePath, buffer);

      const publicUrl = `/uploads/expenses/${safeName}`;
      s.json({
        ok: true,
        url: publicUrl,
        filename: filename || safeName,
        message: "Receipt attached successfully."
      });
    } catch (err) {
      console.error("[Upload Receipt] Error:", err);
      s.status(500).json({ error: "Could not save receipt: " + err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 14. GET /api/expenses/audit-logs
  // Full forensic audit history of expense approvals, changes and deletions
  // --------------------------------------------------------------------------
  app.get("/api/expenses/audit-logs", need("owner", "manager", "admin"), (q, s) => {
    try {
      const logs = getDb().prepare(`
        SELECT l.*, e.amount, e.category, e.d, e.shift
        FROM expense_audit_logs l
        LEFT JOIN station_expenses e ON e.id = l.expense_id
        ORDER BY l.timestamp DESC, l.id DESC
        LIMIT 200
      `).all();
      s.json({ ok: true, logs });
    } catch (err) {
      s.status(500).json({ error: "Could not load expense audit logs: " + err.message });
    }
  });

  console.log("✓ Registered full Expense Management backend routes.");
}

module.exports = { registerExpenseRoutes };
