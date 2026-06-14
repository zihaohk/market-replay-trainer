(function runtimeModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRuntimeApi() {
  function activePendingOrders(state = {}) {
    return (state.pendingOrders || []).filter((order) => order.status === "active");
  }

  function processSettlementLedger({ state, settlementPolicy, day = state?.day, formatCurrency = defaultFormatCurrency, nowIso = defaultNowIso } = {}) {
    state.settlementLedger = state.settlementLedger || [];
    const events = [];
    state.settlementLedger.forEach((entry) => {
      if (entry.status === "settled") return;
      if (day >= entry.settleDay) {
        entry.status = "settled";
        entry.settledAtDay = day;
        entry.settledAt = nowIso();
        events.push({
          type: "settlement",
          message: `资金结算：${entry.symbol} 卖出款 ${formatCurrency(entry.amount)} 已按 ${settlementPolicy.label} 结算。`,
        });
      }
    });
    return events;
  }

  function recordSettlementEntry({
    state,
    settlementPolicy,
    symbol,
    quantity,
    price,
    amount,
    tradeDay = state?.day || 0,
    currentCaseLength = 0,
    roundPrice = defaultRoundPrice,
    idFactory = defaultIdFactory,
    nowIso = defaultNowIso,
  } = {}) {
    state.settlementLedger = state.settlementLedger || [];
    const settleDay = Math.min(currentCaseLength, tradeDay + settlementPolicy.cycleDays);
    const entry = {
      id: idFactory("settle"),
      symbol,
      quantity,
      price,
      amount: roundPrice(amount),
      tradeDay,
      settleDay,
      cycle: settlementPolicy.label,
      status: tradeDay >= settleDay ? "settled" : "pending",
      createdAt: nowIso(),
    };
    state.settlementLedger.unshift(entry);
    return entry;
  }

  function processCorporateActions({
    state,
    selectedCase,
    taxProfile,
    roundPrice = defaultRoundPrice,
    formatCurrency = defaultFormatCurrency,
    formatPlainPercent = defaultFormatPlainPercent,
    formatNumber = defaultFormatNumber,
    nowIso = defaultNowIso,
  } = {}) {
    const actions = (selectedCase?.corporateActions || []).filter((action) => action.day === state.day);
    if (!actions.length) return [];
    state.corporateActionLog = state.corporateActionLog || [];
    const events = [];
    actions.forEach((action) => {
      const key = corporateActionKey(selectedCase, action);
      if (state.corporateActionLog.some((item) => item.key === key)) return;
      const position = state.positions[action.symbol];
      const quantityBefore = Number(position?.quantity) || 0;
      const averageCostBefore = Number(position?.averageCost) || 0;
      let quantityAfter = quantityBefore;
      let averageCostAfter = averageCostBefore;
      let cashDelta = 0;
      let grossDividend = 0;
      let taxWithheld = 0;
      let withholdingRatePct = 0;
      const affected = quantityBefore > 0;
      let note = action.detail || corporateActionHint(action, { taxProfile, formatCurrency, formatPlainPercent });

      if (action.type === "dividend") {
        withholdingRatePct = Number.isFinite(Number(action.withholdingRatePct))
          ? Number(action.withholdingRatePct)
          : taxProfile.dividendWithholdingRatePct;
        grossDividend = affected ? roundPrice(quantityBefore * (Number(action.cashPerShare) || 0)) : 0;
        taxWithheld = roundPrice(grossDividend * withholdingRatePct / 100);
        cashDelta = roundPrice(grossDividend - taxWithheld);
        if (cashDelta > 0) state.cash = roundPrice(state.cash + cashDelta);
      } else if (action.type === "split") {
        const ratio = Number(action.ratio) || 1;
        if (affected && action.adjustHolding) {
          quantityAfter = Math.round(quantityBefore * ratio);
          averageCostAfter = roundPrice(averageCostBefore / ratio);
          state.positions[action.symbol] = {
            ...position,
            quantity: quantityAfter,
            averageCost: averageCostAfter,
          };
        } else if (affected) {
          note = `${note} 当前训练使用调整价格，不自动改股数和成本，避免同一份复权价格被重复调整。`;
        }
      }

      const log = {
        key,
        day: action.day,
        symbol: action.symbol,
        type: action.type,
        title: action.title || corporateActionTypeLabel(action.type),
        detail: note,
        ratio: action.ratio || null,
        cashPerShare: action.cashPerShare || null,
        adjustHolding: Boolean(action.adjustHolding),
        affected,
        quantityBefore,
        quantityAfter,
        averageCostBefore,
        averageCostAfter,
        grossDividend,
        taxWithheld,
        withholdingRatePct,
        cashDelta,
        savedAt: nowIso(),
      };
      state.corporateActionLog.unshift(log);
      events.push({
        type: "corporate-action",
        message: `公司行动：${log.title} ${corporateActionEffectText(log, { formatCurrency, formatNumber })}`,
      });
    });
    return events;
  }

  function processPendingOrders({
    state,
    resolvePendingOrderStatus,
    buildDecisionFromPendingOrder,
    validateBuy,
    executeBuy,
    executeSell,
    findCashAccountSaleWarnings,
    decisionLabel = (side) => side,
    formatCurrency = defaultFormatCurrency,
    nowIso = defaultNowIso,
  } = {}) {
    const events = [];
    state.pendingOrders = state.pendingOrders || [];
    state.pendingOrders.forEach((order) => {
      if (order.status !== "active") return;
      const orderStatus = resolvePendingOrderStatus(order, state.day);
      if (orderStatus.status === "expired") {
        order.status = "expired";
        order.closedDay = state.day;
        order.closedAt = nowIso();
        events.push({ type: "expired", message: `限价单过期：${order.symbol} ${decisionLabel(order.side)} ${order.quantity} 股。` });
        return;
      }
      const fill = orderStatus.fill;
      if (!fill) return;
      const decision = buildDecisionFromPendingOrder(order, fill);
      if (order.side === "buy") {
        const riskCheck = validateBuy(order.symbol, order.quantity, decision.amount);
        if (!riskCheck.ok) {
          order.status = "canceled";
          order.closedDay = state.day;
          order.cancelReason = riskCheck.message;
          events.push({ type: "canceled", message: `限价单取消：${order.symbol} ${riskCheck.message}` });
          return;
        }
        executeBuy(order.symbol, order.quantity, decision.price, decision.amount);
      } else if (order.side === "sell") {
        const position = state.positions[order.symbol];
        if (!position || position.quantity < order.quantity) {
          order.status = "canceled";
          order.closedDay = state.day;
          order.cancelReason = "持仓不足";
          events.push({ type: "canceled", message: `限价单取消：${order.symbol} 持仓不足。` });
          return;
        }
        decision.cashAccountWarnings = findCashAccountSaleWarnings(order.symbol, order.quantity, fill.day);
        executeSell(order.symbol, order.quantity, decision.price, decision.amount);
      }
      order.status = "filled";
      order.closedDay = state.day;
      order.fillPrice = decision.price;
      order.closedAt = nowIso();
      state.decisions.unshift(decision);
      events.push({ type: "filled", message: `限价单成交：${order.symbol} ${decisionLabel(order.side)} ${order.quantity} 股，${formatCurrency(decision.price)}。` });
    });
    return events;
  }

  function corporateActionKey(selectedCase, action) {
    return `${selectedCase.id}:${action.day}:${action.symbol}:${action.type}:${action.title || ""}`;
  }

  function corporateActionTypeLabel(type) {
    if (type === "dividend") return "现金分红";
    if (type === "split") return "拆股/复权口径";
    return "公司行动";
  }

  function corporateActionHint(action, { taxProfile = {}, formatCurrency = defaultFormatCurrency, formatPlainPercent = defaultFormatPlainPercent } = {}) {
    if (action.type === "dividend") {
      const rate = Number.isFinite(Number(action.withholdingRatePct)) ? Number(action.withholdingRatePct) : taxProfile.dividendWithholdingRatePct;
      return action.detail || `每股现金分红 ${formatCurrency(Number(action.cashPerShare) || 0)}，训练默认先按 ${formatPlainPercent(rate)} 预扣股息税，账户增加净到账现金。`;
    }
    if (action.type === "split") {
      return action.detail || `拆股比例 ${Number(action.ratio) || 1}:1。训练时要先确认价格数据是否已经复权，避免重复调整持仓。`;
    }
    return action.detail || "公司行动会影响价格口径、现金或持仓，需要和普通新闻分开看。";
  }

  function corporateActionEffectText(item, { formatCurrency = defaultFormatCurrency, formatNumber = defaultFormatNumber } = {}) {
    if (item.type === "dividend") {
      return item.affected
        ? `毛分红 ${formatCurrency(item.grossDividend || item.cashDelta || 0)}，预扣 ${formatCurrency(item.taxWithheld || 0)}，净到账 ${formatCurrency(item.cashDelta)}，持仓 ${formatNumber(item.quantityBefore)} 股。`
        : "当时没有持仓，所以没有现金到账。";
    }
    if (item.type === "split") {
      if (item.adjustHolding && item.affected) {
        return `拆股后股数 ${formatNumber(item.quantityBefore)} -> ${formatNumber(item.quantityAfter)}，成本 ${formatCurrency(item.averageCostBefore)} -> ${formatCurrency(item.averageCostAfter)}。`;
      }
      return item.affected
        ? "已记录拆股/复权口径提示；本训练不重复调整持仓。"
        : "当时没有持仓，只记录拆股/复权口径提示。";
    }
    return item.affected ? "公司行动已记录。" : "当时没有持仓，公司行动仅作记录。";
  }

  function defaultRoundPrice(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function defaultFormatCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "$0.00";
    return `$${number.toFixed(2)}`;
  }

  function defaultFormatPlainPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "暂无";
    return `${Math.round(number)}%`;
  }

  function defaultFormatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  function defaultIdFactory(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function defaultNowIso() {
    return new Date().toISOString();
  }

  return {
    activePendingOrders,
    processSettlementLedger,
    recordSettlementEntry,
    processCorporateActions,
    processPendingOrders,
    corporateActionKey,
    corporateActionTypeLabel,
    corporateActionHint,
    corporateActionEffectText,
  };
});
