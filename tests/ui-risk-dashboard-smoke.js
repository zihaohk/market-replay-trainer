const assert = require("node:assert/strict");

const ui = require("../ui/risk-dashboard.js");

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const helpers = {
  escapeHtml,
  formatCurrency: (value) => `$${Number(value || 0).toFixed(2)}`,
  formatHomeCurrency: (value) => `HK$${Number(value || 0).toFixed(2)}`,
  formatPercent: (value) => `${Number(value || 0).toFixed(1)}%`,
  formatPlainPercent: (value) => `${Number(value || 0).toFixed(1)}%`,
  displayDay: (day) => String(Number(day) + 1),
  eventRiskLevelLabel: (level) => ({ danger: "高风险" })[level] || level,
  missionStatusLabel: (status) => ({ pass: "通过" })[status] || status,
  checkpointBiasLabel: (bias) => ({ deteriorating: "证据恶化" })[bias] || bias,
  checkpointActionLabel: (action) => ({ trim: "减仓" })[action] || action,
};

const checkpointHtml = ui.renderCheckpointLogPanel({
  symbols: ['BAD" onclick="alert(1)', "SAFE"],
  selectedSymbol: "SAFE",
  revealed: false,
  logs: [{
    symbol: "<BAD>",
    day: 1,
    bias: "deteriorating",
    action: "trim",
    riskChanged: true,
    note: "Note <script>alert(1)</script>",
  }],
}, helpers);

assert(checkpointHtml.includes("&lt;BAD&gt;"));
assert(checkpointHtml.includes("Note &lt;script&gt;alert(1)&lt;/script&gt;"));
assert(!checkpointHtml.includes("onclick=\"alert(1)"));

const html = ui.renderRiskDashboard({
  cashPct: 4,
  reserveCashPct: 8,
  maxDrawdownPct: 9,
  maxPositionPct: 30,
  turnoverPct: 12,
  funding: {
    homeReturnPct: -2,
    usdReturnPct: 1,
    initialHomeDeposit: 780000,
    initialUsdCash: 100000,
    fxFeeBps: 20,
    initialFxCostUsd: 200,
    initialFxCostHome: 1560,
    equityHome: 760000,
  },
  settlement: {
    settledCash: 1000,
    unsettledProceeds: 500,
    cycle: "T+1",
    pendingCount: 1,
    dueTodayCount: 0,
  },
  alerts: [{ level: "danger", title: "Alert <img>", detail: "Detail <script>" }],
  positionRows: [{ label: "Position <svg>", weightPct: 25, level: "warning", detail: "Detail <b>" }],
  sectorRows: [{ label: "Sector", weightPct: 10, level: "", detail: "Safe" }],
  stressRows: [{ label: "Stress <img>", shock: "-10%", level: "danger", loss: 100, lossPct: 1, afterEquity: 9900, detail: "Stress <script>" }],
  gapRows: [{ symbol: "<SYM>", name: "<Name>", level: "warn", gapPct: -3, previousClose: 100, open: 97, dayChangePct: -2, detail: "Gap <img>" }],
  eventRiskRows: [{ level: "danger", day: 2, title: "Event <img>", statusLabel: "Today", typeLabel: "Macro", riskLevel: "danger", daysUntil: 0, detail: "Event <script>" }],
  allocationStatus: { items: [{ status: "pass", title: "Allocation <b>", detail: "Allocation <script>" }] },
  planRows: [{ level: "warn", title: "Plan <b>", statusLabel: "Watch", unrealizedPnl: -10, pnlPct: -1, maxAdversePct: -2, riskLimitPct: 5, detail: "Plan <script>", invalidation: "<invalid>", actionHint: "<hint>" }],
}, { ...helpers, checkpointPanelHtml: checkpointHtml });

assert(html.includes("Alert &lt;img&gt;"));
assert(html.includes("Position &lt;svg&gt;"));
assert(html.includes("Stress &lt;script&gt;"));
assert(html.includes("&lt;SYM&gt; · &lt;Name&gt;"));
assert(html.includes("Event &lt;script&gt;"));
assert(html.includes("Allocation &lt;script&gt;"));
assert(html.includes("&lt;invalid&gt;"));
assert(html.includes("&lt;hint&gt;"));
assert(!html.includes("<script>"));
assert(html.includes("盘中复查"));

console.log("risk dashboard UI smoke tests passed");
