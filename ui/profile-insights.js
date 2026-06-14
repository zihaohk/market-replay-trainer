(function profileInsightsUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayProfileInsightsUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProfileInsightsUiApi() {
  function renderTrainingTrendCard(trend, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const safeTrend = trend || { level: "warn", title: "训练趋势", summary: "暂无足够训练记录。", rows: [] };
    return `
    <article class="profile-item">
      <strong>训练趋势</strong>
      <div class="trend-summary is-${escapeHtml(safeTrend.level || "warn")}">
        <strong>${escapeHtml(safeTrend.title || "训练趋势")}</strong>
        <p>${escapeHtml(safeTrend.summary || "暂无足够训练记录。")}</p>
      </div>
      ${renderTrendRows(safeTrend.rows, { escapeHtml, valueField: "deltaLabel" })}
    </article>
  `;
  }

  function renderSkillRadarCard(skillRadar, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const rows = Array.isArray(skillRadar) ? skillRadar : [];
    return `
    <article class="profile-item">
      <strong>能力雷达</strong>
      <div class="skill-radar">
        ${rows.map((item) => {
          const score = clampScore(item.score);
          return `
          <section class="skill-radar-row is-${escapeHtml(item.level || "warn")}">
            <div class="skill-radar-head">
              <span>${escapeHtml(item.label)}</span>
              <strong>${score}/100</strong>
            </div>
            <div class="skill-meter" aria-hidden="true"><span style="width: ${score}%"></span></div>
            <p>${escapeHtml(item.detail)}</p>
          </section>
        `;
        }).join("")}
      </div>
    </article>
  `;
  }

  function renderTrainingQueueCard(trainingQueue, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const priorityLabel = typeof options.priorityLabel === "function" ? options.priorityLabel : defaultPriorityLabel;
    const displayCaseId = typeof options.displayCaseId === "function" ? options.displayCaseId : (caseId) => caseId || "匿名案例";
    const hideMeta = Boolean(options.hideMeta);
    const rows = Array.isArray(trainingQueue) ? trainingQueue : [];
    return `
    <article class="profile-item">
      <strong>弱项自动排课</strong>
      <div class="training-queue">
        ${rows.map((item, index) => {
          const priority = item.priority || "normal";
          const caseLabel = hideMeta ? displayCaseId(item.caseId) : item.caseId;
          const focusLabel = hideMeta ? "强盲测" : item.focus;
          return `
          <section class="training-queue-card is-${escapeHtml(priority)}">
            <div class="training-queue-head">
              <strong>${index + 1}. ${escapeHtml(hideMeta ? "匿名训练任务" : item.title)}</strong>
              <span class="tag ${priority === "high" ? "important" : priority === "normal" ? "real" : ""}">${escapeHtml(priorityLabel(priority))}</span>
            </div>
            <p>${escapeHtml(hideMeta ? "考试模式隐藏任务来源和案例主题。按硬限制执行，复盘后再看具体原因。" : item.reason)}</p>
            <div class="course-meta">
              <span class="tag">${escapeHtml(caseLabel)} · ${escapeHtml(hideMeta ? "匿名案例" : item.caseTitle)}</span>
              <span class="tag">${escapeHtml(focusLabel)}</span>
            </div>
            <p><strong>硬限制：</strong>${escapeHtml(hideMeta ? "限制交易次数和仓位；每次动作必须写清证据、风险和失效条件。" : item.constraint)}</p>
            <ul class="lesson-mini-list">${(item.passCriteria || []).map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join("")}</ul>
            <button class="mini-button" type="button" data-start-plan-case="${escapeHtml(item.caseId || "")}" data-start-plan-focus="${escapeHtml(item.focus || "")}">开始这项训练</button>
          </section>
        `;
        }).join("")}
      </div>
    </article>
  `;
  }

  function renderSampleQualityCard(sampleQuality, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const report = sampleQuality || {};
    const runCount = Number(options.runCount) || 0;
    const validBlindRuns = Number(report.validBlindRuns) || 0;
    const averageValidDiscipline = Number(report.averageValidDiscipline);
    return `
    <article class="profile-item">
      <strong>样本质量</strong>
      <p>${escapeHtml(report.summary || "暂无足够样本。")}</p>
      <div class="profile-meta">
        <span class="tag ${validBlindRuns >= 3 ? "real" : "important"}">有效盲测 ${validBlindRuns}/${runCount}</span>
        <span class="tag">随机盲测 ${Number(report.randomBlindRuns) || 0}</span>
        <span class="tag">练习样本 ${Number(report.practiceRuns) || 0}</span>
        <span class="tag ${Number(report.corruptedBlindRuns) ? "important" : "real"}">失真盲测 ${Number(report.corruptedBlindRuns) || 0}</span>
        <span class="tag">有效均分 ${Number.isFinite(averageValidDiscipline) ? `${Math.round(averageValidDiscipline)}/100` : "暂无"}</span>
      </div>
      ${renderTrendRows(report.rows, { escapeHtml })}
    </article>
  `;
  }

  function renderExamPerformanceCard(examReport, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const formatPlainPercent = typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultFormatPlainPercent;
    const examLevelLabel = typeof options.examLevelLabel === "function" ? options.examLevelLabel : (level) => level || "暂无";
    const report = examReport || {};
    const passRate = Number(report.passRate);
    const averageComposite = Number(report.averageComposite);
    return `
    <article class="profile-item">
      <strong>真实考试成绩</strong>
      <p>${escapeHtml(report.summary || "还没有真实考试成绩。")}</p>
      <div class="profile-meta">
        <span class="tag ${Number(report.validRuns) >= 5 ? "real" : "important"}">有效考试 ${Number(report.validRuns) || 0}</span>
        <span class="tag">通过 ${Number(report.passedRuns) || 0}</span>
        <span class="tag">考试均分 ${Number.isFinite(averageComposite) ? `${Math.round(averageComposite)}/100` : "暂无"}</span>
        <span class="tag">通过率 ${Number.isFinite(passRate) ? escapeHtml(formatPlainPercent(passRate)) : "暂无"}</span>
        <span class="tag ${levelTagClass(report.level)}">${escapeHtml(examLevelLabel(report.level))}</span>
      </div>
      ${renderTrendRows(report.rows, { escapeHtml })}
    </article>
  `;
  }

  function renderScenarioCoverageCard(coverageReport, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const coverageLevelLabel = typeof options.coverageLevelLabel === "function" ? options.coverageLevelLabel : (level) => level || "暂无";
    const report = coverageReport || {};
    const weakest = report.weakest || {};
    return `
    <article class="profile-item">
      <strong>市场场景覆盖</strong>
      <p>${escapeHtml(report.summary || "暂无足够场景覆盖记录。")}</p>
      <div class="profile-meta">
        <span class="tag ${levelTagClass(report.level)}">${escapeHtml(coverageLevelLabel(report.level))}</span>
        <span class="tag">平均覆盖 ${Number(report.averageScore) || 0}/100</span>
        <span class="tag">已覆盖 ${Number(report.coveredDimensions) || 0}/${Number(report.totalDimensions) || 0}</span>
        <span class="tag">最弱：${escapeHtml(weakest.label || "暂无")}</span>
      </div>
      ${renderTrendRows(report.rows, {
        escapeHtml,
        valueField: "score",
        valueFormatter: (item) => `${Number(item.score) || 0}/100`,
      })}
    </article>
  `;
  }

  function renderLiveReadinessCard(liveReadiness, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const report = liveReadiness || {};
    const blockers = Array.isArray(report.blockers) ? report.blockers : [];
    const gate = report.gate || {};
    const gateRows = Array.isArray(report.gateRows) ? report.gateRows : Array.isArray(gate.rows) ? gate.rows : [];
    const failedGateRows = gateRows.filter((row) => row.status === "fail");
    return `
    <article class="profile-item">
      <strong>实盘前准备度</strong>
      <p>${escapeHtml(report.summary || "暂无足够数据判断实盘前准备度。")}</p>
      <div class="profile-meta">
        <span class="tag ${levelTagClass(report.level)}">${escapeHtml(report.statusLabel || "待训练")}</span>
        <span class="tag">准备度 ${Number(report.score) || 0}/100</span>
        <span class="tag">硬性缺口 ${blockers.length}</span>
        <span class="tag">建议阶段：${escapeHtml(report.stage || "继续模拟")}</span>
      </div>
      <div class="readiness-gate">
        <div class="trend-summary is-${failedGateRows.length ? "danger" : "good"}">
          <strong>硬门槛：${failedGateRows.length ? `${failedGateRows.length} 项未过` : "全部通过"}</strong>
          <p>${escapeHtml(gate.summary || "硬门槛会检查有效盲测、最近纪律、回撤、合约破坏、风险冷却、错题复发和交易机制。")}</p>
        </div>
        ${failedGateRows.length ? `
          <ul class="readiness-blocker-list">
            ${failedGateRows.slice(0, 5).map((row) => `<li><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.detail)}</span></li>`).join("")}
          </ul>
        ` : ""}
      </div>
      ${renderTrendRows(report.rows, {
        escapeHtml,
        valueField: "score",
        valueFormatter: (item) => `${Number(item.score) || 0}/100`,
      })}
    </article>
  `;
  }

  function renderReflectionCard(reflection, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const reflectedCount = Number(options.reflectedCount) || 0;
    const runCount = Number(options.runCount) || 0;
    return `
    <article class="profile-item">
      <strong>最近反思</strong>
      <p>${reflection && reflection.nextRule
        ? `下轮硬规则：${escapeHtml(reflection.nextRule)}。已保存 ${reflectedCount}/${runCount} 次复盘反思。`
        : "还没有保存过复盘反思。完成案例后，请写下下一轮必须执行的一条硬规则。"}</p>
    </article>
  `;
  }

  function renderRulebookCard(rulebook, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const ruleTagLabel = typeof options.ruleTagLabel === "function" ? options.ruleTagLabel : (tag) => tag || "规则";
    const rules = Array.isArray(rulebook) ? rulebook : [];
    const activeCount = rules.filter((item) => item.active !== false).length;
    return `
    <article class="profile-item">
      <strong>个人纪律规则库</strong>
      <p>${activeCount ? `当前启用 ${activeCount} 条规则。下单教练会检查这些规则。` : "还没有启用的个人规则。保存复盘反思后，下一轮硬规则会自动进入规则库。"}</p>
      <div class="rulebook-list">
        ${rules.slice(0, 6).map((rule) => `
          <section class="rulebook-card ${rule.active === false ? "is-paused" : ""}">
            <div class="rulebook-head">
              <strong>${escapeHtml(rule.text)}</strong>
              <span class="tag ${rule.active === false ? "" : "real"}">${rule.active === false ? "已暂停" : "启用中"}</span>
            </div>
            <p>${escapeHtml((rule.tags || []).map(ruleTagLabel).join("、"))} · 来源 ${escapeHtml(rule.sourceCaseId || "未知")} · 出现 ${Number(rule.timesSeen) || 1} 次</p>
            <button class="mini-button" type="button" data-toggle-rule-id="${escapeHtml(rule.id || "")}">${rule.active === false ? "启用规则" : "暂停规则"}</button>
          </section>
        `).join("") || `<section class="rulebook-card"><p>暂无规则。完成一次复盘反思后会自动生成。</p></section>`}
      </div>
    </article>
  `;
  }

  function renderRemediationCard(remediation, options = {}) {
    if (!remediation) return "";
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const hideMeta = Boolean(options.hideMeta);
    const visibleText = hideMeta
      ? "考试模式隐藏补练标题和来源案例。下一轮按处方限制交易频率、仓位和记录质量，复盘后再查看具体弱项。"
      : `${remediation.title}：下一轮练 ${remediation.nextCaseId} · ${remediation.nextCaseTitle}。${remediation.constraint}`;
    return `
      <article class="profile-item">
        <strong>最新补练处方</strong>
        <p>${escapeHtml(visibleText)}</p>
        <button class="mini-button" type="button" data-start-remediation="profile">开始补练</button>
      </article>
    `;
  }

  function renderProfileRecommendationCard(recommendation, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const hideMeta = Boolean(options.hideMeta);
    const text = hideMeta
      ? "考试模式隐藏具体案例建议。先完成当前匿名训练，再用复盘结果决定下一轮。"
      : recommendation || "先完成一轮完整训练，再根据复盘结果安排下一步。";
    return `
    <article class="profile-item">
      <strong>下一步建议</strong>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
  }

  function renderTrendRows(rows, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const valueField = options.valueField || "value";
    const valueFormatter = typeof options.valueFormatter === "function"
      ? options.valueFormatter
      : (item) => item[valueField];
    const safeRows = Array.isArray(rows) ? rows : [];
    return `
      <div class="trend-grid">
        ${safeRows.map((item) => `
          <section class="trend-row is-${escapeHtml(item.level || "warn")}">
            <div class="trend-head">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(valueFormatter(item))}</strong>
            </div>
            <p>${escapeHtml(item.detail)}</p>
          </section>
        `).join("")}
      </div>
    `;
  }

  function defaultPriorityLabel(priority) {
    return {
      high: "高优先级",
      normal: "正常",
      low: "低优先级",
    }[priority] || "正常";
  }

  function clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  function levelTagClass(level) {
    if (level === "good") return "real";
    if (level === "danger") return "important";
    return "";
  }

  function defaultFormatPlainPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "暂无";
    return `${Math.round(number)}%`;
  }

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  return {
    renderTrainingTrendCard,
    renderSkillRadarCard,
    renderTrainingQueueCard,
    renderSampleQualityCard,
    renderExamPerformanceCard,
    renderScenarioCoverageCard,
    renderLiveReadinessCard,
    renderReflectionCard,
    renderRulebookCard,
    renderRemediationCard,
    renderProfileRecommendationCard,
    renderTrendRows,
    defaultPriorityLabel,
  };
});
