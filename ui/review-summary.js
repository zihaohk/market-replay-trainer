(function reviewSummaryUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayReviewSummaryUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createReviewSummaryUiApi() {
  function renderReviewEvidenceIntro(review, options = {}) {
    const helpers = buildHelpers(options);
    return `
    <p><strong>数据来源核对：</strong></p>
    ${renderEvidenceSources(review?.evidence?.sources || [], helpers)}
    <p><strong>复盘资料包：</strong>${helpers.escapeHtml(review?.evidence?.sourcePack?.summary || "本案例没有内置复盘资料包。")}</p>
    ${renderSourcePack(review?.evidence?.sourcePack?.items || [], helpers)}
    <p><strong>事件证据时间线：</strong></p>
    ${renderEvidenceTimeline(review?.evidence?.timeline || [], helpers)}
    <p><strong>新闻判断校准：</strong>${helpers.escapeHtml(review?.newsCalibration?.summary || "本轮没有新闻判断校准。")}</p>
    ${renderNewsCalibration(review?.newsCalibration?.items || [], helpers)}
  `;
  }

  function renderReviewScoreGrid(review, options = {}) {
    const helpers = buildHelpers(options);
    const cards = buildScoreCards(review || {}, helpers);
    return `
    <div class="review-score">
      ${cards.map((card) => `
        <div class="score-card">
          <span>${helpers.escapeHtml(String(card.label ?? ""))}</span>
          <strong class="${helpers.escapeHtml(String(card.className || ""))}">${helpers.escapeHtml(String(card.value ?? ""))}</strong>
        </div>
      `).join("")}
    </div>
  `;
  }

  function renderReviewPlanSections(review, options = {}) {
    const helpers = buildHelpers(options);
    const sections = [
      renderPlanSection({
        title: "本关任务",
        summary: review?.mission?.plan?.objective || "本关没有任务目标。",
        rows: review?.mission?.items || [],
      }, helpers),
      renderPlanSection({
        title: "训练合约",
        summary: review?.contractStatus?.contract?.saved
          ? review.contractStatus.contract.objective
          : "本轮没有保存训练合约。",
        rows: review?.contractStatus?.items || [],
      }, helpers),
      renderPlanSection({
        title: "配置蓝图",
        summary: review?.allocationStatus?.blueprint?.saved
          ? review.allocationStatus.blueprint.objective
          : "本轮没有保存配置蓝图。",
        rows: review?.allocationStatus?.items || [],
      }, helpers),
      renderPlanSection({
        title: "市场假设",
        summary: review?.thesisQuality?.thesis?.saved
          ? review.thesisQuality.thesis.baseCase
          : "本轮没有保存市场假设。",
        rows: review?.thesisQuality?.items || [],
      }, helpers),
    ];
    if (review?.remediationResult) {
      sections.push(renderPlanSection({
        title: "处方执行",
        summary: review.remediationResult.passed ? "本轮补练达标。" : "本轮补练未达标，需要继续执行处方。",
        rows: review.remediationResult.items || [],
      }, helpers));
    }
    if (review?.activeTrainingPlanResult) {
      sections.push(renderPlanSection({
        title: "计划执行",
        summary: review.activeTrainingPlanResult.passed ? "本轮计划达标。" : "本轮计划未达标，下次继续按同一限制补练。",
        rows: review.activeTrainingPlanResult.items || [],
      }, helpers));
    }
    return sections.join("");
  }

  function renderBlindIntegritySection(blindIntegrityReview, options = {}) {
    const helpers = buildHelpers(options);
    const report = blindIntegrityReview || {};
    return `
    <p><strong>盲测完整性：</strong>${helpers.escapeHtml(report.summary || "暂无盲测完整性记录。")}</p>
    <div class="profit-plan-review-list">
      ${(report.rows || []).map((item) => `
        <article class="profit-plan-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day || 0)} 天 · ${helpers.escapeHtml(helpers.blindViolationTypeLabel(item.type))}</strong>
            <span class="tag ${item.level === "danger" ? "important" : "real"}">${item.level === "danger" ? "红色" : "提醒"}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("") || `<article class="profit-plan-review-card is-good"><p>${helpers.escapeHtml(report.active ? "本轮没有破坏盲测完整性的记录。" : "本轮不是随机盲测。想测试真实未知环境时，使用顶部“随机盲测”。")}</p></article>`}
    </div>
  `;
  }

  function renderRiskCoolingSection(riskCoolingReview, options = {}) {
    const helpers = buildHelpers(options);
    const report = riskCoolingReview || {};
    return `
    <p><strong>风险冷却：</strong>${helpers.escapeHtml(report.summary || "暂无风险冷却记录。")}</p>
    <div class="profit-plan-review-list">
      ${(report.items || []).map((item) => `
        <article class="profit-plan-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.title)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : "real"}">${item.type === "forbidden-buy" ? "违规加风险" : "防守记录"}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("") || `<article class="profit-plan-review-card is-${helpers.escapeHtml(report.level || "good")}"><p>${helpers.escapeHtml(report.active ? "触发风险冷却后还没有防守动作记录。" : "本轮没有触发风险冷却。")}</p></article>`}
    </div>
  `;
  }

  function renderDecisionQualitySection(review, options = {}) {
    const helpers = buildHelpers(options);
    const coachStats = review?.coachStats || {};
    const writingQuality = review?.writingQuality || {};
    const evidenceSourceReview = review?.evidenceSourceReview || {};
    const coachSummary = Number(coachStats.sampleCount)
      ? `保存 ${Number(coachStats.sampleCount) || 0} 条教练快照，平均 ${Math.round(Number(coachStats.averageScore) || 0)}/100；高风险 ${Number(coachStats.dangerCount) || 0} 次，提醒 ${Number(coachStats.warnCount) || 0} 次。`
      : "本轮没有保存下单前教练快照。";
    const writingSummary = Number(writingQuality.sampleCount)
      ? `平均 ${Math.round(Number(writingQuality.averageScore) || 0)}/100。${writingQuality.summary || ""}`
      : "本轮没有可评分文字样本。";
    return `
    <p><strong>下单前质量：</strong>${helpers.escapeHtml(coachSummary)}</p>
    ${renderIssueList(coachStats.topIssues || [], helpers)}
    <p><strong>决策文字质量：</strong>${helpers.escapeHtml(writingSummary)}</p>
    ${renderIssueList(writingQuality.issueCounts || [], helpers)}
    <p><strong>证据来源复盘：</strong>${helpers.escapeHtml(evidenceSourceReview.summary || "本轮没有证据来源复盘。")}</p>
    ${renderEvidenceSourceCards(evidenceSourceReview.rows || [], helpers)}
  `;
  }

  function renderFundingAndSettlementSection(review, options = {}) {
    const helpers = buildHelpers(options);
    const fundingReview = review?.fundingReview || {};
    const corporateActionReview = review?.corporateActionReview || {};
    const settlementReview = review?.settlementReview || {};
    return `
    <p><strong>资金与汇率复盘：</strong>${helpers.escapeHtml(fundingReview.summary || "暂无资金与汇率复盘。")}</p>
    <div class="evidence-review-list">
      <article class="evidence-review-card is-${helpers.escapeHtml(fundingReview.level || "warn")}">
        <div class="trade-ledger-head">
          <strong>港币入金与美元交易</strong>
          <span class="tag ${fundingReview.level === "danger" ? "important" : "real"}">${Number(fundingReview.score) || 0}/100</span>
        </div>
        <div class="audit-metrics">
          <span>入金 ${helpers.formatHomeCurrency(fundingReview.initialHomeDeposit)}</span>
          <span>换汇成本 ${helpers.formatHomeCurrency(fundingReview.initialFxCostHome)}</span>
          <span>成交折合 ${helpers.formatHomeCurrency(fundingReview.tradedHome)}</span>
          <span>股息预扣 ${helpers.formatCurrency(corporateActionReview.dividendTaxWithheld)}</span>
        </div>
        <p>美元口径收益 ${helpers.formatPercent(fundingReview.usdReturnPct)}；港币入金口径收益 ${helpers.formatPercent(fundingReview.homeReturnPct)}。如果未来接入真实券商数据，这里应替换成真实成交汇率和换汇流水。</p>
      </article>
    </div>
    <p><strong>资金结算复盘：</strong>${helpers.escapeHtml(settlementReview.summary || "暂无资金结算复盘。")}</p>
    <div class="evidence-review-list">
      ${renderSettlementRows(settlementReview.rows || [], helpers)}
      ${renderUnsettledBuyRows(settlementReview.unsettledBuyRows || [], helpers)}
      ${renderCashAccountWarnings(settlementReview.cashAccountWarnings || [], helpers)}
    </div>
  `;
  }

  function renderExecutionRiskSection(review, options = {}) {
    const helpers = buildHelpers(options);
    return `
    ${renderOrderExecutionReview(review?.orderExecutionReview || {}, helpers)}
    ${renderGapRiskReview(review?.gapRiskReview || {}, helpers)}
    ${renderEventRiskReview(review?.eventRiskReview || {}, helpers)}
    ${renderLiquidityReview(review?.liquidityReview || {}, helpers)}
    ${renderCorporateActionReview(review?.corporateActionReview || {}, helpers)}
  `;
  }

  function renderPositionDisciplineSection(review, options = {}) {
    const helpers = buildHelpers(options);
    return `
    ${renderPositionTriggerReview(review?.positionTriggerReview || {}, helpers)}
    ${renderConfidenceCalibration(review?.confidenceCalibration || {}, helpers)}
    ${renderInvalidationExecution(review?.invalidationExecution || {}, helpers)}
    ${renderProfitPlanReview(review?.profitPlanReview || {}, helpers)}
    ${renderCheckpointReview(review?.checkpointReview || {}, helpers)}
  `;
  }

  function renderOutcomeAuditSection(review, options = {}) {
    const helpers = buildHelpers(options);
    return `
    ${renderRootCauseMatrix(review?.rootCauseMatrix || {}, helpers)}
    ${renderSignalCalibration(review?.signalCalibration || {}, helpers)}
    ${renderTradeLedgerReview(review?.tradeLedger || {}, helpers)}
    ${renderPnlAttribution(review?.pnlAttribution || {}, helpers)}
    ${renderDecisionAudit(review?.decisionAudit || [], helpers)}
  `;
  }

  function renderReviewActionSection(review, selectedCase = {}, reflection = {}, options = {}) {
    const helpers = buildHelpers(options);
    return `
    ${renderReflectionCard(reflection, helpers)}
    ${renderRemediationCard(review?.remediation || {}, helpers)}
    ${renderBenchmarkGrid(review?.benchmarks || [], helpers)}
    <p><strong>系统判断：</strong>${helpers.escapeHtml(review?.summary || "暂无系统判断。")}</p>
    ${renderDiagnostics(review?.diagnostics || [], helpers)}
    ${renderFlagList(review?.flags || [], helpers)}
    ${renderLessonList(selectedCase?.lessons || [], helpers)}
  `;
  }

  function renderReflectionCard(reflection, helpers) {
    return `
    <p><strong>复盘反思：</strong></p>
    <div class="reflection-card">
      <label>
        <span>这轮做对了什么</span>
        <textarea id="reflectionWinInput" rows="2" placeholder="例如：没有一次性重仓，先记录了观望。">${helpers.escapeHtml(reflection?.win || "")}</textarea>
      </label>
      <label>
        <span>这轮最大的错误</span>
        <textarea id="reflectionMistakeInput" rows="2" placeholder="例如：看到下跌就急着抄底，没有等确认。">${helpers.escapeHtml(reflection?.mistake || "")}</textarea>
      </label>
      <label>
        <span>下一轮必须执行的一条硬规则</span>
        <textarea id="reflectionNextRuleInput" rows="2" placeholder="例如：第一笔仓位不超过 10%，并且至少观望一次。">${helpers.escapeHtml(reflection?.nextRule || "")}</textarea>
      </label>
      <div class="reflection-actions">
        <button class="mini-button" type="button" data-save-reflection>保存反思</button>
        <span>${reflection?.savedAt ? `已保存：${helpers.formatDateTime(reflection.savedAt)}` : "还未保存反思"}</span>
      </div>
    </div>
  `;
  }

  function renderRemediationCard(remediation, helpers) {
    return `
    <p><strong>补练处方：</strong>${helpers.escapeHtml(remediation.title || "暂无补练处方")}</p>
    <div class="remediation-card">
      <div class="remediation-head">
        <strong>下一轮：${helpers.escapeHtml(remediation.nextCaseId || "待选择")} · ${helpers.escapeHtml(remediation.nextCaseTitle || "暂无下一轮案例")}</strong>
        <span class="tag important">${helpers.escapeHtml(remediation.primaryIssue || "待复盘")}</span>
      </div>
      <p>${helpers.escapeHtml(remediation.reason || "本轮暂时没有生成补练原因。")}</p>
      <p><strong>限制：</strong>${helpers.escapeHtml(remediation.constraint || "暂无额外限制")}</p>
      <div class="remediation-grid">
        <div>
          <strong>必须完成</strong>
          <ul>${(remediation.checklist || []).map((item) => `<li>${helpers.escapeHtml(item)}</li>`).join("") || "<li>完成下一轮训练并保存复盘。</li>"}</ul>
        </div>
        <div>
          <strong>通过标准</strong>
          <ul>${(remediation.passCriteria || []).map((item) => `<li>${helpers.escapeHtml(item)}</li>`).join("") || "<li>纪律评分和任务评分达标。</li>"}</ul>
        </div>
      </div>
      <button class="mini-button remediation-start-button" type="button" data-start-remediation="review">开始补练</button>
    </div>
  `;
  }

  function renderBenchmarkGrid(benchmarks, helpers) {
    return `
    <p><strong>基准对比：</strong></p>
    <div class="benchmark-grid">
      ${benchmarks.map((item) => `
        <div class="benchmark-row">
          <strong>${helpers.escapeHtml(item.name)}</strong>
          <span>${helpers.escapeHtml(item.description)}</span>
          <strong class="${Number(item.returnPct) >= 0 ? "positive" : "negative"}">${helpers.formatPercent(item.returnPct)}</strong>
        </div>
      `).join("") || `<div class="benchmark-row"><strong>暂无基准</strong><span>本轮没有可对比的持有、现金或 ETF 基准。</span><strong>暂无</strong></div>`}
    </div>
  `;
  }

  function renderDiagnostics(diagnostics, helpers) {
    return `
    <p><strong>高级诊断：</strong></p>
    <div class="diagnostic-grid">
      ${diagnostics.map((item) => `
        <article class="diagnostic-card is-${helpers.escapeHtml(item.severity || "warn")}">
          <div class="diagnostic-title">
            <strong>${helpers.escapeHtml(item.title)}</strong>
            <span class="tag ${item.severity === "danger" ? "important" : ""}">${helpers.escapeHtml(helpers.severityLabel(item.severity))}</span>
          </div>
          <p>${helpers.escapeHtml(item.evidence)}</p>
          <p>${helpers.escapeHtml(item.lesson)}</p>
        </article>
      `).join("") || `<article class="diagnostic-card"><strong>没有触发高级诊断</strong><p>这不代表已经成熟，只说明本轮没有出现系统能识别的典型错误。</p></article>`}
    </div>
  `;
  }

  function renderFlagList(flags, helpers) {
    return `<ul class="lesson-list">${flags.map((flag) => `<li>${helpers.escapeHtml(flag)}</li>`).join("") || "<li>没有明显纪律问题，但样本很小，不能说明已经成熟。</li>"}</ul>`;
  }

  function renderLessonList(lessons, helpers) {
    return `
    <p><strong>本案例课程：</strong></p>
    <ul class="lesson-list">${lessons.map((lesson) => `<li>${helpers.escapeHtml(lesson)}</li>`).join("") || "<li>本案例没有额外课程记录。</li>"}</ul>
  `;
  }

  function renderRootCauseMatrix(rootCauseMatrix, helpers) {
    const rows = rootCauseMatrix.items || [];
    return `
    <p><strong>错误根因拆解：</strong>${helpers.escapeHtml(rootCauseMatrix.summary || "暂无错误根因拆解。")}</p>
    <div class="root-cause-grid">
      ${rows.map((item) => {
        const drivers = (item.drivers || []).length
          ? item.drivers
          : [{ evidence: "本轮没有触发明显问题。", action: item.nextAction }];
        return `
        <article class="root-cause-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="root-cause-head">
            <strong>${helpers.escapeHtml(item.label)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">严重度 ${Number(item.severityScore) || 0}/100</span>
          </div>
          <p>${helpers.escapeHtml(item.focus)}</p>
          <ul class="lesson-mini-list">
            ${drivers.slice(0, 3).map((driver) => `<li>${helpers.escapeHtml(driver.evidence)}</li>`).join("")}
          </ul>
          <p><strong>下一步：</strong>${helpers.escapeHtml(item.nextAction)}</p>
        </article>
      `;
      }).join("") || `<article class="root-cause-card is-good"><p>本轮没有足够根因样本。下一轮至少完成一次买入、观望或复查记录。</p></article>`}
    </div>
  `;
  }

  function renderSignalCalibration(signalCalibration, helpers) {
    return `
    <p><strong>关键节点校准：</strong></p>
    <div class="forecast-calibration-list">
      ${(signalCalibration.items || []).map((item) => `
        <article class="forecast-calibration-card is-${helpers.escapeHtml(item.verdict?.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天${item.date ? ` · ${helpers.escapeHtml(item.date)}` : ""} · ${helpers.escapeHtml(helpers.outlookLabel(item.outlook))}</strong>
            <span class="tag">${helpers.formatPercent(item.forwardReturnPct)}</span>
          </div>
          <p>${helpers.escapeHtml(item.plan)}</p>
          <p>${helpers.escapeHtml(item.verdict?.text)}</p>
        </article>
      `).join("") || `<article class="forecast-calibration-card"><p>本轮没有保存关键节点判断。下一轮遇到系统暂停时，先写下判断再继续。</p></article>`}
    </div>
  `;
  }

  function renderTradeLedgerReview(tradeLedger, helpers) {
    const summary = tradeLedger.summary || {};
    const closedLots = tradeLedger.closedLots || [];
    const openLots = tradeLedger.openLots || [];
    return `
    <p><strong>交易闭环账本：</strong></p>
    <div class="trade-ledger-summary">
      <div class="score-card"><span>已实现盈亏</span><strong class="${Number(summary.realizedPnl) >= 0 ? "positive" : "negative"}">${helpers.formatCurrency(summary.realizedPnl)}</strong></div>
      <div class="score-card"><span>未实现盈亏</span><strong class="${Number(summary.unrealizedPnl) >= 0 ? "positive" : "negative"}">${helpers.formatCurrency(summary.unrealizedPnl)}</strong></div>
      <div class="score-card"><span>交易摩擦</span><strong class="negative">${helpers.formatCurrency(summary.frictionCost)}</strong></div>
      <div class="score-card"><span>流动性冲击</span><strong class="negative">${helpers.formatCurrency(summary.liquidityImpactCost)}</strong></div>
      <div class="score-card"><span>平仓胜率</span><strong>${Number(summary.closedTrades) ? helpers.formatPlainPercent(summary.winRatePct) : "无平仓"}</strong></div>
    </div>
    <div class="trade-ledger-list">
      ${closedLots.map((item) => `
        <article class="trade-ledger-card ${Number(item.pnl) >= 0 ? "is-good" : "is-danger"}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.symbol)} · 第 ${helpers.displayDay(item.buyDay)} 天买入 / 第 ${helpers.displayDay(item.sellDay)} 天卖出</strong>
            <span class="tag">${Number(item.holdingDays) || 0} 天</span>
          </div>
          <div class="audit-metrics">
            <span>数量 ${helpers.formatNumber(item.quantity)}</span>
            <span>买入 ${helpers.formatCurrency(item.buyPrice)}</span>
            <span>卖出 ${helpers.formatCurrency(item.sellPrice)}</span>
            <span>盈亏 ${helpers.formatCurrency(item.pnl)}</span>
            <span>收益率 ${helpers.formatPercent(item.returnPct)}</span>
          </div>
        </article>
      `).join("") || `<article class="trade-ledger-card"><p>还没有平仓交易。当前盈亏主要来自持仓浮动，不要把浮盈当成已经落袋。</p></article>`}
      ${openLots.length ? `
        <article class="trade-ledger-card is-open">
          <div class="trade-ledger-head">
            <strong>未平仓风险</strong>
            <span class="tag important">${openLots.length} 笔 lot</span>
          </div>
          <div class="audit-metrics">
            ${openLots.slice(0, 6).map((item) => `<span>${helpers.escapeHtml(item.symbol)} ${helpers.formatNumber(item.quantity)} 股 · 浮动 ${helpers.formatCurrency(item.unrealizedPnl)} / ${helpers.formatPercent(item.returnPct)}</span>`).join("")}
          </div>
        </article>
      ` : ""}
    </div>
  `;
  }

  function renderPnlAttribution(pnlAttribution, helpers) {
    return `
    <p><strong>盈亏归因：</strong>${helpers.escapeHtml(pnlAttribution.summary || "暂无盈亏归因。")}</p>
    <div class="pnl-attribution-list">
      ${(pnlAttribution.rows || []).map((item) => `
        <article class="pnl-attribution-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.symbol)} · ${helpers.escapeHtml(item.assetType)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : "real"}">贡献 ${helpers.formatPercent(item.contributionPct)}</span>
          </div>
          <div class="audit-metrics">
            <span>总盈亏 ${helpers.formatCurrency(item.totalPnl)}</span>
            <span>已实现 ${helpers.formatCurrency(item.realizedPnl)}</span>
            <span>未实现 ${helpers.formatCurrency(item.unrealizedPnl)}</span>
            <span>摩擦 ${helpers.formatCurrency(item.frictionCost)}</span>
            <span>成交额 ${helpers.formatCurrency(item.tradedValue)}</span>
            <span>平仓胜率 ${Number.isFinite(Number(item.winRatePct)) ? helpers.formatPlainPercent(item.winRatePct) : "无平仓"}</span>
          </div>
        </article>
      `).join("") || `<article class="pnl-attribution-card"><p>本轮没有可归因的交易或持仓。</p></article>`}
    </div>
  `;
  }

  function renderDecisionAudit(decisionAudit, helpers) {
    return `
    <p><strong>逐笔决策审计：</strong></p>
    <div class="decision-audit-list">
      ${(decisionAudit || []).map((item) => {
        const counterfactual = item.counterfactual || {};
        return `
        <article class="decision-audit-card is-${helpers.escapeHtml(item.verdict?.level || "warn")}">
          <div class="decision-audit-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · ${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag">${Number.isFinite(Number(item.coachScore)) ? `教练 ${Number(item.coachScore)}/100` : "无教练快照"}</span>
            <span class="tag">${helpers.escapeHtml(helpers.confidenceLabel(item.confidence))}</span>
          </div>
          <p>${helpers.escapeHtml(item.verdict?.text)}</p>
          <div class="audit-metrics">
            <span>${helpers.escapeHtml(item.windowLabel)}变化 ${helpers.formatPercent(item.marketMovePct)}</span>
            <span>有利波动 ${helpers.formatPlainPercent(item.favorablePct)}</span>
            <span>不利波动 ${helpers.formatPlainPercent(item.adversePct)}</span>
          </div>
          <div class="counterfactual-box">
            <strong>反事实对比</strong>
            <p>${helpers.escapeHtml(counterfactual.summary)}</p>
            <div class="audit-metrics">
              ${(counterfactual.alternatives || []).map((alternative) => `
                <span class="${alternative.id === "actual" ? "is-actual" : ""}">${helpers.escapeHtml(alternative.label)} ${helpers.formatPercent(alternative.returnPct)}</span>
              `).join("")}
            </div>
          </div>
        </article>
      `;
      }).join("") || `<article class="decision-audit-card"><p>没有决策记录可审计。下一轮即使选择不交易，也要提交一次观望理由。</p></article>`}
    </div>
  `;
  }

  function renderPositionTriggerReview(positionTriggerReview, helpers) {
    return `
    <p><strong>持仓触发提醒：</strong>${helpers.escapeHtml(positionTriggerReview.summary || "暂无持仓触发提醒。")}</p>
    <div class="profit-plan-review-list">
      ${(positionTriggerReview.items || []).map((item) => `
        <article class="profit-plan-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.triggerDay)} 天 · ${helpers.escapeHtml(item.symbol)} · ${item.type === "stop" ? "亏损线" : "盈利窗口"}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${helpers.escapeHtml(helpers.missionStatusLabel(item.status))}</span>
          </div>
          <div class="audit-metrics">
            <span>买入日 第 ${helpers.displayDay(item.entryDay)} 天</span>
            <span>${helpers.escapeHtml(item.triggerLabel)}</span>
            <span>${helpers.escapeHtml(item.actionLabel)}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("") || `<article class="profit-plan-review-card is-good"><p>本轮没有持仓触发亏损线或 2R 盈利窗口。</p></article>`}
    </div>
  `;
  }

  function renderConfidenceCalibration(confidenceCalibration, helpers) {
    return `
    <p><strong>信心校准：</strong>${helpers.escapeHtml(confidenceCalibration.summary || "暂无信心校准。")}</p>
    <div class="confidence-calibration-list">
      ${(confidenceCalibration.items || []).map((item) => `
        <article class="confidence-calibration-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · ${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${item.overconfident ? "important" : item.underconfident ? "" : item.level === "good" ? "real" : ""}">${helpers.escapeHtml(helpers.confidenceLabel(item.confidence))}</span>
          </div>
          <div class="audit-metrics">
            <span>主观把握 ${helpers.formatPlainPercent((Number(item.expectedScore) || 0) * 100)}</span>
            <span>结果验证 ${helpers.formatPlainPercent((Number(item.outcomeScore) || 0) * 100)}</span>
            <span>校准误差 ${helpers.formatPlainPercent(item.calibrationError)}</span>
          </div>
          <p>${item.overconfident ? "可能过度自信。" : item.underconfident ? "可能过度保守。" : "信心和结果大致匹配。"}${helpers.escapeHtml(item.counterfactualSummary)}</p>
        </article>
      `).join("") || `<article class="confidence-calibration-card"><p>没有可校准信心样本。下一轮每笔决策都填写判断信心。</p></article>`}
    </div>
  `;
  }

  function renderInvalidationExecution(invalidationExecution, helpers) {
    return `
    <p><strong>失效条件执行：</strong>${helpers.escapeHtml(invalidationExecution.summary || "暂无失效条件执行复盘。")}</p>
    <div class="invalidation-execution-list">
      ${(invalidationExecution.items || []).map((item) => `
        <article class="invalidation-execution-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.symbol)} · 第 ${helpers.displayDay(item.entryDay)} 天买入 / 第 ${helpers.displayDay(item.breachDay)} 天触发</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${helpers.escapeHtml(helpers.missionStatusLabel(item.status))}</span>
          </div>
          <div class="audit-metrics">
            <span>亏损线 ${helpers.formatPlainPercent(item.riskLimitPct)}</span>
            <span>止损参考 ${helpers.formatCurrency(item.stopPrice)}</span>
            <span>触发低点 ${helpers.formatCurrency(item.breachPrice)}</span>
            <span>响应 ${item.responseDay === null ? "无" : `第 ${helpers.displayDay(item.responseDay)} 天 · ${helpers.escapeHtml(item.actionLabel)}`}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
          <p><strong>原失效条件：</strong>${helpers.escapeHtml(item.invalidation)}</p>
        </article>
      `).join("") || `<article class="invalidation-execution-card is-good"><p>没有买入记录触发自定亏损线。注意，这不代表计划质量一定好，只代表本轮没有进入执行压力区。</p></article>`}
    </div>
  `;
  }

  function renderProfitPlanReview(profitPlanReview, helpers) {
    return `
    <p><strong>盈利计划执行：</strong>${helpers.escapeHtml(profitPlanReview.summary || "暂无盈利计划执行复盘。")}</p>
    <div class="profit-plan-review-list">
      ${(profitPlanReview.items || []).map((item) => `
        <article class="profit-plan-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.symbol)} · 第 ${helpers.displayDay(item.entryDay)} 天买入 / 第 ${helpers.displayDay(item.triggerDay)} 天盈利窗口</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${helpers.escapeHtml(helpers.missionStatusLabel(item.status))}</span>
          </div>
          <div class="audit-metrics">
            <span>触发阈值 ${helpers.formatPlainPercent(item.triggerPct)}</span>
            <span>窗口高点 ${helpers.formatCurrency(item.triggerHigh)}</span>
            <span>有利波动 ${helpers.formatPlainPercent(item.favorablePct)}</span>
            <span>响应 ${item.responseDay === null ? "无" : `第 ${helpers.displayDay(item.responseDay)} 天 · ${helpers.escapeHtml(item.actionLabel)}`}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
          <p><strong>原盈利计划：</strong>${helpers.escapeHtml(item.profitPlan || "未记录")}</p>
        </article>
      `).join("") || `<article class="profit-plan-review-card is-good"><p>没有买入记录达到明显盈利计划触发区。</p></article>`}
    </div>
  `;
  }

  function renderCheckpointReview(checkpointReview, helpers) {
    return `
    <p><strong>盘中复查日志：</strong>${helpers.escapeHtml(checkpointReview.summary || "暂无盘中复查日志。")}</p>
    <div class="profit-plan-review-list">
      ${(checkpointReview.logs || []).map((item) => {
        const warned = item.riskChanged || item.bias === "deteriorating";
        return `
        <article class="profit-plan-review-card is-${warned ? "warn" : "good"}">
          <div class="trade-ledger-head">
            <strong>${helpers.escapeHtml(item.symbol)} · 第 ${helpers.displayDay(item.day)} 天复查</strong>
            <span class="tag ${warned ? "important" : "real"}">${helpers.escapeHtml(helpers.checkpointBiasLabel(item.bias))}</span>
          </div>
          <div class="audit-metrics">
            <span>动作 ${helpers.escapeHtml(helpers.checkpointActionLabel(item.action))}</span>
            <span>${item.riskChanged ? "风险已变化" : "风险未明显变化"}</span>
          </div>
          <p>${helpers.escapeHtml(item.note || "")}</p>
        </article>
      `;
      }).join("") || `<article class="profit-plan-review-card"><p>本轮没有保存盘中复查记录。下一轮买入后至少复查一次原计划是否仍成立。</p></article>`}
    </div>
  `;
  }

  function renderOrderExecutionReview(orderExecutionReview, helpers) {
    return `
    <p><strong>订单执行复盘：</strong>${helpers.escapeHtml(orderExecutionReview.summary || "暂无订单执行复盘。")}</p>
    <div class="evidence-review-list">
      ${(orderExecutionReview.rows || []).map((item) => {
        const status = item.status || "unknown";
        const level = status === "filled" ? "good" : status === "active" ? "warn" : "danger";
        return `
        <article class="evidence-review-card is-${level}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.createdDay)} 天 · 限价${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${status === "filled" ? "real" : status === "active" ? "" : "important"}">${helpers.escapeHtml(helpers.pendingOrderStatusLabel(status))}</span>
          </div>
          <div class="audit-metrics">
            <span>数量 ${helpers.formatNumber(item.quantity)}</span>
            <span>限价 ${helpers.formatCurrency(item.limitPrice)}</span>
            <span>成交 ${item.fillPrice ? helpers.formatCurrency(item.fillPrice) : "无"}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `;
      }).join("") || `<article class="evidence-review-card is-good"><p>本轮没有限价单样本。</p></article>`}
    </div>
  `;
  }

  function renderGapRiskReview(gapRiskReview, helpers) {
    return `
    <p><strong>隔夜跳空复盘：</strong>${helpers.escapeHtml(gapRiskReview.summary || "暂无隔夜跳空复盘。")}</p>
    <div class="evidence-review-list">
      ${(gapRiskReview.rows || []).map((item) => `
        <article class="evidence-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天${item.date ? ` · ${helpers.escapeHtml(item.date)}` : ""} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : ""}">${helpers.formatPercent(item.gapPct)}</span>
          </div>
          <div class="audit-metrics">
            <span>前收 ${helpers.formatCurrency(item.previousClose)}</span>
            <span>今开 ${helpers.formatCurrency(item.open)}</span>
            <span>收盘 ${helpers.formatCurrency(item.close)}</span>
            <span>日内 ${helpers.formatPercent(item.dayChangePct)}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("") || `<article class="evidence-review-card is-good"><p>本轮没有明显隔夜跳空节点。</p></article>`}
    </div>
  `;
  }

  function renderEventRiskReview(eventRiskReview, helpers) {
    return `
    <p><strong>事件日风险复盘：</strong>${helpers.escapeHtml(eventRiskReview.summary || "暂无事件日风险复盘。")}</p>
    <div class="evidence-review-list">
      ${(eventRiskReview.rows || []).map((item) => {
        const decisions = item.decisions || [];
        return `
        <article class="evidence-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天${item.date ? ` · ${helpers.escapeHtml(item.date)}` : ""} · ${helpers.escapeHtml(item.title)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${helpers.escapeHtml(item.typeLabel)}</span>
          </div>
          <div class="audit-metrics">
            <span>${helpers.escapeHtml(helpers.eventRiskLevelLabel(item.riskLevel))}</span>
            <span>附近决策 ${Number(item.decisionCount) || 0}</span>
            <span>交易 ${Number(item.tradeCount) || 0}</span>
            <span>大额 ${Number(item.largeTradeCount) || 0}</span>
            <span>市价单 ${Number(item.marketOrderCount) || 0}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
          ${decisions.length ? `<p><strong>附近动作：</strong>${decisions.map((decision) => `第 ${helpers.displayDay(decision.day)} 天 ${helpers.escapeHtml(helpers.decisionLabel(decision.side))} ${helpers.escapeHtml(decision.symbol)} ${helpers.formatCurrency(decision.amount)}`).join("；")}</p>` : "<p>事件前后没有交易动作，重点看是否提前写了等待条件。</p>"}
        </article>
      `;
      }).join("") || `<article class="evidence-review-card is-good"><p>本轮没有经过预设事件窗口。</p></article>`}
    </div>
  `;
  }

  function renderLiquidityReview(liquidityReview, helpers) {
    return `
    <p><strong>流动性复盘：</strong>${helpers.escapeHtml(liquidityReview.summary || "暂无流动性复盘。")}</p>
    <div class="evidence-review-list">
      ${(liquidityReview.rows || []).map((item) => `
        <article class="evidence-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · ${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">占量 ${helpers.formatPlainPercent(item.volumeSharePct)}</span>
          </div>
          <div class="audit-metrics">
            <span>当日成交量 ${helpers.formatCompactNumber(item.dayVolume)}</span>
            <span>成交额占比 ${helpers.formatPlainPercent(item.dollarVolumeSharePct)}</span>
            <span>估算冲击 ${helpers.formatCurrency(item.impactCost)}</span>
          </div>
          <p>${helpers.escapeHtml(item.summary)}</p>
        </article>
      `).join("") || `<article class="evidence-review-card is-good"><p>本轮没有买卖交易样本。</p></article>`}
    </div>
  `;
  }

  function renderCorporateActionReview(corporateActionReview, helpers) {
    return `
    <p><strong>公司行动复盘：</strong>${helpers.escapeHtml(corporateActionReview.summary || "暂无公司行动复盘。")}</p>
    <div class="evidence-review-list">
      ${(corporateActionReview.rows || []).map((item) => `
        <article class="evidence-review-card is-${item.applied ? "good" : "danger"}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · ${helpers.escapeHtml(helpers.corporateActionTypeLabel(item.type))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${item.applied ? "real" : "important"}">${item.applied ? "已记录" : "缺记录"}</span>
          </div>
          <div class="audit-metrics">
            <span>${item.type === "dividend" ? `每股 ${helpers.formatCurrency(item.expectedCashPerShare || 0)}` : `比例 ${helpers.escapeHtml(item.expectedRatio || "-")}:1`}</span>
            <span>影响 ${item.affected ? "有持仓" : "无持仓"}</span>
            <span>毛分红 ${helpers.formatCurrency(item.grossDividend)}</span>
            <span>预扣 ${helpers.formatCurrency(item.taxWithheld)}</span>
            <span>净到账 ${helpers.formatCurrency(item.cashDelta)}</span>
          </div>
          <p>${helpers.escapeHtml(item.effectText)}</p>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("") || `<article class="evidence-review-card is-good"><p>本轮没有公司行动事件。</p></article>`}
    </div>
  `;
  }

  function renderSettlementRows(rows, helpers) {
    return rows.map((item) => {
      const settled = item.status === "settled";
      return `
        <article class="evidence-review-card is-${settled ? "good" : "warn"}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.tradeDay)} 天 · ${helpers.escapeHtml(item.symbol)} 卖出款</strong>
            <span class="tag ${settled ? "real" : ""}">${settled ? "已结算" : "未结算"}</span>
          </div>
          <div class="audit-metrics">
            <span>金额 ${helpers.formatCurrency(item.amount)}</span>
            <span>结算日 第 ${helpers.displayDay(item.settleDay)} 天</span>
            <span>${helpers.escapeHtml(item.cycle || helpers.settlementCycleLabel)}</span>
          </div>
          <p>${settled ? "卖出款已经进入已结算现金。" : "卖出款尚未完成结算，连续短线买卖要特别留意资金口径。"}</p>
        </article>
      `;
    }).join("") || `<article class="evidence-review-card is-good"><p>本轮没有卖出结算记录。</p></article>`;
  }

  function renderUnsettledBuyRows(rows, helpers) {
    return rows.map((item) => `
        <article class="evidence-review-card is-warn">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · 动用未结算资金买入 ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag important">需复盘</span>
          </div>
          <div class="audit-metrics">
            <span>买入金额 ${helpers.formatCurrency(item.amount)}</span>
            <span>当时已结算 ${helpers.formatCurrency(item.settledCash)}</span>
            <span>未结算卖出款 ${helpers.formatCurrency(item.unsettledProceeds)}</span>
          </div>
          <p>训练允许记录，但这代表你在用尚未完成结算的卖出款继续交易。现实账户中要按券商现金/保证金规则确认限制。</p>
        </article>
      `).join("");
  }

  function renderCashAccountWarnings(rows, helpers) {
    return rows.map((item) => `
        <article class="evidence-review-card is-danger">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.sellDay)} 天 · 现金账户纪律风险 · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag important">good faith 风险</span>
          </div>
          <div class="audit-metrics">
            <span>买入日 第 ${helpers.displayDay(item.entryDay)} 天</span>
            <span>结算日 第 ${helpers.displayDay(item.paidForDay)} 天</span>
            <span>卖出股数 ${helpers.formatNumber(item.quantity)}</span>
          </div>
          <p>${helpers.escapeHtml(item.detail)}</p>
        </article>
      `).join("");
  }

  function renderIssueList(rows, helpers) {
    return rows.length
      ? `<ul class="lesson-list">${rows.map(([issue, count]) => `<li>${helpers.escapeHtml(issue)}：${Number(count) || 0} 次</li>`).join("")}</ul>`
      : "";
  }

  function renderEvidenceSourceCards(rows, helpers) {
    return `
    <div class="evidence-review-list">
      ${rows.map((item) => `
        <article class="evidence-review-card is-${helpers.escapeHtml(item.level || "warn")}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天 · ${helpers.escapeHtml(helpers.decisionLabel(item.side))} · ${helpers.escapeHtml(item.symbol)}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${Number(item.sourceCount) || 0} 类证据</span>
          </div>
          <p>${helpers.escapeHtml(item.summary)}</p>
          <div class="course-meta">
            ${(item.sources || []).length
              ? item.sources.map((source) => `<span class="tag">${helpers.escapeHtml(helpers.evidenceSourceLabel(source))}</span>`).join("")
              : `<span class="tag important">未记录</span>`}
          </div>
        </article>
      `).join("") || `<article class="evidence-review-card is-good"><p>本轮没有决策样本。</p></article>`}
    </div>
  `;
  }

  function renderPlanSection(section, helpers) {
    return `
    <p><strong>${helpers.escapeHtml(String(section.title || ""))}：</strong>${helpers.escapeHtml(String(section.summary || ""))}</p>
    <ul class="lesson-list">${(section.rows || []).map((item) => `<li>${helpers.escapeHtml(helpers.missionStatusLabel(item.status))}：${helpers.escapeHtml(item.title)}。${helpers.escapeHtml(item.detail)}</li>`).join("")}</ul>
  `;
  }

  function renderEvidenceSources(sources, helpers) {
    return `
    <div class="evidence-source-grid">
      ${sources.map((item) => `
        <article class="evidence-source-card">
          <strong>${helpers.escapeHtml(item.maskedSymbol)} · ${helpers.escapeHtml(item.realSymbol)}</strong>
          <span>${helpers.escapeHtml(item.sourceLabel)} · ${helpers.escapeHtml(item.dateRange)} · ${Number(item.barCount) || 0} 条</span>
          <div class="audit-metrics">
            <span>阶段收益 ${helpers.formatPercent(item.returnPct)}</span>
            <span>阶段最大回撤 ${helpers.formatPlainPercent(item.maxDrawdownPct)}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
  }

  function renderSourcePack(items, helpers) {
    return `
    <div class="evidence-source-grid">
      ${items.map((item) => {
        const safeHref = helpers.safeUrl(item.url);
        return `
          <article class="evidence-source-card external-source-card">
            <strong>${helpers.escapeHtml(item.title)}</strong>
            <span>${helpers.escapeHtml(item.publisher)} · ${helpers.escapeHtml(item.date)} · ${helpers.escapeHtml(item.kind)}</span>
            <p>${helpers.escapeHtml(item.reason)}</p>
            ${safeHref ? `<a href="${helpers.escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">打开资料</a>` : `<span>${item.url ? "链接已拦截" : "无外部链接"}</span>`}
          </article>
        `;
      }).join("") || `<article class="evidence-source-card external-source-card"><p>本案例没有内置外部资料。导入自己的案例时，请在复盘里手动补充来源。</p></article>`}
    </div>
  `;
  }

  function renderEvidenceTimeline(items, helpers) {
    return `
    <div class="evidence-timeline">
      ${items.map((item) => `
        <article class="evidence-event is-${helpers.escapeHtml(item.category)}">
          <div class="evidence-event-head">
            <strong>第 ${helpers.displayDay(item.day)} 天${item.date ? ` · ${helpers.escapeHtml(item.date)}` : ""}</strong>
            <span class="tag ${item.category === "important" ? "important" : ""}">${helpers.escapeHtml(item.categoryLabel)}</span>
          </div>
          <p>${helpers.escapeHtml(item.title)}</p>
          <div class="evidence-move-list">
            ${(item.moves || []).map((move) => `<span>${helpers.escapeHtml(move.symbol)}：当日 ${helpers.formatPercent(move.dayChangePct)}，累计 ${helpers.formatPercent(move.sinceStartPct)}</span>`).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
  }

  function renderNewsCalibration(items, helpers) {
    return `
    <div class="news-calibration-list">
      ${items.map((item) => `
        <article class="news-calibration-card is-${helpers.escapeHtml(item.level)}">
          <div class="trade-ledger-head">
            <strong>第 ${helpers.displayDay(item.day)} 天${item.date ? ` · ${helpers.escapeHtml(item.date)}` : ""}</strong>
            <span class="tag ${item.level === "danger" ? "important" : item.level === "good" ? "real" : ""}">${Number(item.score) || 0}/100</span>
          </div>
          <p>${helpers.escapeHtml(item.title)}</p>
          <div class="course-meta">
            <span class="tag">你判：${helpers.escapeHtml(helpers.newsLabel(item.judgedCategory))}</span>
            <span class="tag">实际：${helpers.escapeHtml(helpers.newsLabel(item.actualCategory))}</span>
            <span class="tag">后续 ${helpers.formatPercent(item.forwardReturnPct)}</span>
            <span class="tag">${helpers.escapeHtml(helpers.newsActionLabel(item.action))}</span>
          </div>
          <p>${helpers.escapeHtml(item.categoryVerdict?.text || "")} ${helpers.escapeHtml(item.outlookVerdict?.text || "")} ${helpers.escapeHtml(item.actionVerdict?.text || "")}</p>
        </article>
      `).join("") || `<article class="news-calibration-card"><p>本轮没有保存新闻判断。下一轮不要只读新闻，要先判断它属于重要、噪音还是滞后。</p></article>`}
    </div>
  `;
  }

  function buildScoreCards(review, helpers) {
    const score = (value) => `${Number(value) || 0}/100`;
    const finiteScore = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}/100` : "无样本";
    return [
      { label: "你的收益", value: helpers.formatPercent(review.returnPct), className: numericClass(review.returnPct) },
      { label: "港币口径", value: helpers.formatPercent(review.fundingReview?.homeReturnPct), className: numericClass(review.fundingReview?.homeReturnPct) },
      { label: "资金结算", value: score(review.settlementReview?.score), className: levelClass(review.settlementReview?.level) },
      { label: "买入持有 ETF", value: helpers.formatPercent(review.buyHoldPct) },
      { label: "纪律评分", value: score(review.disciplineScore) },
      { label: "最大回撤", value: helpers.formatPlainPercent(review.maxDrawdown), className: "negative" },
      { label: "交易次数", value: Number(review.tradeCount) || 0 },
      { label: "错误模式", value: Array.isArray(review.flags) ? review.flags.length : 0 },
      { label: "换手率", value: helpers.formatPlainPercent(review.turnoverPct) },
      { label: "最大仓位", value: helpers.formatPlainPercent(review.maxConcentrationPct) },
      { label: "观望次数", value: Number(review.holdCount) || 0 },
      { label: "任务评分", value: score(review.mission?.score), className: passClass(review.mission?.passed) },
      { label: "任务结果", value: review.mission?.passed ? "通关" : "需补练", className: passClass(review.mission?.passed) },
      { label: "合约执行", value: score(review.contractStatus?.score), className: passClass(review.contractStatus?.passed) },
      { label: "盲测完整性", value: score(review.blindIntegrityReview?.score), className: levelClass(review.blindIntegrityReview?.level) },
      { label: "风险冷却", value: score(review.riskCoolingReview?.score), className: levelClass(review.riskCoolingReview?.level) },
      { label: "配置蓝图", value: score(review.allocationStatus?.score), className: levelClass(review.allocationStatus?.level) },
      { label: "市场假设", value: score(review.thesisQuality?.score), className: levelClass(review.thesisQuality?.level) },
      { label: "下单质量", value: finiteScore(review.coachStats?.averageScore) },
      { label: "文字质量", value: finiteScore(review.writingQuality?.averageScore), className: levelClass(review.writingQuality?.level) },
      { label: "证据来源", value: score(review.evidenceSourceReview?.score), className: levelClass(review.evidenceSourceReview?.level) },
      { label: "流动性", value: score(review.liquidityReview?.score), className: levelClass(review.liquidityReview?.level) },
      { label: "订单执行", value: score(review.orderExecutionReview?.score), className: levelClass(review.orderExecutionReview?.level) },
      { label: "公司行动", value: score(review.corporateActionReview?.score), className: levelClass(review.corporateActionReview?.level) },
      { label: "隔夜跳空", value: score(review.gapRiskReview?.score), className: levelClass(review.gapRiskReview?.level) },
      { label: "事件日风险", value: score(review.eventRiskReview?.score), className: levelClass(review.eventRiskReview?.level) },
      { label: "信心校准", value: Number.isFinite(Number(review.confidenceCalibration?.score)) ? `${review.confidenceCalibration.score}/100` : "无样本", className: levelClass(review.confidenceCalibration?.level) },
      { label: "失效执行", value: score(review.invalidationExecution?.score), className: levelClass(review.invalidationExecution?.level) },
      { label: "盈利计划", value: score(review.profitPlanReview?.score), className: levelClass(review.profitPlanReview?.level) },
      { label: "持仓触发", value: score(review.positionTriggerReview?.score), className: levelClass(review.positionTriggerReview?.level) },
      { label: "盘中复查", value: score(review.checkpointReview?.score), className: levelClass(review.checkpointReview?.level) },
      { label: "揭晓纪律", value: score(review.revealReadiness?.score), className: levelClass(review.revealReadiness?.level) },
      { label: "首要根因", value: review.rootCauseMatrix?.primary?.label || "暂无", className: levelClass(review.rootCauseMatrix?.primary?.level) },
      { label: "课程理解", value: review.lessonGate?.passed ? `${Number(review.lessonGate.attempts) || 0} 次通过` : "未通过", className: passClass(review.lessonGate?.passed) },
    ];
  }

  function buildHelpers(options) {
    return {
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml,
      safeUrl: typeof options.safeUrl === "function" ? options.safeUrl : defaultSafeUrl,
      formatPercent: typeof options.formatPercent === "function" ? options.formatPercent : defaultFormatPercent,
      formatPlainPercent: typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultFormatPlainPercent,
      formatCurrency: typeof options.formatCurrency === "function" ? options.formatCurrency : defaultFormatCurrency,
      formatHomeCurrency: typeof options.formatHomeCurrency === "function" ? options.formatHomeCurrency : defaultFormatHomeCurrency,
      formatNumber: typeof options.formatNumber === "function" ? options.formatNumber : defaultFormatNumber,
      formatCompactNumber: typeof options.formatCompactNumber === "function" ? options.formatCompactNumber : defaultFormatCompactNumber,
      displayDay: typeof options.displayDay === "function" ? options.displayDay : (day) => String((Number(day) || 0) + 1),
      settlementCycleLabel: options.settlementCycleLabel || "T+1",
      newsLabel: typeof options.newsLabel === "function" ? options.newsLabel : (value) => value || "未记录",
      newsActionLabel: typeof options.newsActionLabel === "function" ? options.newsActionLabel : (value) => value || "未记录",
      missionStatusLabel: typeof options.missionStatusLabel === "function" ? options.missionStatusLabel : (value) => value || "未记录",
      blindViolationTypeLabel: typeof options.blindViolationTypeLabel === "function" ? options.blindViolationTypeLabel : (value) => value || "盲测完整性问题",
      decisionLabel: typeof options.decisionLabel === "function" ? options.decisionLabel : (value) => value || "决策",
      evidenceSourceLabel: typeof options.evidenceSourceLabel === "function" ? options.evidenceSourceLabel : (value) => value || "证据",
      pendingOrderStatusLabel: typeof options.pendingOrderStatusLabel === "function" ? options.pendingOrderStatusLabel : (value) => value || "未知",
      eventRiskLevelLabel: typeof options.eventRiskLevelLabel === "function" ? options.eventRiskLevelLabel : (value) => value || "事件风险",
      corporateActionTypeLabel: typeof options.corporateActionTypeLabel === "function" ? options.corporateActionTypeLabel : (value) => value || "公司行动",
      confidenceLabel: typeof options.confidenceLabel === "function" ? options.confidenceLabel : (value) => value ? `信心 ${value}` : "未记录",
      checkpointBiasLabel: typeof options.checkpointBiasLabel === "function" ? options.checkpointBiasLabel : (value) => value || "未记录",
      checkpointActionLabel: typeof options.checkpointActionLabel === "function" ? options.checkpointActionLabel : (value) => value || "未记录",
      outlookLabel: typeof options.outlookLabel === "function" ? options.outlookLabel : (value) => value || "未记录",
      severityLabel: typeof options.severityLabel === "function" ? options.severityLabel : (value) => value || "提醒",
      formatDateTime: typeof options.formatDateTime === "function" ? options.formatDateTime : defaultFormatDateTime,
    };
  }

  function levelClass(level) {
    if (level === "good") return "positive";
    if (level === "danger") return "negative";
    return "";
  }

  function passClass(passed) {
    return passed ? "positive" : "negative";
  }

  function numericClass(value) {
    return Number(value) >= 0 ? "positive" : "negative";
  }

  function defaultFormatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "暂无";
    return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
  }

  function defaultFormatPlainPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "暂无";
    return `${Math.round(number)}%`;
  }

  function defaultFormatCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "$0.00";
    return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function defaultFormatHomeCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "HK$0.00";
    return `HK$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function defaultFormatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }

  function defaultFormatCompactNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return number.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
  }

  function defaultFormatDateTime(value) {
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return String(value || "");
    return time.toLocaleString();
  }

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultSafeUrl(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (typeof URL !== "function") return /^https?:\/\//i.test(text) ? text : "";
    try {
      const url = new URL(text);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  return {
    renderReviewEvidenceIntro,
    renderReviewScoreGrid,
    renderReviewPlanSections,
    renderBlindIntegritySection,
    renderRiskCoolingSection,
    renderDecisionQualitySection,
    renderFundingAndSettlementSection,
    renderExecutionRiskSection,
    renderPositionDisciplineSection,
    renderOutcomeAuditSection,
    renderReviewActionSection,
    renderIssueList,
    renderEvidenceSourceCards,
    renderPlanSection,
    renderEvidenceSources,
    renderSourcePack,
    renderEvidenceTimeline,
    renderNewsCalibration,
  };
});
