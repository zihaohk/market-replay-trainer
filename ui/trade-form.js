(function tradeFormUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayTradeFormUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTradeFormUiApi() {
  function renderSymbolOptions(rows = [], options = {}) {
    const helpers = buildHelpers(options);
    return rows.map((row) => `
      <option value="${helpers.escapeHtml(row.symbol)}">${helpers.escapeHtml(row.symbol)} - ${helpers.escapeHtml(row.name)}</option>
    `).join("");
  }

  function renderClosedOrderPreview() {
    return `<div class="preview-warning">案例已复盘，不能再追加决策。</div>`;
  }

  function renderClosedDecisionCoach() {
    return `<div class="coach-summary is-good"><strong>训练已结束</strong><span>请把注意力放到复盘报告和下一轮补练。</span></div>`;
  }

  function renderOrderPreview(preview = {}, lessonGate = {}, options = {}) {
    const helpers = buildHelpers(options);
    const warningClass = preview.level === "danger" ? "danger" : preview.level === "good" ? "positive" : "";
    return `
    <div class="preview-grid">
      <div class="preview-card"><span>预计成交价</span><strong>${helpers.formatCurrency(preview.price)}</strong></div>
      <div class="preview-card"><span>预计金额</span><strong>${helpers.formatCurrency(preview.amount)}</strong></div>
      <div class="preview-card"><span>折合港币</span><strong>${helpers.formatHomeCurrency(preview.fundingScenario?.amountHome || 0)}</strong></div>
      <div class="preview-card"><span>交易摩擦</span><strong>${helpers.formatCurrency(preview.frictionCost || 0)}</strong></div>
      <div class="preview-card"><span>成交占比</span><strong>${helpers.formatPlainPercent(preview.liquidityScenario?.volumeSharePct || 0)}</strong></div>
      <div class="preview-card"><span>交易后现金</span><strong>${helpers.formatCurrency(preview.nextCash)}</strong></div>
      <div class="preview-card"><span>标的仓位</span><strong>${helpers.formatPercent(preview.symbolWeightPct)}</strong></div>
    </div>
    ${renderTradeRiskScenario(preview.riskScenario, helpers)}
    ${renderLiquidityScenario(preview.liquidityScenario, helpers)}
    ${renderFundingScenario(preview.fundingScenario, helpers)}
    ${renderSettlementScenario(preview.settlementScenario, helpers)}
    <div class="preview-warning ${lessonGate.passed ? warningClass : "danger"}">${helpers.escapeHtml(lessonGate.passed ? preview.message : lessonGate.message)}</div>
  `;
  }

  function renderTradeRiskScenario(scenario, helpers = buildHelpers({})) {
    if (!scenario) return "";
    return `
    <div class="trade-risk-scenario is-${helpers.escapeHtml(scenario.level)}">
      <div class="scenario-head">
        <strong>单笔风险预算</strong>
        <span>${helpers.escapeHtml(scenario.label)}</span>
      </div>
      <div class="scenario-grid">
        <span>止损参考 ${scenario.stopPrice ? helpers.formatCurrency(scenario.stopPrice) : "无"}</span>
        <span>计划亏损 ${helpers.formatCurrency(scenario.lossAtStop)}</span>
        <span>账户风险 ${helpers.formatPlainPercent(scenario.accountRiskPct)}</span>
        <span>2R 目标 ${scenario.rewardTargetPrice ? helpers.formatCurrency(scenario.rewardTargetPrice) : "无"}</span>
      </div>
      <p>${helpers.escapeHtml(scenario.detail)}</p>
    </div>
  `;
  }

  function renderLiquidityScenario(scenario, helpers = buildHelpers({})) {
    if (!scenario) return "";
    return `
    <div class="trade-risk-scenario is-${helpers.escapeHtml(scenario.level)}">
      <div class="scenario-head">
        <strong>流动性与成交冲击</strong>
        <span>${helpers.escapeHtml(scenario.label)}</span>
      </div>
      <div class="scenario-grid">
        <span>当日成交量 ${helpers.formatCompactNumber(scenario.dayVolume)}</span>
        <span>订单占量 ${helpers.formatPlainPercent(scenario.volumeSharePct)}</span>
        <span>成交额占比 ${helpers.formatPlainPercent(scenario.dollarVolumeSharePct)}</span>
        <span>估算冲击 ${helpers.formatCurrency(scenario.impactCost)}</span>
      </div>
      <p>${helpers.escapeHtml(scenario.detail)}</p>
    </div>
  `;
  }

  function renderFundingScenario(scenario, helpers = buildHelpers({})) {
    if (!scenario) return "";
    return `
    <div class="trade-risk-scenario is-${helpers.escapeHtml(scenario.level)}">
      <div class="scenario-head">
        <strong>资金与汇率口径</strong>
        <span>${helpers.escapeHtml(scenario.rateLabel)}</span>
      </div>
      <div class="scenario-grid">
        <span>入金 ${helpers.formatHomeCurrency(scenario.initialHomeDeposit)}</span>
        <span>可用美元 ${helpers.formatCurrency(scenario.initialUsdCash)}</span>
        <span>换汇成本 ${helpers.formatCurrency(scenario.initialFxCostUsd)}</span>
        <span>港币口径收益 ${helpers.formatPercent(scenario.homeReturnPct)}</span>
      </div>
      <p>${helpers.escapeHtml(scenario.detail)}</p>
    </div>
  `;
  }

  function renderSettlementScenario(scenario, helpers = buildHelpers({})) {
    if (!scenario) return "";
    return `
    <div class="trade-risk-scenario is-${helpers.escapeHtml(scenario.level)}">
      <div class="scenario-head">
        <strong>资金结算</strong>
        <span>${helpers.escapeHtml(scenario.cycle)}</span>
      </div>
      <div class="scenario-grid">
        <span>已结算现金 ${helpers.formatCurrency(scenario.settledCash)}</span>
        <span>未结算卖出款 ${helpers.formatCurrency(scenario.unsettledProceeds)}</span>
        <span>交易后已结算 ${helpers.formatCurrency(scenario.nextSettledCash)}</span>
        <span>${scenario.usesUnsettledCash ? "动用未结算" : "未动用未结算"}</span>
      </div>
      <p>${helpers.escapeHtml(scenario.detail)}</p>
    </div>
  `;
  }

  function renderDecisionCoach(coach = {}, options = {}) {
    const helpers = buildHelpers(options);
    const items = Array.isArray(coach.items) ? coach.items : [];
    const summaryClass = coach.level === "danger" ? "is-danger" : coach.level === "warn" ? "is-warn" : "is-good";
    return `
    <div class="coach-summary ${summaryClass}">
      <strong>决策教练 · ${Number(coach.score) || 0}/100</strong>
      <span>${helpers.escapeHtml(coach.summary)}</span>
    </div>
    <div class="coach-grid">
      ${items.map((item) => `
        <article class="coach-card is-${helpers.escapeHtml(item.level)}">
          <strong>${helpers.escapeHtml(item.title)}</strong>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("")}
    </div>
  `;
  }

  function renderSizingHint(summary = {}, options = {}) {
    const helpers = buildHelpers(options);
    if (summary.revealed) return "案例已复盘，仓位计算器已停止。";
    if (summary.selectedSide === "hold") return "观望时先写清楚等待条件，不需要计算股数。";

    const quantity = Math.max(0, Number.parseInt(summary.quantity, 10) || 0);
    const amount = Number(summary.amount) || 0;
    const base = `${summary.symbol} 当前价 ${helpers.formatCurrency(summary.price)}，当前仓位 ${helpers.formatPlainPercent(summary.currentWeight)}，${quantity || 1} 股约 ${helpers.formatCurrency(quantity ? amount : summary.price)}。`;
    if (!summary.result) return `${base} 输入目标仓位、金额或单笔风险后点击换算。`;

    const capText = summary.result.capped ? " 已按现金或持仓上限截断。" : "";
    const zeroText = summary.result.quantity <= 0 ? " 这个目标换算不出 1 股，说明目标太小、现金不足，或当前仓位已经达到目标。" : "";
    return `${base} ${summary.result.message} 可换算 ${summary.result.quantity} 股。${capText}${zeroText}`.trim();
  }

  function buildHelpers(options = {}) {
    return {
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml,
      formatCurrency: typeof options.formatCurrency === "function" ? options.formatCurrency : defaultCurrency,
      formatHomeCurrency: typeof options.formatHomeCurrency === "function" ? options.formatHomeCurrency : defaultHomeCurrency,
      formatPercent: typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent,
      formatPlainPercent: typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultPlainPercent,
      formatCompactNumber: typeof options.formatCompactNumber === "function" ? options.formatCompactNumber : defaultCompactNumber,
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

  function defaultCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "$0.00";
    return `$${number.toFixed(2)}`;
  }

  function defaultHomeCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "HK$0.00";
    return `HK$${number.toFixed(2)}`;
  }

  function defaultPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  }

  function defaultPlainPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number.toFixed(2)}%`;
  }

  function defaultCompactNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}K`;
    return String(number);
  }

  return {
    renderSymbolOptions,
    renderClosedOrderPreview,
    renderClosedDecisionCoach,
    renderOrderPreview,
    renderTradeRiskScenario,
    renderLiquidityScenario,
    renderFundingScenario,
    renderSettlementScenario,
    renderDecisionCoach,
    renderSizingHint,
  };
});
