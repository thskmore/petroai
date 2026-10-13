// ============================================================================
// EXPENSE MANAGEMENT MODULE: Database Schema & Seed Data
// Indian Retail Petroleum Outlet (HPCL / IOCL / BPCL) Standards
// ============================================================================

async function initExpensesDb(db) {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        subcategories TEXT NOT NULL DEFAULT '[]',
        icon TEXT DEFAULT 'tag',
        color TEXT DEFAULT '#0A63F8',
        budget_monthly REAL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS station_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL DEFAULT 1,
        expense_no TEXT NOT NULL UNIQUE,
        d TEXT NOT NULL,
        shift TEXT NOT NULL DEFAULT 'General',
        duty_id INTEGER,
        category TEXT NOT NULL,
        subcategory TEXT DEFAULT '',
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        is_shift_cash INTEGER NOT NULL DEFAULT 1,
        paid_by TEXT DEFAULT '',
        paid_to TEXT DEFAULT '',
        description TEXT NOT NULL,
        remarks TEXT DEFAULT '',
        receipt_url TEXT DEFAULT '',
        receipt_name TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending_approval',
        created_by INTEGER NOT NULL,
        created_by_name TEXT NOT NULL,
        approved_by INTEGER,
        approved_by_name TEXT,
        approved_at INTEGER,
        rejection_reason TEXT,
        payment_ref TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expense_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id INTEGER NOT NULL,
        expense_no TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id INTEGER NOT NULL,
        actor_name TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    // Add any missing columns safely
    const addCol = (t, c, def) => {
      try {
        const cols = db.prepare(`pragma table_info(${t})`).all() || [];
        if (!cols.some((x) => x.name === c)) {
          db.exec(`alter table ${t} add column ${c} ${def}`);
        }
      } catch (_) {}
    };

    addCol("station_expenses", "station_id", "INTEGER NOT NULL DEFAULT 1");
    addCol("station_expenses", "subcategory", "TEXT DEFAULT ''");
    addCol("station_expenses", "is_shift_cash", "INTEGER NOT NULL DEFAULT 1");
    addCol("station_expenses", "receipt_url", "TEXT DEFAULT ''");
    addCol("station_expenses", "receipt_name", "TEXT DEFAULT ''");
    addCol("station_expenses", "rejection_reason", "TEXT");
    addCol("station_expenses", "payment_ref", "TEXT DEFAULT ''");

    // 1. Seed Expense Categories if empty
    const catCount = (db.prepare("SELECT COUNT(*) as c FROM expense_categories").get() || {}).c || 0;
    if (catCount === 0) {
      const nowTs = Math.floor(Date.now() / 1000);
      const defaultCategories = [
        {
          name: "Electricity",
          subcategories: JSON.stringify(["MSEDCL Power Bill", "Transformer Inspection", "Capacitor Bank Panel", "Forecourt Canopy Lighting"]),
          icon: "zap",
          color: "#EAB308",
          budget_monthly: 35000
        },
        {
          name: "Salary & Wages",
          subcategories: JSON.stringify(["Attendant Salary", "Manager Remuneration", "Shift Overtime (OT)", "Festival Bonus / Ex-gratia", "Staff Advance Payout"]),
          icon: "users",
          color: "#0A63F8",
          budget_monthly: 95000
        },
        {
          name: "Tea & Refreshments",
          subcategories: JSON.stringify(["Daily Shift Attendant Tea", "Drinking Water 20L Jars", "Forecourt Night Shift Snacks", "VIP Customer Hospitality"]),
          icon: "coffee",
          color: "#D97706",
          budget_monthly: 6000
        },
        {
          name: "Repairs & Maintenance",
          subcategories: JSON.stringify(["Dispenser Nozzle & Z-Swivel", "Delivery Hose Replacement", "Submersible Turbine Pump (STP)", "Air Compressor & Tyre Gauge", "Forecourt Paver Block Repairs"]),
          icon: "tool",
          color: "#EF4444",
          budget_monthly: 20000
        },
        {
          name: "Cleaning & Housekeeping",
          subcategories: JSON.stringify(["Forecourt Detergent & Paving Wash", "Customer Toilet Hygiene Phenyl", "Brooms, Wipers & Mops", "Waste Bins & Hand Wash Refill"]),
          icon: "sparkles",
          color: "#059669",
          budget_monthly: 4500
        },
        {
          name: "Stationery & Printing",
          subcategories: JSON.stringify(["POS Billing Thermal Paper Rolls", "Daily Duty Handover Sheets", "Physical Cash Book Registers", "Pens, Stamp Pads & Carbon Paper"]),
          icon: "file-text",
          color: "#6366F1",
          budget_monthly: 3500
        },
        {
          name: "Transport & Conveyance",
          subcategories: JSON.stringify(["Cash Transit to Bank Branch", "Depot & Sales Officer Liaison", "Local Emergency Auto/Bike Run", "Courier & Speed Post Deliveries"]),
          icon: "truck",
          color: "#8B5CF6",
          budget_monthly: 5000
        },
        {
          name: "Internet & Telecom",
          subcategories: JSON.stringify(["Forecourt Fiber Broadband", "EDC POS Machine SIM Cards", "CCTV Cloud Backup", "Official Station Mobile Recharge"]),
          icon: "wifi",
          color: "#06B6D4",
          budget_monthly: 2500
        },
        {
          name: "Bank & POS Charges",
          subcategories: JSON.stringify(["EDC Card Machine Monthly Rent", "Bank Cash Deposit Handling Fee", "NEFT / RTGS Transfer Charges", "UPI QR Code Gateway Fee"]),
          icon: "credit-card",
          color: "#EC4899",
          budget_monthly: 4000
        },
        {
          name: "Equipment & Assets",
          subcategories: JSON.stringify(["Weights & Measures 5L Verification", "DCP Fire Extinguisher Refilling", "ASTM 53B Hydrometer & Thermo", "Safety Cones & First Aid Kit"]),
          icon: "shield",
          color: "#14B8A6",
          budget_monthly: 12000
        },
        {
          name: "Rent & Lease",
          subcategories: JSON.stringify(["Retail Outlet Ground Lease", "Forecourt Storage Shed", "Advertising Billboard Space"]),
          icon: "home",
          color: "#F97316",
          budget_monthly: 25000
        },
        {
          name: "Statutory & License Fees",
          subcategories: JSON.stringify(["PESO Explosives License Renewal", "Legal Metrology Stamping Fee", "Gram Panchayat / Municipal Trade Tax", "Pollution Control Board Consent"]),
          icon: "award",
          color: "#3B82F6",
          budget_monthly: 15000
        },
        {
          name: "Miscellaneous",
          subcategories: JSON.stringify(["Ayudha Puja / Festival Decor", "Local Community Goodwill", "Emergency Forecourt Sundry", "Staff Uniform Aprons & Caps"]),
          icon: "grid",
          color: "#64748B",
          budget_monthly: 8000
        }
      ];

      const insCat = db.prepare(`
        INSERT INTO expense_categories (name, subcategories, icon, color, budget_monthly, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `);

      defaultCategories.forEach((c) => {
        insCat.run(c.name, c.subcategories, c.icon, c.color, c.budget_monthly, nowTs);
      });
      console.log("✓ Seeded 13 standard retail petroleum expense categories.");
    }

    // 2. Seed realistic station expenses if empty
    const expCount = (db.prepare("SELECT COUNT(*) as c FROM station_expenses").get() || {}).c || 0;
    if (expCount === 0) {
      const todayDate = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);

      // Fetch users for attribution
      const ownerUser = db.prepare("SELECT id, name FROM users WHERE role='owner' LIMIT 1").get() || { id: 2, name: "Sarita More" };
      const mgrUser = db.prepare("SELECT id, name FROM users WHERE role='manager' LIMIT 1").get() || { id: 3, name: "Kapane" };
      const workerUser = db.prepare("SELECT id, name FROM users WHERE role='worker' LIMIT 1").get() || { id: 4, name: "Vikram" };

      // Sample initial entries representing realistic daily petrol pump workflow
      const sampleExpenses = [
        {
          expense_no: "EXP-202610-001",
          d: todayDate,
          shift: "Morning",
          category: "Tea & Refreshments",
          subcategory: "Daily Shift Attendant Tea",
          amount: 240,
          payment_method: "Cash",
          is_shift_cash: 1,
          paid_by: workerUser.name,
          paid_to: "Mahesh Hotel & Canteen",
          description: "Morning shift attendants tea & biscuit refreshments (4 staff)",
          remarks: "Paid from shift cash drawer till as per routine allowance",
          status: "approved",
          created_by: workerUser.id,
          created_by_name: workerUser.name,
          approved_by: mgrUser.id,
          approved_by_name: mgrUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 7200,
          created_at: Math.floor(Date.now() / 1000) - 14400
        },
        {
          expense_no: "EXP-202610-002",
          d: todayDate,
          shift: "Morning",
          category: "Cleaning & Housekeeping",
          subcategory: "Forecourt Detergent & Paving Wash",
          amount: 650,
          payment_method: "Cash",
          is_shift_cash: 1,
          paid_by: workerUser.name,
          paid_to: "Shree Ganesh Traders",
          description: "2x 5L Surface cleaner and hard brooms for forecourt canopy wash",
          remarks: "Cash paid from morning shift collection till",
          status: "pending_approval",
          created_by: workerUser.id,
          created_by_name: workerUser.name,
          approved_by: null,
          approved_by_name: null,
          approved_at: null,
          created_at: Math.floor(Date.now() / 1000) - 3600
        },
        {
          expense_no: "EXP-202610-003",
          d: todayDate,
          shift: "General",
          category: "Electricity",
          subcategory: "MSEDCL Power Bill",
          amount: 26850,
          payment_method: "Bank",
          is_shift_cash: 0,
          paid_by: mgrUser.name,
          paid_to: "Maharashtra State Electricity Distribution (MSEDCL)",
          description: "Monthly high tension HT commercial consumer bill for outlet canopy & STP motors",
          remarks: "Paid directly via Bank NetBanking (Consumer No: 18492049182). Not deducted from shift cash.",
          status: "approved",
          created_by: mgrUser.id,
          created_by_name: mgrUser.name,
          approved_by: ownerUser.id,
          approved_by_name: ownerUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 1800,
          payment_ref: "NEFT-HDFC-9918291048",
          created_at: Math.floor(Date.now() / 1000) - 7200
        },
        {
          expense_no: "EXP-202610-004",
          d: yesterday,
          shift: "Evening",
          category: "Repairs & Maintenance",
          subcategory: "Dispenser Nozzle & Z-Swivel",
          amount: 2450,
          payment_method: "UPI",
          is_shift_cash: 0,
          paid_by: mgrUser.name,
          paid_to: "Petro Mech Automation Services",
          description: "Replacement of leaking Z-swivel coupling on DU-2 HSD Nozzle #3",
          remarks: "Paid via Manager UPI. Tested with 5L measure after fitting.",
          status: "paid",
          created_by: mgrUser.id,
          created_by_name: mgrUser.name,
          approved_by: ownerUser.id,
          approved_by_name: ownerUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 86400,
          payment_ref: "UPI/391029418291/GPay",
          created_at: Math.floor(Date.now() / 1000) - 90000
        },
        {
          expense_no: "EXP-202610-005",
          d: yesterday,
          shift: "Morning",
          category: "Stationery & Printing",
          subcategory: "POS Billing Thermal Paper Rolls",
          amount: 1200,
          payment_method: "Cash",
          is_shift_cash: 1,
          paid_by: workerUser.name,
          paid_to: "Mahavir Paper Mart",
          description: "Box of 50 thermal paper rolls (57mm x 25m) for forecourt EDC swipe machines",
          remarks: "Shift till cash paid by Vikram. Bill verified.",
          status: "paid",
          created_by: workerUser.id,
          created_by_name: workerUser.name,
          approved_by: mgrUser.id,
          approved_by_name: mgrUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 80000,
          created_at: Math.floor(Date.now() / 1000) - 85000
        },
        {
          expense_no: "EXP-202610-006",
          d: twoDaysAgo,
          shift: "General",
          category: "Internet & Telecom",
          subcategory: "Forecourt Fiber Broadband",
          amount: 1499,
          payment_method: "Card",
          is_shift_cash: 0,
          paid_by: mgrUser.name,
          paid_to: "BSNL Bharat Fiber",
          description: "Monthly 100 Mbps commercial broadband plan for automation & security CCTV",
          remarks: "Company Debit Card payment. Invoice attached.",
          status: "paid",
          created_by: mgrUser.id,
          created_by_name: mgrUser.name,
          approved_by: ownerUser.id,
          approved_by_name: ownerUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 170000,
          created_at: Math.floor(Date.now() / 1000) - 172000
        },
        {
          expense_no: "EXP-202610-007",
          d: threeDaysAgo,
          shift: "Evening",
          category: "Transport & Conveyance",
          subcategory: "Cash Transit to Bank Branch",
          amount: 350,
          payment_method: "Cash",
          is_shift_cash: 1,
          paid_by: workerUser.name,
          paid_to: "Auto Rickshaw Fare",
          description: "Two-way auto transport fare for staff carrying daily cash collection to SBI branch",
          remarks: "Emergency escort transit during heavy rain",
          status: "approved",
          created_by: workerUser.id,
          created_by_name: workerUser.name,
          approved_by: mgrUser.id,
          approved_by_name: mgrUser.name,
          approved_at: Math.floor(Date.now() / 1000) - 250000,
          created_at: Math.floor(Date.now() / 1000) - 255000
        }
      ];

      const insExp = db.prepare(`
        INSERT INTO station_expenses (
          station_id, expense_no, d, shift, category, subcategory, amount, payment_method, is_shift_cash,
          paid_by, paid_to, description, remarks, receipt_url, receipt_name, status,
          created_by, created_by_name, approved_by, approved_by_name, approved_at, payment_ref,
          created_at, updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, '', '', ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?
        )
      `);

      const insLog = db.prepare(`
        INSERT INTO expense_audit_logs (expense_id, expense_no, action, actor_id, actor_name, actor_role, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleExpenses.forEach((e) => {
        const info = insExp.run(
          e.expense_no, e.d, e.shift, e.category, e.subcategory, e.amount, e.payment_method, e.is_shift_cash,
          e.paid_by, e.paid_to, e.description, e.remarks, e.status,
          e.created_by, e.created_by_name, e.approved_by, e.approved_by_name, e.approved_at, e.payment_ref || "",
          e.created_at, e.created_at
        );

        const expId = info.lastInsertRowid;
        insLog.run(expId, e.expense_no, "CREATE", e.created_by, e.created_by_name, "worker", `Expense record ${e.expense_no} created for INR ${e.amount}`, e.created_at);

        if (e.approved_by) {
          insLog.run(expId, e.expense_no, "APPROVE", e.approved_by, e.approved_by_name, "manager", `Expense ${e.expense_no} approved`, e.approved_at || e.created_at);
        }
      });

      console.log("✓ Seeded realistic station expenses & audit trails.");
    }
  } catch (err) {
    console.error("Error initializing expense management tables:", err);
  }
}

module.exports = { initExpensesDb };
