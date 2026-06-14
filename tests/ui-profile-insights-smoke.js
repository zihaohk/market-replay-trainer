const assert = require("node:assert/strict");

const ui = require("../ui/profile-insights.js");

const trendHtml = ui.renderTrainingTrendCard({
  level: "good",
  title: "最近 3 轮改善",
  summary: "纪律和复盘闭环正在变好。",
  rows: [
    { level: "good", label: "纪律", deltaLabel: "+8", detail: "最近更少追高。" },
    { level: "warn", label: "下单", deltaLabel: "-1", detail: "样本仍少。" },
  ],
});
assert(trendHtml.includes("训练趋势"));
assert(trendHtml.includes("最近 3 轮改善"));
assert(trendHtml.includes("is-good"));
assert(trendHtml.includes("+8"));

const radarHtml = ui.renderSkillRadarCard([
  { level: "danger", label: "风险控制", score: 58.4, detail: "仓位仍偏大。" },
  { level: "good", label: "课程理解", score: 105, detail: "检查题稳定通过。" },
]);
assert(radarHtml.includes("能力雷达"));
assert(radarHtml.includes("风险控制"));
assert(radarHtml.includes("58/100"));
assert(radarHtml.includes("width: 100%"));

const queue = [
  {
    caseId: "A-01",
    caseTitle: "Foundation",
    title: "补风险控制",
    priority: "high",
    focus: "风险控制",
    reason: "你最近仓位过大。",
    constraint: "第一笔只能试探仓。",
    passCriteria: ["纪律达到 80/100", "至少一次观望"],
  },
];
const queueHtml = ui.renderTrainingQueueCard(queue);
assert(queueHtml.includes("弱项自动排课"));
assert(queueHtml.includes("补风险控制"));
assert(queueHtml.includes("data-start-plan-case=\"A-01\""));
assert(queueHtml.includes("高优先级"));
assert(queueHtml.includes("第一笔只能试探仓"));

const hiddenQueueHtml = ui.renderTrainingQueueCard(queue, {
  hideMeta: true,
  displayCaseId: () => "匿名训练包 01",
});
assert(hiddenQueueHtml.includes("匿名训练任务"));
assert(hiddenQueueHtml.includes("匿名训练包 01"));
assert(hiddenQueueHtml.includes("强盲测"));
assert(!hiddenQueueHtml.includes("Foundation"));
assert(!hiddenQueueHtml.includes("你最近仓位过大"));

const escapedQueueHtml = ui.renderTrainingQueueCard([{
  ...queue[0],
  title: "<script>alert(1)</script>",
  focus: "\"quoted\"",
}]);
assert(!escapedQueueHtml.includes("<script>"));
assert(escapedQueueHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedQueueHtml.includes("&quot;quoted&quot;"));

const sampleHtml = ui.renderSampleQualityCard({
  summary: "有效样本仍少。",
  validBlindRuns: 2,
  randomBlindRuns: 3,
  practiceRuns: 5,
  corruptedBlindRuns: 1,
  averageValidDiscipline: 78.6,
  rows: [{ level: "warn", label: "有效盲测", value: "2 轮", detail: "先补随机盲测。" }],
}, { runCount: 8 });
assert(sampleHtml.includes("样本质量"));
assert(sampleHtml.includes("有效盲测 2/8"));
assert(sampleHtml.includes("失真盲测 1"));
assert(sampleHtml.includes("有效均分 79/100"));

const examHtml = ui.renderExamPerformanceCard({
  summary: "考试稳定性不足。",
  validRuns: 4,
  passedRuns: 2,
  averageComposite: 74.2,
  passRate: 50,
  level: "danger",
  rows: [{ level: "danger", label: "考试回撤", value: "-12", detail: "最近退步。" }],
}, {
  formatPlainPercent: (value) => `${value.toFixed(0)}%`,
  examLevelLabel: () => "未达稳定",
});
assert(examHtml.includes("真实考试成绩"));
assert(examHtml.includes("考试均分 74/100"));
assert(examHtml.includes("通过率 50%"));
assert(examHtml.includes("未达稳定"));

const coverageHtml = ui.renderScenarioCoverageCard({
  summary: "场景覆盖偏科。",
  level: "danger",
  averageScore: 61,
  coveredDimensions: 4,
  totalDimensions: 10,
  weakest: { label: "宏观利率" },
  rows: [{ level: "danger", label: "宏观利率", score: 20, detail: "还没练够。" }],
}, {
  coverageLevelLabel: () => "明显偏科",
});
assert(coverageHtml.includes("市场场景覆盖"));
assert(coverageHtml.includes("明显偏科"));
assert(coverageHtml.includes("平均覆盖 61/100"));
assert(coverageHtml.includes("最弱：宏观利率"));

