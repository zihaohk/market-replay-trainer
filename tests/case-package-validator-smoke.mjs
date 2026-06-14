import assert from "node:assert/strict";
import {
  parseArgs,
  validateCasePackage,
  validateCasePackageInput,
} from "../tools/validate-case-package.mjs";

const rows = Array.from({ length: 24 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  const close = 100 + index;
  return {
    date: `2024-01-${day}`,
    open: close - 0.4,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000000 + index * 1000,
  };
});

const completePackage = {
  title: "Validator complete package",
  maskedTitle: "匿名完整案例",
  maskedBrief: "ETF 暴跌和反弹训练，包含风险主题。",
  revealTitle: "Validator complete package reveal",
  realPeriod: "2024-01-01 至 2024-01-24",
  tags: ["ETF", "流动性", "风险"],
  assets: [
    { symbol: "AAA", maskedSymbol: "PKG-A", type: "etf", sector: "market", rows },
    {
      symbol: "BBB",
      maskedSymbol: "PKG-B",
      type: "etf",
      sector: "growth",
      rows: rows.map((row) => ({
        ...row,
        open: row.open * 1.02,
        high: row.high * 1.02,
        low: row.low * 1.02,
        close: row.close * 1.02,
      })),
    },
  ],
  news: [
    { day: 0, title: "风险偏好开始下降。", category: "important" },
    { date: "2024-01-10", title: "波动扩大。", category: "important" },
  ],
  scheduledEvents: [
    { day: 5, title: "高波动窗口", type: "macro", riskLevel: "danger" },
  ],
  lessons: ["ETF 不能消除系统性风险。", "先控制仓位。", "新闻要等价格验证。"],
  learning: {
    title: "ETF 风险课程",
    concept: "系统性风险会同时影响多个 ETF。",
    rules: ["先写风险预算。", "至少一次观望。", "不追高。"],
    terms: [
      { name: "系统性风险", description: "整个市场一起下跌的风险。" },
      { name: "相对强弱", description: "比较不同资产谁更抗跌。" },
      { name: "现金缓冲", description: "留出后续调整空间。" },
    ],
    quiz: {
      question: "第一步应该做什么？",
      options: ["控制仓位", "满仓", "忽略新闻"],
      answer: 0,
      explanation: "先活下来，再谈收益。",
    },
  },
  mission: {
    focus: "ETF 风险纪律",
    objective: "训练波动中控制仓位。",
    checklist: ["保存合约。", "记录观望。", "比较相对强弱。"],
    passCriteria: ["至少 1 次观望。", "新闻判断 1 条。", "最大仓位不超过 40%。"],
    rules: {
      minHolds: 1,
      maxTrades: 4,
      maxTurnoverPct: 60,
      maxConcentrationPct: 40,
      minNewsJudgments: 1,
    },
    trap: "把 ETF 当绝对安全。",
    drill: "重新训练，只允许小仓。",
  },
  sourcePack: {
    summary: "官方来源用于复盘。",
    items: [
      {
        title: "Federal Reserve release",
        publisher: "Federal Reserve",
        date: "2024",
        url: "https://www.federalreserve.gov/",
        reason: "核对政策背景。",
      },
      {
        title: "Company IR",
        publisher: "Company IR",
        date: "2024",
        url: "https://example.com/ir",
        reason: "核对公司背景。",
      },
    ],
  },
};

const completeReport = validateCasePackage(completePackage, { file: "complete.json" });
assert.equal(completeReport.errors.length, 0);
assert(completeReport.score >= 80, `expected strong package score, got ${completeReport.score}`);
assert(["ready", "usable"].includes(completeReport.level), "complete package should be ready or usable");
assert(completeReport.rows.some((row) => row.key === "sourcePack" && row.score >= 80), "source pack should score well");
assert(completeReport.rows.some((row) => row.key === "blindSafety" && row.score >= 90), "complete package should pass blind-safety checks");

