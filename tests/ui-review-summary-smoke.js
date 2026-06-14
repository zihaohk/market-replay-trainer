const assert = require("node:assert/strict");

const ui = require("../ui/review-summary.js");

const formatPercent = (value) => `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
const formatPlainPercent = (value) => `${Math.round(Number(value))}%`;
const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
const formatHomeCurrency = (value) => `HK$${Number(value).toFixed(2)}`;
const formatNumber = (value) => Number(value).toFixed(2);
const formatCompactNumber = (value) => `${Number(value) / 1000000}M`;
const displayDay = (day) => String(Number(day) + 1);

const review = {
  returnPct: 4.2,
  buyHoldPct: 2.1,
  disciplineScore: 82,
  maxDrawdown: -6.4,
  tradeCount: 3,
  flags: ["追高"],
  turnoverPct: 18.2,
  maxConcentrationPct: 24.4,
  holdCount: 1,
  mission: {
    passed: true,
    score: 86,
    plan: { objective: "练习先观望再试探" },
    items: [{ status: "pass", title: "主动观望", detail: "已完成一次。" }],
  },
  contractStatus: { passed: false, score: 62 },
  fundingReview: { homeReturnPct: -1.5 },
  settlementReview: { level: "good", score: 91 },
  blindIntegrityReview: { level: "danger", score: 55 },
  riskCoolingReview: { level: "good", score: 100 },
  allocationStatus: { level: "warn", score: 72 },
  thesisQuality: { level: "good", score: 88 },
  coachStats: { averageScore: 77.4 },
  writingQuality: { level: "danger", averageScore: 58.1 },
  evidenceSourceReview: { level: "good", score: 90 },
  liquidityReview: { level: "warn", score: 70 },
  orderExecutionReview: { level: "good", score: 94 },
  corporateActionReview: { level: "good", score: 100 },
  gapRiskReview: { level: "warn", score: 76 },
  eventRiskReview: { level: "danger", score: 50 },
  confidenceCalibration: { level: "good", score: 84 },
  invalidationExecution: { level: "danger", score: 45 },
  profitPlanReview: { level: "good", score: 92 },
  positionTriggerReview: { level: "warn", score: 73 },
  checkpointReview: { level: "good", score: 88 },
  revealReadiness: { level: "good", score: 96 },
  rootCauseMatrix: { primary: { level: "danger", label: "仓位风控" } },
  lessonGate: { passed: true, attempts: 2 },
  contractStatus: {
    passed: false,
    score: 62,
    contract: { saved: true, objective: "控制回撤" },
    items: [{ status: "fail", title: "最大回撤", detail: "超过预算。" }],
  },
  allocationStatus: {
    level: "warn",
    score: 72,
    blueprint: { saved: true, objective: "ETF 核心仓" },
    items: [{ status: "pass", title: "现金底线", detail: "仍然保留。" }],
  },
  thesisQuality: {
    level: "good",
    score: 88,
    thesis: { saved: true, baseCase: "先防守后试探" },
    items: [{ status: "warn", title: "看空条件", detail: "还不够具体。" }],
  },
  remediationResult: {
    passed: false,
    items: [{ status: "fail", title: "补练限制", detail: "仍有加仓。" }],
  },
  activeTrainingPlanResult: {
    passed: true,
    items: [{ status: "pass", title: "计划 focus", detail: "按计划完成。" }],
  },
  evidence: {
    sources: [{
      maskedSymbol: "ETF-A",
      realSymbol: "SPY",
      sourceLabel: "Yahoo Chart",
      dateRange: "2020-02-01 至 2020-03-01",
      barCount: 20,
      returnPct: -8.5,
      maxDrawdownPct: -15.2,
    }],
    sourcePack: {
      summary: "复盘官方资料。",
      items: [{
        title: "Fed release",
        publisher: "Federal Reserve",
        date: "2020-03-01",
        kind: "官方资料",
        reason: "核对流动性背景。",
        url: "https://example.com/fed?x=1&y=2",
      }],
    },
    timeline: [{
      day: 1,
      date: "2020-02-03",
      category: "important",
      categoryLabel: "重要",
      title: "市场波动放大",
      moves: [{ symbol: "ETF-A", dayChangePct: -3.2, sinceStartPct: -4.5 }],
    }],
  },
  newsCalibration: {
    summary: "新闻判断有样本。",
    items: [{
      day: 2,
      date: "2020-02-04",
      level: "danger",
      score: 45,
      title: "新闻摘要",
      judgedCategory: "noise",
      actualCategory: "important",
      forwardReturnPct: -5.3,
      action: "watch",
      categoryVerdict: { text: "性质判断偏差。" },
      outlookVerdict: { text: "影响被低估。" },
      actionVerdict: { text: "行动偏慢。" },
    }],
  },
};

const evidenceHtml = ui.renderReviewEvidenceIntro(review, {
  formatPercent,
  formatPlainPercent,
  displayDay,
  newsLabel: (value) => ({ noise: "噪音", important: "重要" })[value] || value,
  newsActionLabel: () => "观察",
});
assert(evidenceHtml.includes("数据来源核对"));
assert(evidenceHtml.includes("ETF-A · SPY"));
assert(evidenceHtml.includes("复盘资料包"));
assert(evidenceHtml.includes("https://example.com/fed?x=1&amp;y=2"));
assert(evidenceHtml.includes("事件证据时间线"));
assert(evidenceHtml.includes("第 2 天 · 2020-02-03"));
assert(evidenceHtml.includes("新闻判断校准"));
assert(evidenceHtml.includes("你判：噪音"));

const emptyNewsHtml = ui.renderReviewEvidenceIntro({
  evidence: { sources: [], sourcePack: { summary: "", items: [] }, timeline: [] },
  newsCalibration: { summary: "", items: [] },
});
assert(emptyNewsHtml.includes("本案例没有内置外部资料"));
assert(emptyNewsHtml.includes("本轮没有保存新闻判断"));

const scoreHtml = ui.renderReviewScoreGrid(review, { formatPercent, formatPlainPercent });
assert(scoreHtml.includes("你的收益"));
assert(scoreHtml.includes("+4.2%"));
assert(scoreHtml.includes("港币口径"));
assert(scoreHtml.includes("-1.5%"));
assert(scoreHtml.includes("任务结果"));
assert(scoreHtml.includes("通关"));
assert(scoreHtml.includes("首要根因"));
assert(scoreHtml.includes("仓位风控"));
assert(scoreHtml.includes("课程理解"));
assert(scoreHtml.includes("2 次通过"));

const planHtml = ui.renderReviewPlanSections(review, {
  missionStatusLabel: (status) => ({ pass: "通过", warn: "提醒", fail: "失败" })[status] || status,
});
assert(planHtml.includes("本关任务"));
assert(planHtml.includes("训练合约"));
assert(planHtml.includes("控制回撤"));
assert(planHtml.includes("配置蓝图"));
assert(planHtml.includes("ETF 核心仓"));
assert(planHtml.includes("市场假设"));
assert(planHtml.includes("先防守后试探"));
assert(planHtml.includes("处方执行"));
assert(planHtml.includes("本轮补练未达标"));
assert(planHtml.includes("计划执行"));
assert(planHtml.includes("本轮计划达标"));
assert(planHtml.includes("失败：最大回撤。超过预算。"));

const escapedPlanHtml = ui.renderReviewPlanSections({
  mission: {
    plan: { objective: "<script>alert(1)</script>" },
    items: [{ status: "pass", title: "\"title\"", detail: "<bad>" }],
  },
  contractStatus: { contract: { saved: false }, items: [] },
  allocationStatus: { blueprint: { saved: false }, items: [] },
  thesisQuality: { thesis: { saved: false }, items: [] },
});
assert(!escapedPlanHtml.includes("<script>"));
assert(escapedPlanHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedPlanHtml.includes("&quot;title&quot;"));
assert(escapedPlanHtml.includes("&lt;bad&gt;"));

const blindHtml = ui.renderBlindIntegritySection({
  summary: "本轮盲测有 1 个问题。",
  active: true,
  rows: [{
    day: 2,
    type: "manual-case-switch",
    level: "danger",
    detail: "训练中手动切换案例。",
  }],
}, {
  displayDay,
  blindViolationTypeLabel: () => "手动换案例",
});
assert(blindHtml.includes("盲测完整性"));
assert(blindHtml.includes("第 3 天 · 手动换案例"));
assert(blindHtml.includes("红色"));
assert(blindHtml.includes("训练中手动切换案例。"));

const cleanBlindHtml = ui.renderBlindIntegritySection({ summary: "完整。", active: true, rows: [] });
assert(cleanBlindHtml.includes("本轮没有破坏盲测完整性的记录。"));
const inactiveBlindHtml = ui.renderBlindIntegritySection({ summary: "非随机。", active: false, rows: [] });
assert(inactiveBlindHtml.includes("本轮不是随机盲测"));

const riskCoolingHtml = ui.renderRiskCoolingSection({
  summary: "风险冷却被触发。",
  active: true,
  level: "danger",
  items: [{
    title: "第 5 天继续买入",
    type: "forbidden-buy",
    level: "danger",
    detail: "回撤预算打穿后仍新增风险。",
  }],
});
assert(riskCoolingHtml.includes("风险冷却"));
assert(riskCoolingHtml.includes("违规加风险"));
assert(riskCoolingHtml.includes("回撤预算打穿后仍新增风险。"));

const passiveRiskCoolingHtml = ui.renderRiskCoolingSection({ summary: "触发但无动作。", active: true, level: "danger", items: [] });
assert(passiveRiskCoolingHtml.includes("触发风险冷却后还没有防守动作记录。"));
const inactiveRiskCoolingHtml = ui.renderRiskCoolingSection({ summary: "未触发。", active: false, level: "good", items: [] });
assert(inactiveRiskCoolingHtml.includes("本轮没有触发风险冷却。"));

const escapedRiskCoolingHtml = ui.renderRiskCoolingSection({
  summary: "<script>alert(1)</script>",
  active: true,
  level: "danger",
  items: [{ title: "\"title\"", level: "danger", detail: "<bad>" }],
});
assert(!escapedRiskCoolingHtml.includes("<script>"));
assert(escapedRiskCoolingHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedRiskCoolingHtml.includes("&quot;title&quot;"));
assert(escapedRiskCoolingHtml.includes("&lt;bad&gt;"));

const decisionQualityHtml = ui.renderDecisionQualitySection({
  coachStats: {
    sampleCount: 2,
    averageScore: 76.4,
    dangerCount: 1,
    warnCount: 1,
    topIssues: [["仓位偏大", 2]],
  },
  writingQuality: {
    sampleCount: 2,
    averageScore: 68.8,
    summary: "理由还不够具体。",
    issueCounts: [["失效条件模糊", 1]],
  },
  evidenceSourceReview: {
    summary: "证据来源偏少。",
    rows: [{
      day: 3,
      side: "buy",
      symbol: "ETF-A",
      level: "danger",
      sourceCount: 1,
      summary: "只看价格。",
      sources: ["price"],
    }],
  },
}, {
  displayDay,
  decisionLabel: (side) => ({ buy: "买入" })[side] || side,
  evidenceSourceLabel: (source) => ({ price: "价格趋势" })[source] || source,
});
assert(decisionQualityHtml.includes("下单前质量"));
assert(decisionQualityHtml.includes("保存 2 条教练快照，平均 76/100"));
assert(decisionQualityHtml.includes("仓位偏大：2 次"));
assert(decisionQualityHtml.includes("决策文字质量"));
assert(decisionQualityHtml.includes("平均 69/100。理由还不够具体。"));
assert(decisionQualityHtml.includes("失效条件模糊：1 次"));
assert(decisionQualityHtml.includes("证据来源复盘"));
assert(decisionQualityHtml.includes("第 4 天 · 买入 · ETF-A"));
assert(decisionQualityHtml.includes("价格趋势"));

const emptyDecisionQualityHtml = ui.renderDecisionQualitySection({
  coachStats: { sampleCount: 0, topIssues: [] },
  writingQuality: { sampleCount: 0, issueCounts: [] },
  evidenceSourceReview: { summary: "暂无。", rows: [] },
});
assert(emptyDecisionQualityHtml.includes("本轮没有保存下单前教练快照。"));
assert(emptyDecisionQualityHtml.includes("本轮没有可评分文字样本。"));
assert(emptyDecisionQualityHtml.includes("本轮没有决策样本。"));

const escapedDecisionQualityHtml = ui.renderDecisionQualitySection({
  coachStats: { sampleCount: 1, averageScore: 1, dangerCount: 0, warnCount: 0, topIssues: [["<script>alert(1)</script>", 1]] },
  writingQuality: { sampleCount: 1, averageScore: 1, summary: "\"summary\"", issueCounts: [["<bad>", 1]] },
  evidenceSourceReview: {
    summary: "<source>",
    rows: [{ day: 0, side: "buy", symbol: "\"ETF\"", level: "danger", sourceCount: 0, summary: "<row>", sources: [] }],
  },
});
assert(!escapedDecisionQualityHtml.includes("<script>"));
assert(escapedDecisionQualityHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedDecisionQualityHtml.includes("&quot;summary&quot;"));
assert(escapedDecisionQualityHtml.includes("&lt;bad&gt;"));
assert(escapedDecisionQualityHtml.includes("&quot;ETF&quot;"));

const fundingAndSettlementHtml = ui.renderFundingAndSettlementSection({
  fundingReview: {
    summary: "资金收益被换汇成本拉低。",
    level: "danger",
    score: 62,
    initialHomeDeposit: 100000,
    initialFxCostHome: 180,
    tradedHome: 25000,
    usdReturnPct: 2,
    homeReturnPct: 1.4,
  },
  corporateActionReview: { dividendTaxWithheld: 15 },
  settlementReview: {
    summary: "存在未结算资金使用。",
    rows: [{
      tradeDay: 2,
      symbol: "ETF-A",
      status: "settled",
      amount: 1234.56,
      settleDay: 3,
      cycle: "",
    }],
    unsettledBuyRows: [{
      day: 4,
      symbol: "STOCK-B",
      amount: 700,
      settledCash: 120,
      unsettledProceeds: 580,
    }],
    cashAccountWarnings: [{
      entryDay: 4,
      paidForDay: 5,
      sellDay: 4,
      symbol: "STOCK-B",
      quantity: 3.5,
      detail: "买入尚未完成付款前卖出。",
    }],
  },
}, {
  formatPercent,
  formatCurrency,
  formatHomeCurrency,
  formatNumber,
  displayDay,
  settlementCycleLabel: "T+1",
});
assert(fundingAndSettlementHtml.includes("资金与汇率复盘"));
assert(fundingAndSettlementHtml.includes("资金收益被换汇成本拉低。"));
assert(fundingAndSettlementHtml.includes("入金 HK$100000.00"));
assert(fundingAndSettlementHtml.includes("换汇成本 HK$180.00"));
assert(fundingAndSettlementHtml.includes("成交折合 HK$25000.00"));
assert(fundingAndSettlementHtml.includes("股息预扣 $15.00"));
assert(fundingAndSettlementHtml.includes("美元口径收益 +2.0%"));
assert(fundingAndSettlementHtml.includes("港币入金口径收益 +1.4%"));
assert(fundingAndSettlementHtml.includes("资金结算复盘"));
assert(fundingAndSettlementHtml.includes("第 3 天 · ETF-A 卖出款"));
assert(fundingAndSettlementHtml.includes("已结算"));
assert(fundingAndSettlementHtml.includes("T+1"));
assert(fundingAndSettlementHtml.includes("动用未结算资金买入 STOCK-B"));
assert(fundingAndSettlementHtml.includes("现金账户纪律风险 · STOCK-B"));
assert(fundingAndSettlementHtml.includes("good faith 风险"));
assert(fundingAndSettlementHtml.includes("卖出股数 3.50"));

const emptyFundingAndSettlementHtml = ui.renderFundingAndSettlementSection({
  fundingReview: {},
  corporateActionReview: {},
  settlementReview: { rows: [], unsettledBuyRows: [], cashAccountWarnings: [] },
});
assert(emptyFundingAndSettlementHtml.includes("暂无资金与汇率复盘。"));
assert(emptyFundingAndSettlementHtml.includes("暂无资金结算复盘。"));
assert(emptyFundingAndSettlementHtml.includes("本轮没有卖出结算记录。"));

const escapedFundingAndSettlementHtml = ui.renderFundingAndSettlementSection({
  fundingReview: { summary: "<script>alert(1)</script>", level: "\"bad\"" },
  settlementReview: {
    summary: "<settlement>",
    rows: [{ tradeDay: 0, symbol: "\"ETF\"", status: "pending", amount: 1, settleDay: 1, cycle: "<T+1>" }],
    unsettledBuyRows: [{ day: 0, symbol: "<BUY>", amount: 1, settledCash: 0, unsettledProceeds: 1 }],
    cashAccountWarnings: [{ entryDay: 0, paidForDay: 1, sellDay: 0, symbol: "<SELL>", quantity: 1, detail: "<detail>" }],
  },
});
assert(!escapedFundingAndSettlementHtml.includes("<script>"));
assert(escapedFundingAndSettlementHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedFundingAndSettlementHtml.includes("&quot;ETF&quot;"));
assert(escapedFundingAndSettlementHtml.includes("&lt;T+1&gt;"));
assert(escapedFundingAndSettlementHtml.includes("&lt;BUY&gt;"));
assert(escapedFundingAndSettlementHtml.includes("&lt;SELL&gt;"));
assert(escapedFundingAndSettlementHtml.includes("&lt;detail&gt;"));

const executionRiskHtml = ui.renderExecutionRiskSection({
  orderExecutionReview: {
    summary: "限价单有等待和成交差异。",
    rows: [{
      createdDay: 1,
      side: "buy",
      symbol: "ETF-A",
      status: "filled",
      quantity: 2,
      limitPrice: 99.5,
      fillPrice: 99.4,
      detail: "低于限价成交。",
    }],
  },
  gapRiskReview: {
    summary: "隔夜跳空影响止损。",
    rows: [{
      day: 2,
      date: "2020-03-03",
      symbol: "ETF-A",
      level: "danger",
      gapPct: -4.2,
      previousClose: 100,
      open: 95.8,
      close: 96.5,
      dayChangePct: 0.7,
      detail: "开盘直接越过止损参考。",
    }],
  },
  eventRiskReview: {
    summary: "事件日前后有大额交易。",
    rows: [{
      day: 3,
      date: "2020-03-04",
      title: "FOMC 决议",
      typeLabel: "宏观事件",
      level: "danger",
      riskLevel: "high",
      decisionCount: 1,
      tradeCount: 1,
      largeTradeCount: 1,
      marketOrderCount: 1,
      detail: "事件前没有降低仓位。",
      decisions: [{ day: 3, side: "sell", symbol: "ETF-A", amount: 800 }],
    }],
  },
  liquidityReview: {
    summary: "成交额占比偏高。",
    rows: [{
      day: 4,
      side: "buy",
      symbol: "SMALL-A",
      level: "warn",
      volumeSharePct: 8,
      dayVolume: 2000000,
      dollarVolumeSharePct: 3,
      impactCost: 12.5,
      summary: "订单相对成交量偏大。",
    }],
  },
  corporateActionReview: {
    summary: "分红已经计入现金。",
    rows: [{
      day: 5,
      type: "dividend",
      symbol: "DIV-A",
      applied: true,
      expectedCashPerShare: 0.5,
      affected: true,
      grossDividend: 10,
      taxWithheld: 3,
      cashDelta: 7,
      effectText: "现金增加。",
      detail: "分红税费已记录。",
    }],
  },
}, {
  formatPercent,
  formatPlainPercent,
  formatCurrency,
  formatNumber,
  formatCompactNumber,
  displayDay,
  decisionLabel: (side) => ({ buy: "买入", sell: "卖出" })[side] || side,
  pendingOrderStatusLabel: (status) => ({ filled: "已成交" })[status] || status,
  eventRiskLevelLabel: (risk) => ({ high: "高风险事件" })[risk] || risk,
  corporateActionTypeLabel: (type) => ({ dividend: "分红" })[type] || type,
});
assert(executionRiskHtml.includes("订单执行复盘"));
assert(executionRiskHtml.includes("限价单有等待和成交差异。"));
assert(executionRiskHtml.includes("第 2 天 · 限价买入 · ETF-A"));
assert(executionRiskHtml.includes("已成交"));
assert(executionRiskHtml.includes("限价 $99.50"));
assert(executionRiskHtml.includes("成交 $99.40"));
assert(executionRiskHtml.includes("隔夜跳空复盘"));
assert(executionRiskHtml.includes("第 3 天 · 2020-03-03 · ETF-A"));
assert(executionRiskHtml.includes("前收 $100.00"));
assert(executionRiskHtml.includes("事件日风险复盘"));
assert(executionRiskHtml.includes("FOMC 决议"));
assert(executionRiskHtml.includes("高风险事件"));
assert(executionRiskHtml.includes("第 4 天 卖出 ETF-A $800.00"));
assert(executionRiskHtml.includes("流动性复盘"));
assert(executionRiskHtml.includes("第 5 天 · 买入 · SMALL-A"));
assert(executionRiskHtml.includes("当日成交量 2M"));
assert(executionRiskHtml.includes("估算冲击 $12.50"));
assert(executionRiskHtml.includes("公司行动复盘"));
assert(executionRiskHtml.includes("第 6 天 · 分红 · DIV-A"));
assert(executionRiskHtml.includes("毛分红 $10.00"));
assert(executionRiskHtml.includes("净到账 $7.00"));

const emptyExecutionRiskHtml = ui.renderExecutionRiskSection({
  orderExecutionReview: { rows: [] },
  gapRiskReview: { rows: [] },
  eventRiskReview: { rows: [] },
  liquidityReview: { rows: [] },
  corporateActionReview: { rows: [] },
});
assert(emptyExecutionRiskHtml.includes("暂无订单执行复盘。"));
assert(emptyExecutionRiskHtml.includes("本轮没有限价单样本。"));
assert(emptyExecutionRiskHtml.includes("本轮没有明显隔夜跳空节点。"));
assert(emptyExecutionRiskHtml.includes("本轮没有经过预设事件窗口。"));
assert(emptyExecutionRiskHtml.includes("本轮没有买卖交易样本。"));
assert(emptyExecutionRiskHtml.includes("本轮没有公司行动事件。"));

const escapedExecutionRiskHtml = ui.renderExecutionRiskSection({
  orderExecutionReview: {
    summary: "<order>",
    rows: [{ createdDay: 0, side: "<buy>", symbol: "\"ETF\"", status: "<filled>", quantity: 1, limitPrice: 1, fillPrice: 1, detail: "<detail>" }],
  },
  gapRiskReview: {
    summary: "<gap>",
    rows: [{ day: 0, date: "<date>", symbol: "<GAP>", level: "\"bad\"", gapPct: 1, previousClose: 1, open: 1, close: 1, dayChangePct: 1, detail: "<gap-detail>" }],
  },
  eventRiskReview: {
    summary: "<event>",
    rows: [{ day: 0, date: "<event-date>", title: "<title>", typeLabel: "<type>", level: "danger", riskLevel: "<risk>", detail: "<event-detail>", decisions: [{ day: 0, side: "<sell>", symbol: "<SYM>", amount: 1 }] }],
  },
  liquidityReview: {
    summary: "<liquidity>",
    rows: [{ day: 0, side: "<side>", symbol: "<LIQ>", level: "danger", volumeSharePct: 1, dayVolume: 1, dollarVolumeSharePct: 1, impactCost: 1, summary: "<liq-detail>" }],
  },
  corporateActionReview: {
    summary: "<corp>",
    rows: [{ day: 0, type: "<split>", symbol: "<CORP>", applied: false, expectedRatio: "<2>", affected: false, grossDividend: 0, taxWithheld: 0, cashDelta: 0, effectText: "<effect>", detail: "<corp-detail>" }],
  },
});
assert(!escapedExecutionRiskHtml.includes("<order>"));
assert(escapedExecutionRiskHtml.includes("&lt;order&gt;"));
assert(escapedExecutionRiskHtml.includes("&quot;ETF&quot;"));
assert(escapedExecutionRiskHtml.includes("&lt;gap-detail&gt;"));
assert(escapedExecutionRiskHtml.includes("&lt;title&gt;"));
assert(escapedExecutionRiskHtml.includes("&lt;SYM&gt;"));
assert(escapedExecutionRiskHtml.includes("&lt;liq-detail&gt;"));
assert(escapedExecutionRiskHtml.includes("&lt;CORP&gt;"));
assert(escapedExecutionRiskHtml.includes("&lt;effect&gt;"));

const positionDisciplineHtml = ui.renderPositionDisciplineSection({
  positionTriggerReview: {
    summary: "有持仓触发计划窗口。",
    items: [{
      triggerDay: 5,
      entryDay: 2,
      symbol: "ETF-A",
      type: "stop",
      level: "danger",
      status: "fail",
      triggerLabel: "跌破 -5%",
      actionLabel: "未处理",
      detail: "亏损线触发后仍然持有。",
    }],
  },
  confidenceCalibration: {
    summary: "存在过度自信。",
    items: [{
      day: 4,
      side: "buy",
      symbol: "ETF-A",
      level: "danger",
      confidence: 5,
      expectedScore: 0.9,
      outcomeScore: 0.2,
      calibrationError: 70,
      overconfident: true,
      underconfident: false,
      counterfactualSummary: "反事实显示观望更好。",
    }],
  },
  invalidationExecution: {
    summary: "失效条件执行偏慢。",
    items: [{
      symbol: "ETF-A",
      entryDay: 2,
      breachDay: 5,
      responseDay: 6,
      level: "warn",
      status: "warn",
      riskLimitPct: -5,
      stopPrice: 95,
      breachPrice: 93,
      actionLabel: "减仓",
      detail: "触发后隔天才处理。",
      invalidation: "跌破 95 必须减仓。",
    }],
  },
  profitPlanReview: {
    summary: "盈利窗口有响应。",
    items: [{
      symbol: "STOCK-B",
      entryDay: 1,
      triggerDay: 7,
      responseDay: null,
      level: "danger",
      status: "fail",
      triggerPct: 12,
      triggerHigh: 112,
      favorablePct: 14,
      actionLabel: "无",
      detail: "达到盈利窗口但没有执行计划。",
      profitPlan: "涨到 2R 先卖一半。",
    }],
  },
  checkpointReview: {
    summary: "复查记录显示风险变化。",
    logs: [{
      symbol: "ETF-A",
      day: 6,
      bias: "deteriorating",
      action: "reduce",
      riskChanged: true,
      note: "流动性和趋势变差。",
    }],
  },
}, {
  formatPlainPercent,
  formatCurrency,
  displayDay,
  decisionLabel: (side) => ({ buy: "买入" })[side] || side,
  missionStatusLabel: (status) => ({ fail: "失败", warn: "提醒" })[status] || status,
  confidenceLabel: (confidence) => `${confidence} 级信心`,
  checkpointBiasLabel: (bias) => ({ deteriorating: "转弱" })[bias] || bias,
  checkpointActionLabel: (action) => ({ reduce: "减仓" })[action] || action,
});
assert(positionDisciplineHtml.includes("持仓触发提醒"));
assert(positionDisciplineHtml.includes("第 6 天 · ETF-A · 亏损线"));
assert(positionDisciplineHtml.includes("跌破 -5%"));
assert(positionDisciplineHtml.includes("信心校准"));
assert(positionDisciplineHtml.includes("第 5 天 · 买入 · ETF-A"));
assert(positionDisciplineHtml.includes("5 级信心"));
assert(positionDisciplineHtml.includes("可能过度自信。反事实显示观望更好。"));
assert(positionDisciplineHtml.includes("失效条件执行"));
assert(positionDisciplineHtml.includes("ETF-A · 第 3 天买入 / 第 6 天触发"));
assert(positionDisciplineHtml.includes("响应 第 7 天 · 减仓"));
assert(positionDisciplineHtml.includes("原失效条件"));
assert(positionDisciplineHtml.includes("盈利计划执行"));
assert(positionDisciplineHtml.includes("STOCK-B · 第 2 天买入 / 第 8 天盈利窗口"));
assert(positionDisciplineHtml.includes("响应 无"));
assert(positionDisciplineHtml.includes("原盈利计划"));
assert(positionDisciplineHtml.includes("盘中复查日志"));
assert(positionDisciplineHtml.includes("ETF-A · 第 7 天复查"));
assert(positionDisciplineHtml.includes("动作 减仓"));
assert(positionDisciplineHtml.includes("风险已变化"));

const emptyPositionDisciplineHtml = ui.renderPositionDisciplineSection({
  positionTriggerReview: { items: [] },
  confidenceCalibration: { items: [] },
  invalidationExecution: { items: [] },
  profitPlanReview: { items: [] },
  checkpointReview: { logs: [] },
});
assert(emptyPositionDisciplineHtml.includes("暂无持仓触发提醒。"));
assert(emptyPositionDisciplineHtml.includes("本轮没有持仓触发亏损线或 2R 盈利窗口。"));
assert(emptyPositionDisciplineHtml.includes("没有可校准信心样本。"));
assert(emptyPositionDisciplineHtml.includes("没有买入记录触发自定亏损线。"));
assert(emptyPositionDisciplineHtml.includes("没有买入记录达到明显盈利计划触发区。"));
assert(emptyPositionDisciplineHtml.includes("本轮没有保存盘中复查记录。"));

const escapedPositionDisciplineHtml = ui.renderPositionDisciplineSection({
  positionTriggerReview: {
    summary: "<position>",
    items: [{ triggerDay: 0, entryDay: 0, symbol: "\"ETF\"", type: "profit", level: "\"bad\"", status: "<status>", triggerLabel: "<trigger>", actionLabel: "<action>", detail: "<detail>" }],
  },
  confidenceCalibration: {
    summary: "<confidence>",
    items: [{ day: 0, side: "<buy>", symbol: "<CONF>", level: "danger", confidence: "<5>", expectedScore: 1, outcomeScore: 0, calibrationError: 1, counterfactualSummary: "<counter>" }],
  },
  invalidationExecution: {
    summary: "<invalid>",
    items: [{ symbol: "<INV>", entryDay: 0, breachDay: 1, responseDay: 2, level: "danger", status: "<fail>", riskLimitPct: -1, stopPrice: 1, breachPrice: 1, actionLabel: "<sell>", detail: "<inv-detail>", invalidation: "<rule>" }],
  },
  profitPlanReview: {
    summary: "<profit>",
    items: [{ symbol: "<PROFIT>", entryDay: 0, triggerDay: 1, responseDay: 2, level: "danger", status: "<fail>", triggerPct: 1, triggerHigh: 1, favorablePct: 1, actionLabel: "<trim>", detail: "<profit-detail>", profitPlan: "<plan>" }],
  },
  checkpointReview: {
    summary: "<checkpoint>",
    logs: [{ symbol: "<CHK>", day: 0, bias: "<bias>", action: "<action>", riskChanged: false, note: "<note>" }],
  },
});
assert(!escapedPositionDisciplineHtml.includes("<position>"));
assert(escapedPositionDisciplineHtml.includes("&lt;position&gt;"));
assert(escapedPositionDisciplineHtml.includes("&quot;ETF&quot;"));
assert(escapedPositionDisciplineHtml.includes("&lt;trigger&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;CONF&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;counter&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;INV&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;sell&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;PROFIT&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;plan&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;CHK&gt;"));
assert(escapedPositionDisciplineHtml.includes("&lt;note&gt;"));

const outcomeAuditHtml = ui.renderOutcomeAuditSection({
  rootCauseMatrix: {
    summary: "主要问题来自仓位和证据。",
    items: [{
      level: "danger",
      label: "仓位风控",
      severityScore: 88,
      focus: "单次买入过大。",
      drivers: [{ evidence: "买入金额超过计划。" }],
      nextAction: "下一轮单笔不超过 10%。",
    }],
  },
  signalCalibration: {
    items: [{
      day: 3,
      date: "2020-03-04",
      outlook: "bullish",
      forwardReturnPct: -6,
      plan: "等待回踩后再买。",
      verdict: { level: "danger", text: "判断方向和后续走势相反。" },
    }],
  },
  tradeLedger: {
    summary: {
      realizedPnl: -120,
      unrealizedPnl: 45,
      frictionCost: 6,
      liquidityImpactCost: 4,
      closedTrades: 1,
      winRatePct: 0,
    },
    closedLots: [{
      symbol: "ETF-A",
      buyDay: 1,
      sellDay: 5,
      holdingDays: 4,
      quantity: 3,
      buyPrice: 100,
      sellPrice: 96,
      pnl: -12,
      returnPct: -4,
    }],
    openLots: [{
      symbol: "STOCK-B",
      quantity: 2,
      unrealizedPnl: 45,
      returnPct: 9,
    }],
  },
  pnlAttribution: {
    summary: "亏损主要来自 ETF-A。",
    rows: [{
      symbol: "ETF-A",
      assetType: "ETF",
      level: "danger",
      contributionPct: -80,
      totalPnl: -120,
      realizedPnl: -120,
      unrealizedPnl: 0,
      frictionCost: 6,
      tradedValue: 600,
      winRatePct: 0,
    }],
  },
  decisionAudit: [{
    day: 2,
    side: "buy",
    symbol: "ETF-A",
    coachScore: 68,
    confidence: 4,
    verdict: { level: "danger", text: "买入太早。" },
    windowLabel: "后 5 天",
    marketMovePct: -4,
    favorablePct: 1,
    adversePct: -7,
    counterfactual: {
      summary: "观望表现更好。",
      alternatives: [
        { id: "actual", label: "实际", returnPct: -4 },
        { id: "cash", label: "现金", returnPct: 0 },
      ],
    },
  }],
}, {
  formatPercent,
  formatPlainPercent,
  formatCurrency,
  formatNumber,
  displayDay,
  decisionLabel: (side) => ({ buy: "买入" })[side] || side,
  confidenceLabel: (confidence) => `${confidence} 级信心`,
  outlookLabel: (outlook) => ({ bullish: "看多" })[outlook] || outlook,
});
assert(outcomeAuditHtml.includes("错误根因拆解"));
assert(outcomeAuditHtml.includes("主要问题来自仓位和证据。"));
assert(outcomeAuditHtml.includes("仓位风控"));
assert(outcomeAuditHtml.includes("严重度 88/100"));
assert(outcomeAuditHtml.includes("买入金额超过计划。"));
assert(outcomeAuditHtml.includes("关键节点校准"));
assert(outcomeAuditHtml.includes("第 4 天 · 2020-03-04 · 看多"));
assert(outcomeAuditHtml.includes("判断方向和后续走势相反。"));
assert(outcomeAuditHtml.includes("交易闭环账本"));
assert(outcomeAuditHtml.includes("已实现盈亏"));
assert(outcomeAuditHtml.includes("$-120.00"));
assert(outcomeAuditHtml.includes("ETF-A · 第 2 天买入 / 第 6 天卖出"));
assert(outcomeAuditHtml.includes("未平仓风险"));
assert(outcomeAuditHtml.includes("STOCK-B 2.00 股"));
assert(outcomeAuditHtml.includes("盈亏归因"));
assert(outcomeAuditHtml.includes("亏损主要来自 ETF-A。"));
assert(outcomeAuditHtml.includes("ETF-A · ETF"));
assert(outcomeAuditHtml.includes("逐笔决策审计"));
assert(outcomeAuditHtml.includes("第 3 天 · 买入 · ETF-A"));
assert(outcomeAuditHtml.includes("教练 68/100"));
assert(outcomeAuditHtml.includes("4 级信心"));
assert(outcomeAuditHtml.includes("观望表现更好。"));
assert(outcomeAuditHtml.includes("实际 -4.0%"));

const emptyOutcomeAuditHtml = ui.renderOutcomeAuditSection({
  rootCauseMatrix: { items: [] },
  signalCalibration: { items: [] },
  tradeLedger: { summary: {}, closedLots: [], openLots: [] },
  pnlAttribution: { rows: [] },
  decisionAudit: [],
});
assert(emptyOutcomeAuditHtml.includes("暂无错误根因拆解。"));
assert(emptyOutcomeAuditHtml.includes("本轮没有足够根因样本。"));
assert(emptyOutcomeAuditHtml.includes("本轮没有保存关键节点判断。"));
assert(emptyOutcomeAuditHtml.includes("还没有平仓交易。"));
assert(emptyOutcomeAuditHtml.includes("暂无盈亏归因。"));
assert(emptyOutcomeAuditHtml.includes("本轮没有可归因的交易或持仓。"));
assert(emptyOutcomeAuditHtml.includes("没有决策记录可审计。"));

const escapedOutcomeAuditHtml = ui.renderOutcomeAuditSection({
  rootCauseMatrix: {
    summary: "<root>",
    items: [{ level: "\"bad\"", label: "<label>", severityScore: 1, focus: "<focus>", drivers: [{ evidence: "<evidence>" }], nextAction: "<next>" }],
  },
  signalCalibration: {
    items: [{ day: 0, date: "<date>", outlook: "<outlook>", forwardReturnPct: 1, plan: "<plan>", verdict: { level: "danger", text: "<verdict>" } }],
  },
  tradeLedger: {
    summary: { realizedPnl: 1, unrealizedPnl: 1, frictionCost: 1, liquidityImpactCost: 1, closedTrades: 1, winRatePct: 1 },
    closedLots: [{ symbol: "<LOT>", buyDay: 0, sellDay: 1, holdingDays: 1, quantity: 1, buyPrice: 1, sellPrice: 1, pnl: 1, returnPct: 1 }],
    openLots: [{ symbol: "<OPEN>", quantity: 1, unrealizedPnl: 1, returnPct: 1 }],
  },
  pnlAttribution: {
    summary: "<pnl>",
    rows: [{ symbol: "<PNL>", assetType: "<ETF>", level: "danger", contributionPct: 1, totalPnl: 1, realizedPnl: 1, unrealizedPnl: 1, frictionCost: 1, tradedValue: 1, winRatePct: 1 }],
  },
  decisionAudit: [{
    day: 0,
    side: "<buy>",
    symbol: "<AUDIT>",
    coachScore: 1,
    confidence: "<conf>",
    verdict: { level: "danger", text: "<audit-verdict>" },
    windowLabel: "<window>",
    marketMovePct: 1,
    favorablePct: 1,
    adversePct: 1,
    counterfactual: { summary: "<counter>", alternatives: [{ id: "actual", label: "<actual>", returnPct: 1 }] },
  }],
});
assert(!escapedOutcomeAuditHtml.includes("<root>"));
assert(escapedOutcomeAuditHtml.includes("&lt;root&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;label&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;evidence&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;date&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;plan&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;LOT&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;OPEN&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;PNL&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;ETF&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;AUDIT&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;audit-verdict&gt;"));
assert(escapedOutcomeAuditHtml.includes("&lt;actual&gt;"));

const reviewActionHtml = ui.renderReviewActionSection({
  remediation: {
    title: "补练仓位控制",
    nextCaseId: "case-002",
    nextCaseTitle: "匿名回撤训练",
    primaryIssue: "仓位过大",
    reason: "本轮最大问题是单笔风险过高。",
    constraint: "第一笔不超过 10%。",
    checklist: ["先观望一次", "写清失效条件"],
    passCriteria: ["纪律分 >= 80", "保存复盘反思"],
  },
  benchmarks: [{
    name: "买入持有 ETF",
    description: "从第一天持有到结束。",
    returnPct: 3.2,
  }],
  summary: "本轮盈利但过程风险过高。",
  diagnostics: [{
    severity: "danger",
    title: "追涨",
    evidence: "高波动日追入。",
    lesson: "等待回撤确认。",
  }],
  flags: ["仓位过大", "证据不足"],
}, {
  lessons: ["ETF 也会回撤", "先控制仓位"],
}, {
  win: "坚持写计划",
  mistake: "买太急",
  nextRule: "先等一天",
  savedAt: "2026-06-14T12:00:00.000Z",
}, {
  formatPercent,
  severityLabel: (severity) => ({ danger: "危险" })[severity] || severity,
  formatDateTime: () => "2026/6/14 12:00",
});
assert(reviewActionHtml.includes("复盘反思"));
assert(reviewActionHtml.includes("reflectionWinInput"));
assert(reviewActionHtml.includes("坚持写计划"));
assert(reviewActionHtml.includes("买太急"));
assert(reviewActionHtml.includes("先等一天"));
assert(reviewActionHtml.includes("data-save-reflection"));
assert(reviewActionHtml.includes("已保存：2026/6/14 12:00"));
assert(reviewActionHtml.includes("补练处方"));
assert(reviewActionHtml.includes("补练仓位控制"));
assert(reviewActionHtml.includes("下一轮：case-002 · 匿名回撤训练"));
assert(reviewActionHtml.includes("仓位过大"));
assert(reviewActionHtml.includes("先观望一次"));
assert(reviewActionHtml.includes("纪律分 &gt;= 80"));
assert(reviewActionHtml.includes("data-start-remediation=\"review\""));
assert(reviewActionHtml.includes("基准对比"));
assert(reviewActionHtml.includes("买入持有 ETF"));
assert(reviewActionHtml.includes("+3.2%"));
assert(reviewActionHtml.includes("系统判断"));
assert(reviewActionHtml.includes("本轮盈利但过程风险过高。"));
assert(reviewActionHtml.includes("高级诊断"));
assert(reviewActionHtml.includes("追涨"));
assert(reviewActionHtml.includes("危险"));
assert(reviewActionHtml.includes("本案例课程"));
assert(reviewActionHtml.includes("ETF 也会回撤"));

const emptyReviewActionHtml = ui.renderReviewActionSection({}, {}, {}, { formatPercent });
assert(emptyReviewActionHtml.includes("还未保存反思"));
assert(emptyReviewActionHtml.includes("暂无补练处方"));
assert(emptyReviewActionHtml.includes("待选择"));
assert(emptyReviewActionHtml.includes("完成下一轮训练并保存复盘。"));
assert(emptyReviewActionHtml.includes("暂无基准"));
assert(emptyReviewActionHtml.includes("暂无系统判断。"));
assert(emptyReviewActionHtml.includes("没有触发高级诊断"));
assert(emptyReviewActionHtml.includes("没有明显纪律问题"));
assert(emptyReviewActionHtml.includes("本案例没有额外课程记录。"));

const escapedReviewActionHtml = ui.renderReviewActionSection({
  remediation: {
    title: "<title>",
    nextCaseId: "<id>",
    nextCaseTitle: "<next>",
    primaryIssue: "<issue>",
    reason: "<reason>",
    constraint: "<constraint>",
    checklist: ["<check>"],
    passCriteria: ["<pass>"],
  },
  benchmarks: [{ name: "<bench>", description: "<desc>", returnPct: 1 }],
  summary: "<summary>",
  diagnostics: [{ severity: "\"bad\"", title: "<diag>", evidence: "<evidence>", lesson: "<lesson>" }],
  flags: ["<flag>"],
}, {
  lessons: ["<lesson-item>"],
}, {
  win: "<win>",
  mistake: "<mistake>",
  nextRule: "<rule>",
});
assert(!escapedReviewActionHtml.includes("<title>"));
assert(escapedReviewActionHtml.includes("&lt;title&gt;"));
assert(escapedReviewActionHtml.includes("&lt;id&gt;"));
assert(escapedReviewActionHtml.includes("&lt;check&gt;"));
assert(escapedReviewActionHtml.includes("&lt;bench&gt;"));
assert(escapedReviewActionHtml.includes("&lt;summary&gt;"));
assert(escapedReviewActionHtml.includes("&lt;diag&gt;"));
assert(escapedReviewActionHtml.includes("&lt;flag&gt;"));
assert(escapedReviewActionHtml.includes("&lt;lesson-item&gt;"));
assert(escapedReviewActionHtml.includes("&lt;win&gt;"));
assert(escapedReviewActionHtml.includes("&lt;mistake&gt;"));
assert(escapedReviewActionHtml.includes("&lt;rule&gt;"));
