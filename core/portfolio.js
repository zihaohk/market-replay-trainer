(function portfolioModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayPortfolio = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPortfolioApi() {
  function clonePositions(positions = {}) {
    return Object.fromEntries(Object.entries(positions || {}).map(([symbol, position]) => [symbol, { ...position }]));
  }

  function getPositionValue(positions = {}, getPrice = () => 0) {
    return Object.entries(positions || {}).reduce((sum, [symbol, position]) => {
      const quantity = Number(position?.quantity) || 0;
      return sum + quantity * (Number(getPrice(symbol)) || 0);
    }, 0);
  }

  function getPortfolioTotals({ cash = 0, positions = {}, getPrice = () => 0 } = {}) {
    const positionValue = getPositionValue(positions, getPrice);
    return {
      positionValue,
      equity: roundPrice((Number(cash) || 0) + positionValue),
    };
  }

  function buildPreviewPortfolio({ cash = 0, positions = {}, side, symbol, quantity, price, amount } = {}) {
    const nextPositions = clonePositions(positions);
    let nextCash = Number(cash) || 0;
    const safeQuantity = Number(quantity) || 0;
    const safePrice = Number(price) || 0;
    const safeAmount = Number(amount) || 0;
    if (side === "buy" && safeQuantity > 0) {
      const current = nextPositions[symbol] || { quantity: 0, averageCost: safePrice };
      const nextQuantity = (Number(current.quantity) || 0) + safeQuantity;
      const nextCost = (Number(current.quantity) || 0) * (Number(current.averageCost) || 0) + safeQuantity * safePrice;
      nextPositions[symbol] = {
        quantity: nextQuantity,
        averageCost: nextQuantity ? roundPrice(nextCost / nextQuantity) : safePrice,
      };
      nextCash -= safeAmount;
    } else if (side === "sell" && safeQuantity > 0) {
      const current = nextPositions[symbol];
      if (current) {
        const nextQuantity = Math.max(0, (Number(current.quantity) || 0) - safeQuantity);
        if (nextQuantity > 0) nextPositions[symbol] = { ...current, quantity: nextQuantity };
        else delete nextPositions[symbol];
      }
      nextCash += safeAmount;
    }
    return { positions: nextPositions, cash: nextCash };
  }

  function applyBuy({ cash = 0, positions = {}, symbol, quantity, amount } = {}) {
    const nextPositions = clonePositions(positions);
    const current = nextPositions[symbol] || { quantity: 0, averageCost: 0 };
    const safeQuantity = Number(quantity) || 0;
    const safeAmount = Number(amount) || 0;
    const nextQuantity = (Number(current.quantity) || 0) + safeQuantity;
    const nextCost = (Number(current.quantity) || 0) * (Number(current.averageCost) || 0) + safeAmount;
    if (nextQuantity > 0) {
      nextPositions[symbol] = {
        quantity: nextQuantity,
        averageCost: roundPrice(nextCost / nextQuantity),
      };
    }
    return {
      positions: nextPositions,
      cash: roundPrice((Number(cash) || 0) - safeAmount),
    };
  }

  function applySell({ cash = 0, positions = {}, symbol, quantity, amount } = {}) {
    const nextPositions = clonePositions(positions);
    const current = nextPositions[symbol];
    const safeQuantity = Number(quantity) || 0;
    if (current) {
      current.quantity = (Number(current.quantity) || 0) - safeQuantity;
      if (current.quantity <= 0) delete nextPositions[symbol];
    }
    return {
      positions: nextPositions,
      cash: roundPrice((Number(cash) || 0) + (Number(amount) || 0)),
    };
  }

  function getSymbolWeightPct({ positions = {}, symbol, equity = 0, getPrice = () => 0 } = {}) {
    const position = positions?.[symbol];
    const safeEquity = Number(equity) || 0;
    if (!position || safeEquity <= 0) return 0;
    return ((Number(position.quantity) || 0) * (Number(getPrice(symbol)) || 0) / safeEquity) * 100;
  }

  function getMaxConcentrationPct({ positions = {}, equity = 0, getPrice = () => 0 } = {}) {
    const safeEquity = Number(equity) || 0;
    if (safeEquity <= 0) return 0;
    return Object.entries(positions || {}).reduce((max, [symbol, position]) => {
      return Math.max(max, ((Number(position.quantity) || 0) * (Number(getPrice(symbol)) || 0) / safeEquity) * 100);
    }, 0);
  }

  function roundPrice(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  return {
    clonePositions,
    getPositionValue,
    getPortfolioTotals,
    buildPreviewPortfolio,
    applyBuy,
    applySell,
    getSymbolWeightPct,
    getMaxConcentrationPct,
  };
});