const thinReport = validateCasePackage({
  title: "Thin",
  assets: [{ symbol: "ONE", rows: rows.slice(0, 3).map((row) => ({ ...row, volume: 0 })) }],
}, { file: "thin.json" });
assert.equal(thinReport.errors.length, 0);
assert(thinReport.score < completeReport.score, "thin package should score lower than complete package");
assert(thinReport.warnings.some((item) => item.path.includes("volume") || item.path === "news" || item.path === "sourcePack"), "thin package should warn about missing or weak material");
assert(thinReport.recommendations.length >= 2, "thin package should produce actionable recommendations");

const leakyPackage = {
  ...completePackage,
  maskedTitle: "META 2022 暴跌前夜",
  maskedBrief: "这是 2022 年某知名成长股崩盘，后来导致股价腰斩。",
  realPeriod: "2022-01-01 至 2022-01-24",
  assets: [{ ...completePackage.assets[0], symbol: "META" }, completePackage.assets[1]],
  news: [{ day: 0, title: "https://example.com/source 提前泄露来源", category: "important" }],
  learning: {
    ...completePackage.learning,
    quiz: {
      ...completePackage.learning.quiz,
      explanation: "第 9 天卖出是最好操作。",
    },
  },
};
const leakyReport = validateCasePackage(leakyPackage, { file: "meta-2022-crash.json" });
assert(leakyReport.warnings.some((item) => item.path === "blindSafety" && item.message.includes("META")), "blind-safety should flag visible real symbols");
assert(leakyReport.warnings.some((item) => item.path === "blindSafety" && item.message.includes("2022")), "blind-safety should flag visible years or filename years");
assert(leakyReport.warnings.some((item) => item.path === "blindSafety" && item.message.includes("来源链接")), "blind-safety should flag visible source links");
assert(leakyReport.rows.some((row) => row.key === "blindSafety" && row.score < 70), "leaky package should receive a weak blind-safety score");
assert(leakyReport.recommendations.some((item) => item.includes("盲测防剧透")), "leaky package should recommend fixing blind-safety");

const brokenReport = validateCasePackage({
  title: "Broken",
  assets: [{ symbol: "BAD", rows: [{ date: "2024-01-01", open: 10, high: 9, low: 8, close: 10, volume: 1 }] }],
  news: [{ day: 99, title: "Out of range", category: "important" }],
}, { file: "broken.json" });
assert(brokenReport.errors.length >= 2, "broken package should surface structural errors");
assert.equal(brokenReport.level, "error");

const bundleReports = validateCasePackageInput({
  schema: "market-replay-case-library",
  schemaVersion: 1,
  cases: [
    completePackage,
    { ...completePackage, title: "Second bundle package", revealTitle: "Second bundle package reveal" },
  ],
}, { file: "case-library-bundle.json" });
assert.equal(bundleReports.length, 2, "case library bundles should validate every contained case");
assert(bundleReports.every((report) => report.file.includes("case-library-bundle.json#") && report.errors.length === 0), "bundle child reports should keep bundle file context");

const duplicateBundleReports = validateCasePackageInput({
  schema: "market-replay-case-library",
  schemaVersion: 1,
  cases: [completePackage, completePackage],
}, { file: "duplicate-library.json" });
assert.equal(duplicateBundleReports.length, 2);
assert(duplicateBundleReports[1].warnings.some((item) => item.path === "bundle.duplicates"), "case library bundle validation should warn about duplicate case content");
assert(duplicateBundleReports[1].recommendations.some((item) => item.includes("重复")), "duplicate bundle reports should recommend removing duplicated cases");

const emptyBundleReports = validateCasePackageInput({
  schema: "market-replay-case-library",
  cases: [],
}, { file: "empty-library.json" });
assert.equal(emptyBundleReports.length, 1);
assert(emptyBundleReports[0].errors.some((item) => item.path === "cases"), "empty case library bundles should fail validation");

const args = parseArgs(["one.json", "two.json", "--json", "--strict"]);
assert.deepEqual(args.files, ["one.json", "two.json"]);
assert.equal(args.json, true);
assert.equal(args.strict, true);

console.log("case package validator smoke tests passed");
