(function reviewModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayReview = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createReviewApi() {
  const evidenceLabels = {
    price: "价格/趋势",
    relative: "相对强弱",
    news: "新闻/事件",
    volume: "成交量/波动",
    risk: "组合风险",
  };

  function buildCoachStats(decisions = []) {
    const snapshots = (decisions || []).map((item) => item.coach).filter((item) => item && Number.isFinite(item.score));
    if (!snapshots.length) {
      return {
        sampleCount: 0,
        averageScore: Number.NaN,
        dangerCount: 0,
        warnCount: 0,
        topIssues: [],
      };
    }
    const issueCounts = {};
    snapshots.forEach((snapshot) => {
      snapshot.issues?.forEach((issue) => {
        issueCounts[issue.title] = (issueCounts[issue.title] || 0) + 1;
      });
    });
    return {
      sampleCount: snapshots.length,
      averageScore: snapshots.reduce((sum, item) => sum + item.score, 0) / snapshots.length,
      dangerCount: snapshots.filter((item) => item.level === "danger").length,
      warnCount: snapshots.filter((item) => item.level === "warn").length,
      topIssues: topEntries(issueCounts, 4),
    };
  }

  function buildEvidenceSourceReview(decisions = []) {
    const rows = chronologicalDecisions(decisions).map((decision) => {
      const sources = normalizeEvidenceSources(decision.evidenceSources);
      const thin = sources.length > 0 && sources.length < 2 && decision.side !== "hold";
      const missing = sources.length === 0;
      const highConfidenceThin = Number(decision.confidence) >= 4 && sources.length < 3;
      const level = missing || highConfidenceThin ? "danger" : thin ? "warn" : "good";
      return {
        day: decision.day,
        symbol: decision.symbol,
        side: decision.side,
        confidence: Number(decision.confidence),
        sources,
        sourceCount: sources.length,
        missing,
        thin,
        highConfidenceThin,
        level,
        summary: missing
          ? "没有记录证据来源。"
          : highConfidenceThin
            ? "高信心但证据来源不足。"
            : thin
              ? "买卖动作证据来源偏单一。"
              : "证据来源结构较完整。",
      };
    });
    if (!rows.length) {
      return {
        sampleCount: 0,
        averageSourceCount: Number.NaN,
        missingSourceCount: 0,
        singleSourceCount: 0,
        highConfidenceThinCount: 0,
        sourceCounts: [],
        rows: [],
        score: 100,
        level: "good",
        summary: "本轮没有决策样本。",
      };
    }
    const sourceMap = {};
    rows.forEach((row) => {
      row.sources.forEach((source) => {
        sourceMap[source] = (sourceMap[source] || 0) + 1;
      });
    });
    const missingSourceCount = rows.filter((item) => item.missing).length;
    const singleSourceCount = rows.filter((item) => item.thin).length;
    const highConfidenceThinCount = rows.filter((item) => item.highConfidenceThin).length;
    const averageSourceCount = rows.reduce((sum, item) => sum + item.sourceCount, 0) / rows.length;
    const score = Math.max(0, Math.round(100
      - missingSourceCount * 24
      - singleSourceCount * 12
      - highConfidenceThinCount * 14
      - Math.max(0, 2 - averageSourceCount) * 8));
    const level = score >= 82 ? "good" : score >= 62 ? "warn" : "danger";
    const sourceCounts = topEntries(Object.fromEntries(Object.entries(sourceMap).map(([key, value]) => [evidenceSourceLabel(key), value])), 5);
    return {
      sampleCount: rows.length,
      averageSourceCount,
      missingSourceCount,
      singleSourceCount,
      highConfidenceThinCount,
      sourceCounts,
      rows,
      score,
      level,
      summary: `平均每笔 ${averageSourceCount.toFixed(1)} 类证据；未记录 ${missingSourceCount} 笔，买卖证据单薄 ${singleSourceCount} 笔，高信心证据不足 ${highConfidenceThinCount} 笔。`,
    };
  }

  function buildLiquidityReview(decisions = [], options = {}) {
    const getLiquiditySnapshot = typeof options.getLiquiditySnapshot === "function" ? options.getLiquiditySnapshot : (decision) => decision.liquidity;
    const formatPercent = typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent;
    const formatCurrency = typeof options.formatCurrency === "function" ? options.formatCurrency : defaultCurrency;
    const rows = chronologicalDecisions(decisions)
      .filter((decision) => decision.side !== "hold")
      .map((decision) => {
        const snapshot = getLiquiditySnapshot(decision) || {};
        const level = snapshot.level || (snapshot.volumeSharePct > 2 ? "danger" : snapshot.volumeSharePct > 0.5 ? "warn" : "good");
        return {
          day: decision.day,
          symbol: decision.symbol,
          side: decision.side,
          level,
          volumeSharePct: Number(snapshot.volumeSharePct) || 0,
          dollarVolumeSharePct: Number(snapshot.dollarVolumeSharePct) || 0,
          impactBps: Number(snapshot.impactBps) || 0,
          impactCost: Number(snapshot.impactCost) || 0,
          dayVolume: Number(snapshot.dayVolume) || 0,
          summary: liquiditySnapshotSummary(level, snapshot, formatPercent),
        };
      });
    if (!rows.length) {
      return {
        sampleCount: 0,
        dangerCount: 0,
        warnCount: 0,
        averageVolumeSharePct: Number.NaN,
        totalImpactCost: 0,
        score: 100,
        level: "good",
        rows: [],
        summary: "本轮没有买卖交易样本。",
      };
    }
    const dangerCount = rows.filter((item) => item.level === "danger").length;
    const warnCount = rows.filter((item) => item.level === "warn").length;
    const averageVolumeSharePct = rows.reduce((sum, item) => sum + item.volumeSharePct, 0) / rows.length;
    const totalImpactCost = rows.reduce((sum, item) => sum + item.impactCost, 0);
    const score = Math.max(0, Math.round(100 - dangerCount * 28 - warnCount * 10 - Math.max(0, averageVolumeSharePct - 0.5) * 4));
    const level = score >= 82 ? "good" : score >= 60 ? "warn" : "danger";
    return {
      sampleCount: rows.length,
      dangerCount,
      warnCount,
      averageVolumeSharePct,
      totalImpactCost,
      score,
      level,
      rows,
      summary: `买卖交易 ${rows.length} 笔，流动性红色 ${dangerCount} 笔、黄色 ${warnCount} 笔，平均订单占当天成交量 ${formatPercent(averageVolumeSharePct)}，估算冲击 ${formatCurrency(totalImpactCost)}。`,
    };
  }

  function buildOrderExecutionReview({ pendingOrders = [], decisions = [], revealed = false, displayDay = (day) => day + 1 } = {}) {
    const orders = pendingOrders || [];
    const limitDecisions = (decisions || []).filter((decision) => decision.orderType === "limit");
    const submittedCount = orders.length + limitDecisions.filter((decision) => !decision.orderId).length;
    const filledCount = orders.filter((order) => order.status === "filled").length + limitDecisions.filter((decision) => !decision.orderId).length;
    const activeCount = orders.filter((order) => order.status === "active").length;
    const expiredCount = orders.filter((order) => order.status === "expired").length;
    const canceledCount = orders.filter((order) => order.status === "canceled").length;
    const score = submittedCount ? Math.max(0, Math.round(100 - expiredCount * 18 - canceledCount * 18 - activeCount * (revealed ? 12 : 4))) : 100;
    const level = score >= 82 ? "good" : score >= 60 ? "warn" : "danger";
    const rows = [
      ...orders.map((order) => ({
        id: order.id,
        createdDay: order.createdDay,
        closedDay: order.closedDay ?? null,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        limitPrice: order.limitPrice,
        status: order.status,
        fillPrice: order.fillPrice || 0,
        detail: order.status === "filled"
          ? `第 ${displayDay(order.closedDay)} 天触发成交。`
          : order.status === "expired"
            ? "有效期内价格没有触发，订单过期。"
            : order.status === "canceled"
              ? `订单取消：${order.cancelReason || "条件变化"}。`
              : "仍在等待价格触发。",
      })),
      ...limitDecisions.filter((decision) => !decision.orderId).map((decision) => ({
        id: `immediate-${decision.day}-${decision.symbol}`,
        createdDay: decision.orderSubmittedDay ?? decision.day,
        closedDay: decision.day,
        symbol: decision.symbol,
        side: decision.side,
        quantity: decision.quantity,
        limitPrice: decision.limitPrice || decision.price,
        status: "filled",
        fillPrice: decision.price,
        detail: "限价单提交时已可成交。",
      })),
    ].sort((a, b) => a.createdDay - b.createdDay);
    return {
      submittedCount,
      filledCount,
      activeCount,
      expiredCount,
      canceledCount,
      score,
      level,
      rows,
      summary: submittedCount
        ? `本轮限价单 ${submittedCount} 张，成交 ${filledCount} 张，等待 ${activeCount} 张，过期 ${expiredCount} 张，取消 ${canceledCount} 张。`
        : "本轮没有使用限价单。市价单适合小额高流动性交易，但高波动时应考虑限价纪律。",
    };
  }

  function buildRemediationPlan({
    selectedCase = {},
    flags = [],
    diagnostics = [],
    mission = {},
    coachStats = {},
    remediationRules = {},
    cases = [],
    classifyMistake: classify = classifyMistake,
  } = {}) {
    const mistakeKeys = (flags || []).map(classify);
    const diagnosticTypes = (diagnostics || []).map((item) => item.type);
    if (!mission.passed && !mistakeKeys.includes("缺少观望") && (mission.stats?.holdCount || 0) < (mission.plan?.rules?.minHolds || 0)) {
      mistakeKeys.unshift("缺少观望");
    }
    if (coachStats.sampleCount && coachStats.averageScore < 75 && !mistakeKeys.includes("下单质量低")) {
      mistakeKeys.unshift("下单质量低");
    }
    if (diagnosticTypes.includes("averaging-down") && !mistakeKeys.includes("补仓失控")) mistakeKeys.unshift("补仓失控");
    if (diagnosticTypes.includes("early-bottom-fishing") && !mistakeKeys.includes("过早抄底")) mistakeKeys.unshift("过早抄底");
    if (diagnosticTypes.includes("ignored-risk-limit") && !mistakeKeys.includes("未执行止损")) mistakeKeys.unshift("未执行止损");

    const uniqueKeys = [...new Set(mistakeKeys)];
    const primaryKey = uniqueKeys.find((key) => remediationRules[key]) || "计划不清";
    const rule = remediationRules[primaryKey] || remediationRules["计划不清"] || fallbackRemediationRule();
    const availableCaseIds = new Set((cases || []).map((caseItem) => caseItem.id).filter(Boolean));
    const caseIds = [...new Set([...(rule.caseIds || []), ...extractCaseIdsFromText(mission.plan?.drill)])]
      .filter((caseId) => !availableCaseIds.size || availableCaseIds.has(caseId))
      .slice(0, 3);
    const selectedCaseId = selectedCase.id;
    const nextCaseId = caseIds.find((caseId) => caseId !== selectedCaseId) || caseIds[0] || selectedCaseId;
    const nextCase = (cases || []).find((caseItem) => caseItem.id === nextCaseId);
    const coachIssueText = coachStats.topIssues?.length
      ? `教练高频提醒：${coachStats.topIssues.map(([issue, count]) => `${issue} ${count} 次`).join("；")}。`
      : "教练没有保存高频问题。";

    return {
      primaryIssue: primaryKey,
      title: rule.title,
      nextCaseId,
      nextCaseTitle: nextCase?.maskedTitle || nextCaseId,
      caseIds,
      constraint: rule.constraint,
      checklist: rule.checklist || [],
      passCriteria: [
        "任务评分达到 80/100 或通关。",
        "平均下单质量达到 80/100，且红色提醒为 0。",
        "至少完成本处方要求的关键动作。",
      ],
      reason: `${mission.passed ? "任务已通过" : "任务未通过"}；${flags.length ? `主要问题：${uniqueKeys.slice(0, 3).join("、")}。` : "本轮问题较少。"}${coachIssueText}`,
    };
  }

  function buildRootCauseMatrix({
    mission = {},
    coachStats = {},
    writingQuality = {},
    evidenceSourceReview = {},
    liquidityReview = {},
    orderExecutionReview = {},
    corporateActionReview = {},
    gapRiskReview = {},
    eventRiskReview = {},
    blindIntegrityReview = {},
    contractStatus = {},
    allocationStatus = {},
    thesisQuality = {},
    lessonGate = {},
    diagnostics = [],
    flags = [],
    revealReadiness = {},
    signalCalibration = {},
    newsCalibration = {},
    confidenceCalibration = {},
    invalidationExecution = {},
    profitPlanReview = {},
    positionTriggerReview = {},
    checkpointReview = {},
    riskCoolingReview = {},
    decisions = [],
    currentDay = 0,
    keyDays = [],
    signalForecasts = {},
    caseLength = 0,
    reflectionSaved = false,
    classifyMistake: classify = classifyMistake,
  } = {}) {
    const diagnosticTypes = (diagnostics || []).map((item) => item.type);
    const mistakeKeys = (flags || []).map(classify);
    const coachIssues = (coachStats.topIssues || []).map(([title]) => title);
    const emotionalCount = (decisions || []).filter((item) => ["fomo", "panic", "greed"].includes(item.emotion)).length;
    const badForecasts = (signalCalibration.items || []).filter((item) => item.verdict?.level === "danger").length;
    const missingForecasts = (keyDays || []).filter((day) => day <= currentDay && !signalForecasts?.[day]).length;
    const contract = contractStatus.contract || {};
    const thesis = thesisQuality.thesis || {};
    const items = [
      rootCauseItem({
        key: "preparation",
        label: "课前准备",
        focus: "先懂规则，再进市场。",
        checks: [
          rootCauseCheck(!lessonGate.passed, 30, "课程检查题未通过，说明本关概念没有先消化。", "下一轮先一次通过检查题，再提交任何决策。"),
          rootCauseCheck(blindIntegrityReview.active && blindIntegrityReview.score < 85, Math.min(30, 100 - blindIntegrityReview.score), `随机盲测完整性 ${blindIntegrityReview.score}/100。`, "随机盲测中不要切模式、换案例或提前揭晓；否则本轮不能当作真实考试样本。"),
          rootCauseCheck(!contract.saved, 20, "训练合约未保存，缺少事前纪律边界。", "开局先写回撤、交易次数、仓位和观望要求。"),
          rootCauseCheck(!thesis.saved, 20, "市场假设未保存，买卖缺少统一逻辑。", "交易前先写基准情景、看多/看空条件和触发器。"),
          rootCauseCheck(revealReadiness.score < 70, 15, `揭晓纪律 ${revealReadiness.score}/100，可能过早看答案。`, "低于 70/100 不把本轮算作合格训练。"),
        ],
        defaultAction: "保持先读课程、写合约、写假设、再交易的顺序。",
      }),
      rootCauseItem({
        key: "hypothesis",
        label: "市场假设",
        focus: "让动作服从事前情景，而不是服从情绪。",
        checks: [
          rootCauseCheck(thesisQuality.score < 80, Math.min(35, 100 - thesisQuality.score), `市场假设质量 ${thesisQuality.score}/100。`, "下一轮同时写看多和看空条件，且写清楚什么证据改变判断。"),
          rootCauseCheck(coachIssues.some((item) => item.includes("市场假设") || item.includes("动作违背假设") || item.includes("超过假设暴露")), 25, "下单教练发现动作和市场假设不一致。", "买卖前先问：机会触发器或风险触发器是否真的发生。"),
          rootCauseCheck(badForecasts > 0, 14, `关键节点判断有 ${badForecasts} 次明显失准。`, "遇到关键节点先写概率和行动计划，不追求猜中，只追求可校准。"),
        ],
        defaultAction: "继续把假设写成可被后续价格和新闻证伪的句子。",
      }),
      rootCauseItem({
        key: "risk",
        label: "仓位与风控",
        focus: "先控制损失，再考虑收益。",
        checks: [
          rootCauseCheck(!contractStatus.passed, Math.min(30, 100 - contractStatus.score), `训练合约执行 ${contractStatus.score}/100。`, "下一轮把最大单仓、最多交易次数和回撤预算设得更保守。"),
          rootCauseCheck(riskCoolingReview.forbiddenBuyCount > 0, Math.min(35, riskCoolingReview.forbiddenBuyCount * 18), `风险冷却后仍继续买入 ${riskCoolingReview.forbiddenBuyCount} 次。`, "回撤超过合约预算后，只允许观望、减仓、止损或复查，不允许新增风险。"),
          rootCauseCheck(riskCoolingReview.active && riskCoolingReview.defensiveActionCount === 0, 18, "回撤预算被打穿后没有防守动作或复查记录。", "触发风险冷却当天先写复查，明确是减仓、止损、暂停加仓还是继续观察。"),
          rootCauseCheck(!allocationStatus.passed, Math.min(24, 100 - allocationStatus.score), `配置蓝图执行 ${allocationStatus.score}/100。`, "下一轮先确定 ETF 核心、卫星仓和现金底线，再考虑单股机会。"),
          rootCauseCheck(diagnosticTypes.includes("averaging-down"), 25, "出现连续向下补仓。", "亏损后禁止新增买入，先写减仓或观望计划。"),
          rootCauseCheck(diagnosticTypes.includes("ignored-risk-limit"), 25, "触发亏损边界后没有处理。", "每笔交易必须有亏损线，触发后只允许减仓、止损或写新证据。"),
          rootCauseCheck(invalidationExecution.failedCount > 0, Math.min(30, invalidationExecution.failedCount * 12), `失效条件触发后有 ${invalidationExecution.failedCount} 笔没有及时响应。`, "触发亏损线后 2 天内必须卖出、减仓、止损或提交重新评估记录。"),
          rootCauseCheck(positionTriggerReview.failedCount > 0, Math.min(30, positionTriggerReview.failedCount * 10), `持仓计划触发后有 ${positionTriggerReview.failedCount} 个节点没有按纪律响应。`, "时间暂停提示出现时，先处理亏损线或 2R 盈利窗口，再继续推进行情。"),
          rootCauseCheck(mistakeKeys.includes("仓位集中"), 18, "仓位过度集中。", "单股和单行业上限先降下来，用 ETF 做主仓。"),
        ],
        defaultAction: "继续用小仓试探和压力测试来限制单次错误的伤害。",
      }),
      rootCauseItem({
        key: "execution",
        label: "执行纪律",
        focus: "少做、慢做、按计划做。",
        checks: [
          rootCauseCheck(!mission.passed, Math.min(28, 100 - mission.score), `任务评分 ${mission.score}/100，未稳定通过。`, "下一轮把任务评分 80/100 放在收益前面。"),
          rootCauseCheck(coachStats.dangerCount > 0, 20 + coachStats.dangerCount * 4, `下单教练出现 ${coachStats.dangerCount} 次红色提醒。`, "红色提醒出现时不要硬交，改为观望或重写计划。"),
          rootCauseCheck(blindIntegrityReview.dangerCount > 0, Math.min(24, blindIntegrityReview.dangerCount * 14), `随机盲测中出现 ${blindIntegrityReview.dangerCount} 个红色完整性问题。`, "如果已经破坏盲测条件，继续训练可以练流程，但复盘不能把结果当成真实未知环境成绩。"),
          rootCauseCheck(diagnosticTypes.includes("incomplete-plan"), 18, "有计划记录不完整的决策。", "每次决策都必须写目的、周期、理由和失效条件。"),
          rootCauseCheck(profitPlanReview.failedCount > 0, Math.min(22, profitPlanReview.failedCount * 9), `有 ${profitPlanReview.failedCount} 笔买入出现盈利窗口后没有执行盈利/再平衡计划。`, "买入前就写好盈利后的减仓、止盈或继续持有条件，触发后必须记录动作。"),
          rootCauseCheck(positionTriggerReview.triggerCount > 0 && positionTriggerReview.score < 75, Math.min(18, 100 - positionTriggerReview.score), `持仓触发执行 ${positionTriggerReview.score}/100。`, "触发提醒不是行情解说，而是纪律检查点：必须记录处理动作或复查理由。"),
          rootCauseCheck(orderExecutionReview.expiredCount > 0, Math.min(16, orderExecutionReview.expiredCount * 8), `有 ${orderExecutionReview.expiredCount} 张限价单过期未成交。`, "限价单过期后要复盘：价格太贪、判断没发生，还是应该改成观望。"),
          rootCauseCheck(eventRiskReview.dangerEventTradeCount > 0, Math.min(24, eventRiskReview.dangerEventTradeCount * 10), `高风险事件窗口交易 ${eventRiskReview.dangerEventTradeCount} 笔。`, "财报、数据日、政策和监管节点前后先降速，普通日仓位不能照搬到事件日。"),
          rootCauseCheck(eventRiskReview.largeEventTradeCount > 0, Math.min(20, eventRiskReview.largeEventTradeCount * 10), `事件窗口出现大额交易 ${eventRiskReview.largeEventTradeCount} 笔。`, "事件日前后只允许小仓试探或观望，先等结果和价格反应再扩大仓位。"),
          rootCauseCheck(corporateActionReview.missedCount > 0, Math.min(16, corporateActionReview.missedCount * 8), `有 ${corporateActionReview.missedCount} 个公司行动没有进入记录。`, "训练推进到分红、拆股节点后，先确认现金、股数和价格口径，再继续下判断。"),
          rootCauseCheck(gapRiskReview.gapTradeCount > 0, Math.min(18, gapRiskReview.gapTradeCount * 6), `有 ${gapRiskReview.gapTradeCount} 笔交易发生在明显跳空日。`, "跳空日先确认开盘重定价原因，优先限价、小仓或观望，不要默认止损价能成交。"),
          rootCauseCheck(checkpointReview.missingAfterTrade > 0, 18, "本轮有交易但没有任何盘中复查记录。", "买入后每隔几天写一次原计划是否仍成立，不能只等结果。"),
          rootCauseCheck(checkpointReview.stalePlanCount > 0, Math.min(20, checkpointReview.stalePlanCount * 8), `有 ${checkpointReview.stalePlanCount} 个持仓计划长时间未复查。`, "持仓超过复查间隔时，先保存复查记录，再考虑继续推进时间。"),
          rootCauseCheck(checkpointReview.unresolvedDeterioration > 0, Math.min(18, checkpointReview.unresolvedDeterioration * 8), `有 ${checkpointReview.unresolvedDeterioration} 次风险变差但没有降风险动作。`, "如果写下证据恶化，动作至少应降级为不加仓、减仓或止损。"),
          rootCauseCheck(mistakeKeys.includes("过度交易"), 16, "交易频率偏高。", "下一轮限制最多 3 次交易，多用主动观望记录。"),
          rootCauseCheck(mistakeKeys.includes("缺少观望"), 14, "缺少主动观望。", "至少记录一次不交易的理由和下一次检查条件。"),
        ],
        defaultAction: "保持低频交易，把每一次动作都做成可审计的计划。",
      }),
      rootCauseItem({
        key: "emotion",
        label: "情绪控制",
        focus: "情绪可以出现，但不能指挥交易。",
        checks: [
          rootCauseCheck(emotionalCount > 0, 18 + emotionalCount * 5, `记录到 ${emotionalCount} 次追涨、恐慌或贪心。`, "高风险情绪出现时，先把动作降级为观望或更小仓位。"),
          rootCauseCheck(confidenceCalibration.overconfidenceCount > 0, Math.min(24, confidenceCalibration.overconfidenceCount * 8), `有 ${confidenceCalibration.overconfidenceCount} 次高信心但后续结果不匹配。`, "高信心只能来自证据，不来自想赢回亏损或害怕错过。"),
          rootCauseCheck(mistakeKeys.includes("追高"), 18, "出现追高倾向。", "大涨后只允许试探仓，且必须写明不追的条件。"),
          rootCauseCheck(mistakeKeys.includes("恐慌卖出"), 18, "出现恐慌卖出倾向。", "大跌后先检查失效条件，不因为价格下跌本身卖出。"),
        ],
        defaultAction: "继续把情绪写进记录，并让仓位自动降级。",
      }),
      rootCauseItem({
        key: "evidence",
        label: "证据质量",
        focus: "用可验证证据替代感觉。",
        checks: [
          rootCauseCheck(writingQuality.sampleCount === 0, 20, "本轮没有可评分的决策文字样本。", "即使观望，也要写清楚看到什么、为什么等、何时再看。"),
          rootCauseCheck(Number.isFinite(writingQuality.averageScore) && writingQuality.averageScore < 75, 22, `决策文字质量 ${Math.round(writingQuality.averageScore)}/100。`, "把“感觉、应该、肯定”改成价格、相对强弱、触发条件和动作。"),
          rootCauseCheck(evidenceSourceReview.score < 70, 18, `证据来源评分 ${evidenceSourceReview.score}/100，可能长期依赖单一证据。`, "每次买卖至少用价格、相对强弱、新闻/事件、成交量或组合风险中的两类互相验证。"),
          rootCauseCheck(liquidityReview.dangerCount > 0, Math.min(20, liquidityReview.dangerCount * 10), `有 ${liquidityReview.dangerCount} 笔交易流动性红色，成交假设不够真实。`, "下一轮下单前先看订单占当天成交量，过大就缩小或分批。"),
          rootCauseCheck(liquidityReview.warnCount > 1, Math.min(14, liquidityReview.warnCount * 5), `有 ${liquidityReview.warnCount} 笔交易需要分批成交。`, "把成交量/波动作为证据来源，不要默认所有订单都能立刻成交。"),
          rootCauseCheck(gapRiskReview.dangerGapCount > 0, Math.min(15, gapRiskReview.dangerGapCount * 4), `本轮出现 ${gapRiskReview.dangerGapCount} 个红色跳空节点。`, "复盘时把隔夜跳空从普通日内波动里拆出来，尤其检查市价单和止损假设。"),
          rootCauseCheck(missingForecasts > 0 && currentDay >= Math.max(3, caseLength * 0.35), Math.min(18, missingForecasts * 4), `有 ${missingForecasts} 个关键节点没有保存判断。`, "关键节点先写未来几天风险判断，再推进时间。"),
          rootCauseCheck(newsCalibration.missedImportant > 0, Math.min(20, newsCalibration.missedImportant * 6), `有 ${newsCalibration.missedImportant} 条重要新闻没有做判断。`, "看到新闻时先判断它是重要、噪音还是滞后，再决定是否行动。"),
          rootCauseCheck(corporateActionReview.score < 80, Math.min(18, 100 - corporateActionReview.score), `公司行动理解 ${corporateActionReview.score}/100。`, "遇到分红、拆股、复权时，把它从普通涨跌里拆出来看总资产。"),
          rootCauseCheck(Number.isFinite(newsCalibration.score) && newsCalibration.score < 65, 16, `新闻判断校准 ${newsCalibration.score}/100。`, "下一轮先校准新闻性质，再让价格反应验证判断。"),
          rootCauseCheck(Number.isFinite(confidenceCalibration.score) && confidenceCalibration.score < 65, 16, `信心校准 ${confidenceCalibration.score}/100，主观把握和后续验证偏差较大。`, "每笔决策先写证据等级，再按证据等级决定仓位。"),
        ],
        defaultAction: "继续训练把证据、因果和失效条件写完整。",
      }),
      rootCauseItem({
        key: "review-loop",
        label: "复盘闭环",
        focus: "训练结束必须产出下一轮规则。",
        checks: [
          rootCauseCheck(!reflectionSaved, 18, "复盘反思还没有保存下一轮硬规则。", "复盘后写下一个可以执行的硬规则，不写空泛口号。"),
          rootCauseCheck(checkpointReview.sampleCount === 0 && (decisions || []).some((item) => item.side !== "hold"), 12, "复查闭环缺失，复盘只能看到交易结果，看不到持仓过程。", "下一轮至少保存一次盘中复查，说明继续持有或处理的依据。"),
          rootCauseCheck(revealReadiness.score < 80, 10, `结束前检查 ${revealReadiness.score}/100。`, "揭晓前先补齐课程、合约、假设、决策样本和关键节点判断。"),
        ],
        defaultAction: "每轮复盘后都把下一轮限制写成可执行动作。",
      }),
    ];
    const sorted = items.sort((a, b) => b.severityScore - a.severityScore);
    return {
      items: sorted,
      primary: sorted[0],
      summary: sorted[0].severityScore
        ? `本轮首要根因是“${sorted[0].label}”：${sorted[0].drivers[0]?.evidence || sorted[0].focus}`
        : "本轮没有明显根因失控，但仍要继续积累样本。",
    };
  }

  function rootCauseCheck(active, penalty, evidence, action) {
    const safePenalty = Number.isFinite(penalty) ? penalty : 0;
    return { active: Boolean(active), penalty: Math.max(0, safePenalty), evidence, action };
  }

  function rootCauseItem({ key, label, focus, checks, defaultAction }) {
    const activeChecks = checks.filter((item) => item.active);
    const severityScore = Math.min(100, Math.round(activeChecks.reduce((sum, item) => sum + item.penalty, 0)));
    const score = Math.max(0, 100 - severityScore);
    const level = severityScore >= 45 ? "danger" : severityScore >= 18 ? "warn" : "good";
    return {
      key,
      label,
      focus,
      score,
      severityScore,
      level,
      drivers: activeChecks.map((item) => ({ evidence: item.evidence, action: item.action, penalty: item.penalty })),
      nextAction: activeChecks[0]?.action || defaultAction,
    };
  }

  function buildPlanAdherenceReport(runs = [], options = {}) {
    const plannedRuns = (runs || [])
      .filter((run) => run && (run.activeTrainingPlan || run.activeTrainingPlanResult || run.activeTrainingPlanPassed !== null && run.activeTrainingPlanPassed !== undefined))
      .map((run) => buildPlanAdherenceRun(run, options));
    const passCount = plannedRuns.filter((run) => run.passed).length;
    const passRate = plannedRuns.length ? (passCount / plannedRuns.length) * 100 : Number.NaN;
    const mistakeDrillRuns = plannedRuns.filter((run) => run.launchMode === "mistake-drill").length;
    const randomBlindPlanRuns = plannedRuns.filter((run) => run.launchMode === "random-blind").length;
    const typeRows = buildPlanAdherenceGroups(plannedRuns, (run) => planLaunchModeLabel(run.launchMode), planLaunchModeNextAction);
    const focusRows = buildPlanAdherenceGroups(plannedRuns, (run) => run.focus || "未记录 focus", planFocusNextAction)
      .filter((row) => row.count >= 1)
      .sort((a, b) => a.passRate - b.passRate || b.count - a.count)
      .slice(0, 4);
    const weakestFocus = focusRows[0] || null;
    const level = !plannedRuns.length ? "danger" : passRate >= 75 && plannedRuns.length >= 3 ? "good" : passRate >= 50 ? "warn" : "danger";
    return {
      level,
      plannedRuns: plannedRuns.length,
      passedRuns: passCount,
      failedRuns: plannedRuns.length - passCount,
      passRate,
      mistakeDrillRuns,
      randomBlindPlanRuns,
      typeRows,
      focusRows,
      weakestFocus,
      summary: planAdherenceSummary({ plannedRuns, passRate, weakestFocus, formatPercent: options.formatPercent || defaultPercent }),
    };
  }

  function buildPlanAdherenceRun(run, options = {}) {
    const result = run.activeTrainingPlanResult || {};
    const plan = run.activeTrainingPlan || {};
    const passed = typeof run.activeTrainingPlanPassed === "boolean"
      ? run.activeTrainingPlanPassed
      : typeof result.passed === "boolean"
        ? result.passed
        : null;
    const getCaseTitle = typeof options.getCaseTitle === "function" ? options.getCaseTitle : (caseId) => caseId || "未知案例";
    return {
      caseId: run.caseId,
      title: run.title || getCaseTitle(run.caseId),
      focus: run.activeTrainingPlanFocus || result.focus || plan.focus || "未记录 focus",
      launchMode: run.activeTrainingPlanLaunchMode || result.launchMode || plan.launchMode || "case",
      passed: passed === true,
      hasVerdict: passed !== null,
      disciplineScore: Number(run.disciplineScore),
      missionScore: Number(run.missionScore),
      averageCoachScore: Number(run.averageCoachScore),
      completedAt: run.completedAt || "",
    };
  }

  function buildPlanAdherenceGroups(runs, getLabel, getNextAction) {
    const grouped = runs.reduce((record, run) => {
      const label = getLabel(run);
      if (!record[label]) record[label] = [];
      record[label].push(run);
      return record;
    }, {});
    return Object.entries(grouped)
      .map(([label, groupRuns]) => {
        const passed = groupRuns.filter((run) => run.passed).length;
        const passRate = groupRuns.length ? (passed / groupRuns.length) * 100 : Number.NaN;
        const level = passRate >= 75 && groupRuns.length >= 2 ? "good" : passRate >= 50 ? "warn" : "danger";
        const averageDiscipline = averageFinite(groupRuns.map((run) => run.disciplineScore));
        const averageCoach = averageFinite(groupRuns.map((run) => run.averageCoachScore));
        return {
          label,
          count: groupRuns.length,
          passed,
          passRate,
          level,
          detail: `平均纪律 ${Number.isFinite(averageDiscipline) ? `${Math.round(averageDiscipline)}/100` : "暂无"}，平均下单 ${Number.isFinite(averageCoach) ? `${Math.round(averageCoach)}/100` : "暂无"}。`,
          nextAction: getNextAction(label, { passRate, count: groupRuns.length, passed }),
        };
      })
      .sort((a, b) => b.count - a.count || a.passRate - b.passRate);
  }

  function planLaunchModeLabel(mode) {
    return {
      "mistake-drill": "错题补练",
      "random-blind": "随机盲测计划",
      case: "普通计划训练",
    }[mode] || "普通计划训练";
  }

  function planLaunchModeNextAction(label, row) {
    if (label === "错题补练") return row.passRate >= 75 ? "继续把错题卡变成稳定通过样本。" : "错题补练未稳，下一轮继续按同一硬限制训练。";
    if (label === "随机盲测计划") return row.passRate >= 75 ? "继续积累有效考试样本。" : "先修盲测完整性、任务通过和复盘反思。";
    return row.passRate >= 75 ? "可以继续按课程路径推进。" : "先降低难度，确认计划限制真的被执行。";
  }

  function planFocusNextAction(label, row) {
    if (`${label}`.includes("追高")) return "下一轮仍按小仓试探和失败条件训练，不允许用收益证明追高合理。";
    if (`${label}`.includes("盲测") || `${label}`.includes("考试")) return "从随机盲测入口开始，保持考试模式到复盘。";
    if (`${label}`.includes("实盘")) return "继续做小额前演练，不把单次盈利当通过。";
    if (row.passRate < 50) return "同一 focus 继续补练，直到至少连续两轮达标。";
    return "继续用不同案例巩固这个 focus。";
  }

  function planAdherenceSummary({ plannedRuns, passRate, weakestFocus, formatPercent = defaultPercent }) {
    if (!plannedRuns.length) return "还没有计划内训练记录。从今日计划、错题卡或随机盲测计划启动后，这里会统计你是否真正按计划完成。";
    const passText = Number.isFinite(passRate) ? `通过率 ${formatPercent(passRate)}` : "通过率暂无";
    if (Number.isFinite(passRate) && passRate < 50) return `计划训练 ${plannedRuns.length} 轮，${passText}。最弱 focus 是“${weakestFocus?.label || "暂无"}”，说明你容易开始计划但执行不到位。`;
    if (Number.isFinite(passRate) && passRate < 75) return `计划训练 ${plannedRuns.length} 轮，${passText}。先把计划达标率拉到 75% 以上，再提高难度。`;
    return `计划训练 ${plannedRuns.length} 轮，${passText}。继续保持从计划入口开始、按硬限制结束的训练闭环。`;
  }

  function buildReviewScheduleReport(runs = [], referenceDate = new Date(), mistakeCounts = {}, options = {}) {
    const safeRuns = (runs || []).filter(Boolean);
    const reference = normalizeReviewDate(referenceDate) || normalizeReviewDate(new Date());
    const latestByCase = latestReviewRunsByCase(safeRuns);
    const caseRows = Object.values(latestByCase).map((run) => buildReviewScheduleCaseRow(run, reference, options));
    const mistakeRows = buildMistakeNotebookReport(safeRuns, mistakeCounts, options).cards
      .slice(0, 3)
      .map((card) => buildReviewScheduleMistakeRow(card, reference));
    const planRows = buildPlanAdherenceReport(safeRuns, options).focusRows
      .filter((row) => row.level !== "good")
      .slice(0, 3)
      .map((row) => buildReviewSchedulePlanRow(row, safeRuns, reference, options));
    const rows = [...caseRows, ...mistakeRows, ...planRows]
      .filter((item) => item && item.launchCaseId)
      .sort(compareReviewScheduleRows);
    const dueNowCount = rows.filter((item) => item.dueInDays <= 0).length;
    const soonCount = rows.filter((item) => item.dueInDays > 0 && item.dueInDays <= 2).length;
    const upcomingCount = rows.filter((item) => item.dueInDays > 2).length;
    return {
      totalItems: rows.length,
      dueNowCount,
      soonCount,
      upcomingCount,
      rows,
      nextItem: rows[0] || null,
      summary: reviewScheduleSummary({ rows, dueNowCount, soonCount }),
    };
  }

  function latestReviewRunsByCase(runs) {
    return runs.reduce((record, run) => {
      const caseId = run.caseId || "";
      if (!caseId) return record;
      const current = record[caseId];
      if (!current || reviewDateTime(run.completedAt) >= reviewDateTime(current.completedAt)) record[caseId] = run;
      return record;
    }, {});
  }

  function buildReviewScheduleCaseRow(run, reference, options = {}) {
    const score = trainingRunQualityScore(run);
    const issue = trainingRunPrimaryIssue(run);
    const weak = score < 72 || run.missionPassed === false || run.activeTrainingPlanPassed === false || (run.blindIntegrityActive && !isValidBlindRun(run));
    const strong = score >= 88 && run.missionPassed !== false && (!run.blindIntegrityActive || isValidBlindRun(run));
    const intervalDays = weak ? 0 : strong ? 10 : isValidBlindRun(run) ? 7 : 3;
    const lastDate = normalizeReviewDate(run.completedAt) || reference;
    const dueDate = addReviewDays(lastDate, intervalDays);
    const dueInDays = reviewDayDiff(reference, dueDate);
    const label = typeof options.getCaseLabel === "function" ? options.getCaseLabel(run.caseId, run) : `${run.caseId} · ${run.title || "训练案例"}`;
    return {
      type: "case",
      label,
      focus: weak ? issue : strong ? "巩固已掌握案例" : "巩固案例纪律",
      launchCaseId: run.caseId,
      dueDate,
      dueInDays,
      dueLabel: reviewDueLabel(dueInDays),
      level: reviewScheduleLevel(dueInDays),
      lastSeenLabel: `最近 ${formatLedgerDate(run.completedAt)}`,
      reason: weak
        ? `上一轮质量 ${score}/100，主要问题是“${issue}”，需要立刻复训。`
        : strong
          ? `上一轮质量 ${score}/100，属于强样本，延后复训防止遗忘。`
          : `上一轮质量 ${score}/100，建议在短间隔内再做一次巩固。`,
      nextAction: weak ? trainingRunNextAction(run, issue) : "下一轮保持同样的合约、仓位限制和复盘标准，不因为上次合格就放松纪律。",
    };
  }

  function buildReviewScheduleMistakeRow(card, reference) {
    const dueInDays = card.level === "danger" ? 0 : 1;
    return {
      type: "mistake",
      label: `错题复训 · ${card.label}`,
      focus: card.label,
      launchCaseId: card.drillCaseId,
      dueDate: addReviewDays(reference, dueInDays),
      dueInDays,
      dueLabel: reviewDueLabel(dueInDays),
      level: card.level === "danger" ? "danger" : "warn",
      lastSeenLabel: `最近 ${card.lastSeenLabel}`,
      reason: `错题本记录“${card.label}”出现 ${card.count} 次，优先级 ${card.priorityScore}/100。`,
      nextAction: card.constraint,
    };
  }

  function buildReviewSchedulePlanRow(row, runs, reference, options = {}) {
    const matchedRun = [...runs].reverse().find((run) => (run.activeTrainingPlanFocus || run.activeTrainingPlanResult?.focus || run.activeTrainingPlan?.focus) === row.label);
    const launchCaseId = matchedRun?.caseId || options.fallbackCaseId || firstCaseId(options.cases);
    const dueInDays = row.level === "danger" ? 0 : 2;
    return {
      type: "plan",
      label: `计划复训 · ${row.label}`,
      focus: row.label,
      launchCaseId,
      dueDate: addReviewDays(reference, dueInDays),
      dueInDays,
      dueLabel: reviewDueLabel(dueInDays),
      level: row.level,
      lastSeenLabel: `${row.count} 轮计划`,
      reason: `${row.label} 的计划达标 ${row.passed}/${row.count}，通过率 ${Number.isFinite(row.passRate) ? (options.formatPercent || defaultPercent)(row.passRate) : "暂无"}。`,
      nextAction: row.nextAction,
    };
  }

  function compareReviewScheduleRows(a, b) {
    const levelRank = { danger: 0, warn: 1, good: 2 };
    return a.dueInDays - b.dueInDays
      || (levelRank[a.level] ?? 3) - (levelRank[b.level] ?? 3)
      || reviewScheduleTypeRank(a.type) - reviewScheduleTypeRank(b.type)
      || a.label.localeCompare(b.label);
  }

  function reviewScheduleTypeRank(type) {
    return { mistake: 0, plan: 1, case: 2 }[type] ?? 3;
  }

  function reviewScheduleTypeLabel(type) {
    return {
      case: "案例复训",
      mistake: "错题复训",
      plan: "计划复训",
    }[type] || "复训";
  }

  function reviewScheduleLevel(dueInDays) {
    if (dueInDays <= 0) return "danger";
    if (dueInDays <= 2) return "warn";
    return "good";
  }

  function reviewDueLabel(dueInDays) {
    if (dueInDays < 0) return `逾期 ${Math.abs(dueInDays)} 天`;
    if (dueInDays === 0) return "今天到期";
    if (dueInDays === 1) return "明天";
    return `${dueInDays} 天后`;
  }

  function reviewScheduleSummary({ rows, dueNowCount, soonCount }) {
    if (!rows.length) return "还没有复训日程。完成训练后，系统会按表现自动安排今天、近期和延后复习。";
    if (dueNowCount) return `有 ${dueNowCount} 项今天需要复训，先处理错题、计划失守和上一轮低分案例。不要只追新案例。`;
    if (soonCount) return `近期有 ${soonCount} 项复训。下一轮优先保持旧弱点不复发，再考虑提高难度。`;
    return `当前没有紧急复训，已排 ${rows.length} 项后续巩固。继续按今日计划推进。`;
  }

  function normalizeReviewDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function reviewDateTime(value) {
    const date = value ? new Date(value) : new Date(0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function addReviewDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
  }

  function reviewDayDiff(fromDate, toDate) {
    return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
  }

  function buildMistakeNotebookReport(runs = [], mistakeCounts = {}, options = {}) {
    const events = collectMistakeNotebookEvents(runs, mistakeCounts, options);
    const grouped = events.reduce((record, event) => {
      if (!record[event.key]) {
        record[event.key] = {
          key: event.key,
          label: event.label,
          count: 0,
          severityTotal: 0,
          recentCount: 0,
          cases: new Set(),
          nextActions: [],
          lastSeenAt: "",
          evidence: [],
        };
      }
      const group = record[event.key];
      group.count += event.count || 1;
      group.severityTotal += event.severity || 12;
      if (event.recent) group.recentCount += 1;
      if (event.caseId) group.cases.add(event.caseId);
      if (event.nextAction) group.nextActions.push(event.nextAction);
      if (event.evidence) group.evidence.push(event.evidence);
      if (event.seenAt && (!group.lastSeenAt || event.seenAt > group.lastSeenAt)) group.lastSeenAt = event.seenAt;
      return record;
    }, {});
    const cards = Object.values(grouped)
      .map((group) => buildMistakeNotebookCard(group, options))
      .sort((a, b) => b.priorityScore - a.priorityScore || b.count - a.count)
      .slice(0, 6);
    const highPriorityCount = cards.filter((card) => card.level === "danger").length;
    const recentIssueCount = cards.filter((card) => card.recentCount > 0).length;
    const primaryCaseId = cards[0]?.drillCaseId || options.fallbackCaseId || firstCaseId(options.cases);
    return {
      totalIssues: Object.keys(grouped).length,
      highPriorityCount,
      recentIssueCount,
      primaryCaseId,
      cards,
      summary: mistakeNotebookSummary({ cards, highPriorityCount, recentIssueCount }),
    };
  }

  function collectMistakeNotebookEvents(runs = [], mistakeCounts = {}, options = {}) {
    const remediationRules = options.remediationRules || {};
    const safeRuns = (runs || []).filter(Boolean);
    const recentRunIds = new Set(safeRuns.slice(-3).map((run) => run.id || `${run.caseId}:${run.completedAt}`));
    const events = [];
    Object.entries(mistakeCounts || {}).forEach(([key, count]) => {
      if (!count) return;
      events.push({
        key,
        label: key,
        count,
        severity: Math.min(60, count * 10),
        evidence: `长期画像累计 ${count} 次。`,
        nextAction: remediationRules[key]?.constraint || "",
      });
    });
    safeRuns.forEach((run) => {
      const runKey = run.id || `${run.caseId}:${run.completedAt}`;
      const recent = recentRunIds.has(runKey);
      (run.flags || []).forEach((flag) => {
        const key = classifyMistake(flag);
        events.push({
          key,
          label: key,
          caseId: run.caseId,
          seenAt: run.completedAt || "",
          recent,
          severity: 18,
          evidence: flag,
          nextAction: remediationRules[key]?.constraint || run.remediation?.constraint || "",
        });
      });
      (run.rootCauseItems || []).forEach((item) => {
        if (!item || item.level === "good") return;
        const key = item.label || item.key || "复盘根因";
        events.push({
          key,
          label: item.label || key,
          caseId: run.caseId,
          seenAt: run.completedAt || "",
          recent,
          severity: Number(item.severityScore) || (item.level === "danger" ? 24 : 14),
          evidence: item.label ? `${item.label} ${item.severityScore || ""}`.trim() : "",
          nextAction: item.nextAction || run.remediation?.constraint || "",
        });
      });
      if (run.reflection?.mistake && run.reflection.mistake.length >= 8) {
        const key = normalizeNotebookReflectionKey(run.reflection.mistake);
        events.push({
          key,
          label: key,
          caseId: run.caseId,
          seenAt: run.completedAt || run.reflection.savedAt || "",
          recent,
          severity: 12,
          evidence: run.reflection.mistake,
          nextAction: run.reflection.nextRule || "",
        });
      }
    });
    return events;
  }

  function buildMistakeNotebookCard(group, options = {}) {
    const remediationRules = options.remediationRules || {};
    const rule = remediationRules[group.key] || null;
    const fallback = notebookFallbackRule(group.key);
    const caseIds = rule?.caseIds || fallback.caseIds;
    const drillCaseId = chooseAvailableCaseId([...group.cases, ...caseIds].filter(Boolean), caseIds[0], options);
    const averageSeverity = group.count ? group.severityTotal / group.count : 0;
    const priorityScore = clampScore(Math.min(100, group.count * 12 + averageSeverity + group.recentCount * 8));
    const level = priorityScore >= 70 ? "danger" : priorityScore >= 45 ? "warn" : "good";
    const nextAction = firstMeaningfulText(group.nextActions) || rule?.constraint || fallback.nextAction;
    return {
      key: group.key,
      label: group.label,
      count: group.count,
      recentCount: group.recentCount,
      priorityScore,
      level,
      lastSeenLabel: formatLedgerDate(group.lastSeenAt),
      drillCaseId,
      detail: notebookCardDetail(group, priorityScore),
      constraint: rule?.constraint || fallback.constraint,
      checklist: (rule?.checklist || fallback.checklist).slice(0, 3),
      nextAction,
      passCriteria: mistakeNotebookPassCriteria(group.key, rule, fallback),
    };
  }

  function mistakeNotebookPassCriteria(key, rule, fallback) {
    const checklist = (rule?.checklist || fallback.checklist).slice(0, 2);
    return [
      `“${key}”不再触发红色诊断或红色教练提醒。`,
      "任务评分达到 80/100，平均下单质量达到 80/100。",
      ...checklist,
    ];
  }

  function notebookFallbackRule(key) {
    const normalized = `${key}`;
    if (normalized.includes("风险") || normalized.includes("仓位")) {
      return {
        caseIds: ["A-01", "E-05", "I-09"],
        constraint: "下一轮单仓不超过 20%，触发红色风险提醒时不能新增买入。",
        checklist: ["先写最大可接受亏损。", "下单前看风险仪表盘。", "回撤扩大时优先观望或减仓。"],
        nextAction: "先把仓位、回撤和现金底线写清楚，再考虑收益。",
      };
    }
    if (normalized.includes("情绪") || normalized.includes("信心")) {
      return {
        caseIds: ["S-11", "B-02", "S-12"],
        constraint: "下一轮高风险情绪出现时，只能观望或用 3% 以内仓位试探。",
        checklist: ["先写情绪，再写证据。", "高信心必须有两类证据。", "看到热门上涨先写失败条件。"],
        nextAction: "把动作从情绪里拆出来，先降仓位或观望。",
      };
    }
    if (normalized.includes("证据") || normalized.includes("文字") || normalized.includes("新闻")) {
      return {
        caseIds: ["S-10", "C-03", "G-07"],
        constraint: "下一轮每笔买卖至少使用两类证据，理由和失效条件必须可复盘。",
        checklist: ["区分新闻和价格反应。", "写清楚什么会证明自己错。", "不要用感觉替代证据。"],
        nextAction: "把模糊判断改成可验证的证据和触发条件。",
      };
    }
    return {
      caseIds: ["A-01", "S-11", "S-12"],
      constraint: "下一轮限制交易次数，先完成观望、证据、风险和复盘四件事。",
      checklist: ["至少记录一次主动观望。", "每次动作先写失效条件。", "复盘保存下一轮硬规则。"],
      nextAction: "先按基础纪律修复流程，再提高难度。",
    };
  }

  function notebookCardDetail(group, priorityScore) {
    const cases = [...group.cases].filter(Boolean).slice(0, 3).join("、") || "暂无具体案例";
    const evidence = group.evidence.filter(Boolean)[0] || "来自长期画像和复盘根因。";
    return `优先级 ${priorityScore}/100，涉及 ${cases}。证据：${evidence}`;
  }

  function normalizeNotebookReflectionKey(text) {
    const cleanText = `${text}`.trim();
    const classified = classifyMistake(cleanText);
    if (classified && classified !== "其他纪律问题") return classified;
    if (cleanText.includes("情绪") || cleanText.includes("冲动")) return "情绪控制";
    if (cleanText.includes("仓位") || cleanText.includes("重仓")) return "仓位集中";
    if (cleanText.includes("计划") || cleanText.includes("理由")) return "计划不清";
    return "复盘反思问题";
  }

  function firstMeaningfulText(items) {
    return (items || []).find((item) => typeof item === "string" && item.trim().length >= 6)?.trim() || "";
  }

  function mistakeNotebookSummary({ cards, highPriorityCount, recentIssueCount }) {
    if (!cards.length) return "还没有错题卡。完成更多训练后，系统会把重复错误整理成可复练的题型。";
    const primary = cards[0];
    if (highPriorityCount) return `错题本有 ${highPriorityCount} 个高优先级问题。先处理“${primary.label}”，不要换新案例逃开重复错误。`;
    if (recentIssueCount) return `错题本显示最近几轮仍有 ${recentIssueCount} 类错题出现。下一轮按错题卡硬限制训练，不把收益当作免检理由。`;
    return `错题本当前没有红色问题。继续复练“${primary.label}”，目标是让同类错误不再反复出现。`;
  }

  function trainingRunQualityScore(run) {
    const riskScore = clampScore(100
      - Math.max(0, (Number(run.maxDrawdown) || 0) - 5) * 3
      - Math.max(0, (Number(run.maxConcentrationPct) || 0) - 35) * 1.2
      - (Number(run.coachDangerCount) || 0) * 6
      - (Number(run.eventRiskDangerTradeCount) || 0) * 8
      - (Number(run.settlementCashAccountWarningCount) || 0) * 7);
    const blindScore = run.blindIntegrityActive ? Number(run.blindIntegrityScore) : Number.NaN;
    return clampScore(weightedAverage([
      { value: Number(run.disciplineScore), weight: 1.2 },
      { value: Number.isFinite(Number(run.missionScore)) ? Number(run.missionScore) : run.missionPassed ? 82 : Number.NaN, weight: 1 },
      { value: Number(run.averageCoachScore), weight: 1 },
      { value: Number(run.contractScore), weight: 0.65 },
      { value: Number(run.writingQualityScore), weight: 0.55 },
      { value: Number(run.evidenceSourceScore), weight: 0.55 },
      { value: Number(run.settlementScore), weight: 0.35 },
      { value: blindScore, weight: 0.55 },
      { value: riskScore, weight: 1 },
    ]));
  }

  function trainingRunPrimaryIssue(run) {
    if (run.blindIntegrityActive && !isValidBlindRun(run)) return "盲测完整性失真";
    if (run.rootCausePrimary) return run.rootCausePrimary;
    if (Array.isArray(run.flags) && run.flags.length) return classifyMistake(run.flags[0]);
    if (Number(run.coachDangerCount) > 0) return "下单教练红色提醒";
    if (Number(run.maxDrawdown) >= 10) return "回撤偏大";
    if (run.missionPassed === false) return "任务未通过";
    return "暂无单一严重问题";
  }

  function trainingRunNextAction(run, primaryIssue) {
    const rootCauseAction = Array.isArray(run.rootCauseItems)
      ? run.rootCauseItems.find((item) => item && item.level !== "good" && item.nextAction)?.nextAction
      : "";
    if (rootCauseAction) return rootCauseAction;
    if (run.remediation?.constraint) return run.remediation.constraint;
    if (run.reflection?.nextRule) return run.reflection.nextRule;
    if (primaryIssue === "盲测完整性失真") return "下一轮从随机盲测入口进入，不能切模式、换案例或提前揭晓。";
    if (primaryIssue === "回撤偏大") return "下一轮先把单仓和最大回撤预算降下来，触发亏损线必须记录动作。";
    return "下一轮继续按今日计划训练，并保存一条具体复盘规则。";
  }

  function buildTrainingLedgerReport(runs = [], options = {}) {
    const rows = (runs || [])
      .filter(Boolean)
      .map((run, index) => buildTrainingLedgerRow(run, index, options));
    const averageScore = clampScore(averageFinite(rows.map((item) => item.score)));
    const weakRows = [...rows].filter((item) => item.score < 70).sort((a, b) => a.score - b.score).slice(0, 4);
    const recentRows = rows.slice(-6).reverse();
    const repeatRows = buildRepeatedWeakCaseRows(rows, options);
    const weakCount = rows.filter((item) => item.level === "danger").length;
    return {
      totalRuns: rows.length,
      averageScore,
      weakCount,
      recentRows,
      weakRows,
      repeatRows,
      summary: trainingLedgerSummary({ totalRuns: rows.length, averageScore, weakRows, repeatRows, recentRows }),
    };
  }

  function buildTrainingLedgerRow(run, index = 0, options = {}) {
    const score = trainingRunQualityScore(run);
    const level = score >= 80 ? "good" : score >= 65 ? "warn" : "danger";
    const primaryIssue = trainingRunPrimaryIssue(run);
    const getCaseTitle = typeof options.getCaseTitle === "function" ? options.getCaseTitle : (caseId) => caseId || "未知案例";
    return {
      id: run.id || `${run.caseId || "run"}-${index}`,
      caseId: run.caseId || "未知",
      caseTitle: run.title || getCaseTitle(run.caseId),
      completedLabel: formatLedgerDate(run.completedAt),
      score,
      level,
      levelLabel: ledgerLevelLabel(level),
      disciplineLabel: Number.isFinite(Number(run.disciplineScore)) ? `${Math.round(Number(run.disciplineScore))}/100` : "暂无",
      missionLabel: Number.isFinite(Number(run.missionScore)) ? `${Math.round(Number(run.missionScore))}/100` : run.missionPassed ? "通过" : "暂无",
      coachLabel: Number.isFinite(Number(run.averageCoachScore)) ? `${Math.round(Number(run.averageCoachScore))}/100` : "暂无",
      returnPct: Number.isFinite(Number(run.returnPct)) ? Number(run.returnPct) : 0,
      maxDrawdown: Number.isFinite(Number(run.maxDrawdown)) ? Number(run.maxDrawdown) : 0,
      primaryIssue,
      nextAction: trainingRunNextAction(run, primaryIssue),
      isValidBlind: isValidBlindRun(run),
      rootCausePrimary: run.rootCausePrimary || "",
    };
  }

  function buildRepeatedWeakCaseRows(rows, options = {}) {
    const getCaseTitle = typeof options.getCaseTitle === "function" ? options.getCaseTitle : (caseId) => caseId || "未知案例";
    const grouped = rows.reduce((record, row) => {
      if (!record[row.caseId]) record[row.caseId] = [];
      record[row.caseId].push(row);
      return record;
    }, {});
    return Object.entries(grouped)
      .map(([caseId, caseRows]) => {
        const weakRows = caseRows.filter((row) => row.score < 75);
        const latest = caseRows[caseRows.length - 1];
        return {
          caseId,
          caseTitle: latest.caseTitle || getCaseTitle(caseId),
          attempts: caseRows.length,
          weakAttempts: weakRows.length,
          latestScore: latest.score,
          level: latest.level,
          latestLevelLabel: latest.levelLabel,
          nextAction: weakRows.length ? latest.nextAction : "当前没有明显重复弱点，继续用不同场景巩固。",
        };
      })
      .filter((item) => item.attempts >= 2 && item.weakAttempts > 0)
      .sort((a, b) => b.weakAttempts - a.weakAttempts || a.latestScore - b.latestScore)
      .slice(0, 4);
  }

  function trainingLedgerSummary({ totalRuns, averageScore, weakRows, repeatRows, recentRows }) {
    if (!totalRuns) return "还没有训练记录。完成第一轮后，系统会把每次训练沉淀成可回看的账本。";
    const latest = recentRows[0];
    if (weakRows.length) return `账本均分 ${averageScore}/100，最需要回看的是 ${weakRows[0].caseId}：${weakRows[0].primaryIssue}。先复盘薄弱轮次，再开始下一轮。`;
    if (repeatRows.length) return `账本均分 ${averageScore}/100，但有 ${repeatRows.length} 个案例出现重复卡点。下一轮优先处理重复错误，而不是换新案例逃开。`;
    return `账本均分 ${averageScore}/100，最近一轮 ${latest?.caseId || "暂无"} 为 ${latest?.levelLabel || "待观察"}。继续保持记录质量，别只看收益。`;
  }

  function ledgerLevelLabel(level) {
    return {
      good: "稳健",
      warn: "待巩固",
      danger: "需复盘",
    }[level] || "待观察";
  }

  function buildSampleQualityReport(runs = [], options = {}) {
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const formatSignedPercent = options.formatSignedPercent || options.formatPercent || defaultPercent;
    const safeRuns = (runs || []).filter(Boolean);
    const randomBlindRuns = safeRuns.filter((item) => item.blindIntegrityActive && item.blindIntegrityRandom);
    const validBlind = randomBlindRuns.filter((item) => isValidBlindRun(item));
    const corruptedBlind = randomBlindRuns.filter((item) => !isValidBlindRun(item));
    const practiceRuns = safeRuns.length - randomBlindRuns.length;
    const validBlindPasses = validBlind.filter((item) => {
      const disciplineOk = Number(item.disciplineScore) >= 75;
      const missionOk = item.missionPassed === true || Number(item.missionScore) >= 80;
      const coachOk = !Number.isFinite(Number(item.averageCoachScore)) || Number(item.averageCoachScore) >= 75;
      return disciplineOk && missionOk && coachOk;
    });
    const validRate = safeRuns.length ? (validBlind.length / safeRuns.length) * 100 : 0;
    const averageValidDiscipline = averageFinite(validBlind.map((item) => Number(item.disciplineScore)));
    const averageValidReturn = averageFinite(validBlind.map((item) => Number(item.returnPct)));
    const averageValidCoach = averageFinite(validBlind.map((item) => Number(item.averageCoachScore)));
    const passRate = validBlind.length ? (validBlindPasses.length / validBlind.length) * 100 : Number.NaN;
    const corruptedRate = randomBlindRuns.length ? (corruptedBlind.length / randomBlindRuns.length) * 100 : 0;
    const level = validBlind.length >= 5 && corruptedRate <= 10
      ? "good"
      : validBlind.length >= 3 && corruptedRate <= 30
        ? "warn"
        : "danger";
    const summary = sampleQualitySummary({
      totalRuns: safeRuns.length,
      validBlindRuns: validBlind.length,
      randomBlindRuns: randomBlindRuns.length,
      practiceRuns,
      corruptedBlindRuns: corruptedBlind.length,
      averageValidDiscipline,
      passRate,
      formatPercent: formatPlainPercent,
    });
    return {
      level,
      summary,
      totalRuns: safeRuns.length,
      randomBlindRuns: randomBlindRuns.length,
      validBlindRuns: validBlind.length,
      corruptedBlindRuns: corruptedBlind.length,
      practiceRuns,
      validRate,
      corruptedRate,
      averageValidDiscipline,
      averageValidReturn,
      averageValidCoach,
      validBlindPassRate: passRate,
      rows: [
        {
          label: "真实考试样本",
          value: `${validBlind.length} 轮`,
          level: validBlind.length >= 5 ? "good" : validBlind.length >= 3 ? "warn" : "danger",
          detail: validBlind.length >= 3
            ? `已有基础样本，可开始观察有效盲测趋势；有效样本占全部训练 ${formatPlainPercent(validRate)}。`
            : "至少积累 3 轮有效随机盲测，才适合判断自己在未知行情下的真实水平。",
        },
        {
          label: "样本污染",
          value: `${corruptedBlind.length} 轮`,
          level: corruptedBlind.length ? "danger" : "good",
          detail: corruptedBlind.length
            ? "这些盲测发生过切模式、换案例或提前揭晓，只能当流程练习，不能当真实考试成绩。"
            : "随机盲测暂未出现完整性污染。",
        },
        {
          label: "有效通过率",
          value: Number.isFinite(passRate) ? formatPlainPercent(passRate) : "暂无",
          level: !Number.isFinite(passRate) ? "warn" : passRate >= 70 ? "good" : passRate >= 45 ? "warn" : "danger",
          detail: Number.isFinite(passRate)
            ? `有效盲测里同时看纪律、任务和下单质量，不只看收益。平均有效下单 ${Number.isFinite(averageValidCoach) ? `${Math.round(averageValidCoach)}/100` : "暂无"}。`
            : "还没有有效盲测通过率。下一轮用随机盲测建立第一条可用样本。",
        },
        {
          label: "收益解释",
          value: Number.isFinite(averageValidReturn) ? formatSignedPercent(averageValidReturn) : "暂无",
          level: "warn",
          detail: "收益只作为复盘材料，不作为新手阶段的主成绩。先看过程是否能复现，再看结果是否赚钱。",
        },
      ],
    };
  }

  function sampleQualitySummary({ totalRuns, validBlindRuns, randomBlindRuns, practiceRuns, corruptedBlindRuns, averageValidDiscipline, passRate, formatPercent = defaultPercent }) {
    if (!totalRuns) return "还没有训练记录。先完成第一轮，再开始区分练习样本和真实盲测样本。";
    if (!randomBlindRuns) return `已有 ${practiceRuns} 轮练习，但还没有随机盲测。练习能熟悉流程，不能证明你面对未知行情也能稳定执行。`;
    if (validBlindRuns < 3) return `已有 ${randomBlindRuns} 轮随机盲测，其中 ${validBlindRuns} 轮有效。先把有效样本补到 3 轮，再判断自己是不是真的进步。`;
    const passText = Number.isFinite(passRate) ? `有效通过率 ${formatPercent(passRate)}` : "通过率暂无";
    const disciplineText = Number.isFinite(averageValidDiscipline) ? `有效均分 ${Math.round(averageValidDiscipline)}/100` : "有效均分暂无";
    if (corruptedBlindRuns) return `有效盲测 ${validBlindRuns} 轮，${disciplineText}，${passText}；但有 ${corruptedBlindRuns} 轮盲测失真，要单独看待。`;
    return `有效盲测 ${validBlindRuns} 轮，${disciplineText}，${passText}。这部分才最接近你面对未知行情时的真实能力。`;
  }

  function buildValidBlindExamReport(runs = [], options = {}) {
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const formatSignedPercent = options.formatSignedPercent || options.formatPercent || defaultPercent;
    const validRuns = (runs || []).filter(isValidBlindRun);
    const scoredRuns = validRuns.map((run) => ({
      run,
      composite: validBlindCompositeScore(run),
      passed: isPassingValidBlindExam(run),
    }));
    const passedRuns = scoredRuns.filter((item) => item.passed);
    const averageComposite = averageFinite(scoredRuns.map((item) => item.composite));
    const passRate = scoredRuns.length ? (passedRuns.length / scoredRuns.length) * 100 : Number.NaN;
    const averageReturn = averageFinite(validRuns.map((item) => Number(item.returnPct)));
    const averageDrawdown = averageFinite(validRuns.map((item) => Number(item.maxDrawdown)));
    const latest = scoredRuns[scoredRuns.length - 1] || null;
    const currentPassStreak = countRecentExamPassStreak(scoredRuns);
    const bestPassStreak = bestExamPassStreak(scoredRuns);
    const trend = buildValidBlindExamTrend(scoredRuns);
    const level = scoredRuns.length >= 5 && Number.isFinite(averageComposite) && averageComposite >= 82 && Number.isFinite(passRate) && passRate >= 70 && currentPassStreak >= 2
      ? "good"
      : scoredRuns.length >= 3 && Number.isFinite(averageComposite) && averageComposite >= 68 && Number.isFinite(passRate) && passRate >= 45
        ? "warn"
        : "danger";
    const summary = validBlindExamSummary({
      validCount: scoredRuns.length,
      averageComposite,
      passRate,
      currentPassStreak,
      trend,
      latest,
      formatPercent: formatPlainPercent,
    });
    return {
      level,
      summary,
      validRuns: scoredRuns.length,
      passedRuns: passedRuns.length,
      averageComposite,
      passRate,
      averageReturn,
      averageDrawdown,
      currentPassStreak,
      bestPassStreak,
      latestScore: latest?.composite ?? Number.NaN,
      trend,
      rows: [
        {
          label: "考试均分",
          value: Number.isFinite(averageComposite) ? `${Math.round(averageComposite)}/100` : "暂无",
          level: !Number.isFinite(averageComposite) ? "warn" : averageComposite >= 82 ? "good" : averageComposite >= 68 ? "warn" : "danger",
          detail: "只统计有效随机盲测，综合纪律、任务、下单质量、盲测完整性和复盘反思。",
        },
        {
          label: "考试通过率",
          value: Number.isFinite(passRate) ? formatPlainPercent(passRate) : "暂无",
          level: !Number.isFinite(passRate) ? "warn" : passRate >= 70 ? "good" : passRate >= 45 ? "warn" : "danger",
          detail: scoredRuns.length ? `通过 ${passedRuns.length}/${scoredRuns.length} 轮。考试通过不看收益单项，先看过程是否稳定。` : "还没有有效考试样本。",
        },
        {
          label: "连续稳定性",
          value: `${currentPassStreak} 轮`,
          level: currentPassStreak >= 3 ? "good" : currentPassStreak >= 1 ? "warn" : "danger",
          detail: `历史最长连续通过 ${bestPassStreak} 轮。新手阶段比单次高分更重要的是连续稳定。`,
        },
        {
          label: "最近趋势",
          value: trend.deltaLabel,
          level: trend.level,
          detail: trend.detail,
        },
        {
          label: "收益解释",
          value: Number.isFinite(averageReturn) ? formatSignedPercent(averageReturn) : "暂无",
          level: "warn",
          detail: `有效考试平均回撤 ${Number.isFinite(averageDrawdown) ? formatPlainPercent(averageDrawdown) : "暂无"}。收益只用来解释过程，不作为考试主分。`,
        },
      ],
    };
  }

  function validBlindCompositeScore(run) {
    const parts = [
      { value: Number(run.disciplineScore), weight: 0.3 },
      { value: Number.isFinite(Number(run.missionScore)) ? Number(run.missionScore) : run.missionPassed === true ? 85 : run.missionPassed === false ? 45 : Number.NaN, weight: 0.25 },
      { value: Number(run.averageCoachScore), weight: 0.2 },
      { value: Number(run.blindIntegrityScore), weight: 0.15 },
      { value: run.reflection?.nextRule ? 100 : run.reflection ? 75 : 55, weight: 0.1 },
    ].filter((item) => Number.isFinite(item.value));
    const totalWeight = parts.reduce((sum, item) => sum + item.weight, 0);
    if (!totalWeight) return Number.NaN;
    return clampScore(parts.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight);
  }

  function isPassingValidBlindExam(run) {
    if (!isValidBlindRun(run)) return false;
    const composite = validBlindCompositeScore(run);
    const disciplineOk = Number(run.disciplineScore) >= 75;
    const missionOk = run.missionPassed === true || Number(run.missionScore) >= 80;
    const coachOk = !Number.isFinite(Number(run.averageCoachScore)) || Number(run.averageCoachScore) >= 75;
    const reflectionOk = Boolean(run.reflection?.nextRule);
    return Number.isFinite(composite) && composite >= 78 && disciplineOk && missionOk && coachOk && reflectionOk;
  }

  function countRecentExamPassStreak(scoredRuns) {
    let streak = 0;
    for (let index = scoredRuns.length - 1; index >= 0; index -= 1) {
      if (!scoredRuns[index].passed) break;
      streak += 1;
    }
    return streak;
  }

  function bestExamPassStreak(scoredRuns) {
    let current = 0;
    let best = 0;
    scoredRuns.forEach((item) => {
      current = item.passed ? current + 1 : 0;
      best = Math.max(best, current);
    });
    return best;
  }

  function buildValidBlindExamTrend(scoredRuns) {
    const recent = scoredRuns.slice(-3).map((item) => item.composite).filter(Number.isFinite);
    const previous = scoredRuns.slice(-6, -3).map((item) => item.composite).filter(Number.isFinite);
    const recentAverage = averageFinite(recent);
    const previousAverage = previous.length ? averageFinite(previous) : averageFinite(recent.slice(0, -1));
    const rawDelta = Number.isFinite(recentAverage) && Number.isFinite(previousAverage) ? recentAverage - previousAverage : Number.NaN;
    const level = !Number.isFinite(rawDelta) ? "warn" : rawDelta >= 5 ? "good" : rawDelta <= -5 ? "danger" : "warn";
    const deltaLabel = Number.isFinite(rawDelta)
      ? `${rawDelta >= 5 ? "改善" : rawDelta <= -5 ? "退步" : "持平"} ${rawDelta >= 0 ? "+" : ""}${rawDelta.toFixed(1)}分`
      : "暂无";
    const detail = Number.isFinite(rawDelta)
      ? `最近有效考试均分 ${Math.round(recentAverage)}/100；对照均分 ${Math.round(previousAverage)}/100。`
      : "有效考试样本不足，至少 2 轮后才判断趋势。";
    return { level, delta: rawDelta, deltaLabel, recentAverage, previousAverage, detail };
  }

  function validBlindExamSummary({ validCount, averageComposite, passRate, currentPassStreak, trend, latest, formatPercent = defaultPercent }) {
    if (!validCount) return "还没有真实考试成绩。先通过随机盲测建立有效样本，再判断自己面对未知行情的能力。";
    if (validCount < 3) return `已有 ${validCount} 轮有效考试，但样本仍少。先补到 3 轮，不要用单轮收益判断水平。`;
    const averageText = Number.isFinite(averageComposite) ? `均分 ${Math.round(averageComposite)}/100` : "均分暂无";
    const passText = Number.isFinite(passRate) ? `通过率 ${formatPercent(passRate)}` : "通过率暂无";
    const latestText = latest && Number.isFinite(latest.composite) ? `最近一轮 ${latest.composite}/100` : "最近一轮暂无评分";
    if (trend.level === "danger") return `真实考试 ${validCount} 轮，${averageText}，${passText}，${latestText}；最近有效考试在退步，先降低交易频率和仓位。`;
    if (currentPassStreak >= 3) return `真实考试 ${validCount} 轮，${averageText}，${passText}，连续通过 ${currentPassStreak} 轮。可以逐步减少提示，但仓位纪律不能放松。`;
    return `真实考试 ${validCount} 轮，${averageText}，${passText}，${latestText}。下一步目标是连续通过 3 轮，而不是追求单轮收益最高。`;
  }

  function examLevelLabel(level) {
    return {
      good: "考试稳定",
      warn: "继续积累",
      danger: "未达稳定",
    }[level] || "待观察";
  }

  const defaultScenarioCoverageDimensions = [
    {
      key: "foundation-etf",
      label: "ETF 与恐慌下跌",
      caseIds: ["A-01", "S-12", "G-07"],
      focus: "ETF恐慌",
      constraint: "只用 ETF 或小仓试探，先写回撤预算和主动观望条件。",
      passCriteria: ["至少 1 次主动观望。", "最大单仓不超过 25%。", "复盘说明 ETF 和单股风险差异。"],
    },
    {
      key: "single-stock-event",
      label: "单股财报与估值",
      caseIds: ["C-03", "F-06", "S-10"],
      focus: "单股事件",
      constraint: "财报或结果公布日前后不重仓，买入前必须写清预期差和跳空风险。",
      passCriteria: ["事件日前不满仓押注。", "下单证据至少 2 类。", "复盘解释好消息/坏消息和价格反应的区别。"],
    },
    {
      key: "macro-rates",
      label: "宏观利率与通胀",
      caseIds: ["D-04", "G-07", "I-09"],
      focus: "宏观利率",
      constraint: "把宏观新闻当作风险背景，不把单个数据日当作必须交易的信号。",
      passCriteria: ["数据日前后不追市价单。", "写清利率路径如何影响成长资产。", "至少比较宽基和成长 ETF。"],
    },
    {
      key: "liquidity-sector",
      label: "行业轮动与流动性",
      caseIds: ["E-05", "H-08", "I-09"],
      focus: "行业流动性",
      constraint: "行业 ETF 和单股分开处理；流动性危机中不把便宜当安全。",
      passCriteria: ["至少查看行业暴露。", "不在红色流动性提醒下加仓。", "复盘行业 ETF 与单股风险差异。"],
    },
    {
      key: "sentiment-fomo",
      label: "情绪追高与热门交易",
      caseIds: ["B-02", "S-11", "F-06"],
      focus: "防追高",
      constraint: "看到暴涨先写失败条件；任何买入都必须小仓并有退出计划。",
      passCriteria: ["没有 FOMO 情绪重仓。", "盈利计划完整。", "出现红色提醒时不新增风险。"],
    },
    {
      key: "defensive-portfolio",
      label: "防御资产与组合配置",
      caseIds: ["A-01", "H-08", "I-09"],
      focus: "组合配置",
      constraint: "先写 ETF 核心仓、卫星仓和现金底线，再决定是否偏向防御或行业资产。",
      passCriteria: ["配置蓝图达到 80/100。", "现金底线不被打穿。", "复盘解释分散和追逐强势行业的区别。"],
    },
    {
      key: "behavior-discipline",
      label: "心理纪律与补仓",
      caseIds: ["S-10", "S-11", "S-12"],
      focus: "心理纪律",
      constraint: "收益不是目标，目标是防止追高、失控补仓和用新闻自我说服。",
      passCriteria: ["保存复盘反思。", "没有连续向下补仓。", "写出下一轮硬规则。"],
    },
  ];

  function buildScenarioCoverageReport(runs = [], options = {}) {
    const safeRuns = (runs || []).filter((run) => run && run.caseId);
    const dimensions = options.dimensions || defaultScenarioCoverageDimensions;
    const rows = dimensions.map((dimension) => buildScenarioCoverageRow(dimension, safeRuns, options));
    const averageScore = clampScore(averageFinite(rows.map((item) => item.score)));
    const coveredDimensions = rows.filter((item) => item.score >= 60).length;
    const weakRows = rows.filter((item) => item.score < 60);
    const weakest = [...rows].sort((a, b) => a.score - b.score)[0] || {
      label: "暂无",
      score: 0,
      caseIds: [],
      focus: "场景覆盖",
    };
    const level = averageScore >= 78 && coveredDimensions >= rows.length - 1
      ? "good"
      : averageScore >= 55 && coveredDimensions >= Math.ceil(rows.length / 2)
        ? "warn"
        : "danger";
    const summary = scenarioCoverageSummary({
      totalRuns: safeRuns.length,
      averageScore,
      coveredDimensions,
      totalDimensions: rows.length,
      weakRows,
      weakest,
    });
    return {
      level,
      summary,
      averageScore,
      coveredDimensions,
      totalDimensions: rows.length,
      weakest,
      weakRows,
      rows,
    };
  }

  function buildScenarioCoverageRow(dimension, runs, options = {}) {
    const getCaseTitle = typeof options.getCaseTitle === "function" ? options.getCaseTitle : (caseId) => caseId || "未知案例";
    const dimensionRuns = runs.filter((run) => dimension.caseIds.includes(run.caseId));
    const uniqueAny = new Set(dimensionRuns.map((run) => run.caseId));
    const qualifiedRuns = dimensionRuns.filter((run) => isQualifiedTrainingRun(run));
    const uniqueQualified = new Set(qualifiedRuns.map((run) => run.caseId));
    const validBlindRuns = dimensionRuns.filter(isValidBlindRun);
    const uniqueValidBlind = new Set(validBlindRuns.map((run) => run.caseId));
    const bestComposite = averageFinite(dimensionRuns.map((run) => {
      if (isValidBlindRun(run)) return validBlindCompositeScore(run);
      const missionScore = Number.isFinite(Number(run.missionScore)) ? Number(run.missionScore) : run.missionPassed ? 80 : Number.NaN;
      return averageFinite([Number(run.disciplineScore), missionScore, Number(run.averageCoachScore)]);
    }).filter(Number.isFinite));
    const anyCoverage = Math.min(1, uniqueAny.size / Math.min(2, dimension.caseIds.length || 1));
    const qualifiedCoverage = Math.min(1, uniqueQualified.size / Math.min(2, dimension.caseIds.length || 1));
    const blindCoverage = Math.min(1, uniqueValidBlind.size / 1);
    const qualityBoost = Number.isFinite(bestComposite) ? Math.max(0, Math.min(10, (bestComposite - 70) * 0.4)) : 0;
    const score = clampScore(anyCoverage * 25 + qualifiedCoverage * 35 + blindCoverage * 30 + qualityBoost);
    const level = score >= 75 ? "good" : score >= 55 ? "warn" : "danger";
    const nextCaseId = chooseAvailableCaseId(dimension.caseIds, dimension.caseIds[0], options);
    return {
      ...dimension,
      score,
      level,
      runCount: dimensionRuns.length,
      anyCaseCount: uniqueAny.size,
      qualifiedCaseCount: uniqueQualified.size,
      validBlindCaseCount: uniqueValidBlind.size,
      nextCaseId,
      nextCaseTitle: getCaseTitle(nextCaseId),
      detail: `${dimensionRuns.length} 轮，${uniqueQualified.size} 个案例达标，${uniqueValidBlind.size} 个案例有有效盲测。${score < 60 ? `建议下一轮补 ${nextCaseId}。` : "继续用不同案例巩固，不要只刷熟悉场景。"}`,
    };
  }

  function isQualifiedTrainingRun(run) {
    const disciplineOk = Number(run.disciplineScore) >= 75;
    const missionOk = run.missionPassed === true || Number(run.missionScore) >= 80;
    const lessonOk = run.lessonPassed !== false;
    const coachOk = !Number.isFinite(Number(run.averageCoachScore)) || Number(run.averageCoachScore) >= 75;
    return disciplineOk && missionOk && lessonOk && coachOk;
  }

  function scenarioCoverageSummary({ totalRuns, averageScore, coveredDimensions, totalDimensions, weakRows, weakest }) {
    if (!totalRuns) return "还没有训练记录。先按课程路径建立基础，再看场景覆盖。";
    if (totalRuns < 4) return `已有 ${totalRuns} 轮训练，先完成基础路径；满 4 轮后再开始看是否偏科。`;
    if (weakRows.length) return `场景覆盖 ${averageScore}/100，已覆盖 ${coveredDimensions}/${totalDimensions} 类。最弱是“${weakest.label}”，下一轮不要只练熟悉案例。`;
    return `场景覆盖 ${averageScore}/100，${coveredDimensions}/${totalDimensions} 类已覆盖。后续重点是把覆盖变成有效盲测稳定通过。`;
  }

  function coverageLevelLabel(level) {
    return {
      good: "覆盖均衡",
      warn: "部分偏科",
      danger: "明显偏科",
    }[level] || "待观察";
  }

  function buildLiveReadinessReport({ runs = [], sampleQuality = null, examReport = null, coverageReport = null, skillRadar = null, activeRuleCount = 0, options = {} } = {}) {
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const safeRuns = (runs || []).filter(Boolean);
    const quality = sampleQuality || buildSampleQualityReport(safeRuns, options);
    const exam = examReport || buildValidBlindExamReport(safeRuns, options);
    const coverage = coverageReport || buildScenarioCoverageReport(safeRuns, options);
    const radar = skillRadar || [];
    const ruleCount = Number.isFinite(Number(activeRuleCount)) ? Number(activeRuleCount) : 0;
    const rows = [
      buildReadinessSampleRow(quality),
      buildReadinessExamRow(exam, { formatPlainPercent }),
      buildReadinessCoverageRow(coverage),
      buildReadinessRiskRow({ runs: safeRuns, radar, formatPlainPercent }),
      buildReadinessMechanicsRow(safeRuns),
      buildReadinessRulebookRow({ runs: safeRuns, ruleCount, formatPlainPercent }),
      buildReadinessExecutionRow(safeRuns),
    ];
    const weightedScore = weightedAverage(rows.map((row) => ({ value: row.score, weight: row.weight })));
    const score = clampScore(weightedScore);
    const gate = buildLiveReadinessGate({ runs: safeRuns, quality, exam, coverage, rows, options: { ...options, formatPlainPercent } });
    const blockers = buildLiveReadinessBlockers({ quality, exam, coverage, rows, gate });
    const level = blockers.length >= 3 || score < 60 ? "danger" : blockers.length || score < 82 ? "warn" : "good";
    const stage = liveReadinessStage({ level, score, blockers });
    const statusLabel = {
      good: "可做小额前演练",
      warn: "继续模拟打磨",
      danger: "不建议接近实盘",
    }[level];
    return {
      level,
      score,
      stage,
      statusLabel,
      summary: liveReadinessSummary({ score, level, stage, blockers, rows }),
      blockers,
      gate,
      gateRows: gate.rows,
      rows,
    };
  }

  function buildLiveReadinessGate({ runs = [], quality = {}, exam = {}, coverage = {}, rows = [], options = {} } = {}) {
    const thresholds = {
      minValidBlindRuns: 20,
      recentRunCount: 10,
      minRecentDisciplineScore: 80,
      maxRecentAverageDrawdown: 8,
      maxConsecutiveContractFailures: 0,
      maxRiskCoolingForbiddenBuys: 0,
      maxRepeatedWeakIssueCount: 2,
      minCoverageScore: 70,
      ...(options.liveReadinessThresholds || {}),
    };
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const safeRuns = (runs || []).filter(Boolean);
    const recentRuns = safeRuns.slice(-thresholds.recentRunCount);
    const recentAverageDiscipline = averageFinite(recentRuns.map((run) => Number(run.disciplineScore)));
    const recentAverageDrawdown = averageFinite(recentRuns.map((run) => Number(run.maxDrawdown)));
    const consecutiveContractFailures = maxConsecutiveContractFailures(recentRuns);
    const riskCoolingForbiddenBuys = recentRuns.reduce((sum, run) => sum + (Number(run.riskCoolingForbiddenBuyCount) || 0), 0);
    const repeatedIssue = mostRepeatedRecentIssue(recentRuns);
    const mechanicsRow = rows.find((row) => row.key === "mechanics") || {};
    const executionRow = rows.find((row) => row.key === "execution") || {};
    const riskRow = rows.find((row) => row.key === "risk") || {};
    const gateRows = [
      liveReadinessGateRow({
        key: "valid-blind-sample",
        label: "有效随机盲测",
        passed: (quality.validBlindRuns || 0) >= thresholds.minValidBlindRuns,
        detail: `要求至少 ${thresholds.minValidBlindRuns} 轮有效随机盲测，目前 ${quality.validBlindRuns || 0} 轮。`,
      }),
      liveReadinessGateRow({
        key: "recent-discipline",
        label: "最近纪律均分",
        passed: recentRuns.length >= thresholds.recentRunCount
          && Number.isFinite(recentAverageDiscipline)
          && recentAverageDiscipline >= thresholds.minRecentDisciplineScore,
        detail: `要求最近 ${thresholds.recentRunCount} 轮纪律均分不低于 ${thresholds.minRecentDisciplineScore}/100，目前 ${recentRuns.length} 轮、${Number.isFinite(recentAverageDiscipline) ? `${Math.round(recentAverageDiscipline)}/100` : "暂无"}。`,
      }),
      liveReadinessGateRow({
        key: "drawdown-control",
        label: "回撤控制",
        passed: recentRuns.length >= thresholds.recentRunCount
          && Number.isFinite(recentAverageDrawdown)
          && recentAverageDrawdown <= thresholds.maxRecentAverageDrawdown,
        detail: `要求最近 ${thresholds.recentRunCount} 轮平均最大回撤不高于 ${formatPlainPercent(thresholds.maxRecentAverageDrawdown)}，目前 ${Number.isFinite(recentAverageDrawdown) ? formatPlainPercent(recentAverageDrawdown) : "暂无"}。`,
      }),
      liveReadinessGateRow({
        key: "contract-breaks",
        label: "合约破坏",
        passed: consecutiveContractFailures <= thresholds.maxConsecutiveContractFailures,
        detail: `要求不能连续破坏训练合约；最近 ${thresholds.recentRunCount} 轮最大连续破坏 ${consecutiveContractFailures} 次。`,
      }),
      liveReadinessGateRow({
        key: "risk-cooling",
        label: "风险冷却",
        passed: riskCoolingForbiddenBuys <= thresholds.maxRiskCoolingForbiddenBuys,
        detail: `要求风险冷却后不新增买入；最近 ${thresholds.recentRunCount} 轮违规买入 ${riskCoolingForbiddenBuys} 次。`,
      }),
      liveReadinessGateRow({
        key: "mistake-recurrence",
        label: "错题复发",
        passed: repeatedIssue.count <= thresholds.maxRepeatedWeakIssueCount,
        detail: repeatedIssue.count
          ? `最近 ${thresholds.recentRunCount} 轮最常复发问题是“${repeatedIssue.label}”，出现 ${repeatedIssue.count} 次；要求不超过 ${thresholds.maxRepeatedWeakIssueCount} 次。`
          : `最近 ${thresholds.recentRunCount} 轮没有明显重复错题。`,
      }),
      liveReadinessGateRow({
        key: "coverage-floor",
        label: "场景覆盖底线",
        passed: (coverage.averageScore || 0) >= thresholds.minCoverageScore,
        detail: `要求市场场景覆盖不低于 ${thresholds.minCoverageScore}/100，目前 ${coverage.averageScore || 0}/100。`,
      }),
      liveReadinessGateRow({
        key: "mechanics-floor",
        label: "交易机制底线",
        passed: Number(mechanicsRow.score) >= 70,
        detail: `资金结算、公司行动和现金账户纪律至少达到 70/100，目前 ${Number(mechanicsRow.score) || 0}/100。`,
      }),
      liveReadinessGateRow({
        key: "risk-floor",
        label: "风险控制底线",
        passed: Number(riskRow.score) >= 70,
        detail: `仓位、回撤和事件日风险至少达到 70/100，目前 ${Number(riskRow.score) || 0}/100。`,
      }),
      liveReadinessGateRow({
        key: "execution-floor",
        label: "下单执行底线",
        passed: Number(executionRow.score) >= 70,
        detail: `下单质量、训练合约和记录质量至少达到 70/100，目前 ${Number(executionRow.score) || 0}/100。`,
      }),
    ];
    const failedRows = gateRows.filter((row) => row.status === "fail");
    return {
      passed: failedRows.length === 0,
      failedCount: failedRows.length,
      thresholds,
      recentRunCount: recentRuns.length,
      recentAverageDiscipline,
      recentAverageDrawdown,
      consecutiveContractFailures,
      riskCoolingForbiddenBuys,
      repeatedIssue,
      rows: gateRows,
      summary: failedRows.length
        ? `硬性门槛还有 ${failedRows.length} 项未过：${failedRows.slice(0, 3).map((row) => row.label).join("、")}。`
        : "硬性门槛全部通过；仍然只代表训练纪律达标，不代表任何投资建议。",
    };
  }

  function liveReadinessGateRow({ key, label, passed, detail }) {
    return {
      key,
      label,
      status: passed ? "pass" : "fail",
      level: passed ? "good" : "danger",
      score: passed ? 100 : 0,
      detail,
      blocker: passed ? "" : `${label}未达标：${detail}`,
    };
  }

  function buildReadinessSampleRow(quality) {
    const validScore = Math.min(100, (quality.validBlindRuns || 0) * 20);
    const randomScore = Math.min(100, (quality.randomBlindRuns || 0) * 12);
    const corruptionPenalty = Math.min(35, (quality.corruptedBlindRuns || 0) * 12);
    const score = clampScore(validScore * 0.75 + randomScore * 0.25 - corruptionPenalty);
    return {
      key: "sample",
      label: "有效样本",
      score,
      weight: 1.2,
      level: readinessRowLevel(score),
      detail: `有效随机盲测 ${quality.validBlindRuns || 0} 轮，随机盲测 ${quality.randomBlindRuns || 0} 轮，失真盲测 ${quality.corruptedBlindRuns || 0} 轮。低样本阶段不能把收益当能力证明。`,
    };
  }

  function buildReadinessExamRow(exam, options = {}) {
    const formatPlainPercent = options.formatPlainPercent || defaultPercent;
    const composite = Number.isFinite(exam.averageComposite) ? exam.averageComposite : 40;
    const passRate = Number.isFinite(exam.passRate) ? exam.passRate : 0;
    const streakScore = Math.min(100, (exam.currentPassStreak || 0) * 30);
    const score = clampScore(composite * 0.5 + passRate * 0.3 + streakScore * 0.2);
    return {
      key: "exam",
      label: "考试稳定",
      score,
      weight: 1.35,
      level: readinessRowLevel(score),
      detail: `有效考试 ${exam.validRuns || 0} 轮，均分 ${Number.isFinite(exam.averageComposite) ? `${Math.round(exam.averageComposite)}/100` : "暂无"}，通过率 ${Number.isFinite(exam.passRate) ? formatPlainPercent(exam.passRate) : "暂无"}，连续通过 ${exam.currentPassStreak || 0} 轮。`,
    };
  }

  function buildReadinessCoverageRow(coverage) {
    const score = clampScore(coverage.averageScore || 0);
    return {
      key: "coverage",
      label: "行情覆盖",
      score,
      weight: 1,
      level: readinessRowLevel(score),
      detail: `覆盖 ${coverage.coveredDimensions || 0}/${coverage.totalDimensions || 0} 类市场场景，最弱项是“${coverage.weakest?.label || "暂无"}”。实盘前不能只在熟悉行情里证明自己。`,
    };
  }

  function buildReadinessRiskRow({ runs, radar, formatPlainPercent = defaultPercent }) {
    const riskItem = (radar || []).find((item) => item.label === "风险控制");
    const score = clampScore(riskItem?.score ?? 45);
    const averageDrawdown = averageFinite((runs || []).map((item) => Number(item.maxDrawdown)));
    const averageConcentration = averageFinite((runs || []).map((item) => Number(item.maxConcentrationPct)));
    const dangerTrades = (runs || []).reduce((sum, item) => sum + (Number(item.eventRiskDangerTradeCount) || 0), 0);
    return {
      key: "risk",
      label: "风险控制",
      score,
      weight: 1.35,
      level: readinessRowLevel(score),
      detail: `平均回撤 ${Number.isFinite(averageDrawdown) ? formatPlainPercent(averageDrawdown) : "暂无"}，平均最大仓位 ${Number.isFinite(averageConcentration) ? formatPlainPercent(averageConcentration) : "暂无"}，高风险事件交易 ${dangerTrades} 笔。`,
    };
  }

  function buildReadinessMechanicsRow(runs) {
    const mechanicRuns = (runs || []).filter((run) => Number.isFinite(Number(run.settlementScore)) || Number.isFinite(Number(run.corporateActionScore)));
    const averageSettlement = averageFinite(mechanicRuns.map((run) => Number(run.settlementScore)));
    const averageCorporateAction = averageFinite(mechanicRuns.map((run) => Number(run.corporateActionScore)));
    const unsettledBuys = (runs || []).reduce((sum, run) => sum + (Number(run.settlementUnsettledBuyCount) || 0), 0);
    const cashWarnings = (runs || []).reduce((sum, run) => sum + (Number(run.settlementCashAccountWarningCount) || 0), 0);
    const knownScore = averageFinite([averageSettlement, averageCorporateAction].filter(Number.isFinite));
    const baseScore = Number.isFinite(knownScore) ? knownScore : (runs || []).length ? 65 : 35;
    const score = clampScore(baseScore - Math.min(30, unsettledBuys * 5 + cashWarnings * 8));
    return {
      key: "mechanics",
      label: "交易机制",
      score,
      weight: 0.9,
      level: readinessRowLevel(score),
      detail: `资金结算均分 ${Number.isFinite(averageSettlement) ? `${Math.round(averageSettlement)}/100` : "暂无"}，公司行动均分 ${Number.isFinite(averageCorporateAction) ? `${Math.round(averageCorporateAction)}/100` : "暂无"}，未结算买入 ${unsettledBuys} 次，现金账户提醒 ${cashWarnings} 次。`,
    };
  }

  function buildReadinessRulebookRow({ runs, ruleCount, formatPlainPercent = defaultPercent }) {
    const reflectionRate = (runs || []).length
      ? ((runs || []).filter((run) => run.reflection?.nextRule).length / runs.length) * 100
      : 0;
    const ruleScore = Math.min(100, (ruleCount || 0) * 25);
    const score = clampScore(reflectionRate * 0.65 + ruleScore * 0.35);
    return {
      key: "rulebook",
      label: "复盘规则",
      score,
      weight: 0.85,
      level: readinessRowLevel(score),
      detail: `复盘反思保存率 ${formatPlainPercent(reflectionRate)}，启用个人规则 ${ruleCount || 0} 条。没有规则沉淀，真实交易里容易重复同一个错误。`,
    };
  }

  function buildReadinessExecutionRow(runs) {
    const averageCoach = averageFinite((runs || []).map((run) => Number(run.averageCoachScore)));
    const averageContract = averageFinite((runs || []).map((run) => Number(run.contractScore)));
    const averageWriting = averageFinite((runs || []).map((run) => Number(run.writingQualityScore)));
    const score = clampScore(averageFinite([averageCoach, averageContract, averageWriting].filter(Number.isFinite)) || 45);
    return {
      key: "execution",
      label: "下单执行",
      score,
      weight: 1,
      level: readinessRowLevel(score),
      detail: `平均下单质量 ${Number.isFinite(averageCoach) ? `${Math.round(averageCoach)}/100` : "暂无"}，交易合约 ${Number.isFinite(averageContract) ? `${Math.round(averageContract)}/100` : "暂无"}，记录质量 ${Number.isFinite(averageWriting) ? `${Math.round(averageWriting)}/100` : "暂无"}。`,
    };
  }

  function buildLiveReadinessBlockers({ quality, exam, coverage, rows, gate = null }) {
    const blockers = (gate?.rows || [])
      .filter((row) => row.status === "fail")
      .map((row) => row.blocker || `${row.label}未达标。`);
    if ((quality.validBlindRuns || 0) < 5) blockers.push(`有效随机盲测不足 5 轮，目前 ${quality.validBlindRuns || 0} 轮。`);
    if ((exam.validRuns || 0) < 5) blockers.push(`有效考试不足 5 轮，目前 ${exam.validRuns || 0} 轮。`);
    if (exam.currentPassStreak < 3) blockers.push(`还没有连续通过 3 轮有效考试，目前 ${exam.currentPassStreak || 0} 轮。`);
    if ((coverage.averageScore || 0) < 65) blockers.push(`市场场景覆盖低于 65/100，目前 ${coverage.averageScore || 0}/100。`);
    rows.filter((row) => ["risk", "mechanics", "execution"].includes(row.key) && row.score < 70)
      .forEach((row) => blockers.push(`${row.label}低于 70/100，目前 ${row.score}/100。`));
    return [...new Set(blockers)].slice(0, 8);
  }

  function readinessRowLevel(score) {
    return score >= 80 ? "good" : score >= 60 ? "warn" : "danger";
  }

  function liveReadinessStage({ level, score, blockers }) {
    if (level === "good") return "小额前演练";
    if (score >= 70 && blockers.length <= 2) return "强盲测巩固";
    if (score >= 55) return "模拟盘修纪律";
    return "基础训练";
  }

  function liveReadinessSummary({ score, level, stage, blockers, rows }) {
    if (!rows.length) return "还没有准备度数据。先完成基础训练。";
    if (level === "good") return `准备度 ${score}/100，当前阶段是“${stage}”。这只表示训练纪律接近小额前演练要求，不代表任何真实买卖建议。`;
    if (blockers.length) return `准备度 ${score}/100，当前阶段是“${stage}”。先处理：${blockers.slice(0, 2).join("；")} 不要用单次盈利跳过这些闸门。`;
    return `准备度 ${score}/100，当前阶段是“${stage}”。继续补齐薄弱项后，再考虑更接近真实的训练。`;
  }

  function buildTrainingQueue({
    runs = [],
    topMistakes = [],
    topEmotions = [],
    averageScore = Number.NaN,
    missionPassRate = Number.NaN,
    averageCoachScore = Number.NaN,
    lessonPassRate = Number.NaN,
    lessonFirstTryRate = Number.NaN,
    sampleQuality = null,
    examReport = null,
    coverageReport = null,
    liveReadiness = null,
    remediationRules = {},
    options = {},
  } = {}) {
    void topEmotions;
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const safeRuns = (runs || []).filter(Boolean);
    const queue = [];
    const quality = sampleQuality || buildSampleQualityReport(safeRuns, options);
    const exam = examReport || buildValidBlindExamReport(safeRuns, options);
    const coverage = coverageReport || buildScenarioCoverageReport(safeRuns, options);
    const readiness = liveReadiness || buildLiveReadinessReport({ runs: safeRuns, sampleQuality: quality, examReport: exam, coverageReport: coverage, options });
    const latestRemediation = [...safeRuns].reverse().find((item) => item.remediation)?.remediation;
    if (latestRemediation) {
      queue.push(trainingQueueItemFromRemediation(latestRemediation, {
        priority: "high",
        reason: `最近复盘处方要求优先处理：${latestRemediation.reason || latestRemediation.primaryIssue}。`,
      }, options));
    }

    if (quality.totalRuns >= 2 && quality.validBlindRuns < 3) {
      queue.push(trainingQueueItemFromPath({
        title: "建立有效盲测样本",
        priority: "high",
        reason: `目前只有 ${quality.validBlindRuns} 轮有效随机盲测。普通练习可以练流程，但不能代表你在未知行情下的真实水平。`,
        focus: "盲测样本",
        launchMode: "random-blind",
        constraint: "下一轮从顶部“随机盲测”进入；不得切换案例、切换模式或提前揭晓。",
        passCriteria: ["盲测完整性不低于 85/100。", "至少完成 3 个交易日判断。", "复盘反思写出一条可执行规则。"],
      }, options));
    }

    if (quality.corruptedBlindRuns >= 2) {
      queue.push(trainingQueueItemFromPath({
        title: "修复盲测失真",
        priority: "high",
        reason: `已有 ${quality.corruptedBlindRuns} 轮盲测被切模式、换案例或提前揭晓污染。继续这样练会让成绩看起来进步，但判断力没有真正变强。`,
        focus: "盲测完整",
        launchMode: "random-blind",
        constraint: "本轮只允许随机盲测入口，任何想看答案或换题的冲动都先写入反思草稿。",
        passCriteria: ["盲测完整性 100/100。", "没有红色完整性违规。", "收益不作为本轮通过条件。"],
      }, options));
    }

    if (exam.validRuns >= 3 && (exam.level === "danger" || exam.trend?.level === "danger")) {
      queue.push(trainingQueueItemFromPath({
        title: "重建真实考试稳定性",
        priority: "high",
        reason: `有效考试 ${exam.validRuns} 轮，但考试均分 ${Number.isFinite(exam.averageComposite) ? `${Math.round(exam.averageComposite)}/100` : "暂无"}，通过率 ${Number.isFinite(exam.passRate) ? formatPlainPercent(exam.passRate) : "暂无"}。现在要先修过程稳定性。`,
        focus: "考试稳定",
        launchMode: "random-blind",
        constraint: "下一轮随机盲测只允许小仓试探或主动观望；任何红色教练提醒都不能新增风险。",
        passCriteria: ["考试综合分达到 78/100。", "任务评分达到 80/100。", "保存复盘反思并生成下一轮硬规则。"],
      }, options));
    }

    topMistakes.forEach(([mistake, count]) => {
      if (queue.length >= 4) return;
      const rule = remediationRules[mistake];
      if (!rule) return;
      queue.push(trainingQueueItemFromRule(mistake, rule, {
        priority: count >= 2 ? "high" : "normal",
        reason: `长期画像显示“${mistake}”出现 ${count} 次，需要用专门案例反复矫正。`,
      }, options));
    });

    if (Number.isFinite(averageCoachScore) && averageCoachScore < 80 && remediationRules["下单质量低"]) {
      queue.push(trainingQueueItemFromRule("下单质量低", remediationRules["下单质量低"], {
        priority: "high",
        reason: `你的平均下单质量为 ${Math.round(averageCoachScore)}/100，说明提交前计划、仓位或情绪仍不稳定。`,
      }, options));
    }

    if (Number.isFinite(lessonPassRate) && (lessonPassRate < 90 || lessonFirstTryRate < 65)) {
      queue.push(trainingQueueItemFromPath({
        title: "补课程理解",
        priority: "normal",
        reason: `课程通过率 ${formatPlainPercent(lessonPassRate)}，一次答对 ${formatPlainPercent(lessonFirstTryRate)}。先把概念理解稳定下来。`,
        focus: "课程理解",
        constraint: "下一轮必须先一次通过检查题，再提交任何决策。",
        passCriteria: ["检查题一次通过。", "完成至少 1 次主动观望。", "复盘反思里写出本关核心概念。"],
      }, options));
    }

    if (Number.isFinite(missionPassRate) && missionPassRate < 75) {
      queue.push(trainingQueueItemFromPath({
        title: "补任务通过率",
        priority: "normal",
        reason: `任务通过率只有 ${formatPlainPercent(missionPassRate)}。先按本关任务拿稳定分，不追求收益最大化。`,
        focus: "任务纪律",
        constraint: "下一轮以任务评分 80/100 为第一目标，收益排名不是主要目标。",
        passCriteria: ["任务评分达到 80/100。", "交易次数不超过任务限制。", "至少保存一条复盘反思。"],
      }, options));
    }

    if (safeRuns.length >= 4 && coverage.weakest?.score < 55 && queue.length < 3) {
      queue.push(trainingQueueItemFromPath({
        caseId: coverage.weakest.nextCaseId,
        title: "补市场场景覆盖",
        priority: "normal",
        reason: `长期训练偏科：“${coverage.weakest.label}”覆盖 ${coverage.weakest.score}/100。只刷熟悉场景会高估真实能力。`,
        focus: coverage.weakest.focus,
        constraint: coverage.weakest.constraint,
        passCriteria: coverage.weakest.passCriteria,
      }, options));
    }

    const weakestReadinessRow = [...(readiness.rows || [])].sort((a, b) => a.score - b.score)[0];
    if (safeRuns.length >= 5 && readiness.level !== "good" && weakestReadinessRow && queue.length < 3) {
      queue.push(trainingQueueItemFromPath({
        title: "实盘前纪律闸门",
        priority: readiness.level === "danger" ? "high" : "normal",
        reason: `实盘前准备度 ${readiness.score}/100，最弱项是“${weakestReadinessRow.label}”。先把训练闸门补齐，不用单次盈利说服自己。`,
        focus: "实盘前检查",
        launchMode: weakestReadinessRow.key === "sample" || weakestReadinessRow.key === "exam" ? "random-blind" : undefined,
        constraint: "本轮按小额前演练标准执行：单仓上限 20%，红色提醒不得新增风险，卖出后先检查已结算现金，复盘必须写下一条硬规则。",
        passCriteria: ["纪律评分达到 80/100。", "平均下单质量达到 80/100。", "没有盲测完整性违规或现金账户红色提醒。"],
      }, options));
    }

    const recommendedCase = recommendedCaseFromOptions(options);
    queue.push(trainingQueueItemFromPath({
      caseId: recommendedCase.id,
      title: "继续课程路径",
      priority: queue.length ? "low" : "normal",
      reason: `课程路径推荐下一关是 ${recommendedCase.id}。按顺序推进可以避免基础纪律没稳就跳高难度。`,
      focus: "路径推进",
      constraint: "按当前 Level 的任务卡执行，不主动跳关。",
      passCriteria: ["课程检查题通过。", "任务评分达到 80/100。", "完成复盘反思。"],
    }, options));

    if (Number.isFinite(averageScore) && averageScore >= 80 && queue.length < 3) {
      queue.push(trainingQueueItemFromPath({
        title: "进阶模式压力测试",
        priority: "low",
        reason: `平均纪律 ${Math.round(averageScore)}/100，已经可以减少提示，测试纪律是否稳定。`,
        focus: "提示减少",
        constraint: "使用进阶模式完成推荐案例，不能因为提示减少而降低记录质量。",
        passCriteria: ["纪律评分不低于 75。", "平均下单质量不低于 80/100。", "没有红色教练提醒。"],
      }, options));
    }

    return dedupeTrainingQueue(queue, options).slice(0, 3);
  }

  function buildTrainingTrend(runs = [], options = {}) {
    const orderedRuns = [...(runs || [])].filter(Boolean);
    const recent = orderedRuns.slice(-3);
    const previous = orderedRuns.slice(-6, -3);
    const metricDefs = options.metricDefs || [
      { key: "disciplineScore", label: "纪律", direction: 1, unit: "分" },
      { key: "missionScore", label: "任务", direction: 1, unit: "分" },
      { key: "averageCoachScore", label: "下单", direction: 1, unit: "分" },
      { key: "blindIntegrityScore", label: "盲测", direction: 1, unit: "分" },
      { key: "contractScore", label: "合约", direction: 1, unit: "分" },
      { key: "eventRiskScore", label: "事件", direction: 1, unit: "分" },
      { key: "writingQualityScore", label: "文字", direction: 1, unit: "分" },
      { key: "maxDrawdown", label: "回撤", direction: -1, unit: "%" },
    ];
    if (recent.length < 2) {
      return {
        level: "warn",
        title: "样本还少",
        summary: "至少完成 2 轮训练后，系统才开始判断最近趋势；完成 6 轮后会比较最近 3 轮和之前 3 轮。",
        rows: metricDefs.slice(0, 4).map((metric) => ({
          key: metric.key,
          label: metric.label,
          level: "warn",
          delta: Number.NaN,
          deltaLabel: "暂无",
          detail: "样本不足，先继续完成训练并保存复盘。",
        })),
      };
    }
    const rows = metricDefs.map((metric) => buildTrendMetricRow(metric, recent, previous, options));
    const validRows = rows.filter((item) => Number.isFinite(item.delta));
    const improving = validRows.filter((item) => item.level === "good").length;
    const declining = validRows.filter((item) => item.level === "danger").length;
    const level = declining >= 2 ? "danger" : improving >= 2 && declining === 0 ? "good" : "warn";
    const title = level === "good" ? "最近趋势在改善" : level === "danger" ? "最近趋势在退步" : "最近趋势混合";
    return {
      level,
      title,
      summary: trendSummary({ previous, rows, level }),
      rows,
    };
  }

  function buildTrendMetricRow(metric, recent, previous, options = {}) {
    const recentAverage = averageFinite(recent.map((item) => Number(item[metric.key])));
    const previousAverage = previous.length ? averageFinite(previous.map((item) => Number(item[metric.key]))) : Number.NaN;
    const fallbackBaseline = averageFinite(recent.slice(0, -1).map((item) => Number(item[metric.key])));
    const baseline = Number.isFinite(previousAverage) ? previousAverage : fallbackBaseline;
    const rawDelta = Number.isFinite(recentAverage) && Number.isFinite(baseline) ? recentAverage - baseline : Number.NaN;
    const delta = Number.isFinite(rawDelta) ? rawDelta * metric.direction : Number.NaN;
    let level = "warn";
    if (Number.isFinite(delta)) {
      if (delta >= 5) level = "good";
      else if (delta <= -5) level = "danger";
    }
    const trendWord = !Number.isFinite(delta) ? "暂无" : delta >= 5 ? "改善" : delta <= -5 ? "退步" : "持平";
    const displayDelta = Number.isFinite(rawDelta)
      ? `${rawDelta >= 0 ? "+" : ""}${rawDelta.toFixed(1)}${metric.unit}`
      : "暂无";
    const previousText = Number.isFinite(previousAverage) ? `前 3 轮 ${formatTrendValue(previousAverage, metric, options)}` : "前序样本不足";
    return {
      key: metric.key,
      label: metric.label,
      level,
      delta,
      rawDelta,
      deltaLabel: `${trendWord} ${displayDelta}`,
      recentAverage,
      previousAverage,
      detail: `最近 ${recent.length} 轮 ${formatTrendValue(recentAverage, metric, options)}；${previousText}。`,
    };
  }

  function formatTrendValue(value, metric, options = {}) {
    if (!Number.isFinite(value)) return "暂无";
    if (metric.unit === "%") return (options.formatPlainPercent || options.formatPercent || defaultPercent)(value);
    return `${Math.round(value)}/100`;
  }

  function trendSummary({ previous, rows, level }) {
    const declining = rows.filter((item) => item.level === "danger");
    const improving = rows.filter((item) => item.level === "good");
    if (!previous.length) {
      return "还没有完整前 3 轮对照，先看最近几轮内部趋势；继续训练后判断会更可靠。";
    }
    if (level === "danger") {
      return `最近 3 轮出现退步，优先处理：${declining.slice(0, 2).map((item) => item.label).join("、")}。不要急着升难度。`;
    }
    if (level === "good") {
      return `最近 3 轮相对前 3 轮明显改善：${improving.slice(0, 2).map((item) => item.label).join("、")}。可以继续按路径推进，但不要放松风控。`;
    }
    return "最近 3 轮有改善也有薄弱项。下一轮按弱项自动排课执行，不要只挑喜欢的案例。";
  }

  function buildSkillRadarMetrics({ runs = [], averageScore = Number.NaN, missionPassRate = Number.NaN, averageCoachScore = Number.NaN, lessonPassRate = Number.NaN, lessonFirstTryRate = Number.NaN, reflectionRate = Number.NaN, options = {} } = {}) {
    const formatPlainPercent = options.formatPlainPercent || options.formatPercent || defaultPercent;
    const safeRuns = runs || [];
    const blindRuns = safeRuns.filter((item) => item.blindIntegrityActive);
    const averageBlindIntegrity = averageFinite(blindRuns.map((item) => Number(item.blindIntegrityScore)));
    const blindViolationCount = blindRuns.reduce((sum, item) => sum + (Number(item.blindIntegrityViolationCount) || 0), 0);
    const averageDrawdown = averageFinite(safeRuns.map((item) => Number(item.maxDrawdown)));
    const averageConcentration = averageFinite(safeRuns.map((item) => Number(item.maxConcentrationPct)));
    const averageTurnover = averageFinite(safeRuns.map((item) => Number(item.turnoverPct)));
    const averageEventRiskScore = averageFinite(safeRuns.map((item) => Number(item.eventRiskScore)));
    const totalDangerEventTrades = safeRuns.reduce((sum, item) => sum + (Number(item.eventRiskDangerTradeCount) || 0), 0);
    const riskScore = clampScore(100
      - Math.max(0, (Number.isFinite(averageDrawdown) ? averageDrawdown : 0) - 5) * 3
      - Math.max(0, (Number.isFinite(averageConcentration) ? averageConcentration : 0) - 35) * 1.2
      - Math.max(0, (Number.isFinite(averageTurnover) ? averageTurnover : 0) - 50) * 0.6
      - Math.max(0, 80 - (Number.isFinite(averageEventRiskScore) ? averageEventRiskScore : 80)) * 0.35);
    const learningScore = clampScore(Number.isFinite(lessonPassRate)
      ? lessonPassRate * 0.65 + (Number.isFinite(lessonFirstTryRate) ? lessonFirstTryRate : lessonPassRate) * 0.35
      : 50);
    return [
      skillRadarItem("纪律稳定", averageScore, `平均纪律分 ${Number.isFinite(averageScore) ? Math.round(averageScore) : "暂无"}/100。`),
      skillRadarItem("任务执行", missionPassRate, `任务通过率 ${Number.isFinite(missionPassRate) ? formatPlainPercent(missionPassRate) : "暂无"}。`),
      skillRadarItem("下单质量", averageCoachScore, `平均下单质量 ${Number.isFinite(averageCoachScore) ? `${Math.round(averageCoachScore)}/100` : "暂无"}。`),
      skillRadarItem("风险控制", riskScore, `平均回撤 ${Number.isFinite(averageDrawdown) ? formatPlainPercent(averageDrawdown) : "暂无"}，平均最大仓位 ${Number.isFinite(averageConcentration) ? formatPlainPercent(averageConcentration) : "暂无"}；高风险事件交易 ${totalDangerEventTrades} 笔。`),
      skillRadarItem("盲测完整", Number.isFinite(averageBlindIntegrity) ? averageBlindIntegrity : Number.NaN, blindRuns.length ? `随机盲测 ${blindRuns.length} 轮，平均完整性 ${Number.isFinite(averageBlindIntegrity) ? `${Math.round(averageBlindIntegrity)}/100` : "暂无"}，违规 ${blindViolationCount} 次。` : "还没有随机盲测记录。"),
      skillRadarItem("课程理解", learningScore, `课程通过 ${Number.isFinite(lessonPassRate) ? formatPlainPercent(lessonPassRate) : "暂无"}，一次答对 ${Number.isFinite(lessonFirstTryRate) ? formatPlainPercent(lessonFirstTryRate) : "暂无"}。`),
      skillRadarItem("复盘闭环", reflectionRate, `复盘反思保存率 ${Number.isFinite(reflectionRate) ? formatPlainPercent(reflectionRate) : "暂无"}。`),
    ];
  }

  function skillRadarItem(label, rawScore, detail) {
    const score = clampScore(Number.isFinite(rawScore) ? rawScore : 50);
    return {
      label,
      score,
      level: score >= 80 ? "good" : score >= 60 ? "warn" : "danger",
      detail,
    };
  }

  function trainingQueueItemFromRemediation(remediation, itemOptions = {}, options = {}) {
    const caseId = chooseAvailableCaseId(remediation.caseIds || [remediation.nextCaseId], remediation.nextCaseId, options);
    return {
      title: remediation.title,
      caseId,
      caseTitle: caseTitleFromOptions(caseId, options),
      focus: remediation.primaryIssue || "补练处方",
      launchMode: itemOptions.launchMode || "case",
      priority: itemOptions.priority || "normal",
      reason: itemOptions.reason || remediation.reason || "根据最近复盘生成的补练任务。",
      constraint: remediation.constraint,
      passCriteria: remediation.passCriteria || ["任务评分达到 80/100。", "平均下单质量达到 80/100。", "完成反思。"],
    };
  }

  function trainingQueueItemFromRule(mistake, rule, itemOptions = {}, options = {}) {
    const caseId = chooseAvailableCaseId(rule.caseIds || [], "", options);
    return {
      title: rule.title,
      caseId,
      caseTitle: caseTitleFromOptions(caseId, options),
      focus: mistake,
      launchMode: itemOptions.launchMode || "case",
      priority: itemOptions.priority || "normal",
      reason: itemOptions.reason || `系统检测到 ${mistake}，需要定向补练。`,
      constraint: rule.constraint,
      passCriteria: ["任务评分达到 80/100。", "平均下单质量达到 80/100。", ...(rule.checklist || []).slice(0, 2)],
    };
  }

  function trainingQueueItemFromPath(itemOptions = {}, options = {}) {
    const recommendedCase = recommendedCaseFromOptions(options);
    const caseId = chooseAvailableCaseId(itemOptions.caseId ? [itemOptions.caseId] : [recommendedCase.id], recommendedCase.id, options);
    return {
      title: itemOptions.title || "继续课程路径",
      caseId,
      caseTitle: caseTitleFromOptions(caseId, options),
      focus: itemOptions.focus || "路径推进",
      launchMode: itemOptions.launchMode || "case",
      priority: itemOptions.priority || "normal",
      reason: itemOptions.reason || `推荐继续训练 ${caseId}。`,
      constraint: itemOptions.constraint || "按任务卡完成，不跳过课程检查题。",
      passCriteria: itemOptions.passCriteria || ["课程检查题通过。", "任务评分达到 80/100。", "完成复盘反思。"],
    };
  }

  function dedupeTrainingQueue(queue, options = {}) {
    const availableIds = new Set((options.cases || []).map((caseItem) => caseItem.id).filter(Boolean));
    const seen = new Set();
    return queue.filter((item) => {
      const key = `${item.caseId}:${item.focus}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return item && item.caseId && (!availableIds.size || availableIds.has(item.caseId));
    });
  }

  function recommendedCaseFromOptions(options = {}) {
    if (options.recommendedCase?.id) return options.recommendedCase;
    const first = (options.cases || []).find((caseItem) => caseItem && caseItem.id);
    return first || { id: options.fallbackCaseId || "" };
  }

  function caseTitleFromOptions(caseId, options = {}) {
    if (typeof options.getCaseTitle === "function") return options.getCaseTitle(caseId);
    const caseItem = (options.cases || []).find((item) => item.id === caseId);
    return caseItem?.maskedTitle || caseItem?.title || caseId || "未知案例";
  }

  function isValidBlindRun(run) {
    return Boolean(run
      && run.blindIntegrityActive
      && run.blindIntegrityRandom
      && Number(run.blindIntegrityScore) >= 85
      && Number(run.blindIntegrityDangerCount || 0) === 0);
  }

  function chooseAvailableCaseId(caseIds, fallbackCaseId = "", options = {}) {
    const availableIds = new Set((options.cases || []).map((caseItem) => caseItem.id).filter(Boolean));
    const fallback = fallbackCaseId || options.fallbackCaseId || firstCaseId(options.cases);
    const uniqueCaseIds = [...new Set([...(caseIds || []), fallback])].filter(Boolean);
    if (!availableIds.size) return uniqueCaseIds[0] || fallback;
    return uniqueCaseIds.find((caseId) => availableIds.has(caseId)) || fallback || firstCaseId(options.cases);
  }

  function firstCaseId(cases = []) {
    return (cases || []).find((caseItem) => caseItem && caseItem.id)?.id || "";
  }

  function formatLedgerDate(value) {
    if (!value) return "未知日期";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "未知日期";
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function weightedAverage(items) {
    const cleanItems = items.filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
    const totalWeight = cleanItems.reduce((sum, item) => sum + item.weight, 0);
    return totalWeight ? cleanItems.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight : Number.NaN;
  }

  function averageFinite(values) {
    const cleanValues = values.filter(Number.isFinite);
    return cleanValues.length ? cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length : Number.NaN;
  }

  function maxConsecutiveContractFailures(runs = []) {
    let current = 0;
    let max = 0;
    (runs || []).forEach((run) => {
      const failed = run.contractPassed === false || (Number.isFinite(Number(run.contractScore)) && Number(run.contractScore) < 70);
      if (failed) {
        current += 1;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });
    return max;
  }

  function mostRepeatedRecentIssue(runs = []) {
    const counts = {};
    (runs || []).forEach((run) => {
      const keys = [
        ...(Array.isArray(run.flags) ? run.flags.map(classifyMistake) : []),
        run.rootCausePrimaryKey,
        run.rootCausePrimary,
      ].filter(Boolean);
      [...new Set(keys)].forEach((key) => {
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    const [label = "", count = 0] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
    return { label, count };
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  }

  function classifyMistake(flag) {
    const text = String(flag || "");
    if (text.includes("复盘样本")) return "缺少记录";
    if (text.includes("继续明显下跌")) return "过早抄底";
    if (text.includes("很快反弹")) return "恐慌卖出";
    if (text.includes("连续向下补仓")) return "补仓失控";
    if (text.includes("可接受亏损")) return "未执行止损";
    if (text.includes("闭环亏损")) return "亏损闭环";
    if (text.includes("盈利大幅回吐")) return "盈利回吐";
    if (text.includes("计划记录") || text.includes("目的和动作")) return "计划不清";
    if (text.includes("下单前质量") || text.includes("红色提醒")) return "下单质量低";
    if (text.includes("当天周期")) return "短线噪音";
    if (text.includes("追高")) return "追高";
    if (text.includes("恐慌")) return "恐慌卖出";
    if (text.includes("交易频率")) return "过度交易";
    if (text.includes("观望")) return "缺少观望";
    if (text.includes("仓位") || text.includes("集中")) return "仓位集中";
    return "其他纪律问题";
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

  function normalizeEvidenceSources(sources = []) {
    const valid = new Set(Object.keys(evidenceLabels));
    return [...new Set((Array.isArray(sources) ? sources : [])
      .map((item) => String(item || "").trim())
      .filter((item) => valid.has(item)))];
  }

  function evidenceSourceLabel(source) {
    return evidenceLabels[source] || source;
  }

  function extractCaseIdsFromText(text = "") {
    return [...new Set(String(text || "").match(/[A-Z]-\d{2}|S-\d{2}/g) || [])];
  }

  function fallbackRemediationRule() {
    return {
      title: "强化交易计划",
      caseIds: [],
      constraint: "下一轮每次提交前教练分必须不低于 80，且不能有红色提醒。",
      checklist: ["先选操作目的。", "计划周期要和动作匹配。", "理由和失效条件必须能被复盘验证。"],
    };
  }

  function liquiditySnapshotSummary(level, snapshot, formatPercent = defaultPercent) {
    if (level === "danger") return "订单相对当天成交量过大，成交假设不够真实。";
    if (level === "warn") return "订单占成交量偏高，应考虑分批或缩小数量。";
    return `订单占当天成交量 ${formatPercent(Number(snapshot.volumeSharePct) || 0)}，流动性假设可接受。`;
  }

  function topEntries(record, limit) {
    return Object.entries(record || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  function defaultPercent(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return `${safe.toFixed(2)}%`;
  }

  function defaultCurrency(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return `$${safe.toFixed(2)}`;
  }

  return {
    buildCoachStats,
    buildEvidenceSourceReview,
    buildLiquidityReview,
    buildOrderExecutionReview,
    buildRemediationPlan,
    buildRootCauseMatrix,
    buildPlanAdherenceReport,
    buildReviewScheduleReport,
    buildMistakeNotebookReport,
    buildTrainingLedgerReport,
    buildTrainingLedgerRow,
    buildSampleQualityReport,
    buildValidBlindExamReport,
    buildScenarioCoverageReport,
    buildScenarioCoverageRow,
    buildLiveReadinessReport,
    buildLiveReadinessGate,
    buildTrainingQueue,
    buildTrainingTrend,
    buildTrendMetricRow,
    buildSkillRadarMetrics,
    skillRadarItem,
    trainingQueueItemFromRemediation,
    trainingQueueItemFromRule,
    trainingQueueItemFromPath,
    buildPlanAdherenceRun,
    buildPlanAdherenceGroups,
    buildMistakeNotebookCard,
    mistakeNotebookPassCriteria,
    notebookFallbackRule,
    trainingRunQualityScore,
    trainingRunPrimaryIssue,
    trainingRunNextAction,
    isValidBlindRun,
    validBlindCompositeScore,
    isPassingValidBlindExam,
    buildValidBlindExamTrend,
    examLevelLabel,
    ledgerLevelLabel,
    coverageLevelLabel,
    readinessRowLevel,
    liveReadinessStage,
    maxConsecutiveContractFailures,
    mostRepeatedRecentIssue,
    reviewScheduleTypeLabel,
    reviewDueLabel,
    rootCauseCheck,
    rootCauseItem,
    chronologicalDecisions,
    normalizeEvidenceSources,
    evidenceSourceLabel,
    classifyMistake,
    extractCaseIdsFromText,
  };
});
