const assert = require("node:assert/strict");

const review = require("../core/review.js");

const decisions = [
  {
    day: 1,
    side: "buy",
    symbol: "AAA",
    confidence: 2,
    evidenceSources: ["price"],
    liquidity: { level: "warn", volumeSharePct: 0.8, dollarVolumeSharePct: 0.9, impactBps: 8, impactCost: 2, dayVolume: 1000 },
    coach: { score: 80, level: "warn", issues: [{ title: "仓位偏大" }] },
  },
  {
    day: 2,
    side: "buy",
    symbol: "BBB",
    confidence: 5,
    evidenceSources: ["price", "risk"],
    liquidity: { level: "danger", volumeSharePct: 3, dollarVolumeSharePct: 3.2, impactBps: 55, impactCost: 5, dayVolume: 200 },
    coach: { score: 60, level: "danger", issues: [{ title: "仓位偏大" }, { title: "证据不足" }] },
  },
  {
    day: 3,
    side: "hold",
    symbol: "AAA",
    confidence: 3,
    evidenceSources: [],
  },
  {
    day: 4,
    side: "sell",
    symbol: "AAA",
    quantity: 1,
    orderType: "limit",
    limitPrice: 12,
    price: 12.1,
    orderSubmittedDay: 4,
    evidenceSources: ["price", "relative", "risk"],
  },
];

const coach = review.buildCoachStats(decisions);
assert.equal(coach.sampleCount, 2);
assert.equal(coach.averageScore, 70);
assert.equal(coach.dangerCount, 1);
assert.deepEqual(coach.topIssues[0], ["仓位偏大", 2]);

const evidence = review.buildEvidenceSourceReview(decisions);
assert.equal(evidence.sampleCount, 4);
assert.equal(evidence.missingSourceCount, 1);
assert.equal(evidence.singleSourceCount, 1);
assert.equal(evidence.highConfidenceThinCount, 1);
assert.equal(evidence.level, "danger");
assert(evidence.sourceCounts.some(([label, count]) => label === "价格/趋势" && count === 3));

const liquidity = review.buildLiquidityReview(decisions);
assert.equal(liquidity.sampleCount, 3);
assert.equal(liquidity.dangerCount, 1);
assert.equal(liquidity.warnCount, 1);
assert.equal(liquidity.totalImpactCost, 7);
assert.equal(liquidity.level, "danger");

const execution = review.buildOrderExecutionReview({
  revealed: true,
  displayDay: (day) => day + 1,
  pendingOrders: [
    { id: "filled", status: "filled", createdDay: 1, closedDay: 2, symbol: "AAA", side: "buy", quantity: 1, limitPrice: 10, fillPrice: 9.9 },
    { id: "active", status: "active", createdDay: 2, symbol: "AAA", side: "buy", quantity: 1, limitPrice: 9 },
    { id: "expired", status: "expired", createdDay: 3, closedDay: 6, symbol: "BBB", side: "sell", quantity: 2, limitPrice: 30 },
    { id: "canceled", status: "canceled", createdDay: 4, closedDay: 4, symbol: "CCC", side: "buy", quantity: 3, limitPrice: 8, cancelReason: "风险变化" },
  ],
  decisions,
});
assert.equal(execution.submittedCount, 5);
assert.equal(execution.filledCount, 2);
assert.equal(execution.activeCount, 1);
assert.equal(execution.expiredCount, 1);
assert.equal(execution.canceledCount, 1);
assert.equal(execution.score, 52);
assert.equal(execution.level, "danger");
assert(execution.rows.some((row) => row.detail.includes("限价单提交时已可成交")));

assert.equal(review.classifyMistake("连续向下补仓导致仓位失控"), "补仓失控");
assert.equal(review.classifyMistake("下单前质量红色提醒没有处理"), "下单质量低");
assert.deepEqual(review.extractCaseIdsFromText("补练 A-01，再练 S-12 和 A-01"), ["A-01", "S-12"]);

const remediationRules = {
  "缺少观望": {
    title: "训练主动观望",
    caseIds: ["A-01", "S-11"],
    constraint: "下一轮第一天不允许买入。",
    checklist: ["先记录观望。"],
  },
  "下单质量低": {
    title: "清零红色提醒",
    caseIds: ["S-12"],
    constraint: "不能带红色提醒提交。",
    checklist: ["先处理红色提醒。"],
  },
  "计划不清": {
    title: "强化交易计划",
    caseIds: ["A-01"],
    constraint: "写清计划。",
    checklist: ["先选操作目的。"],
  },
};

