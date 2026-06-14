const assert = require("node:assert/strict");

const importers = require("../core/importers.js");

const rows = importers.parseCsvBars("Date,Open,High,Low,Close,Volume\n2024-01-03,103,108,102,107,234567\n2024-01-02,100,105,99,103,123456");
assert.equal(rows.length, 2);
assert.equal(rows[0].date, "2024-01-02");
assert.equal(rows[1].close, 107);

const quoted = importers.splitCsvLine('"BRK,B",2024-01-02,100');
assert.deepEqual(quoted, ["BRK,B", "2024-01-02", "100"]);

const multi = importers.parseCsvAssets([
  "Symbol,Date,Open,High,Low,Close,Volume",
  "SPY,2024-01-02,100,105,99,103,123456",
  "QQQ,2024-01-02,80,84,79,82,234567",
  "SPY,2024-01-03,103,106,101,104,111111",
  "QQQ,2024-01-03,82,86,81,85,222222",
].join("\n"));
assert.equal(multi.length, 2);
assert.equal(multi[0].symbol, "SPY");
assert.equal(multi[1].type, "etf");

assert.throws(
  () => importers.parseCsvAssets("Symbol,Date,Open,High,Low,Close,Volume\nSPY,2024-01-02,100,105,99,103,1\nSPY,2024-01-02,100,105,99,103,1\nSPY,2024-01-03,103,106,101,104,1"),
  /重复日期/,
);

const abnormal = importers.parseCsvAssets([
  "Date,Open,High,Low,Close,Volume",
  "2024-01-02,100,105,99,100,1000",
  "2024-01-03,100,230,95,220,1000",
  "2024-02-20,220,222,210,215,0",
].join("\n"), "JUMP");
const report = importers.buildCsvQualityReport(abnormal);
assert.equal(report.status, "danger");
assert(report.warnings.some((item) => item.title === "异常单日波动"));
assert(report.warnings.some((item) => item.title === "日期缺口较大"));
assert.equal(importers.csvQualityStatusLabel("danger"), "需核对");
assert.equal(importers.daysBetweenDates("2024-01-02", "2024-01-12"), 10);

const packagePayload = {
  title: "Classic package",
  assets: [
    {
      symbol: "abc",
      rows: [
        ["2024-01-03", 11, 12, 10, 11.5, 1000],
        ["2024-01-02", 10, 11, 9, 10.5, 900],
      ],
    },
  ],
  sourcePack: {
    items: [{ title: "IR release", publisher: "Company", date: "2024-01-03", kind: "IR", url: "https://example.com", reason: "核对背景" }],
  },
  mission: {
    focus: "只做小仓位",
    rules: { minHolds: 2, maxTrades: 3, maxTurnoverPct: 45, maxConcentrationPct: 35, calmOnly: false, minNewsJudgments: 2 },
  },
  learning: {
    title: "案例课",
    terms: [{ name: "复权", description: "价格口径" }],
    quiz: { options: ["A", "B"], answer: 1 },
  },
};
const parsedPackage = importers.parseScenarioPackage(JSON.stringify(packagePayload));
const normalizedAsset = importers.normalizeScenarioPackageAsset(parsedPackage.assets[0], 0);
assert.equal(normalizedAsset.symbol, "ABC");
assert.equal(normalizedAsset.rows[0].date, "2024-01-02");
assert.equal(normalizedAsset.maskedSymbol, "PKG-A");

const defaultNews = importers.normalizeScenarioPackageNews([], [normalizedAsset]);
assert.equal(defaultNews[0].category, "important");
const sourcePack = importers.normalizeScenarioPackageSourcePack(parsedPackage.sourcePack, parsedPackage.title);
assert.equal(sourcePack.items[0].publisher, "Company");
const emptySourcePack = importers.normalizeScenarioPackageSourcePack({}, "No source package");
assert.equal(emptySourcePack.items[0].kind, "来源缺失");

const mission = importers.normalizeScenarioPackageMission(parsedPackage.mission);
assert.equal(mission.rules.minHolds, 2);
assert.equal(mission.rules.calmOnly, false);
const learning = importers.normalizeScenarioPackageLearning(parsedPackage.learning, parsedPackage);
assert.equal(learning.quiz.answer, 1);
assert.equal(learning.terms[0].name, "复权");

assert(importers.isScenarioPackageBundle({ cases: [packagePayload] }));
assert.throws(() => importers.parseScenarioPackage("{bad json"), /不是有效 JSON/);
assert.throws(() => importers.normalizeScenarioPackageBar({ date: "2024-01-02", open: 10, high: 9, low: 8, close: 10 }, "坏行"), /high\/low 不合理/);

const importedCaseForReadiness = {
  assets: [{ realSymbol: "ABC", symbol: "ABC" }, { realSymbol: "QQQ", symbol: "QQQ" }],
  news: [{ day: 0, title: "匿名重要消息", category: "important" }, { day: 1, title: "另一条重要消息", category: "important" }],
  scheduledEvents: [{ day: 1, title: "事件日", type: "earnings", riskLevel: "warn" }],
  sourcePack: { items: [{ url: "https://example.com/a" }, { url: "https://example.com/b" }] },
};
const readiness = importers.buildScenarioPackageTrainingReadiness({
  importedCase: importedCaseForReadiness,
  parsed: {
    lessons: ["一", "二", "三"],
    mission: { rules: { minNewsJudgments: 1, maxTrades: 4 } },
    maskedTitle: "匿名训练包",
    assets: [{ maskedSymbol: "PKG-A" }],
  },
  priceReport: { totalRows: 80 },
  learningModule: { terms: [], quiz: { options: [] } },
  missionPlan: { rules: { minNewsJudgments: 1, maxTrades: 4 } },
});
assert(readiness.score >= 80);
assert(readiness.rows.some((row) => row.label === "盲测防剧透" && row.level === "good"));

const leakyReadiness = importers.buildScenarioPackageTrainingReadiness({
  importedCase: importedCaseForReadiness,
  parsed: {
    realPeriod: "2024 crisis",
    maskedTitle: "ABC 暴跌前夜最佳卖点",
    assets: [{ maskedSymbol: "ABC" }],
    news: [{ title: "https://example.com/source" }],
  },
  priceReport: { totalRows: 10 },
  sourceName: "ABC-2024-crash.json",
});
const blindRow = leakyReadiness.rows.find((row) => row.label === "盲测防剧透");
assert.equal(blindRow.level, "danger");
const blindSafety = importers.buildScenarioPackageBlindSafetyReport(
  { realPeriod: "2024", maskedTitle: "ABC 历史大底", assets: [{ maskedSymbol: "ABC" }] },
  importedCaseForReadiness,
  { sourceName: "ABC-2024.json" },
);
assert(blindSafety.leaks.some((item) => item.includes("真实代码 ABC")));
assert(blindSafety.leaks.some((item) => item.includes("真实年份 2024")));
assert(importers.collectScenarioPackageVisibleText({ mission: { trap: "最高峰值" } }).some((item) => item.path === "mission.trap"));
