(function ordersModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayOrders = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createOrdersApi() {
  function isLimitMarketable(side, limitPrice, marketPrice) {
    if (!Number.isFinite(limitPrice) || limitPrice <= 0 || !Number.isFinite(marketPrice) || marketPrice <= 0) return false;
    if (side === "buy") return limitPrice >= marketPrice;
    if (side === "sell") return limitPrice <= marketPrice;
    return true;
  }

  function buildTradeExecution({ side, quantity, referencePrice, orderType = "market", limitPrice = 0, frictionBps = 0 }) {
    const safeReferencePrice = Number(referencePrice) || 0;
    const safeQuantity = Number(quantity) || 0;
    if (side === "hold" || safeQuantity <= 0) {
      return {
        referencePrice: safeReferencePrice,
        price: safeReferencePrice,
        amount: 0,
        frictionCost: 0,
        frictionBps: 0,
      };
    }
    if (orderType === "limit" && Number.isFinite(limitPrice) && limitPrice > 0 && !isLimitMarketable(side, limitPrice, safeReferencePrice)) {
      const amount = roundPrice(limitPrice * safeQuantity);
      return {
        referencePrice: safeReferencePrice,
        price: roundPrice(limitPrice),
        amount,
        grossAmount: amount,
        frictionCost: 0,
        frictionBps: 0,
        pending: true,
      };
    }
    const safeFrictionBps = Number(frictionBps) || 0;
    const direction = side === "buy" ? 1 : -1;
    const price = roundPrice(safeReferencePrice * (1 + direction * safeFrictionBps / 10000));
    const cappedPrice = orderType === "limit" && Number.isFinite(limitPrice) && limitPrice > 0
      ? (side === "buy" ? Math.min(price, limitPrice) : Math.max(price, limitPrice))
      : price;
    const grossAmount = safeReferencePrice * safeQuantity;
    const amount = roundPrice(cappedPrice * safeQuantity);
    return {
      referencePrice: safeReferencePrice,
      price: roundPrice(cappedPrice),
      amount,
      grossAmount: roundPrice(grossAmount),
      frictionCost: roundPrice(Math.abs(amount - grossAmount)),
      frictionBps: safeFrictionBps,
      pending: false,
    };
  }

  function getLimitOrderFill(order, { day, bar } = {}) {
    if (!order || !bar || !Number.isFinite(order.limitPrice) || order.limitPrice <= 0) return null;
    const open = Number(bar.open);
    const high = Number(bar.high);
    const low = Number(bar.low);
    if (order.side === "buy" && Number.isFinite(low) && low <= order.limitPrice) {
      const price = Number.isFinite(open) && open <= order.limitPrice ? Math.min(open, order.limitPrice) : order.limitPrice;
      return { day, price: roundPrice(price), bar };
    }
    if (order.side === "sell" && Number.isFinite(high) && high >= order.limitPrice) {
      const price = Number.isFinite(open) && open >= order.limitPrice ? Math.max(open, order.limitPrice) : order.limitPrice;
      return { day, price: roundPrice(price), bar };
    }
    return null;
  }

  function resolvePendingOrderStatus(order, { day, bar } = {}) {
    if (!order || order.status !== "active") return { status: order?.status || "missing", fill: null };
    if (Number.isFinite(order.expiresDay) && Number.isFinite(day) && day > order.expiresDay) {
      return { status: "expired", fill: null };
    }
    const fill = getLimitOrderFill(order, { day, bar });
    return fill ? { status: "filled", fill } : { status: "active", fill: null };
  }

  function roundPrice(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  return {
    isLimitMarketable,
    buildTradeExecution,
    getLimitOrderFill,
    resolvePendingOrderStatus,
  };
});
