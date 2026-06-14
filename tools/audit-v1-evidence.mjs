#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();

const HELP = `
Market Replay v1.0 evidence audit

Usage:
  node tools/audit-v1-evidence.mjs
  node tools/audit-v1-evidence.mjs --json

Options:
  --json       Print machine-readable JSON summary.
  --help       Show this help.
`;

const FILES = {
  standard: "docs/V1_COMPLETION_STANDARD.md",
  blindPolicy: "docs/BLIND_TRAINING_POLICY.md",
  pipeline: "docs/CONTENT_PIPELINE.md",
  readme: "README.md",
  status: "PROJECT_STATUS.md",
  packageJson: "package.json",
  index: "index.html",
  app: "app.js",
  checkAll: "tools/check-all.mjs",
  browserSmoke: "tools/browser-smoke.mjs",
  v1Readiness: "tools/audit-v1-readiness.mjs",
  starterData: "data/starter-bundle.js",
  starterManifest: "cases/starter-classic-library.json",
  starterBundle: "packages/case-c-bundle.json",
  validateCase: "tools/validate-case-package.mjs",
  auditCoverage: "tools/audit-case-coverage.mjs",
  syncStarter: "tools/sync-starter-bundle.mjs",
  smoke: "tests/smoke.js",
  reviewSmoke: "tests/review-smoke.js",
  runtimeSmoke: "tests/runtime-smoke.js",
  importersSmoke: "tests/importers-smoke.js",
  courseSmoke: "tests/course-smoke.js",
  profileUiSmoke: "tests/ui-profile-insights-smoke.js",
  trainingPlanUiSmoke: "tests/ui-training-plan-smoke.js",
  reviewUiSmoke: "tests/ui-review-summary-smoke.js",
  ordersSmoke: "tests/orders-smoke.js",
  portfolioSmoke: "tests/portfolio-smoke.js",
  coreOrders: "core/orders.js",
  corePortfolio: "core/portfolio.js",
  coreRuntime: "core/runtime.js",
  coreReview: "core/review.js",
  coreCourse: "core/course.js",
  coreImporters: "core/importers.js",
  stateSession: "state/session.js",
  uiProfile: "ui/profile-insights.js",
  uiReview: "ui/review-summary.js",
  uiTraining: "ui/training-plan.js",
};

const REQUIRED_MODULES = [
  "core/case-library-coverage.js",
  "core/trade-ledger.js",
  "core/orders.js",
  "core/portfolio.js",
  "core/course.js",
  "core/runtime.js",
  "core/review.js",
  "core/importers.js",
  "state/session.js",
  "ui/training-plan.js",
  "ui/profile-insights.js",
  "ui/review-summary.js",
  "ui/events.js",
];

