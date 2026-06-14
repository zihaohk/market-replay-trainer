(function trainingPlanUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayTrainingPlanUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createTrainingPlanUiApi() {
  function renderDailyTrainingPlan(plan, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
    const priorityLabel = typeof options.priorityLabel === "function" ? options.priorityLabel : defaultPriorityLabel;
    const trainingModeLabel = typeof options.trainingModeLabel === "function" ? options.trainingModeLabel : defaultTrainingModeLabel;
    const displayCaseId = typeof options.displayCaseId === "function" ? options.displayCaseId : (caseId) => caseId || "匿名案例";
    const hideMeta = Boolean(options.hideMeta);
    const primary = plan?.primary || {};
    const weakestSkill = plan?.weakestSkill || { label: "基础纪律", score: 0 };
    const planTitle = hideMeta ? "今日匿名盲测计划" : plan?.title || "今日训练计划";
    const planSummary = hideMeta
      ? `${displayCaseId(primary.caseId)} · 匿名训练任务，预计 ${Number(plan?.estimatedMinutes) || 35} 分钟。`
      : plan?.summary || `${primary.caseId || "训练案例"} · ${primary.caseTitle || "训练任务"}`;
    const steps = hideMeta ? anonymizedDailyPlanSteps() : Array.isArray(plan?.steps) ? plan.steps : [];
    const stopRules = hideMeta ? anonymizedStopRules() : Array.isArray(plan?.stopRules) ? plan.stopRules : [];
    const priority = primary.priority || "normal";
    return `
    <article class="profile-item daily-plan-card is-${escapeHtml(priority)}">
      <div class="daily-plan-head">
        <div>
          <strong>${escapeHtml(planTitle)}</strong>
          <p>${escapeHtml(planSummary)}</p>
        </div>
        <span class="tag ${priority === "high" ? "important" : priority === "normal" ? "real" : ""}">${escapeHtml(priorityLabel(priority))}</span>
      </div>
      <div class="daily-plan-meta">
        <span class="tag">${Number(plan?.estimatedMinutes) || 35} 分钟</span>
        <span class="tag">建议${escapeHtml(trainingModeLabel(plan?.modeSuggestion))}</span>
        <span class="tag">最弱项：${escapeHtml(weakestSkill.label)} ${Number(weakestSkill.score) || 0}/100</span>
        <span class="tag">高优先级 ${Number(plan?.highPriorityCount) || 0} 项</span>
      </div>
      <div class="daily-plan-steps">
        ${steps.map((step) => `
          <section class="daily-plan-step">
            <strong>${escapeHtml(step.title)}</strong>
            <p>${escapeHtml(step.detail)}</p>
            <span>${escapeHtml(step.check)}</span>
          </section>
        `).join("")}
      </div>
      <div class="daily-plan-stop">
        <strong>硬停止规则</strong>
        <ul class="lesson-mini-list">${stopRules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <button class="mini-button" type="button" data-start-plan-case="${escapeHtml(primary.caseId || "")}" data-start-plan-focus="${escapeHtml(primary.focus || "")}">按今日计划开始</button>
    </article>
  `;
  }

  function anonymizedDailyPlanSteps() {
    return [
      {
        title: "1. 训练前热身",
        detail: "确认当前处于考试模式；不要猜真实年份、公司、行业或历史事件。",
        check: "保存训练合约、配置蓝图和市场假设。",
      },
      {
        title: "2. 主训练",
        detail: "只根据价格、成交量、新闻摘要、事件窗口、组合风险和自己写下的计划做决策。",
        check: "遇到关键节点先写判断；出现红色教练提醒时不新增风险。",
      },
      {
        title: "3. 复盘动作",
        detail: "揭晓后再查看真实案例、课程主题、任务来源和弱项处方。",
        check: "先看过程评分，再看收益。",
      },
      {
        title: "4. 验收标准",
        detail: "任务、纪律、下单质量和复盘反思都达标，才把本轮算作有效训练。",
        check: "未达标就继续按弱项补练，不升难度。",
      },
    ];
  }

  function anonymizedStopRules() {
    return [
      "没有保存训练合约，不开始交易。",
      "想猜案例身份时，先写下可见证据，不用记忆下注。",
      "出现红色教练提醒，不加仓，只能观望、减仓或重写计划。",
    ];
  }

  function defaultPriorityLabel(priority) {
    return {
      high: "高优先级",
      normal: "正常",
      low: "低优先级",
    }[priority] || "正常";
  }

  function defaultTrainingModeLabel(mode) {
    return {
      exam: "考试模式",
      advanced: "进阶模式",
      novice: "新手模式",
    }[mode] || "新手模式";
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
    renderDailyTrainingPlan,
    anonymizedDailyPlanSteps,
    anonymizedStopRules,
    defaultPriorityLabel,
    defaultTrainingModeLabel,
  };
});