const readinessHtml = ui.renderLiveReadinessCard({
  summary: "继续模拟。",
  level: "warn",
  statusLabel: "谨慎模拟",
  score: 69,
  blockers: ["有效盲测不足"],
  stage: "继续训练",
  gate: {
    summary: "硬性门槛还有 1 项未过：有效随机盲测。",
    rows: [
      { status: "fail", label: "有效随机盲测", detail: "要求至少 20 轮，目前 1 轮。" },
      { status: "pass", label: "风险控制", detail: "已达标。" },
    ],
  },
  rows: [{ level: "warn", label: "样本", score: 50, detail: "样本少。" }],
});
assert(readinessHtml.includes("实盘前准备度"));
assert(readinessHtml.includes("准备度 69/100"));
assert(readinessHtml.includes("硬性缺口 1"));
assert(readinessHtml.includes("建议阶段：继续训练"));
assert(readinessHtml.includes("硬门槛：1 项未过"));
assert(readinessHtml.includes("要求至少 20 轮"));

const escapedReadinessHtml = ui.renderLiveReadinessCard({
  summary: "<script>alert(1)</script>",
  stage: "\"stage\"",
  gate: {
    summary: "<script>alert(1)</script>",
    rows: [{ status: "fail", label: "<script>alert(1)</script>", detail: "<script>alert(1)</script>" }],
  },
});
assert(!escapedReadinessHtml.includes("<script>"));
assert(escapedReadinessHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedReadinessHtml.includes("&quot;stage&quot;"));

const reflectionHtml = ui.renderReflectionCard(
  { nextRule: "下一轮必须先观望一次" },
  { reflectedCount: 3, runCount: 5 },
);
assert(reflectionHtml.includes("最近反思"));
assert(reflectionHtml.includes("下一轮必须先观望一次"));
assert(reflectionHtml.includes("已保存 3/5 次"));

const rulebookHtml = ui.renderRulebookCard([
  {
    id: "rule-1",
    text: "第一笔只能试探仓",
    tags: ["hold-first", "position-limit"],
    active: true,
    sourceCaseId: "A-01",
    timesSeen: 2,
  },
  {
    id: "rule-2",
    text: "暂停规则",
    tags: ["risk"],
    active: false,
    sourceCaseId: "B-02",
  },
], {
  ruleTagLabel: (tag) => ({ "hold-first": "先观望", "position-limit": "仓位限制", risk: "风险" })[tag] || tag,
});
assert(rulebookHtml.includes("个人纪律规则库"));
assert(rulebookHtml.includes("当前启用 1 条规则"));
assert(rulebookHtml.includes("data-toggle-rule-id=\"rule-1\""));
assert(rulebookHtml.includes("暂停规则"));
assert(rulebookHtml.includes("is-paused"));

const escapedRulebookHtml = ui.renderRulebookCard([{
  id: "rule-&",
  text: "<script>alert(1)</script>",
  tags: ["<bad>"],
  sourceCaseId: "\"case\"",
}]);
assert(!escapedRulebookHtml.includes("<script>"));
assert(escapedRulebookHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedRulebookHtml.includes("data-toggle-rule-id=\"rule-&amp;\""));
assert(escapedRulebookHtml.includes("&quot;case&quot;"));

const remediationHtml = ui.renderRemediationCard({
  title: "补仓位纪律",
  nextCaseId: "A-01",
  nextCaseTitle: "Foundation",
  constraint: "第一笔只能小仓。",
});
assert(remediationHtml.includes("最新补练处方"));
assert(remediationHtml.includes("补仓位纪律"));
assert(remediationHtml.includes("data-start-remediation=\"profile\""));

const hiddenRemediationHtml = ui.renderRemediationCard({
  title: "真实弱项",
  nextCaseId: "C-03",
  nextCaseTitle: "Meta",
  constraint: "真实处方",
}, { hideMeta: true });
assert(hiddenRemediationHtml.includes("考试模式隐藏补练标题"));
assert(!hiddenRemediationHtml.includes("Meta"));
assert(!hiddenRemediationHtml.includes("真实处方"));

const recommendationHtml = ui.renderProfileRecommendationCard("下一轮补随机盲测。");
assert(recommendationHtml.includes("下一步建议"));
assert(recommendationHtml.includes("下一轮补随机盲测。"));

const hiddenRecommendationHtml = ui.renderProfileRecommendationCard("真实建议", { hideMeta: true });
assert(hiddenRecommendationHtml.includes("考试模式隐藏具体案例建议"));
assert(!hiddenRecommendationHtml.includes("真实建议"));
