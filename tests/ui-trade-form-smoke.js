const assert = require("node:assert/strict");

const ui = require("../ui/trade-form.js");

const helpers = {
  escapeHtml: (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;"),
  formatCurrency: (value) => `$${Number(value || 0).toFixed(2)}`,
  formatHomeCurrency: (value) => `HK$${Number(value || 0).toFixed(2)}`,
  formatPercent: (value) => `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`,
  formatPlainPercent: (value) => `${Number(value || 0).toFixed(1)}%`,
  formatCompactNumber: (value) => `${Number(value || 0) / 1000000}M`,
};

const optionsHtml = ui.renderSymbolOptions([
  { symbol: 'BAD" onclick="alert(1)', name: "<Unsafe ETF>" },
], helpers);
assert(optionsHtml.includes("BAD&quot; onclick=&quot;alert(1)"));
assert(optionsHtml.includes("&lt;Unsafe ETF&gt;"));
assert(!optionsHtml.includes("onclick=\"alert(1)"));

const previewHtml = ui.renderOrderPreview({
  level: "danger",
  price: 101.25,
  amount: 202.5,
  nextCash: 99797.5,
  symbolWeightPct: 1.2,
  frictionCost: 1.1,
  message: "Preview <script>",
  fundingScenario: {
    level: "warn",
    rateLabel: "HKD <rate>",
    amountHome: 1579.5,
    initialHomeDeposit: 780000,
    initialUsdCash: 100000,
    initialFxCostUsd: 200,
    homeReturnPct: -1.3,
    detail: "Funding <script>",
  },
  riskScenario: {
    level: "danger",
    label: "Too large <b>",
    stopPrice: 95,
    lossAtStop: 12.5,
    accountRiskPct: 0.7,
    rewardTargetPrice: 113.75,
    detail: "Risk <img>",
  },
  liquidityScenario: {
    level: "warn",
    label: "Thin <b>",
    dayVolume: 2000000,
    volumeSharePct: 1.1,
    dollarVolumeSharePct: 0.9,
    impactCost: 3.2,
    detail: "Liquidity <img>",
  },
  settlementScenario: {
    level: "good",
    cycle: "T+1",
    settledCash: 1000,
    unsettledProceeds: 50,
    nextSettledCash: 900,
    usesUnsettledCash: true,
    detail: "Settlement <script>",
  },
}, { passed: true, message: "ok" }, helpers);

assert(previewHtml.includes("预计成交价"));
assert(previewHtml.includes("$101.25"));
assert(previewHtml.includes("Risk &lt;img&gt;"));
assert(previewHtml.includes("Funding &lt;script&gt;"));
assert(previewHtml.includes("Settlement &lt;script&gt;"));
assert(!previewHtml.includes("<script>"));

const blockedHtml = ui.renderOrderPreview({ message: "Preview" }, {
  passed: false,
  message: "Lesson <script>alert(1)</script>",
}, helpers);
assert(blockedHtml.includes("Lesson &lt;script&gt;alert(1)&lt;/script&gt;"));

const coachHtml = ui.renderDecisionCoach({
  level: "warn",
  score: 71,
  summary: "Coach <img>",
  items: [{ level: "danger", title: "Issue <b>", detail: "Detail <script>" }],
}, helpers);
assert(coachHtml.includes("决策教练 · 71/100"));
assert(coachHtml.includes("Coach &lt;img&gt;"));
assert(coachHtml.includes("Detail &lt;script&gt;"));

assert(ui.renderClosedOrderPreview().includes("不能再追加决策"));
assert(ui.renderClosedDecisionCoach().includes("训练已结束"));

const defaultHint = ui.renderSizingHint({
  revealed: false,
  selectedSide: "buy",
  symbol: "ETF-A",
  price: 100,
  currentWeight: 12,
  quantity: 2,
  amount: 200,
}, helpers);
assert(defaultHint.includes("ETF-A 当前价 $100.00"));
assert(defaultHint.includes("输入目标仓位"));

const resultHint = ui.renderSizingHint({
  revealed: false,
  selectedSide: "buy",
  symbol: "ETF-A",
  price: 100,
  currentWeight: 12,
  quantity: 2,
  amount: 200,
  result: { message: "按目标金额计算", quantity: 3, capped: true },
}, helpers);
assert(resultHint.includes("可换算 3 股"));
assert(resultHint.includes("已按现金或持仓上限截断"));
assert(ui.renderSizingHint({ revealed: true }, helpers).includes("已复盘"));
assert(ui.renderSizingHint({ selectedSide: "hold" }, helpers).includes("观望时"));
