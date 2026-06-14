(function tradeLedgerModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayTradeLedger = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTradeLedgerApi() {
  function buildTradeLedgerFromDecisions(options = {}) {
    const decisions = chronologicalDecisions(options.decisions || []);
    const finalDay = Number.isFinite(options.finalDay) ? options.finalDay : 0;
    const getPrice = typeof options.getPrice === "function" ? options.getPrice : () => 0;
    const activeTrades = decisions.filter((decision) => decision.day <= finalDay && decision.side !== "hold");
    const lotsBySymbol = {};
    const closedLots = [];

    activeTrades.forEach((decision) => {
      if (decision.side === "buy") {
        addBuyLot({ lotsBySymbol, decision, getPrice });
        return;
      }
      if (decision.side === "sell") {
        matchSellLots({ lotsBySymbol, closedLots, decision, getPrice });
      }
    });

    const openLots = buildOpenLots({ lotsBySymbol, finalDay, getPrice });
    const realizedPnl = closedLots.reduce((sum, item) => sum + item.pnl, 0);
    const unrealizedPnl = openLots.reduce((sum, item) => sum + item.unrealizedPnl, 0);
    const frictionCost = activeTrades.reduce((sum, decision) => sum + (Number(decision.frictionCost) || 0), 0);
    const liquidityImpactCost = activeTrades.reduce((sum, decision) => sum + (Number(decision.liquidity?.impactCost) || 0), 0);
    const wins = closedLots.filter((item) => item.pnl > 0).length;

    return {
      closedLots,
      openLots,
      summary: {
        realizedPnl,
        unrealizedPnl,
        frictionCost,
        liquidityImpactCost,
        closedTrades: closedLots.length,
        openLots: openLots.length,
        winRatePct: closedLots.length ? (wins / closedLots.length) * 100 : 0,
        averageHoldingDays: closedLots.length ? closedLots.reduce((sum, item) => sum + item.holdingDays, 0) / closedLots.length : 0,
      },
    };
  }

  function addBuyLot({ lotsBySymbol, decision, getPrice }) {
    const quantity = Number(decision.quantity) || 0;
    if (quantity <= 0) return;
    const symbol = decision.symbol;
    lotsBySymbol[symbol] = lotsBySymbol[symbol] || [];
    lotsBySymbol[symbol].push({
      symbol,
      quantity,
      remaining: quantity,
      buyDay: decision.day,
      buyPrice: Number(decision.price) || getPrice(symbol, decision.day),
    });
  }

  function matchSellLots({ lotsBySymbol, closedLots, decision, getPrice }) {
    const symbol = decision.symbol;
    let sellRemaining = Number(decision.quantity) || 0;
    const sellPrice = Number(decision.price) || getPrice(symbol, decision.day);
    const lots = lotsBySymbol[symbol] || [];
    while (sellRemaining > 0 && lots.length) {
      const lot = lots[0];
      const matchedQuantity = Math.min(sellRemaining, lot.remaining);
      const pnl = (sellPrice - lot.buyPrice) * matchedQuantity;
      const cost = lot.buyPrice * matchedQuantity;
      closedLots.push({
        symbol,
        quantity: matchedQuantity,
        buyDay: lot.buyDay,
        sellDay: decision.day,
        buyPrice: lot.buyPrice,
        sellPrice,
        holdingDays: Math.max(0, decision.day - lot.buyDay),
        cost,
        proceeds: sellPrice * matchedQuantity,
        pnl,
        returnPct: cost ? (pnl / cost) * 100 : 0,
      });
      lot.remaining -= matchedQuantity;
      sellRemaining -= matchedQuantity;
      if (lot.remaining <= 0) lots.shift();
    }
  }

  function buildOpenLots({ lotsBySymbol, finalDay, getPrice }) {
    return Object.values(lotsBySymbol).flat().filter((lot) => lot.remaining > 0).map((lot) => {
      const currentPrice = getPrice(lot.symbol, finalDay);
      const cost = lot.buyPrice * lot.remaining;
      const marketValue = currentPrice * lot.remaining;
      const unrealizedPnl = marketValue - cost;
      return {
        symbol: lot.symbol,
        quantity: lot.remaining,
        buyDay: lot.buyDay,
        buyPrice: lot.buyPrice,
        currentPrice,
        cost,
        marketValue,
        unrealizedPnl,
        returnPct: cost ? (unrealizedPnl / cost) * 100 : 0,
        holdingDays: Math.max(0, finalDay - lot.buyDay),
      };
    });
  }

  function chronologicalDecisions(decisions) {
    return (decisions || [])
      .filter(Boolean)
      .map((item, index) => ({
        ...item,
        originalIndex: Number.isFinite(item.originalIndex) ? item.originalIndex : index,
      }))
      .sort((a, b) => a.day - b.day || b.originalIndex - a.originalIndex);
  }

  return {
    buildTradeLedgerFromDecisions,
    chronologicalDecisions,
  };
});