const remediation = review.buildRemediationPlan({
  selectedCase: { id: "A-01" },
  flags: ["交易频率偏高"],
  diagnostics: [{ type: "averaging-down" }],
  mission: { passed: false, stats: { holdCount: 0 }, plan: { rules: { minHolds: 1 }, drill: "补练 S-11" } },
  coachStats: { sampleCount: 2, averageScore: 72, topIssues: [["仓位偏大", 2]] },
  remediationRules,
  cases: [{ id: "A-01", maskedTitle: "急跌训练" }, { id: "S-11", maskedTitle: "追高训练" }, { id: "S-12", maskedTitle: "慢跌训练" }],
});
assert.equal(remediation.primaryIssue, "下单质量低");
assert.equal(remediation.nextCaseId, "S-12");
assert.equal(remediation.title, "清零红色提醒");
assert(remediation.reason.includes("主要问题"));

const holdRemediation = review.buildRemediationPlan({
  selectedCase: { id: "A-01" },
  flags: ["交易频率偏高"],
  diagnostics: [],
  mission: { passed: false, stats: { holdCount: 0 }, plan: { rules: { minHolds: 1 }, drill: "补练 S-11" } },
  coachStats: { sampleCount: 2, averageScore: 82, topIssues: [] },
  remediationRules,
  cases: [{ id: "A-01", maskedTitle: "急跌训练" }, { id: "S-11", maskedTitle: "追高训练" }, { id: "S-12", maskedTitle: "慢跌训练" }],
});
assert.equal(holdRemediation.primaryIssue, "缺少观望");
assert.equal(holdRemediation.nextCaseId, "S-11");
assert.equal(holdRemediation.title, "训练主动观望");

const coachRemediation = review.buildRemediationPlan({
  selectedCase: { id: "A-01" },
  flags: [],
  diagnostics: [],
  mission: { passed: true, stats: { holdCount: 2 }, plan: { rules: { minHolds: 1 }, drill: "" } },
  coachStats: { sampleCount: 2, averageScore: 70, topIssues: [] },
  remediationRules,
  cases: [{ id: "A-01", maskedTitle: "急跌训练" }, { id: "S-12", maskedTitle: "慢跌训练" }],
});
assert.equal(coachRemediation.primaryIssue, "下单质量低");
assert.equal(coachRemediation.nextCaseTitle, "慢跌训练");

const rootCause = review.buildRootCauseMatrix({
  mission: { passed: true, score: 88 },
  coachStats: { dangerCount: 0, topIssues: [] },
  writingQuality: { sampleCount: 2, averageScore: 82 },
  evidenceSourceReview: { score: 90 },
  liquidityReview: { dangerCount: 0, warnCount: 0 },
  orderExecutionReview: { expiredCount: 0 },
  corporateActionReview: { missedCount: 0, score: 100 },
  gapRiskReview: { gapTradeCount: 0, dangerGapCount: 0 },
  eventRiskReview: { dangerEventTradeCount: 0, largeEventTradeCount: 0 },
  blindIntegrityReview: { active: true, score: 95, dangerCount: 0 },
  contractStatus: { passed: true, score: 86, contract: { saved: true } },
  allocationStatus: { passed: true, score: 84 },
  thesisQuality: { score: 82, thesis: { saved: true } },
  lessonGate: { passed: true },
  diagnostics: [{ type: "ignored-risk-limit" }],
  flags: ["仓位过度集中"],
  revealReadiness: { score: 92 },
  signalCalibration: { items: [] },
  newsCalibration: { score: 80, missedImportant: 0 },
  confidenceCalibration: { score: 78, overconfidenceCount: 0 },
  invalidationExecution: { failedCount: 1 },
  profitPlanReview: { failedCount: 0 },
  positionTriggerReview: { failedCount: 0, triggerCount: 0, score: 100 },
  checkpointReview: { sampleCount: 1, missingAfterTrade: 0, stalePlanCount: 0, unresolvedDeterioration: 0 },
  riskCoolingReview: { active: true, forbiddenBuyCount: 2, defensiveActionCount: 0 },
  decisions: [{ side: "buy", emotion: "calm" }],
  currentDay: 8,
  keyDays: [2, 5, 8],
  signalForecasts: { 2: { direction: "down" }, 5: { direction: "flat" }, 8: { direction: "up" } },
  caseLength: 20,
  reflectionSaved: true,
});
assert.equal(rootCause.primary.key, "risk");
assert.equal(rootCause.primary.label, "仓位与风控");
assert(rootCause.primary.severityScore >= 70);
assert(rootCause.summary.includes("仓位与风控"));
assert(rootCause.items.some((item) => item.key === "review-loop" && item.level === "good"));

