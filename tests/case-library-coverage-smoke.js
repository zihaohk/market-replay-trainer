const assert = require("node:assert/strict");

const coverage = require("../core/case-library-coverage.js");

const cases = [
  {
    id: "mock-etf",
    maskedTitle: "宽基 ETF 暴跌后快速反弹",
    tags: ["ETF", "系统性", "纪律"],
    mission: {
      focus: "控制核心仓风险",
      objective: "等待确认后再加仓",
    },
    assets: [{ type: "ETF", maskedSymbol: "ETF-A" }],
  },
  {
    id: "mock-mechanics",
    maskedTitle: "限价单挂起后取消",
    tags: ["限价", "取消挂单", "T+1", "结算"],
    mission: {
      focus: "理解交易机制",
      objective: "避免滑点和现金结算误判",
    },
  },
];

const report = coverage.buildCaseLibraryCoverageReport(cases);
assert.equal(coverage.caseLibraryCoverageLevelLabel("good"), "库结构均衡");
assert.equal(report.totalDimensions, coverage.dimensions.length);
assert(report.rows.some((row) => row.label === "交易机制" && row.level === "warn"));
assert(report.rows.some((row) => row.label === "ETF 系统性风险" && row.level === "danger"));

const customTextReport = coverage.buildCaseLibraryCoverageReport([{ id: "custom-text-only" }], {
  getText: () => "财报 业绩 earnings 指引 收入 利润",
});
assert(customTextReport.rows.some((row) => row.label === "财报预期差" && row.count === 1));