const AUDIT = [
  {
    id: "V1-01",
    title: "训练体验完整",
    checks: [
      contains("index", "id=\"randomExamButton\"", "页面提供随机盲测入口。"),
      contains("index", "id=\"nextDayButton\"", "页面提供逐日推进。"),
      contains("index", "id=\"speedInput\"", "页面提供时间速度控制。"),
      contains("index", "id=\"jumpEventButton\"", "页面提供跳到关键节点。"),
      contains("browserSmoke", "Decision history items", "浏览器回归覆盖真实观望记录。"),
      contains("browserSmoke", "Trade history items", "浏览器回归覆盖真实买入和卖出。"),
      contains("browserSmoke", "Limit order status", "浏览器回归覆盖限价单成交。"),
      contains("browserSmoke", "Limit order expiry status", "浏览器回归覆盖限价单过期。"),
      contains("browserSmoke", "Limit order cancel status", "浏览器回归覆盖限价单取消。"),
      contains("browserSmoke", "Mobile overflow", "浏览器回归覆盖移动端横向溢出。"),
    ],
  },
  {
    id: "V1-02",
    title: "盲测严肃性完整",
    checks: [
      contains("smoke", "exam mode should hide case theme, asset names, tags, lesson concepts, and navigation hints before reveal", "主 smoke 覆盖考试模式遮罩。"),
      contains("smoke", "startRandomBlindExam", "主 smoke 覆盖随机盲测入口。"),
      contains("smoke", "blind integrity", "主 smoke 覆盖盲测完整性。"),
      contains("smoke", "corrupted blind", "主 smoke 区分失真盲测。"),
      contains("validateCase", "blindSafety", "案例包校验包含防剧透体检。"),
      contains("blindPolicy", "污染样本", "盲测政策文档说明污染样本。"),
      contains("browserSmoke", "盲测防剧透", "浏览器回归覆盖导入体检里的防剧透评分。"),
    ],
  },
  {
    id: "V1-03",
    title: "案例库达到课程级",
    checks: [
      starterCaseCountAtLeast(11),
      contains("readme", "23 个内置训练案例", "README 说明当前 23 个内置训练案例。"),
      contains("browserSmoke", "Cases:", "浏览器回归报告开箱案例数量。"),
      contains("checkAll", "starter classic coverage audit", "总自检覆盖 starter 案例库体检。"),
      contains("checkAll", "starter built-in data sync", "总自检覆盖内置 starter 同步。"),
      contains("smoke", "built-in v1 library should be broad and balanced", "主 smoke 检查内置案例库均衡性。"),
      contains("smoke", "scenario package learning should render in the lesson panel", "主 smoke 检查案例任务和课程模块。"),
    ],
  },
  {
    id: "V1-04",
    title: "新手风控必须硬约束",
    checks: [
      contains("app", "maxSingleStockWeight", "应用包含单股仓位上限。"),
      contains("app", "maxSectorWeight", "应用包含行业仓位上限。"),
      contains("app", "maxTradesPerDay", "应用包含每日交易次数上限。"),
      contains("app", "reserveCashRatio", "应用包含现金底线。"),
      contains("smoke", "risk cooldown should activate", "主 smoke 覆盖风险冷却。"),
      contains("smoke", "liquidity", "主 smoke 覆盖流动性检查。"),
      contains("smoke", "evidence source", "主 smoke 覆盖证据来源。"),
      contains("smoke", "profit plan", "主 smoke 覆盖盈利计划。"),
      fileExists("coreOrders", "订单核心模块存在。"),
      fileExists("corePortfolio", "组合核心模块存在。"),
      fileExists("coreRuntime", "运行时核心模块存在。"),
    ],
  },
  {
    id: "V1-05",
    title: "资金、结算和公司行动可信",
    checks: [
      contains("app", "usdHkdRate", "应用包含港币/美元资金口径。"),
      contains("app", "dividendWithholdingRatePct", "应用包含股息预扣税口径。"),
      contains("app", "T+1", "应用显示 T+1 结算。"),
      contains("runtimeSmoke", "settlement", "runtime smoke 覆盖结算。"),
      contains("runtimeSmoke", "dividend", "runtime smoke 覆盖分红。"),
      contains("runtimeSmoke", "split", "runtime smoke 覆盖拆股。"),
      contains("smoke", "good faith", "主 smoke 覆盖 cash account/good faith 类风险。"),
      contains("smoke", "dividend withholding", "主 smoke 覆盖股息税费复盘。"),
    ],
  },
  {
    id: "V1-06",
    title: "复盘系统必须能指导下一轮",
    checks: [
      contains("uiReview", "复盘资料包", "复盘 UI 包含资料包。"),
      contains("uiReview", "事件证据时间线", "复盘 UI 包含事件证据时间线。"),
      contains("uiReview", "盲测完整性", "复盘 UI 包含盲测完整性。"),
      contains("uiReview", "补练处方", "复盘 UI 包含补练处方。"),
      contains("uiReview", "高级诊断", "复盘 UI 包含高级诊断。"),
      contains("reviewUiSmoke", "复盘资料包", "复盘 UI smoke 覆盖资料包。"),
      contains("browserSmoke", "Review markdown", "浏览器回归覆盖 Markdown 导出。"),
      contains("reviewSmoke", "buildRootCauseMatrix", "review core smoke 覆盖根因矩阵。"),
    ],
  },
  {
    id: "V1-07",
    title: "长期画像和课程路径完整",
    checks: [
      contains("coreCourse", "Level 2", "课程模块包含 Level 2 解锁逻辑。"),
      contains("coreCourse", "Level 3", "课程模块包含 Level 3 解锁逻辑。"),
      contains("courseSmoke", "chooseRandomBlindCase", "course smoke 覆盖随机盲测选题。"),
      contains("profileUiSmoke", "实盘前准备度", "画像 UI smoke 覆盖实盘前准备度。"),
      contains("smoke", "profile should render the mistake notebook", "主 smoke 覆盖错题本。"),
      contains("profileUiSmoke", "弱项自动排课", "画像 UI smoke 覆盖弱项自动排课。"),
      contains("trainingPlanUiSmoke", "今日", "今日训练计划 UI smoke 存在。"),
      contains("browserSmoke", "Live readiness gate checked", "浏览器回归覆盖实盘前硬门槛。"),
    ],
  },
  {
    id: "V1-08",
    title: "数据导入导出可靠",
    checks: [
      contains("coreImporters", "parseCsvBars", "导入模块支持单标的 CSV。"),
      contains("coreImporters", "parseCsvAssets", "导入模块支持多标的 CSV。"),
      contains("coreImporters", "parseScenarioPackage", "导入模块支持 JSON 案例包。"),
      contains("app", "market-replay-case-library", "应用支持案例库 bundle。"),
      contains("index", "multiple hidden", "页面支持多选 JSON 文件。"),
      contains("browserSmoke", "File import cases", "浏览器回归覆盖文件选择导入。"),
      contains("browserSmoke", "Case package", "浏览器回归覆盖案例包导出。"),
      contains("browserSmoke", "Case library", "浏览器回归覆盖案例库导出。"),
      contains("browserSmoke", "Backup", "浏览器回归覆盖完整备份。"),
      contains("app", "duplicateComparableFingerprint", "重复导入按内容指纹跳过。"),
    ],
  },
  {
    id: "V1-09",
    title: "工程质量可维护",
    checks: [
      ...REQUIRED_MODULES.map((file) => fileExistsPath(file, `${file} 存在。`)),
      contains("checkAll", "source hygiene", "总自检包含源码卫生。"),
      contains("checkAll", "docs hygiene", "总自检包含文档卫生。"),
      contains("checkAll", "v1 evidence audit", "总自检包含 v1 证据矩阵审计。"),
      contains("checkAll", "starter built-in data sync", "总自检包含 starter 同步检查。"),
    ],
  },
  {
    id: "V1-10",
    title: "文档足够让新手自己使用",
    checks: [
      fileExists("readme", "README 存在。"),
      fileExists("status", "PROJECT_STATUS 存在。"),
      fileExists("pipeline", "内容生产流程文档存在。"),
      fileExists("blindPolicy", "盲测防剧透文档存在。"),
      fileExists("standard", "v1 完工标准文档存在。"),
      contains("readme", "运行", "README 说明运行方式。"),
      contains("readme", "导入", "README 说明导入流程。"),
      contains("readme", "npm test", "README 说明测试命令。"),
      contains("checkAll", "docs hygiene", "总自检包含文档卫生。"),
    ],
  },
];

