const assert = require("node:assert/strict");

const ui = require("../ui/history.js");

const helpers = {
  escapeHtml: (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;"),
  formatNumber: (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }),
  formatCurrency: (value) => `$${Number(value || 0).toFixed(2)}`,
  formatHomeCurrency: (value) => `HK$${Number(value || 0).toFixed(2)}`,
  formatPlainPercent: (value) => `${Number(value || 0).toFixed(1)}%`,
  displayDay: (value) => String(Number(value || 0) + 1),
  decisionLabel: (value) => ({ buy: "买入", sell: "卖出", hold: "观望" }[value] || value),
  pendingOrderStatusLabel: (value) => ({ active: "等待成交", canceled: "已取消" }[value] || value),
  corporateActionEffectText: (item) => item.effectText,
  getDecisionDate: () => "2024-01-03",
  intentLabel: (value) => `intent:${value}`,
  horizonLabel: (value) => `horizon:${value}`,
  planCheckCount: (values) => values.filter(Boolean).length,
  evidenceSourceText: (values) => values.join(", "),
  coachLevelLabel: (value) => `level:${value}`,
  emotionLabel: (value) => `emotion:${value}`,
  confidenceLabel: (value) => `confidence:${value}`,
};

const emptyPositionsHtml = ui.renderPositions([], helpers);
assert(emptyPositionsHtml.includes("暂无持仓"));

const positionsHtml = ui.renderPositions([
  {
    symbol: 'BAD" onclick="alert(1)',
    quantity: 10,
    averageCost: 90,
    price: 100,
    value: 1000,
    pnl: 100,
  },
], helpers);
assert(positionsHtml.includes("BAD&quot; onclick=&quot;alert(1)"));
assert(!positionsHtml.includes("onclick=\"alert(1)"));
assert(positionsHtml.includes("positive"));

const emptyHistoryHtml = ui.renderHistory({}, helpers);
assert(emptyHistoryHtml.includes("还没有决策记录"));

const historyHtml = ui.renderHistory({
  revealed: false,
  orders: [{
    id: 'order" onclick="alert(1)',
    createdDay: 1,
    expiresDay: 3,
    side: "buy",
    symbol: "<ETF>",
    quantity: 5,
    limitPrice: 101.5,
    status: "active",
    cancelReason: "Reason <script>",
  }],
  corporateActions: [{
    day: 2,
    symbol: "<ACME>",
    title: "Split <img>",
    effectText: "Adjusted <script>",
  }],
  decisions: [{
    day: 2,
    side: "buy",
    symbol: "<ETF>",
    quantity: 5,
    price: 102,
    amount: 510,
    funding: {
      amountHome: 3978,
      usdHkdRate: "7.8<script>",
    },
    settlement: {
      cycle: "T+1<script>",
      settledCash: 1000,
      unsettledProceeds: 50,
      usesUnsettledCash: true,
    },
    cashAccountWarnings: [{ detail: "Warning <script>" }],
    frictionCost: 1.25,
    frictionBps: 8,
    liquidity: {
      volumeSharePct: 0.3,
      impactCost: 0.5,
    },
    intent: "entry",
    horizon: "swing",
    planChecks: [true, false, true],
    evidenceSources: ["news<script>", "chart"],
    coach: {
      score: 72,
      level: "warn",
      issues: [{ title: "Issue <script>" }],
    },
    emotion: "calm",
    confidence: "medium",
    reason: "Reason <script>",
  }],
}, helpers);

assert(historyHtml.includes("公司行动"));
assert(historyHtml.includes("限价买入"));
assert(historyHtml.includes("data-cancel-pending-order=\"order&quot; onclick=&quot;alert(1)\""));
assert(historyHtml.includes("&lt;ETF&gt;"));
assert(historyHtml.includes("Issue &lt;script&gt;"));
assert(historyHtml.includes("Reason &lt;script&gt;"));
assert(!historyHtml.includes("<script>"));
assert(!historyHtml.includes("onclick=\"alert(1)"));

const revealedHistoryHtml = ui.renderHistory({
  revealed: true,
  decisions: [{
    day: 0,
    side: "hold",
    symbol: "SPY",
    reason: "wait",
    intent: "watch",
    horizon: "short",
    planChecks: [],
    evidenceSources: [],
    emotion: "calm",
    confidence: "low",
  }],
}, helpers);
assert(revealedHistoryHtml.includes("2024-01-03"));
assert(!revealedHistoryHtml.includes("data-cancel-pending-order"));
