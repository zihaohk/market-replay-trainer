import assert from "node:assert/strict";
import {
  auditCaseCoverage,
  parseArgs,
} from "../tools/audit-case-coverage.mjs";

const broadCases = [
  {
    id: "etf-panic",
    title: "ETF systemic risk panic",
    tags: ["ETF", "暴跌", "系统性风险", "现金"],
    maskedBrief: "宽基 ETF 在系统性下跌中的回撤训练。",
    mission: { focus: "ETF 纪律", objective: "训练现金缓冲和主动观望。" },
    news: [{ title: "流动性压力升高。", category: "important" }],
    assets: [{ symbol: "SPY", type: "etf", sector: "market" }],
  },
  {
    id: "single-earnings",
    title: "single stock earnings expectation gap",
    tags: ["单股", "财报", "预期差"],
    maskedBrief: "公司财报和收入指引后重新定价。",
    mission: { focus: "财报预期差", trap: "好财报不等于上涨。" },
    assets: [{ symbol: "META", type: "stock", sector: "technology" }],
  },
  {
    id: "macro-rates",
    title: "macro rates inflation CPI shock",
    tags: ["宏观", "利率", "通胀", "CPI", "Federal Reserve"],
    scheduledEvents: [{ title: "CPI 数据", type: "macro", riskLevel: "danger" }],
    sourcePack: { items: [{ publisher: "Federal Reserve", title: "Fed source" }] },
  },
  {
    id: "bank-liquidity",
    title: "bank liquidity crisis",
    tags: ["银行", "流动性", "FDIC", "存款"],
    news: [{ title: "客户撤资和监管接管。", category: "important" }],
  },
  {
    id: "sector-defense",
    title: "sector rotation defensive allocation",
    tags: ["行业", "轮动", "防御", "能源", "配置", "80/20"],
    mission: { focus: "防御配置", objective: "训练核心仓和再平衡。" },
  },
  {
    id: "momentum-mechanics",
    title: "momentum bubble and trading mechanics",
    tags: ["追高", "泡沫", "FOMO", "T+1", "结算", "分红", "拆股", "限价"],
    mission: { focus: "心理纪律", objective: "训练止损、失效条件和 good faith 风险。" },
  },
];

const broadReport = auditCaseCoverage(broadCases);
assert(broadReport.score >= 50, `expected useful broad coverage score, got ${broadReport.score}`);
assert.equal(broadReport.dimensions.find((item) => item.key === "liquidity-crisis").count >= 1, true);
assert.equal(broadReport.dimensions.find((item) => item.key === "mechanics-settlement-actions").count >= 1, true);
assert(broadReport.cases.find((item) => item.id === "momentum-mechanics").matchedDimensions.includes("momentum-bubble"));

const biasedReport = auditCaseCoverage([
  {
    id: "only-etf",
    title: "ETF risk replay",
    tags: ["ETF", "风险", "纪律"],
    mission: { focus: "ETF 系统性风险", objective: "训练观望和现金。" },
  },
]);
assert(biasedReport.score < broadReport.score, "biased library should score lower");
assert(biasedReport.dimensions.some((item) => item.count === 0), "biased library should expose missing dimensions");
assert(biasedReport.recommendations.some((item) => item.includes("正式训练库建议")), "small library should recommend more cases");

const args = parseArgs(["--manifest", "tools/example-case-library.json", "--json", "--strict"]);
assert.equal(args.manifest, "tools/example-case-library.json");
assert.equal(args.json, true);
assert.equal(args.strict, true);

console.log("case coverage audit smoke tests passed");
