(function riskDashboardUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayRiskDashboardUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRiskDashboardUiApi() {
  function renderRiskDashboard(dashboard = {}, options = {}) {
    const helpers = buildHelpers(options);
    const alerts = Array.isArray(dashboard.alerts) ? dashboard.alerts : [];
    return `
    <div class="risk-main">
      <div class="risk-metrics">
        <div class="risk-card"><span>现金比例</span><strong class="${Number(dashboard.cashPct) < Number(dashboard.reserveCashPct) ? "negative" : ""}">${helpers.formatPlainPercent(dashboard.cashPct)}</strong></div>
        <div class="risk-card"><span>已结算现金</span><strong>${helpers.formatCurrency(dashboard.settlement?.settledCash)}</strong></div>
        <div class="risk-card"><span>港币口径收益</span><strong class="${Number(dashboard.funding?.homeReturnPct) >= 0 ? "positive" : "negative"}">${helpers.formatPercent(dashboard.funding?.homeReturnPct)}</strong></div>
        <div class="risk-card"><span>最大回撤</span><strong class="${Number(dashboard.maxDrawdownPct) >= 5 ? "negative" : ""}">${helpers.formatPlainPercent(dashboard.maxDrawdownPct)}</strong></div>
        <div class="risk-card"><span>最大仓位</span><strong>${helpers.formatPlainPercent(dashboard.maxPositionPct)}</strong></div>
        <div class="risk-card"><span>换手率</span><strong>${helpers.formatPlainPercent(dashboard.turnoverPct)}</strong></div>
      </div>
      <div class="risk-alerts">
        ${alerts.map((alert) => `
          <div class="risk-alert is-${helpers.escapeHtml(alert.level)}">
            <strong>${helpers.escapeHtml(alert.title)}</strong>
            <span>${helpers.escapeHtml(alert.detail)}</span>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="risk-exposures">
      <section>
        <h3>持仓暴露</h3>
        <div class="exposure-list">${(dashboard.positionRows || []).map((row) => renderExposureRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>行业暴露</h3>
        <div class="exposure-list">${(dashboard.sectorRows || []).map((row) => renderExposureRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>压力测试</h3>
        <div class="stress-list">${(dashboard.stressRows || []).map((row) => renderStressRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>隔夜跳空</h3>
        <div class="position-plan-list">${(dashboard.gapRows || []).map((row) => renderGapRiskRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>事件日风险</h3>
        <div class="position-plan-list">${(dashboard.eventRiskRows || []).map((row) => renderEventRiskRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>配置蓝图</h3>
        <div class="position-plan-list">${(dashboard.allocationStatus?.items || []).map((row) => renderAllocationRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>资金与汇率</h3>
        <div class="position-plan-list">${renderFundingDashboardRows(dashboard.funding || {}, helpers)}</div>
      </section>
      <section>
        <h3>资金结算</h3>
        <div class="position-plan-list">${renderSettlementDashboardRows(dashboard.settlement || {}, helpers)}</div>
      </section>
      <section>
        <h3>持仓计划</h3>
        <div class="position-plan-list">${(dashboard.planRows || []).map((row) => renderPositionPlanRow(row, helpers)).join("")}</div>
      </section>
      <section>
        <h3>盘中复查</h3>
        ${options.checkpointPanelHtml || ""}
      </section>
    </div>
  `;
  }

  function renderCheckpointLogPanel({ symbols = [], logs = [], selectedSymbol = "", revealed = false } = {}, options = {}) {
    const helpers = buildHelpers(options);
    return `
    <div class="position-plan-row">
      <div class="form-grid">
        <label>
          复查标的
          <select id="checkpointSymbolInput">
            ${symbols.map((symbol) => `<option value="${helpers.escapeHtml(symbol)}" ${symbol === selectedSymbol ? "selected" : ""}>${helpers.escapeHtml(symbol)}</option>`).join("")}
          </select>
        </label>
        <label>
          当前判断
          <select id="checkpointBiasInput">
            <option value="unchanged">原计划仍成立</option>
            <option value="improving">证据改善</option>
            <option value="deteriorating">证据恶化</option>
            <option value="uncertain">不确定，先降速</option>
          </select>
        </label>
        <label>
          后续动作
          <select id="checkpointActionInput">
            <option value="hold">按计划持有</option>
            <option value="trim">减仓/再平衡</option>
            <option value="stop">止损/退出</option>
            <option value="add-no">禁止加仓</option>
            <option value="wait">继续观察</option>
          </select>
        </label>
        <label class="checkbox-line">
          <input id="checkpointRiskChangedInput" type="checkbox" />
          风险已经变化
        </label>
      </div>
      <label>
        复查记录
        <textarea id="checkpointNoteInput" rows="2" placeholder="写清楚：原计划是否还成立、哪条证据改变了、下一次什么条件再处理。"></textarea>
      </label>
      <div class="reflection-actions">
        <button class="mini-button" type="button" data-save-checkpoint-log ${revealed ? "disabled" : ""}>保存复查</button>
        <span>${revealed ? "复盘后不能再新增复查记录。" : "保存后会刷新持仓计划的最近复查时间。"}</span>
      </div>
    </div>
    <div class="position-plan-list">
      ${logs.map((log) => renderCheckpointLogRow(log, helpers)).join("") || `<div class="position-plan-row is-warn"><p>还没有复查记录。买入后不要只看盈亏，要定期写清楚原计划是否仍成立。</p></div>`}
    </div>
  `;
  }

  function renderCheckpointLogRow(log, helpers = buildHelpers({})) {
    return `
    <div class="position-plan-row is-${log.riskChanged || log.bias === "deteriorating" ? "warn" : "good"}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(log.symbol)} · 第 ${helpers.displayDay(log.day)} 天复查</strong>
        <span>${helpers.escapeHtml(helpers.checkpointBiasLabel(log.bias))} · ${helpers.escapeHtml(helpers.checkpointActionLabel(log.action))}</span>
      </div>
      <p>${helpers.escapeHtml(log.note || "")}</p>
    </div>
  `;
  }

  function renderExposureRow(row, helpers) {
    const width = Math.min(100, Math.max(0, Number(row.weightPct) || 0));
    return `
    <div class="exposure-row">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.label)}</strong>
        <span>${helpers.formatPlainPercent(row.weightPct)}</span>
      </div>
      <div class="exposure-bar"><div class="exposure-fill ${helpers.escapeHtml(row.level || "")}" style="width:${width}%"></div></div>
      <span>${helpers.escapeHtml(row.detail)}</span>
    </div>
  `;
  }

  function renderStressRow(row, helpers) {
    return `
    <div class="stress-row is-${helpers.escapeHtml(row.level)}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.label)}</strong>
        <span>${helpers.escapeHtml(row.shock)}</span>
      </div>
      <div class="stress-metrics">
        <span>潜在亏损 ${helpers.formatCurrency(row.loss)}</span>
        <span>权益影响 ${helpers.formatPlainPercent(row.lossPct)}</span>
        <span>冲击后 ${helpers.formatCurrency(row.afterEquity)}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `;
  }

  function renderGapRiskRow(row, helpers) {
    return `
    <div class="position-plan-row is-${helpers.escapeHtml(row.level)}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.symbol)} · ${helpers.escapeHtml(row.name)}</strong>
        <span>${helpers.formatPercent(row.gapPct)}</span>
      </div>
      <div class="plan-metrics">
        <span>前收 ${helpers.formatCurrency(row.previousClose)}</span>
        <span>今开 ${helpers.formatCurrency(row.open)}</span>
        <span>日内 ${helpers.formatPercent(row.dayChangePct)}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `;
  }

  function renderEventRiskRow(row, helpers) {
    return `
    <div class="position-plan-row is-${helpers.escapeHtml(row.level)}">
      <div class="exposure-title">
        <strong>第 ${helpers.displayDay(row.day)} 天 · ${helpers.escapeHtml(row.title)}</strong>
        <span>${helpers.escapeHtml(row.statusLabel)} · ${helpers.escapeHtml(row.typeLabel)}</span>
      </div>
      <div class="plan-metrics">
        <span>${helpers.escapeHtml(helpers.eventRiskLevelLabel(row.riskLevel))}</span>
        <span>${Number(row.daysUntil) > 0 ? `${row.daysUntil} 天后` : Number(row.daysUntil) < 0 ? `已过 ${Math.abs(row.daysUntil)} 天` : "今天"}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `;
  }

  function renderPositionPlanRow(row, helpers) {
    return `
    <div class="position-plan-row is-${helpers.escapeHtml(row.level)}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.title)}</strong>
        <span>${helpers.escapeHtml(row.statusLabel)}</span>
      </div>
      <div class="plan-metrics">
        <span>浮动 ${helpers.formatCurrency(row.unrealizedPnl)} / ${helpers.formatPlainPercent(row.pnlPct)}</span>
        <span>最大不利 ${helpers.formatPlainPercent(row.maxAdversePct)}</span>
        <span>${row.riskLimitPct ? `自定亏损线 ${helpers.formatPlainPercent(row.riskLimitPct)}` : "未写亏损线"}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
      <p><strong>失效条件：</strong>${helpers.escapeHtml(row.invalidation)}</p>
      <p><strong>下一步：</strong>${helpers.escapeHtml(row.actionHint)}</p>
    </div>
  `;
  }

  function renderAllocationRow(row, helpers) {
    return `
    <div class="position-plan-row is-${row.status === "fail" ? "danger" : row.status === "warn" || row.status === "pending" ? "warn" : "good"}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.title)}</strong>
        <span>${helpers.escapeHtml(helpers.missionStatusLabel(row.status))}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `;
  }

  function renderFundingDashboardRows(funding, helpers) {
    const rows = [
      {
        title: "入金口径",
        detail: `模拟港币入金 ${helpers.formatHomeCurrency(funding.initialHomeDeposit)}，换汇后获得可交易美元 ${helpers.formatCurrency(funding.initialUsdCash)}。`,
        status: "good",
      },
      {
        title: "换汇成本",
        detail: `假设换汇成本 ${helpers.formatPlainPercent((Number(funding.fxFeeBps) || 0) / 100)}，约 ${helpers.formatCurrency(funding.initialFxCostUsd)} / ${helpers.formatHomeCurrency(funding.initialFxCostHome)}。`,
        status: Number(funding.fxFeeBps) > 35 ? "warn" : "good",
      },
      {
        title: "港币口径收益",
        detail: `当前总资产折合 ${helpers.formatHomeCurrency(funding.equityHome)}，相对初始港币入金 ${helpers.formatPercent(funding.homeReturnPct)}；美元口径为 ${helpers.formatPercent(funding.usdReturnPct)}。`,
        status: Number(funding.homeReturnPct) >= 0 ? "good" : "warn",
      },
    ];
    return rows.map((row) => `
    <div class="position-plan-row is-${helpers.escapeHtml(row.status)}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.title)}</strong>
        <span>${row.status === "good" ? "已纳入" : "需注意"}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `).join("");
  }

  function renderSettlementDashboardRows(settlement, helpers) {
    const rows = [
      {
        title: "已结算现金",
        detail: `当前已结算现金 ${helpers.formatCurrency(settlement.settledCash)}，可用于训练中不触发结算提醒的买入。`,
        status: "good",
      },
      {
        title: "未结算卖出款",
        detail: Number(settlement.unsettledProceeds)
          ? `当前有 ${helpers.formatCurrency(settlement.unsettledProceeds)} 卖出款未完成 ${settlement.cycle} 结算，待结算记录 ${Number(settlement.pendingCount) || 0} 条。`
          : `当前没有未结算卖出款。美股训练默认按 ${settlement.cycle} 处理。`,
        status: Number(settlement.unsettledProceeds) ? "warn" : "good",
      },
      {
        title: "今日到期结算",
        detail: Number(settlement.dueTodayCount)
          ? `有 ${Number(settlement.dueTodayCount) || 0} 条卖出款到达结算日，推进时间后会自动转为已结算。`
          : "当前没有到期但未处理的结算记录。",
        status: Number(settlement.dueTodayCount) ? "warn" : "good",
      },
    ];
    return rows.map((row) => `
    <div class="position-plan-row is-${helpers.escapeHtml(row.status)}">
      <div class="exposure-title">
        <strong>${helpers.escapeHtml(row.title)}</strong>
        <span>${row.status === "good" ? "正常" : "需注意"}</span>
      </div>
      <p>${helpers.escapeHtml(row.detail)}</p>
    </div>
  `).join("");
  }

  function buildHelpers(options = {}) {
    return {
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml,
      formatCurrency: typeof options.formatCurrency === "function" ? options.formatCurrency : defaultCurrency,
      formatHomeCurrency: typeof options.formatHomeCurrency === "function" ? options.formatHomeCurrency : defaultHomeCurrency,
      formatPercent: typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent,
      formatPlainPercent: typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultPlainPercent,
      displayDay: typeof options.displayDay === "function" ? options.displayDay : (day) => String((Number(day) || 0) + 1),
      eventRiskLevelLabel: typeof options.eventRiskLevelLabel === "function" ? options.eventRiskLevelLabel : (level) => level || "事件风险",
      missionStatusLabel: typeof options.missionStatusLabel === "function" ? options.missionStatusLabel : (status) => status || "未记录",
      checkpointBiasLabel: typeof options.checkpointBiasLabel === "function" ? options.checkpointBiasLabel : (bias) => bias || "未记录",
      checkpointActionLabel: typeof options.checkpointActionLabel === "function" ? options.checkpointActionLabel : (action) => action || "未记录",
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
    return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function defaultHomeCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "HK$0.00";
    return `HK$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  return {
    renderRiskDashboard,
    renderCheckpointLogPanel,
    renderCheckpointLogRow,
    renderExposureRow,
    renderStressRow,
    renderGapRiskRow,
    renderEventRiskRow,
    renderPositionPlanRow,
    renderAllocationRow,
    renderFundingDashboardRows,
    renderSettlementDashboardRows,
  };
});
