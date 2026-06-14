const assert = require("node:assert/strict");

const ui = require("../ui/training-plan.js");

const plan = {
  title: "今日先补最危险弱项",
  summary: "A-01 · Foundation。主攻 风险控制，预计 45 分钟。",
  primary: {
    caseId: "A-01",
    caseTitle: "Foundation",
    focus: "风险控制",
    priority: "high",
  },
  weakestSkill: { label: "风险控制", score: 58 },
  estimatedMinutes: 45,
  modeSuggestion: "novice",
  highPriorityCount: 2,
  steps: [
    { title: "1. 训练前热身", detail: "先保存合约。", check: "合约保存。" },
    { title: "2. 主训练", detail: "只做小仓。", check: "红色提醒不加仓。" },
  ],
  stopRules: ["没有保存训练合约，不开始交易。"],
};

const normalHtml = ui.renderDailyTrainingPlan(plan);
assert(normalHtml.includes("今日先补最危险弱项"));
assert(normalHtml.includes("data-start-plan-case=\"A-01\""));
assert(normalHtml.includes("高优先级"));
assert(normalHtml.includes("风险控制 58/100"));

const escapedHtml = ui.renderDailyTrainingPlan({
  ...plan,
  title: "<script>alert(1)</script>",
  primary: { ...plan.primary, focus: "\"quoted\"" },
});
assert(!escapedHtml.includes("<script>"));
assert(escapedHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(escapedHtml.includes("&quot;quoted&quot;"));

const hiddenHtml = ui.renderDailyTrainingPlan(plan, {
  hideMeta: true,
  displayCaseId: () => "匿名训练包 03",
});
assert(hiddenHtml.includes("今日匿名盲测计划"));
assert(hiddenHtml.includes("匿名训练包 03"));
assert(hiddenHtml.includes("不要猜真实年份"));
assert(!hiddenHtml.includes("Foundation"));