const rootCheck = review.rootCauseCheck(true, Number.NaN, "证据", "动作");
assert.equal(rootCheck.penalty, 0);

const profileRuns = [
  {
    id: "r1",
    caseId: "A-01",
    title: "Foundation",
    completedAt: "2026-01-01T00:00:00Z",
    disciplineScore: 88,
    missionScore: 86,
    missionPassed: true,
    averageCoachScore: 84,
    contractScore: 82,
    writingQualityScore: 80,
    evidenceSourceScore: 82,
    maxDrawdown: 4,
    maxConcentrationPct: 25,
    returnPct: 2,
    rootCausePrimary: "执行纪律",
    rootCauseItems: [{ label: "执行纪律", level: "warn", severityScore: 18, nextAction: "write invalidation first" }],
    activeTrainingPlanFocus: "追高",
    activeTrainingPlanLaunchMode: "mistake-drill",
    activeTrainingPlanPassed: true,
  },
  {
    id: "r2",
    caseId: "S-11",
    title: "Sentiment",
    completedAt: "2026-01-02T00:00:00Z",
    flags: ["追高"],
    disciplineScore: 58,
    missionScore: 55,
    missionPassed: false,
    averageCoachScore: 60,
    maxDrawdown: 14,
    maxConcentrationPct: 55,
    coachDangerCount: 2,
    rootCausePrimary: "情绪控制",
    rootCauseItems: [{ label: "情绪控制", level: "danger", severityScore: 30, nextAction: "reduce FOMO risk" }],
    activeTrainingPlanFocus: "追高",
    activeTrainingPlanLaunchMode: "mistake-drill",
    activeTrainingPlanPassed: false,
  },
  {
    id: "r3",
    caseId: "S-12",
    title: "Blind",
    completedAt: "2026-01-05T00:00:00Z",
    disciplineScore: 78,
    missionScore: 82,
    missionPassed: true,
    averageCoachScore: 80,
    blindIntegrityActive: true,
    blindIntegrityRandom: true,
    blindIntegrityScore: 92,
    blindIntegrityDangerCount: 0,
    activeTrainingPlanResult: { focus: "随机盲测", launchMode: "random-blind", passed: true },
  },
];

const profileOptions = {
  cases: [{ id: "A-01" }, { id: "S-11" }, { id: "S-12" }],
  fallbackCaseId: "A-01",
  remediationRules: {
    "追高": {
      title: "追高补练",
      caseIds: ["S-11"],
      constraint: "大涨后只能小仓试探。",
      checklist: ["先写失败条件。"],
    },
  },
  getCaseTitle: (caseId) => `Case ${caseId}`,
  getCaseLabel: (caseId) => `${caseId} · Case ${caseId}`,
};

const planAdherence = review.buildPlanAdherenceReport(profileRuns, profileOptions);
assert.equal(planAdherence.plannedRuns, 3);
assert.equal(planAdherence.mistakeDrillRuns, 2);
assert(planAdherence.focusRows.some((row) => row.label === "追高" && row.count === 2));
assert(planAdherence.summary.includes("计划训练"));

const notebook = review.buildMistakeNotebookReport(profileRuns, { "追高": 2 }, profileOptions);
assert(notebook.cards.some((card) => card.label === "追高" && card.constraint.includes("大涨")));
assert(notebook.cards.some((card) => card.label === "情绪控制" && card.nextAction.includes("reduce")));
assert(notebook.summary.includes("错题本"));

const schedule = review.buildReviewScheduleReport(profileRuns, new Date("2026-01-06T00:00:00Z"), { "追高": 2 }, profileOptions);
assert(schedule.dueNowCount >= 1);
assert(schedule.rows.some((row) => row.type === "case" && row.focus));
assert(schedule.rows.some((row) => row.type === "mistake" && row.launchCaseId === "S-11"));
assert(schedule.summary.includes("复训"));
assert.equal(review.reviewScheduleTypeLabel("mistake"), "错题复训");
assert.equal(review.reviewDueLabel(0), "今天到期");
assert(review.trainingRunQualityScore(profileRuns[1]) < review.trainingRunQualityScore(profileRuns[0]));
assert.equal(review.trainingRunPrimaryIssue(profileRuns[2]), "暂无单一严重问题");
assert(review.isValidBlindRun(profileRuns[2]));

