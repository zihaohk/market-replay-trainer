(function historyUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayHistoryUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHistoryUiApi() {
  function renderPositions(rows = [], options = {}) {
    const helpers = buildHelpers(options);
    if (!rows.length) return `<tr><td class="empty-row" colspan="6">暂无持仓</td></tr>`;

    return rows.map((row) => {
      const pnl = Number(row.pnl) || 0;
      return `
        <tr>
          <td><strong>${helpers.escapeHtml(row.symbol)}</strong></td>
          <td>${helpers.formatNumber(row.quantity)}</td>
          <td>${helpers.formatCurrency(row.averageCost)}</td>
          <td>${helpers.formatCurrency(row.price)}</td>
          <td>${helpers.formatCurrency(row.value)}</td>
          <td class="${pnl >= 0 ? "positive" : "negative"}">${helpers.formatCurrency(pnl)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderHistory(summary = {}, options = {}) {
    const helpers = buildHelpers(options);
    const orders = Array.isArray(summary.orders) ? summary.orders : [];
    const corporateActions = Array.isArray(summary.corporateActions) ? summary.corporateActions : [];
    const decisions = Array.isArray(summary.decisions) ? summary.decisions : [];

    if (!decisions.length && !orders.length && !corporateActions.length) {
      return `<article class="history-item"><p>还没有决策记录。训练重点不是多交易，而是每次决定都有清楚理由。</p></article>`;
    }

    const orderHtml = orders.slice(0, 5).map((order) => renderPendingOrder(order, summary, helpers)).join("");
    const corporateActionHtml = corporateActions.slice(0, 5).map((item) => renderCorporateAction(item, helpers)).join("");
    const decisionHtml = decisions.slice(0, 10).map((item) => renderDecision(item, summary, helpers)).join("");
    return `${corporateActionHtml}${orderHtml}${decisionHtml}`;
  }

  function renderPendingOrder(order = {}, summary = {}, helpers = buildHelpers({})) {
    const fillText = order.fillPrice ? ` · 成交价 ${helpers.formatCurrency(order.fillPrice)}` : "";
    const cancelText = order.cancelReason ? ` · ${helpers.escapeHtml(order.cancelReason)}` : "";
    const cancelButton = order.status === "active" && !summary.revealed
      ? `<button class="mini-danger-button" type="button" data-cancel-pending-order="${helpers.escapeHtml(order.id)}">取消挂单</button>`
      : "";
    return `
      <article class="history-item">
        <strong>第 ${helpers.displayDay(order.createdDay)} 天 · 限价${helpers.escapeHtml(helpers.decisionLabel(order.side))} · ${helpers.escapeHtml(order.symbol)}</strong>
        <p>${helpers.formatNumber(order.quantity)} 股，限价 ${helpers.formatCurrency(order.limitPrice)}，有效至第 ${helpers.displayDay(order.expiresDay)} 天。</p>
        <p>状态：${helpers.escapeHtml(helpers.pendingOrderStatusLabel(order.status))}${fillText}${cancelText}</p>
        ${cancelButton}
      </article>
    `;
  }

  function renderCorporateAction(item = {}, helpers = buildHelpers({})) {
    return `
      <article class="history-item">
        <strong>第 ${helpers.displayDay(item.day)} 天 · 公司行动 · ${helpers.escapeHtml(item.symbol)}</strong>
        <p>${helpers.escapeHtml(item.title)}</p>
        <p>${helpers.escapeHtml(helpers.corporateActionEffectText(item))}</p>
      </article>
    `;
  }

  function renderDecision(item = {}, summary = {}, helpers = buildHelpers({})) {
    const dateText = summary.revealed ? ` · ${helpers.getDecisionDate(item)}` : "";
    const fundingText = item.side !== "hold" && item.funding
      ? `<p>资金口径：折合 ${helpers.formatHomeCurrency(item.funding.amountHome)} · 汇率 ${helpers.escapeHtml(item.funding.usdHkdRate)}</p>`
      : "";
    const settlementText = item.side !== "hold" && item.settlement
      ? `<p>结算口径：${helpers.escapeHtml(item.settlement.cycle)} · 已结算 ${helpers.formatCurrency(item.settlement.settledCash)} · 未结算 ${helpers.formatCurrency(item.settlement.unsettledProceeds)}${item.settlement.usesUnsettledCash ? " · 动用未结算资金" : ""}</p>`
      : "";
    const warningsText = Array.isArray(item.cashAccountWarnings) && item.cashAccountWarnings.length
      ? `<p>现金账户提醒：${item.cashAccountWarnings.map((warning) => helpers.escapeHtml(warning.detail)).join("；")}</p>`
      : "";
    const frictionText = item.side !== "hold" && Number(item.frictionCost)
      ? `<p>交易摩擦：${helpers.formatCurrency(item.frictionCost)} · ${helpers.formatPlainPercent((item.frictionBps || 0) / 100)} 点差假设</p>`
      : "";
    const liquidityText = item.side !== "hold" && item.liquidity
      ? `<p>流动性：订单占量 ${helpers.formatPlainPercent(item.liquidity.volumeSharePct || 0)} · 估算冲击 ${helpers.formatCurrency(item.liquidity.impactCost || 0)}</p>`
      : "";
    const coachText = item.coach
      ? `<p>下单质量：${Number(item.coach.score) || 0}/100 · ${helpers.escapeHtml(helpers.coachLevelLabel(item.coach.level))}${Array.isArray(item.coach.issues) && item.coach.issues.length ? ` · ${item.coach.issues.map((issue) => helpers.escapeHtml(issue.title)).slice(0, 2).join("、")}` : ""}</p>`
      : `<p>下单质量：旧记录未保存</p>`;

    return `
      <article class="history-item">
        <strong>第 ${helpers.displayDay(item.day)} 天${helpers.escapeHtml(dateText)} · ${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
        <p>${item.side === "hold" ? "未交易" : `${helpers.formatNumber(item.quantity)} 股，${helpers.formatCurrency(item.price)}，金额 ${helpers.formatCurrency(item.amount)}`}</p>
        ${fundingText}
        ${settlementText}
        ${warningsText}
        ${frictionText}
        ${liquidityText}
        <p>计划：${helpers.escapeHtml(helpers.intentLabel(item.intent))} · ${helpers.escapeHtml(helpers.horizonLabel(item.horizon))} · 检查 ${helpers.planCheckCount(item.planChecks)}/3</p>
        <p>证据：${helpers.escapeHtml(helpers.evidenceSourceText(item.evidenceSources))}</p>
        ${coachText}
        <p>情绪：${helpers.escapeHtml(helpers.emotionLabel(item.emotion))} · 信心：${helpers.escapeHtml(helpers.confidenceLabel(item.confidence))} · 理由：${helpers.escapeHtml(item.reason)}</p>
      </article>
    `;
  }

  function buildHelpers(options = {}) {
    return {
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml,
      formatNumber: typeof options.formatNumber === "function" ? options.formatNumber : defaultNumber,
      formatCurrency: typeof options.formatCurrency === "function" ? options.formatCurrency : defaultCurrency,
      formatHomeCurrency: typeof options.formatHomeCurrency === "function" ? options.formatHomeCurrency : defaultHomeCurrency,
      formatPlainPercent: typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultPercent,
      displayDay: typeof options.displayDay === "function" ? options.displayDay : defaultDay,
      decisionLabel: typeof options.decisionLabel === "function" ? options.decisionLabel : defaultLabel,
      pendingOrderStatusLabel: typeof options.pendingOrderStatusLabel === "function" ? options.pendingOrderStatusLabel : defaultLabel,
      corporateActionEffectText: typeof options.corporateActionEffectText === "function" ? options.corporateActionEffectText : defaultLabel,
      getDecisionDate: typeof options.getDecisionDate === "function" ? options.getDecisionDate : () => "",
      intentLabel: typeof options.intentLabel === "function" ? options.intentLabel : defaultLabel,
      horizonLabel: typeof options.horizonLabel === "function" ? options.horizonLabel : defaultLabel,
      planCheckCount: typeof options.planCheckCount === "function" ? options.planCheckCount : defaultCount,
      evidenceSourceText: typeof options.evidenceSourceText === "function" ? options.evidenceSourceText : defaultLabel,
      coachLevelLabel: typeof options.coachLevelLabel === "function" ? options.coachLevelLabel : defaultLabel,
      emotionLabel: typeof options.emotionLabel === "function" ? options.emotionLabel : defaultLabel,
      confidenceLabel: typeof options.confidenceLabel === "function" ? options.confidenceLabel : defaultLabel,
    };
  }

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "0";
  }

  function defaultCurrency(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `$${number.toFixed(2)}` : "$0.00";
  }

  function defaultHomeCurrency(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `HK$${number.toFixed(2)}` : "HK$0.00";
  }

  function defaultPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(2)}%` : "0.00%";
  }

  function defaultDay(value) {
    const day = Number.parseInt(value, 10);
    return Number.isFinite(day) ? String(day + 1) : "1";
  }

  function defaultCount(value) {
    if (!Array.isArray(value)) return 0;
    return value.filter(Boolean).length;
  }

  function defaultLabel(value) {
    return String(value ?? "");
  }

  return {
    renderPositions,
    renderHistory,
    renderPendingOrder,
    renderCorporateAction,
    renderDecision,
  };
});
