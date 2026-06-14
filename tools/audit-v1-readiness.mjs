import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const requiredFiles = [
  "docs/V1_COMPLETION_STANDARD.md",
  "docs/CONTENT_PIPELINE.md",
  "docs/BLIND_TRAINING_POLICY.md",
  "README.md",
  "PROJECT_STATUS.md",
  "index.html",
  "app.js",
  "data/starter-bundle.js",
  "tools/sync-starter-bundle.mjs",
  "tools/browser-smoke.mjs",
  "tools/check-all.mjs",
  "tools/audit-v1-evidence.mjs",
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

const failures = [];

function readText(file) {
  return readFileSync(resolve(cwd, file), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const file of requiredFiles) {
  assert(existsSync(resolve(cwd, file)), `缺少必需文件：${file}`);
}

const standard = readText("docs/V1_COMPLETION_STANDARD.md");
for (let index = 1; index <= 10; index += 1) {
  const id = `V1-${String(index).padStart(2, "0")}`;
  assert(standard.includes(id), `v1.0 标准缺少 ${id}`);
}
[
  "训练体验完整",
  "盲测严肃性完整",
  "案例库达到课程级",
  "新手风控必须硬约束",
  "资金、结算和公司行动可信",
  "复盘系统必须能指导下一轮",
  "长期画像和课程路径完整",
  "数据导入导出可靠",
  "工程质量可维护",
  "文档足够让新手自己使用",
  "npm test",
  "npm run browser:smoke",
  "tools/audit-v1-evidence.mjs",
].forEach((text) => assert(standard.includes(text), `v1.0 标准缺少关键文本：${text}`));

const readme = readText("README.md");
const status = readText("PROJECT_STATUS.md");
assert(readme.includes("docs/V1_COMPLETION_STANDARD.md") || status.includes("docs/V1_COMPLETION_STANDARD.md"), "README 或 PROJECT_STATUS 必须引用 v1.0 完工标准文档。");
assert(readme.includes("23 个内置训练案例"), "README 必须说明 23 个内置训练案例。");
assert(status.includes("23 个内置训练包"), "PROJECT_STATUS 必须说明 23 个内置训练包。");

const starterBundleSource = readText("data/starter-bundle.js");
const starterMatch = starterBundleSource.match(/window\.MarketReplayStarterBundle\s*=\s*([\s\S]*);\s*$/);
assert(Boolean(starterMatch), "data/starter-bundle.js 必须暴露 window.MarketReplayStarterBundle。");
if (starterMatch) {
  const starterBundle = JSON.parse(starterMatch[1]);
  assert(Array.isArray(starterBundle.cases), "starter bundle 必须包含 cases。");
  assert(starterBundle.cases.length === 11, `starter bundle 应包含 11 个案例，实际 ${starterBundle.cases.length}。`);
}

const app = readText("app.js");
assert(app.includes("...starterClassicCases()"), "app.js 必须内置 starter classic cases。");
assert(app.includes("duplicateComparableFingerprint"), "app.js 必须用内容指纹识别重复案例。");

const reviewCore = readText("core/review.js");
[
  "buildLiveReadinessGate",
  "minValidBlindRuns: 20",
  "maxConsecutiveContractFailures",
  "mostRepeatedRecentIssue",
].forEach((text) => assert(reviewCore.includes(text), `core/review.js 必须包含实盘前硬门槛：${text}`));

const profileInsightsUi = readText("ui/profile-insights.js");
[
  "硬门槛",
  "readiness-blocker-list",
].forEach((text) => assert(profileInsightsUi.includes(text), `ui/profile-insights.js 必须展示实盘前硬门槛：${text}`));

const browserSmoke = readText("tools/browser-smoke.mjs");
[
  "Cases:",
  "Limit order status",
  "Limit order expiry status",
  "Limit order cancel status",
  "File import cases",
  "Live readiness gate checked",
  "Mobile overflow",
].forEach((text) => assert(browserSmoke.includes(text), `浏览器 smoke 必须报告：${text}`));

const checkAll = readText("tools/check-all.mjs");
[
  "app smoke",
  "starter built-in data sync",
  "events UI smoke",
  "source hygiene",
  "docs hygiene",
  "v1 readiness audit",
  "v1 evidence audit",
].forEach((text) => assert(checkAll.includes(text), `总自检必须包含：${text}`));

if (failures.length) {
  process.stderr.write(`v1 readiness audit failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("v1 readiness audit passed\n");
}