const ledger = review.buildTrainingLedgerReport(profileRuns, profileOptions);
assert.equal(ledger.totalRuns, 3);
assert(ledger.weakCount >= 1);
assert(ledger.weakRows.some((row) => row.caseId === "S-11"));
assert(ledger.summary.includes("账本"));
assert.equal(review.ledgerLevelLabel("danger"), "需复盘");

const sampleQuality = review.buildSampleQualityReport(profileRuns, {
  formatPlainPercent: (value) => `${value.toFixed(1)}%`,
  formatSignedPercent: (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
});
assert.equal(sampleQuality.totalRuns, 3);
assert.equal(sampleQuality.randomBlindRuns, 1);
assert.equal(sampleQuality.validBlindRuns, 1);
assert(sampleQuality.rows.some((row) => row.label === "真实考试样本"));
assert(sampleQuality.summary.includes("随机盲测"));

const exam = review.buildValidBlindExamReport(profileRuns, {
  formatPlainPercent: (value) => `${value.toFixed(1)}%`,
  formatSignedPercent: (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
});
assert.equal(exam.validRuns, 1);
assert(Number.isFinite(exam.latestScore));
assert.equal(exam.passedRuns, 0);
assert(exam.rows.some((row) => row.label === "考试均分"));
assert.equal(review.examLevelLabel("danger"), "未达稳定");
assert(Number.isFinite(review.validBlindCompositeScore(profileRuns[2])));
assert.equal(review.isPassingValidBlindExam(profileRuns[2]), false);

const coverageRuns = [
  ...profileRuns,
  {
    id: "r4",
    caseId: "C-03",
    completedAt: "2026-01-07T00:00:00Z",
    disciplineScore: 82,
    missionScore: 84,
    missionPassed: true,
    averageCoachScore: 81,
    lessonPassed: true,
  },
  {
    id: "r5",
    caseId: "G-07",
    completedAt: "2026-01-09T00:00:00Z",
    disciplineScore: 76,
    missionScore: 80,
    missionPassed: true,
    averageCoachScore: 78,
    blindIntegrityActive: true,
    blindIntegrityRandom: true,
    blindIntegrityScore: 88,
    blindIntegrityDangerCount: 0,
    reflection: { nextRule: "keep risk small" },
  },
];
const coverage = review.buildScenarioCoverageReport(coverageRuns, {
  cases: [{ id: "A-01" }, { id: "S-10" }, { id: "S-11" }, { id: "S-12" }, { id: "C-03" }, { id: "G-07" }],
  fallbackCaseId: "A-01",
  getCaseTitle: (caseId) => `Case ${caseId}`,
});
assert(coverage.rows.length >= 7);
assert(coverage.totalDimensions >= 7);
assert(coverage.weakest && coverage.weakest.nextCaseId);
assert(coverage.summary.includes("场景覆盖"));
assert.equal(review.coverageLevelLabel("danger"), "明显偏科");

const readiness = review.buildLiveReadinessReport({
  runs: coverageRuns,
  sampleQuality: review.buildSampleQualityReport(coverageRuns),
  examReport: review.buildValidBlindExamReport(coverageRuns),
  coverageReport: coverage,
  skillRadar: [{ label: "风险控制", score: 55 }],
  activeRuleCount: 2,
  options: { formatPlainPercent: (value) => `${value.toFixed(1)}%` },
});
assert(Number.isFinite(readiness.score));
assert(readiness.rows.some((row) => row.key === "coverage"));
assert(readiness.rows.some((row) => row.key === "risk" && row.score === 55));
assert(readiness.blockers.length >= 1);
assert(readiness.gate.failedCount >= 1);
assert(readiness.gateRows.some((row) => row.key === "valid-blind-sample" && row.status === "fail"));
assert(["基础训练", "模拟盘修纪律", "强盲测巩固", "小额前演练"].includes(readiness.stage));
assert.equal(review.readinessRowLevel(59), "danger");
assert.equal(review.liveReadinessStage({ level: "good", score: 90, blockers: [] }), "小额前演练");

const strongReadinessRuns = Array.from({ length: 20 }, (_, index) => ({
  caseId: ["A-01", "B-02", "C-03", "D-04", "E-05", "F-06", "G-07", "H-08", "I-09", "S-10"][index % 10],
  disciplineScore: 86 + (index % 5),
  missionScore: 86,
  missionPassed: true,
  averageCoachScore: 86,
  contractScore: 88,
  contractPassed: true,
  writingQualityScore: 86,
  maxDrawdown: 3,
  maxConcentrationPct: 24,
  settlementScore: 88,
  corporateActionScore: 90,
  blindIntegrityActive: true,
  blindIntegrityRandom: true,
  blindIntegrityScore: 96,
  blindIntegrityDangerCount: 0,
  reflection: { nextRule: `rule ${index}` },
}));
const strongReadiness = review.buildLiveReadinessReport({
  runs: strongReadinessRuns,
  sampleQuality: { validBlindRuns: 20, randomBlindRuns: 20, corruptedBlindRuns: 0 },
  examReport: { validRuns: 20, averageComposite: 88, passRate: 90, currentPassStreak: 6 },
  coverageReport: { averageScore: 88, coveredDimensions: 7, totalDimensions: 7, weakest: { label: "暂无" } },
  skillRadar: [{ label: "风险控制", score: 88 }],
  activeRuleCount: 4,
});
assert.equal(strongReadiness.gate.passed, true);
assert.equal(strongReadiness.gate.failedCount, 0);
assert.equal(strongReadiness.level, "good");
assert(strongReadiness.summary.includes("不代表任何真实买卖建议"));

const recurringIssueGate = review.buildLiveReadinessGate({
  runs: [
    { disciplineScore: 88, maxDrawdown: 3, contractPassed: true, flags: ["追高"] },
    { disciplineScore: 86, maxDrawdown: 4, contractPassed: true, flags: ["追高"] },
    { disciplineScore: 85, maxDrawdown: 4, contractPassed: true, flags: ["追高"] },
  ],
  quality: { validBlindRuns: 20, randomBlindRuns: 20, corruptedBlindRuns: 0 },
  exam: { validRuns: 20, averageComposite: 88, passRate: 90, currentPassStreak: 6 },
  coverage: { averageScore: 90 },
  rows: [
    { key: "mechanics", score: 90 },
    { key: "risk", score: 90 },
    { key: "execution", score: 90 },
  ],
  options: { liveReadinessThresholds: { recentRunCount: 3, minValidBlindRuns: 20 } },
});
assert(recurringIssueGate.rows.some((row) => row.key === "mistake-recurrence" && row.status === "fail"));

const trend = review.buildTrainingTrend([
  { disciplineScore: 90, missionScore: 88, averageCoachScore: 86, maxDrawdown: 3 },
  { disciplineScore: 88, missionScore: 86, averageCoachScore: 84, maxDrawdown: 4 },
  { disciplineScore: 86, missionScore: 84, averageCoachScore: 82, maxDrawdown: 5 },
  { disciplineScore: 74, missionScore: 70, averageCoachScore: 72, maxDrawdown: 8 },
  { disciplineScore: 70, missionScore: 68, averageCoachScore: 66, maxDrawdown: 10 },
  { disciplineScore: 68, missionScore: 64, averageCoachScore: 62, maxDrawdown: 12 },
]);
assert.equal(trend.level, "danger");
assert(trend.rows.some((row) => row.key === "maxDrawdown" && row.level === "danger"));
assert(trend.summary.includes("退步"));

const radar = review.buildSkillRadarMetrics({
  runs: coverageRuns,
  averageScore: 72,
  missionPassRate: 60,
  averageCoachScore: 75,
  lessonPassRate: 80,
  lessonFirstTryRate: 50,
  reflectionRate: 40,
  options: { formatPlainPercent: (value) => `${value.toFixed(1)}%` },
});
assert(radar.some((item) => item.label === "风险控制" && Number.isFinite(item.score)));
assert(radar.some((item) => item.label === "课程理解" && item.score < 80));
assert.equal(review.skillRadarItem("测试", 59, "detail").level, "danger");

const queue = review.buildTrainingQueue({
  runs: coverageRuns,
  topMistakes: [["追高", 3]],
  averageCoachScore: 60,
  missionPassRate: 50,
  lessonPassRate: 80,
  lessonFirstTryRate: 50,
  remediationRules: {
    ...profileOptions.remediationRules,
    "下单质量低": {
      title: "清零红色提醒",
      caseIds: ["S-12"],
      constraint: "不能带红色提醒提交。",
      checklist: ["先处理红色提醒。"],
    },
  },
  options: {
    ...profileOptions,
    recommendedCase: { id: "A-01", maskedTitle: "Foundation" },
    formatPlainPercent: (value) => `${value.toFixed(1)}%`,
  },
});
assert(queue.length >= 1 && queue.length <= 3);
assert(queue.some((item) => item.title === "清零红色提醒" || item.focus === "追高" || item.launchMode === "random-blind"));
assert(queue.every((item) => item.caseId));
assert(review.trainingQueueItemFromPath({ title: "路径", focus: "基础" }, profileOptions).caseId);
