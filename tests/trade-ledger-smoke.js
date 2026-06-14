const assert = require("node:assert/strict");

const ledger = require("../core/trade-ledger.js");

const priceTable = {
  AAA: { 1: 10, 2: 12, 3: 15, 4: 14 },
  BBB: { 2: 20, 4: 18 },
};

const report = ledger.buildTradeLedgerFromDecisions({
  finalDay: 4,
  getPrice: (symbol, day) => priceTable[symbol]?.[day] || 0,
  decisions: [
    { day: 4, side: "hold", symbol: "AAA", quantity: 0 },
    { day: 2, side: "buy", symbol: "AAA", quantity: 5, price: 12, frictionCost: 1 },
    { day: 1, side: "buy", symbol: "AAA", quantity: 10, price: 10, frictionCost: 2 },
    { day: 3, side: "sell", symbol: "AAA", quantity: 12, price: 15, frictionCost: 3, liquidity: { impactCost: 4 } },
    { day: 2, side: "buy", symbol: "BBB", quantity: 2, price: 20 },
  ],
});

assert.equal(report.closedLots.length, 2);
assert.equal(report.openLots.length, 2);
assert.equal(report.closedLots[0].quantity, 10);
assert.equal(report.closedLots[0].pnl, 50);
assert.equal(report.closedLots[1].quantity, 2);
assert.equal(report.closedLots[1].pnl, 6);
assert.equal(report.summary.realizedPnl, 56);
assert.equal(report.summary.frictionCost, 6);
assert.equal(report.summary.liquidityImpactCost, 4);
assert.equal(report.summary.closedTrades, 2);
assert.equal(report.summary.winRatePct, 100);

const openAaa = report.openLots.find((lot) => lot.symbol === "AAA");
const openBbb = report.openLots.find((lot) => lot.symbol === "BBB");
assert(openAaa);
assert(openBbb);
assert.equal(openAaa.quantity, 3);
assert.equal(openAaa.unrealizedPnl, 6);
assert.equal(openBbb.unrealizedPnl, -4);
assert.equal(report.summary.unrealizedPnl, 2);