export function parseArgs(argv) {
  const args = { json: false, help: false };
  argv.forEach((token) => {
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else throw new Error(`Unexpected argument: ${token}`);
  });
  return args;
}

export function runEvidenceAudit() {
  const results = AUDIT.map((section) => {
    const checks = section.checks.map((check) => check());
    const failed = checks.filter((check) => !check.ok);
    return {
      id: section.id,
      title: section.title,
      ok: failed.length === 0,
      passed: checks.length - failed.length,
      total: checks.length,
      checks,
    };
  });
  const failedSections = results.filter((section) => !section.ok);
  return {
    ok: failedSections.length === 0,
    passed: results.length - failedSections.length,
    total: results.length,
    results,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  const summary = runEvidenceAudit();
  if (args.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(formatSummary(summary));
  }
  if (!summary.ok) process.exitCode = 1;
}

function formatSummary(summary) {
  const lines = [`v1 evidence audit ${summary.ok ? "passed" : "failed"}: ${summary.passed}/${summary.total} sections passed.`];
  summary.results.forEach((section) => {
    lines.push(`[${section.ok ? "PASS" : "FAIL"}] ${section.id} ${section.title} (${section.passed}/${section.total})`);
    section.checks
      .filter((check) => !check.ok)
      .slice(0, 6)
      .forEach((check) => lines.push(`  - ${check.message}`));
  });
  return `${lines.join("\n")}\n`;
}

function fileExists(fileKey, label) {
  return () => {
    const file = FILES[fileKey];
    const ok = Boolean(file && existsSync(resolve(cwd, file)));
    return evidence(ok, label, ok ? file : `${file || fileKey} missing`);
  };
}

function fileExistsPath(file, label) {
  return () => evidence(existsSync(resolve(cwd, file)), label, file);
}

function contains(fileKey, text, label) {
  return () => {
    const file = FILES[fileKey];
    if (!file || !existsSync(resolve(cwd, file))) return evidence(false, label, `${file || fileKey} missing`);
    const body = readFileSync(resolve(cwd, file), "utf8");
    return evidence(body.includes(text), label, `${file} should include ${JSON.stringify(text)}`);
  };
}

function starterCaseCountAtLeast(minimum) {
  return () => {
    const file = FILES.starterData;
    if (!existsSync(resolve(cwd, file))) return evidence(false, `starter bundle 至少 ${minimum} 个案例。`, `${file} missing`);
    const source = readFileSync(resolve(cwd, file), "utf8");
    const match = source.match(/window\.MarketReplayStarterBundle\s*=\s*([\s\S]*);\s*$/);
    if (!match) return evidence(false, `starter bundle 至少 ${minimum} 个案例。`, `${file} does not expose bundle JSON`);
    const bundle = JSON.parse(match[1]);
    const count = Array.isArray(bundle.cases) ? bundle.cases.length : 0;
    return evidence(count >= minimum, `starter bundle 至少 ${minimum} 个案例。`, `${file} has ${count} cases`);
  };
}

function evidence(ok, label, detail) {
  return {
    ok,
    label,
    detail,
    message: ok ? label : `${label} 证据不足：${detail}`,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
