const assert = require("node:assert/strict");

const portfolio = require("../core/portfolio.js");

const prices = { AAA: 12, BBB: 30 };
const getPrice = (symbol) => prices[symbol] || 0;
const initialPositions = {
  AAA: { quantity: 10, averageCost: 10 },
  BBB: { quantity: 2, averageCost: 25 },
};

const totals = portfolio.getPortfolioTotals({
  cash: 100,
  positions: initialPositions,
  getPrice,
});
assert.equal(totals.positionValue, 180);
assert.equal(totals.equity, 280);
assert.equal(portfolio.getSymbolWeightPct({ positions: initialPositions, symbol: "AAA", equity: totals.equity, getPrice }), (120 / 280) * 100);
assert.equal(portfolio.getMaxConcentrationPct({ positions: initialPositions, equity: totals.equity, getPrice }), (120 / 280) * 100);

const previewBuy = portfolio.buildPreviewPortfolio({
  cash: 100,
  positions: initialPositions,
  side: "buy",
  symbol: "AAA",
  quantity: 5,
  price: 12,
  amount: 61,
});
assert.equal(previewBuy.cash, 39);
assert.equal(previewBuy.positions.AAA.quantity, 15);
assert.equal(previewBuy.positions.AAA.averageCost, 10.67);
assert.equal(initialPositions.AAA.quantity, 10);

const appliedBuy = portfolio.applyBuy({
  cash: 100,
  positions: initialPositions,
  symbol: "AAA",
  quantity: 5,
  amount: 61,
});
assert.equal(appliedBuy.cash, 39);
assert.equal(appliedBuy.positions.AAA.quantity, 15);
assert.equal(appliedBuy.positions.AAA.averageCost, 10.73);

const previewSell = portfolio.buildPreviewPortfolio({
  cash: 100,
  positions: initialPositions,
  side: "sell",
  symbol: "BBB",
  quantity: 2,
  price: 30,
  amount: 60,
});
assert.equal(previewSell.cash, 160);
assert.equal(previewSell.positions.BBB, undefined);
assert(initialPositions.BBB);

const appliedSell = portfolio.applySell({
  cash: 100,
  positions: initialPositions,
  symbol: "AAA",
  quantity: 4,
  amount: 48,
});
assert.equal(appliedSell.cash, 148);
assert.equal(appliedSell.positions.AAA.quantity, 6);
assert.equal(appliedSell.positions.AAA.averageCost, 10);
