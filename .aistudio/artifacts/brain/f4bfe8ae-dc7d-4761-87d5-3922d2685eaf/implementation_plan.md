# Employee Payroll & Forecourt Duty Suite

Rebuild of the petrol pump staff and payroll management system inspired by PetroPulse360, featuring employee directory, advance tracking ledgers, forecourt shift shortage auto-sync, cash recovery drawer integration, digital payslips (WhatsApp & PDF), NEFT bank transfer exports, and statutory EPF/ESIC compliance. Also resolves the opening meter display discrepancy in the workers shift view.

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural direction and scope have been confirmed via clarifying inquiries:

- **Confirmed Feature Set**: Full PetroPulse360 suite containing employee management, live advance ledgers, alert banner for high advances, and cash drawer recovery sync.
- **Confirmed Forecourt Linking**: Automatic linkage between forecourt shift duties (cash shortages/surpluses, shift advances) and the staff member's live payroll ledger.
- **Confirmed Statutory & Exports**: Retention and enhancement of WhatsApp digital payslips, NEFT bank NEFT/RTGS batch payment sheets, and EPF/ESIC challan breakdowns.
- **Workers View Opening Meter**: Investigation and fix for the opening meter counter not displaying or pulling the correct previous closing reading in the shift workers view.

---

## 1. Overview & Core Concept

### What It Does
- **Staff Directory & Profiles**: Unified roster of pump attendants (DSMs), cashiers, forecourt managers, and lube bay technicians with designations, active/inactive statuses, join dates, contact numbers, and base monthly salary.
- **Live Advance Ledger & Alert Bar**: Real-time tracking of employee salary advances with date-stamped debit/credit audit trail, running outstanding balance, and warning banners when an attendant's advance exceeds their monthly entitlement.
- **Shift Shortage & Forecourt Sync**: Any cash shortage logged during nozzle/meter shift handovers automatically flows as a deductible ledger item (with review & waiver option by manager), eliminating manual double-entry.
- **Automated Payroll Settlement**: End-of-month or custom payroll runs calculating gross pay, shift allowances/overtime, minus advance deductions, shift shortages, and statutory EPF/ESIC, producing net payable amounts.
- **Dispatches & Banking**: One-click WhatsApp payslip sharing, printable salary slips, downloadable NEFT bank upload sheets (Excel/CSV), and EPF/ESIC monthly compliance summaries.
- **Workers Shift Opening Meter Resolution**: Ensures nozzle opening meter readings are strictly chained from the prior shift's certified closing meter, preventing blank or zeroed opening readings.

### Target Audience & Persona
- **Petrol Pump Owners & Forecourt Managers**: Needing airtight cash control, automated advance deductions, and quick monthly salary processing across multiple shifts and pump attendants.
- **Pump Attendants / Workers**: Requiring transparent records of their advances, shifts worked, and instant WhatsApp payslips.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Dashboard Top Metrics & Alert Banner**:
   - Live KPI cards: Total Staff (Active vs Inactive), Monthly Base Payroll Commitment (₹), and Total Outstanding Advances (₹).
   - Amber alert bar: Displays staff members with significant outstanding advance balances and quick links to review their ledgers.
2. **Staff Roster & Quick Actions**:
   - Filter by designation (Manager, Cashier, DSM Attendant, Technician, Security) and search by name or mobile.
   - Quick badges for status and advance balance.
   - Action buttons: **Pay Salary**, **Give Advance**, **View Ledger**, **Edit / Deactivate**.
3. **Advance Ledger Modal**:
   - Interactive history log: `advance_payout`, `salary_deduction`, `shift_shortage`, and `advance_recovery`.
   - Option to debit/credit directly to the pump cash drawer (settlement shift cash).
   - "Add Transaction" modal with receipt print and WhatsApp confirmation.
4. **Payroll Calculation & Pay Run**:
   - Month/period selector with bulk recalculate.
   - Per-employee breakdown: Basic + Allowances/Overtime - Advance Deductions - Shift Shortages - EPF/ESIC = Net Pay.
   - Settle via Cash Drawer, Bank Transfer, or UPI.
   - Export NEFT Bank file and share WhatsApp payslips with one click.
5. **Workers View Opening Meter**:
   - In the shift workers / nozzle reading interface, the opening meter automatically pulls the verified closing meter of the previous closed shift for that exact nozzle and fuel grade, with fallback manual override for pump calibration or meter replacement.

### Visual Identity & Theme
- **Theme**: Utilitarian, high-contrast industrial forecourt styling aligned with existing pump operations.
- **Colors**: Deep navy slate headers (`#0f172a`), clean card surfaces (`#ffffff`), emerald positive balances (`#10b981`), warm amber warning alerts (`#f59e0b`), and crimson for shortages/deductions (`#ef4444`).
- **Typography**: Tabular figures (`font-mono`) for all meter readings, rupee currency figures, and ledger balances for zero optical shifting.

---

## 3. Key Product Decisions & Trade-Offs

- **Automated vs Manual Shortage Deduction**:
  - *Decision*: Shift shortages automatically register as pending deductions on the staff member's ledger, but remain editable by managers prior to final salary lock.
  - *Why*: Prevents missed deductions while giving owners the flexibility to forgive accidental spills or dispensing discrepancies.
- **Cash Drawer Bi-directional Sync**:
  - *Decision*: Giving an advance or recovering cash directly prompts a checkbox to record the transaction in the current day's cash drawer entries.
  - *Why*: Ensures the pump's physical cash count matches the accounting books without requiring separate cash-drop entries.

---

## 4. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PETROPULSE360 EMPLOYEE & PAYROLL SUITE               │
└────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Top Metrics & Alert │ │  Staff Roster Table  │ │ Forecourt Shift Sync │
│  • Total Staff       │ │  • Search & Role Tag │ │  • Nozzle Readings   │
│  • Salary Commitment │ │  • Advance Balances  │ │  • Meter Chaining    │
│  • Advance Exposure  │ │  • Quick Pay/Advance │ │  • Shift Shortages   │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Live Advance Ledger │ │ Payroll Settle Modal │ │ Compliance & Exports │
│  • Payouts & Recov.  │ │  • Gross Earnings    │ │  • WhatsApp Slips   │
│  • Shift Shortages   │ │  • Net Pay Calc      │ │  • NEFT Bank Sheets  │
│  • Cash Drawer Sync  │ │  • Cash / Bank Mode  │ │  • EPF/ESIC Challans │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### Workers View Opening Meter Resolution:
1. Locate nozzle reading state hydration in `renderShiftDutyEntry` / `renderWorkerEntry` in `index.html`.
2. Ensure nozzle opening reading query fetches the latest recorded `closingMeter` from the previous completed shift rather than defaulting to `0` or `null`.
3. Display clear badge showing `"Opening: [Reading] (from Shift #[Id])"` with lock indicator and audit trail.
