const assert = require("node:assert/strict");

const runtime = require("../core/runtime.js");

const settlementPolicy = { cycleDays: 1, label: "T+1" };
const roundPrice = (value) => Math.round(Number(value) * 100) / 100;
const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
const formatNumber = (value) => Number(value).toFixed(2);
const nowIso = () => "2026-06-14T00:00:00.000Z";

const settlementState = { day: 2, settlementLedger: [] };
const entry = runtime.recordSettlementEntry({
  state: settlementState,
  settlementPolicy,
  symbol: "ETF-A",
  quantity: 10,
  price: 100,
  amount: 1000.123,
  tradeDay: 1,
  currentCaseLength: 5,
  roundPrice,
  idFactory: () => "settle-test",
  nowIso,
});
assert.equal(entry.id, "settle-test");
assert.equal(entry.amount, 1000.12);
assert.equal(entry.settleDay, 2);
assert.equal(entry.status, "pending");
const settlementEvents = runtime.processSettlementLedger({ state: settlementState, settlementPolicy, formatCurrency, nowIso });
assert.equal(settlementState.settlementLedger[0].status, "settled");
assert.equal(settlementState.settlementLedger[0].settledAtDay, 2);
assert.equal(settlementEvents[0].message, "资金结算：ETF-A 卖出款 $1000.12 已按 T+1 结算。");

const dividendState = {
  day: 3,
  cash: 1000,
  positions: { "ETF-A": { quantity: 10, averageCost: 90 } },
  corporateActionLog: [],
};
const dividendEvents = runtime.processCorporateActions({
  state: dividendState,
  selectedCase: {
    id: "case-div",
    corporateActions: [{ day: 3, symbol: "ETF-A", type: "dividend", cashPerShare: 0.5 }],
  },
  taxProfile: { dividendWithholdingRatePct: 30 },
  roundPrice,
  formatCurrency,
  formatNumber,
  nowIso,
});
assert.equal(dividendState.cash, 1003.5);
assert.equal(dividendState.corporateActionLog[0].grossDividend, 5);
assert.equal(dividendState.corporateActionLog[0].taxWithheld, 1.5);
assert.equal(dividendState.corporateActionLog[0].cashDelta, 3.5);
assert(dividendEvents[0].message.includes("毛分红 $5.00"));
assert.equal(runtime.processCorporateActions({
  state: dividendState,
  selectedCase: {
    id: "case-div",
    corporateActions: [{ day: 3, symbol: "ETF-A", type: "dividend", cashPerShare: 0.5 }],
  },
  taxProfile: { dividendWithholdingRatePct: 30 },
  nowIso,
}).length, 0);

const splitState = {
  day: 4,
  cash: 0,
  positions: { "STOCK-A": { quantity: 2, averageCost: 100 } },
  corporateActionLog: [],
};
runtime.processCorporateActions({
  state: splitState,
  selectedCase: {
    id: "case-split",
    corporateActions: [{ day: 4, symbol: "STOCK-A", type: "split", ratio: 2, adjustHolding: true }],
  },
  taxProfile: { dividendWithholdingRatePct: 30 },
  roundPrice,
  nowIso,
});
assert.equal(splitState.positions["STOCK-A"].quantity, 4);
assert.equal(splitState.positions["STOCK-A"].averageCost, 50);
assert.equal(splitState.corporateActionLog[0].quantityBefore, 2);
assert.equal(splitState.corporateActionLog[0].quantityAfter, 4);

const pendingState = {
  day: 2,
  positions: { "ETF-A": { quantity: 3, averageCost: 100 } },
  pendingOrders: [
    { id: "buy-1", status: "active", side: "buy", symbol: "ETF-A", quantity: 2 },
    { id: "sell-1", status: "active", side: "sell", symbol: "ETF-A", quantity: 2 },
    { id: "expire-1", status: "active", side: "buy", symbol: "ETF-A", quantity: 1 },
    { id: "cancel-1", status: "active", side: "sell", symbol: "ETF-A", quantity: 99 },
  ],
  decisions: [],
};
const executed = [];
const pendingEvents = runtime.processPendingOrders({
  state: pendingState,
  resolvePendingOrderStatus: (order) => {
    if (order.id === "expire-1") return { status: "expired", fill: null };
    return { status: "filled", fill: { day: 2, price: order.side === "buy" ? 99 : 101 } };
  },
  buildDecisionFromPendingOrder: (order, fill) => ({
    day: fill.day,
    side: order.side,
    symbol: order.symbol,
    quantity: order.quantity,
    price: fill.price,
    amount: roundPrice(fill.price * order.quantity),
  }),
  validateBuy: () => ({ ok: true }),
  executeBuy: (symbol, quantity, price, amount) => executed.push(["buy", symbol, quantity, price, amount]),
  executeSell: (symbol, quantity, price, amount) => executed.push(["sell", symbol, quantity, price, amount]),
  findCashAccountSaleWarnings: () => [{ detail: "cash warning" }],
  decisionLabel: (side) => ({ buy: "买入", sell: "卖出" })[side],
  formatCurrency,
  nowIso,
});
assert.equal(pendingState.pendingOrders.find((item) => item.id === "buy-1").status, "filled");
assert.equal(pendingState.pendingOrders.find((item) => item.id === "sell-1").status, "filled");
assert.equal(pendingState.pendingOrders.find((item) => item.id === "expire-1").status, "expired");
assert.equal(pendingState.pendingOrders.find((item) => item.id === "cancel-1").status, "canceled");
assert.equal(pendingState.decisions.length, 2);
assert.deepEqual(executed.map((item) => item[0]), ["buy", "sell"]);
assert(pendingState.decisions.some((decision) => Array.isArray(decision.cashAccountWarnings)));
assert(pendingEvents.some((event) => event.type === "filled" && event.message.includes("限价单成交")));
assert(pendingEvents.some((event) => event.type === "expired"));
assert(pendingEvents.some((event) => event.type === "canceled"));

const failedBuyState = {
  day: 2,
  positions: {},
  pendingOrders: [{ id: "buy-risk", status: "active", side: "buy", symbol: "ETF-A", quantity: 2 }],
  decisions: [],
};
const failedBuyEvents = runtime.processPendingOrders({
  state: failedBuyState,
  resolvePendingOrderStatus: () => ({ status: "filled", fill: { day: 2, price: 100 } }),
  buildDecisionFromPendingOrder: () => ({ price: 100, amount: 200 }),
  validateBuy: () => ({ ok: false, message: "现金不足" }),
  executeBuy: () => assert.fail("buy should not execute"),
  executeSell: () => assert.fail("sell should not execute"),
  findCashAccountSaleWarnings: () => [],
});
assert.equal(failedBuyState.pendingOrders[0].status, "canceled");
assert.equal(failedBuyState.decisions.length, 0);
assert.equal(failedBuyEvents[0].message, "限价单取消：ETF-A 现金不足");

assert.deepEqual(runtime.activePendingOrders({ pendingOrders: [{ status: "active" }, { status: "filled" }] }), [{ status: "active" }]);
assert.equal(runtime.corporateActionTypeLabel("dividend"), "现金分红");
assert(runtime.corporateActionHint({ type: "split", ratio: 3 }).includes("3:1"));
