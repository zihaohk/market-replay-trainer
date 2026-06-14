#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COVERAGE_DIMENSIONS = [
  {
    key: "etf-systemic-risk",
    label: "ETF 系统性风险",
    target: 3,
    patterns: [/ETF/i, /宽基/, /系统性/, /暴跌/, /回撤/, /market/i],
    why: "新手容易以为 ETF 稳定就不会大跌，必须反复训练系统性风险。",
  },
  {
    key: "single-stock-event",
    label: "单股事件",
    target: 3,
    patterns: [/单股/, /\bstock\b/i, /财报/, /监管/, /黑天鹅/, /平台/, /限制交易/],
    why: "单个公司波动更大，需要单独训练仓位和事件风险。",
  },
  {
    key: "earnings-expectation",
    label: "财报与预期差",
    target: 3,
    patterns: [/财报/, /业绩/, /earnings/i, /指引/, /预期/, /收入/, /利润/],
    why: "好财报不等于上涨，市场交易的是预期差。",
  },
  {
    key: "macro-rates-inflation",
    label: "宏观利率与通胀",
    target: 3,
    patterns: [/利率/, /通胀/, /CPI/i, /宏观/, /央行/, /Federal Reserve/i, /Fed/i, /加息/, /降息/],
    why: "利率和通胀会改变估值中枢，影响 ETF 和成长股。",
  },
  {
    key: "liquidity-crisis",
    label: "流动性与银行压力",
    target: 2,
    patterns: [/流动性/, /liquidity/i, /银行/, /bank/i, /挤兑/, /存款/, /FDIC/i, /融资/],
    why: "流动性危机会让相关资产一起重定价，训练现金和仓位底线。",
  },
  {
    key: "sector-rotation",
    label: "行业轮动",
    target: 2,
    patterns: [/行业/, /轮动/, /sector/i, /能源/, /防御/, /成长/, /周期/, /板块/],
    why: "行业轮动训练相对强弱，而不是只看单个涨幅。",
  },
  {
    key: "momentum-bubble",
    label: "追高与泡沫",
    target: 2,
    patterns: [/追高/, /泡沫/, /热门/, /情绪/, /FOMO/i, /meme/i, /暴涨/, /异常上涨/],
    why: "新手最容易把别人赚钱的故事当成自己的交易依据。",
  },
  {
    key: "defensive-allocation",
    label: "防御配置",
    target: 2,
    patterns: [/防御/, /现金/, /保守/, /低波动/, /核心仓/, /配置/, /再平衡/, /80\/20/],
    why: "防御训练能避免只会进攻，不会保护本金。",
  },
  {
    key: "psychology-discipline",
    label: "心理纪律",
    target: 3,
    patterns: [/纪律/, /情绪/, /恐惧/, /贪心/, /观望/, /补仓/, /止损/, /计划/, /失效条件/],
    why: "模拟器的核心目标是纠正冲动、补仓、猜底和不复盘。",
  },
  {
    key: "mechanics-settlement-actions",
    label: "交易机制与公司行动",
    target: 2,
    patterns: [/T\\+1/i, /结算/, /good faith/i, /分红/, /拆股/, /复权/, /股息/, /税/, /限价/, /滑点/],
    why: "真实交易会受结算、税费、分红、拆股和成交机制影响。",
  },
];

