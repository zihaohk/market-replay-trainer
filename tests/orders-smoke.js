const assert = require("node:assert/strict");

const orders = require("../core/orders.js");

assert.equal(orders.isLimitMarketable("buy", 101, 100), true);
assert.equal(orders.isLimitMarketable("buy", 99, 100), false);
assert.equal(orders.isLimitMarketable("sell", 99, 100), true);
assert.equal(orders.isLimitMarketable("sell", 101, 100), false);

const pendingBuy = orders.buildTradeExecution({
  side: "buy",
  quantity: 10,
  referencePrice: 100,
  orderType: "limit",
  limitPrice: 98,
  frictionBps: 8,
});
assert.equal(pendingBuy.pending, true);
assert.equal(pendingBuy.price, 98);
assert.equal(pendingBuy.amount, 980);
assert.equal(pendingBuy.frictionCost, 0);

const marketableBuy = orders.buildTradeExecution({
  side: "buy",
  quantity: 10,
  referencePrice: 100,
  orderType: "limit",
  limitPrice: 101,
  frictionBps: 8,
});
assert.equal(marketableBuy.pending, false);
assert.equal(marketableBuy.price, 100.08);
assert.equal(marketableBuy.frictionCost, 0.8);

const cappedSell = orders.buildTradeExecution({
  side: "sell",
  quantity: 10,
  referencePrice: 100,
  orderType: "limit",
  limitPrice: 99,
  frictionBps: 8,
});
assert.equal(cappedSell.price, 99.92);
assert.equal(cappedSell.amount, 999.2);

const buyFill = orders.getLimitOrderFill(
  { side: "buy", limitPrice: 98 },
  { day: 3, bar: { open: 97, high: 102, low: 96, close: 100 } },
);
assert.equal(buyFill.price, 97);

const sellFill = orders.getLimitOrderFill(
  { side: "sell", limitPrice: 105 },
  { day: 4, bar: { open: 106, high: 108, low: 101, close: 104 } },
);
assert.equal(sellFill.price, 106);

assert.equal(orders.getLimitOrderFill(
  { side: "buy", limitPrice: 98 },
  { day: 5, bar: { open: 101, high: 103, low: 99, close: 102 } },
), null);

const expired = orders.resolvePendingOrderStatus(
  { status: "active", side: "buy", limitPrice: 100, expiresDay: 2 },
  { day: 3, bar: { open: 99, high: 101, low: 98, close: 100 } },
);
assert.equal(expired.status, "expired");
assert.equal(expired.fill, null);

const filled = orders.resolvePendingOrderStatus(
  { status: "active", side: "sell", limitPrice: 105, expiresDay: 6 },
  { day: 4, bar: { open: 104, high: 106, low: 103, close: 105 } },
);
assert.equal(filled.status, "filled");
assert.equal(filled.fill.price, 105);