const HELP = `
Market Replay case coverage auditor

Usage:
  node tools/audit-case-coverage.mjs tools/example-case-package.json
  node tools/audit-case-coverage.mjs --manifest tools/example-case-library.json
  node tools/audit-case-coverage.mjs packages/*.json --json

Options:
  --manifest <file>   Audit planned cases from a library manifest.
  --json              Print machine-readable JSON.
  --strict            Exit with failure when coverage is below 70 or any dimension has 0 cases.
  --help              Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  const cases = args.manifest
    ? await readManifestCases(args.manifest)
    : await readPackageCases(args.files);
  if (!cases.length) throw new Error("Provide package files or --manifest <file>.");
  const report = auditCaseCoverage(cases);
  if (args.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else process.stdout.write(`${formatCoverageReport(report)}\n`);
  if (args.strict && (report.score < 70 || report.dimensions.some((item) => item.count === 0))) process.exitCode = 1;
}

export function parseArgs(argv) {
  const args = { files: [], manifest: "", json: false, strict: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else if (token === "--strict") args.strict = true;
    else if (token === "--manifest") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("Missing value for --manifest.");
      args.manifest = value;
      index += 1;
    } else if (token.startsWith("--")) {
      throw new Error(`Unexpected option: ${token}`);
    } else {
      args.files.push(token);
    }
  }
  return args;
}

async function readJson(filePath) {
  const text = await readFile(resolve(filePath), "utf8");
  return JSON.parse(text);
}

async function readPackageCases(files) {
  const cases = [];
  for (const file of files) {
    const packageJson = await readJson(file);
    cases.push(normalizeAuditCase(packageJson, { id: packageJson.id || file, file }));
  }
  return cases;
}

async function readManifestCases(manifestPath) {
  const resolvedManifest = resolve(manifestPath);
  const manifest = await readJson(resolvedManifest);
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.cases)) {
    throw new Error("Manifest must include cases array.");
  }
  const manifestDir = dirname(resolvedManifest);
  const cases = [];
  for (const [index, entry] of manifest.cases.entries()) {
    if (!entry || typeof entry !== "object") throw new Error(`cases[${index}] must be an object.`);
    const config = entry.configFile ? await readJson(resolve(manifestDir, entry.configFile)) : entry.config;
    if (!config) throw new Error(`${entry.id || `cases[${index}]`} must include config or configFile.`);
    cases.push(normalizeAuditCase({ title: entry.title, ...config }, {
      id: entry.id || `case-${index + 1}`,
      file: entry.configFile || "",
      planned: true,
    }));
  }
  return cases;
}

export function auditCaseCoverage(cases) {
  const normalizedCases = cases.map((item, index) => normalizeAuditCase(item, { id: item.id || `case-${index + 1}` }));
  const dimensions = COVERAGE_DIMENSIONS.map((dimension) => auditDimension(dimension, normalizedCases));
  const weightedScore = dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length;
  const breadthBonus = Math.min(10, normalizedCases.length);
  const score = clampScore(weightedScore * 0.9 + breadthBonus);
  const missing = dimensions.filter((item) => item.count === 0);
  const thin = dimensions.filter((item) => item.count > 0 && item.count < item.target);
  return {
    totalCases: normalizedCases.length,
    score,
    level: score >= 85 && !missing.length ? "ready" : score >= 70 ? "usable" : score >= 55 ? "thin" : "biased",
    summary: coverageSummary({ score, missing, thin, totalCases: normalizedCases.length }),
    dimensions,
    cases: normalizedCases.map((item) => ({
      id: item.id,
      title: item.title,
      matchedDimensions: item.matchedDimensions,
    })),
    recommendations: coverageRecommendations({ missing, thin, normalizedCases }),
  };
}

function normalizeAuditCase(rawCase, meta = {}) {
  const textParts = [
    rawCase.text,
    rawCase.title,
    rawCase.maskedTitle,
    rawCase.maskedBrief,
    rawCase.revealTitle,
    rawCase.realPeriod,
    ...(Array.isArray(rawCase.tags) ? rawCase.tags : []),
    rawCase.dataQuality,
    ...(Array.isArray(rawCase.lessons) ? rawCase.lessons : []),
    rawCase.learning?.title,
    rawCase.learning?.concept,
    ...(Array.isArray(rawCase.learning?.rules) ? rawCase.learning.rules : []),
    ...(Array.isArray(rawCase.learning?.terms) ? rawCase.learning.terms.map((item) => `${item.name} ${item.description}`) : []),
    rawCase.mission?.focus,
    rawCase.mission?.objective,
    rawCase.mission?.trap,
    rawCase.mission?.drill,
    ...(Array.isArray(rawCase.mission?.checklist) ? rawCase.mission.checklist : []),
    ...(Array.isArray(rawCase.mission?.passCriteria) ? rawCase.mission.passCriteria : []),
    ...(Array.isArray(rawCase.news) ? rawCase.news.map((item) => `${item.title} ${item.category}`) : []),
    ...(Array.isArray(rawCase.scheduledEvents) ? rawCase.scheduledEvents.map((item) => `${item.title} ${item.type} ${item.riskLevel} ${item.detail}`) : []),
    rawCase.sourcePack?.summary,
    ...(Array.isArray(rawCase.sourcePack?.items) ? rawCase.sourcePack.items.map((item) => `${item.title} ${item.publisher} ${item.kind} ${item.reason}`) : []),
    ...(Array.isArray(rawCase.assets) ? rawCase.assets.map((item) => `${item.symbol} ${item.type} ${item.sector} ${item.maskedName}`) : []),
  ];
  return {
    id: meta.id || rawCase.id || rawCase.title || "case",
    file: meta.file || "",
    planned: Boolean(meta.planned),
    title: rawCase.title || rawCase.maskedTitle || meta.id || "Untitled case",
    text: textParts.filter(Boolean).join(" "),
    matchedDimensions: [],
  };
}

function auditDimension(dimension, cases) {
  const matchedCases = cases.filter((item) => dimension.patterns.some((pattern) => pattern.test(item.text)));
  matchedCases.forEach((item) => {
    if (!item.matchedDimensions.includes(dimension.key)) item.matchedDimensions.push(dimension.key);
  });
  const score = clampScore(Math.min(1, matchedCases.length / dimension.target) * 100);
  return {
    key: dimension.key,
    label: dimension.label,
    target: dimension.target,
    count: matchedCases.length,
    score,
    level: score >= 100 ? "good" : score >= 50 ? "warn" : "danger",
    why: dimension.why,
    cases: matchedCases.map((item) => ({ id: item.id, title: item.title })),
  };
}

function coverageSummary({ score, missing, thin, totalCases }) {
  if (!totalCases) return "没有案例可审计。";
  if (missing.length) return `覆盖度 ${score}/100，缺少 ${missing.length} 类训练环境：${missing.slice(0, 3).map((item) => item.label).join("、")}。`;
  if (thin.length) return `覆盖度 ${score}/100，所有维度都有样本，但 ${thin.length} 类样本偏少。`;
  return `覆盖度 ${score}/100，案例库覆盖比较均衡。`;
}

function coverageRecommendations({ missing, thin, normalizedCases }) {
  const recommendations = [];
  missing.slice(0, 6).forEach((item) => {
    recommendations.push(`新增“${item.label}”案例：${item.why}`);
  });
  thin.slice(0, 6).forEach((item) => {
    recommendations.push(`补强“${item.label}”：当前 ${item.count}/${item.target} 个案例。`);
  });
  if (normalizedCases.length < 10) {
    recommendations.push(`案例总数只有 ${normalizedCases.length} 个。正式训练库建议先做到 20-50 个高质量案例。`);
  }
  return recommendations.slice(0, 10);
}

function formatCoverageReport(report) {
  const lines = [
    `Case coverage audit`,
    `  ${report.summary}`,
    `  Cases: ${report.totalCases}; Score: ${report.score}/100; Level: ${report.level}`,
    ...report.dimensions.map((item) => `  - ${item.label}: ${item.count}/${item.target} (${item.score}/100) ${item.cases.map((caseItem) => caseItem.id).join(", ") || "缺失"}`),
  ];
  if (report.recommendations.length) {
    lines.push("  Next:", ...report.recommendations.map((item) => `    - ${item}`));
  }
  return lines.join("\n");
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
