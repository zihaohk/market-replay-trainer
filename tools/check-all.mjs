#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const CHECKS = [
  {
    name: "builder syntax",
    command: ["node", "--check", "tools/build-case-package.mjs"],
  },
  {
    name: "validator syntax",
    command: ["node", "--check", "tools/validate-case-package.mjs"],
  },
  {
    name: "library builder syntax",
    command: ["node", "--check", "tools/build-case-library.mjs"],
  },
  {
    name: "library bundler syntax",
    command: ["node", "--check", "tools/bundle-case-library.mjs"],
  },
  {
    name: "coverage auditor syntax",
    command: ["node", "--check", "tools/audit-case-coverage.mjs"],
  },
  {
    name: "case scaffolder syntax",
    command: ["node", "--check", "tools/scaffold-case-config.mjs"],
  },
  {
    name: "starter bundle sync syntax",
    command: ["node", "--check", "tools/sync-starter-bundle.mjs"],
  },
  {
    name: "v1 readiness audit syntax",
    command: ["node", "--check", "tools/audit-v1-readiness.mjs"],
  },
  {
    name: "v1 evidence audit syntax",
    command: ["node", "--check", "tools/audit-v1-evidence.mjs"],
  },
  {
    name: "app syntax",
    command: ["node", "--check", "app.js"],
  },
  {
    name: "case library coverage core syntax",
    command: ["node", "--check", "core/case-library-coverage.js"],
  },
  {
    name: "trade ledger core syntax",
    command: ["node", "--check", "core/trade-ledger.js"],
  },
  {
    name: "orders core syntax",
    command: ["node", "--check", "core/orders.js"],
  },
  {
    name: "portfolio core syntax",
    command: ["node", "--check", "core/portfolio.js"],
  },
  {
    name: "course core syntax",
    command: ["node", "--check", "core/course.js"],
  },
  {
    name: "review core syntax",
    command: ["node", "--check", "core/review.js"],
  },
  {
    name: "importers core syntax",
    command: ["node", "--check", "core/importers.js"],
  },
  {
    name: "runtime core syntax",
    command: ["node", "--check", "core/runtime.js"],
  },
  {
    name: "session state syntax",
    command: ["node", "--check", "state/session.js"],
  },
  {
    name: "training plan UI syntax",
    command: ["node", "--check", "ui/training-plan.js"],
  },
  {
    name: "case list UI syntax",
    command: ["node", "--check", "ui/case-list.js"],
  },
  {
    name: "risk dashboard UI syntax",
    command: ["node", "--check", "ui/risk-dashboard.js"],
  },
  {
    name: "trade form UI syntax",
    command: ["node", "--check", "ui/trade-form.js"],
  },
  {
    name: "import export UI syntax",
    command: ["node", "--check", "ui/import-export.js"],
  },
  {
    name: "history UI syntax",
    command: ["node", "--check", "ui/history.js"],
  },
  {
    name: "profile insights UI syntax",
    command: ["node", "--check", "ui/profile-insights.js"],
  },
  {
    name: "review summary UI syntax",
    command: ["node", "--check", "ui/review-summary.js"],
  },
  {
    name: "events UI syntax",
    command: ["node", "--check", "ui/events.js"],
  },
  {
    name: "starter bundle data syntax",
    command: ["node", "--check", "data/starter-bundle.js"],
  },
  {
    name: "browser smoke syntax",
    command: ["node", "--check", "tools/browser-smoke.mjs"],
  },
  {
    name: "package builder smoke",
    command: ["node", "tests/package-builder-smoke.mjs"],
  },
  {
    name: "case package validator smoke",
    command: ["node", "tests/case-package-validator-smoke.mjs"],
  },
  {
    name: "case library builder smoke",
    command: ["node", "tests/case-library-builder-smoke.mjs"],
  },
  {
    name: "case library bundler smoke",
    command: ["node", "tests/case-library-bundler-smoke.mjs"],
  },
  {
    name: "case coverage audit smoke",
    command: ["node", "tests/case-coverage-audit-smoke.mjs"],
  },
  {
    name: "case config scaffold smoke",
    command: ["node", "tests/case-config-scaffold-smoke.mjs"],
  },
  {
    name: "case library coverage core smoke",
    command: ["node", "tests/case-library-coverage-smoke.js"],
  },
  {
    name: "trade ledger core smoke",
    command: ["node", "tests/trade-ledger-smoke.js"],
  },
  {
    name: "orders core smoke",
    command: ["node", "tests/orders-smoke.js"],
  },
  {
    name: "portfolio core smoke",
    command: ["node", "tests/portfolio-smoke.js"],
  },
  {
    name: "course core smoke",
    command: ["node", "tests/course-smoke.js"],
  },
  {
    name: "review core smoke",
    command: ["node", "tests/review-smoke.js"],
  },
  {
    name: "importers core smoke",
    command: ["node", "tests/importers-smoke.js"],
  },
  {
    name: "runtime core smoke",
    command: ["node", "tests/runtime-smoke.js"],
  },
  {
    name: "session state smoke",
    command: ["node", "tests/session-state-smoke.js"],
  },
  {
    name: "training plan UI smoke",
    command: ["node", "tests/ui-training-plan-smoke.js"],
  },
  {
    name: "case list UI smoke",
    command: ["node", "tests/ui-case-list-smoke.js"],
  },
  {
    name: "risk dashboard UI smoke",
    command: ["node", "tests/ui-risk-dashboard-smoke.js"],
  },
  {
    name: "trade form UI smoke",
    command: ["node", "tests/ui-trade-form-smoke.js"],
  },
  {
    name: "import export UI smoke",
    command: ["node", "tests/ui-import-export-smoke.js"],
  },
  {
    name: "history UI smoke",
    command: ["node", "tests/ui-history-smoke.js"],
  },
  {
    name: "profile insights UI smoke",
    command: ["node", "tests/ui-profile-insights-smoke.js"],
  },
  {
    name: "review summary UI smoke",
    command: ["node", "tests/ui-review-summary-smoke.js"],
  },
  {
    name: "events UI smoke",
    command: ["node", "tests/ui-events-smoke.js"],
  },
  {
    name: "app smoke",
    command: ["node", "tests/smoke.js"],
  },
  {
    name: "example package validation",
    command: ["node", "tools/validate-case-package.mjs", "tools/example-case-package.json", "--strict"],
  },
  {
    name: "example library dry run",
    command: ["node", "tools/build-case-library.mjs", "--manifest", "tools/example-case-library.json", "--dry-run", "--strict"],
  },
  {
    name: "example bundle dry run",
    command: ["node", "tools/bundle-case-library.mjs", "tools/example-case-package.json", "--dry-run", "--strict"],
  },
  {
    name: "example coverage audit",
    command: ["node", "tools/audit-case-coverage.mjs", "--manifest", "tools/example-case-library.json"],
  },
  {
    name: "starter classic library dry run",
    command: ["node", "tools/build-case-library.mjs", "--manifest", "cases/starter-classic-library.json", "--dry-run", "--strict"],
  },
  {
    name: "starter classic coverage audit",
    command: ["node", "tools/audit-case-coverage.mjs", "--manifest", "cases/starter-classic-library.json", "--strict"],
  },
  {
    name: "starter classic bundle dry run",
    command: ["node", "tools/bundle-case-library.mjs", "--manifest", "cases/starter-classic-library.json", "--dir", "packages/starter-classic", "--out", "packages/case-c-bundle.json", "--dry-run", "--strict"],
  },
  {
    name: "starter built-in data sync",
    command: ["node", "tools/sync-starter-bundle.mjs", "--check"],
  },
  {
    name: "v1 readiness audit",
    command: ["node", "tools/audit-v1-readiness.mjs"],
  },
  {
    name: "v1 evidence audit",
    command: ["node", "tools/audit-v1-evidence.mjs"],
  },
  {
    name: "source hygiene",
    command: [
      "node",
      "-e",
      sourceHygieneScript(),
    ],
  },
  {
    name: "docs hygiene",
    command: [
      "node",
      "-e",
      docsHygieneScript(),
    ],
  },
];

const HELP = `
Market Replay full self-check

Usage:
  node tools/check-all.mjs
  node tools/check-all.mjs --json

Options:
  --json       Print machine-readable JSON summary.
  --help       Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  const startedAt = new Date();
  const results = [];
  for (const check of CHECKS) {
    const result = await runCheck(check);
    results.push(result);
    if (!args.json) process.stdout.write(formatCheckResult(result));
  }
  const failed = results.filter((result) => result.exitCode !== 0);
  const summary = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    ok: failed.length === 0,
    results,
  };
  if (args.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    process.stdout.write(`\nSelf-check ${summary.ok ? "passed" : "failed"}: ${summary.passed}/${summary.total} passed.\n`);
  }
  if (failed.length) process.exitCode = 1;
}

export function parseArgs(argv) {
  const args = { json: false, help: false };
  argv.forEach((token) => {
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else throw new Error(`Unexpected argument: ${token}`);
  });
  return args;
}

export function runCheck(check) {
  const startedAt = Date.now();
  return new Promise((resolveResult) => {
    const [bin, ...args] = check.command;
    const child = spawn(bin, args, {
      cwd: resolve(fileURLToPath(new URL("..", import.meta.url))),
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolveResult({
        name: check.name,
        command: check.command.join(" "),
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr: `${stderr}${error.message}`,
      });
    });
    child.on("close", (exitCode) => {
      resolveResult({
        name: check.name,
        command: check.command.join(" "),
        exitCode,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

function formatCheckResult(result) {
  const status = result.exitCode === 0 ? "PASS" : "FAIL";
  const lines = [`[${status}] ${result.name} (${result.durationMs}ms)`];
  if (result.exitCode !== 0 || result.stderr.trim()) {
    lines.push(indentOutput(result.stderr || result.stdout));
  }
  return `${lines.join("\n")}\n`;
}

function indentOutput(text) {
  return text.trim().split(/\r?\n/).slice(0, 20).map((line) => `  ${line}`).join("\n");
}

function sourceHygieneScript() {
  const files = [
    "app.js",
    "core/case-library-coverage.js",
    "core/trade-ledger.js",
    "core/orders.js",
    "core/portfolio.js",
    "core/course.js",
    "core/review.js",
    "core/importers.js",
    "core/runtime.js",
    "state/session.js",
    "ui/training-plan.js",
    "ui/case-list.js",
    "ui/risk-dashboard.js",
    "ui/trade-form.js",
    "ui/import-export.js",
    "ui/profile-insights.js",
    "ui/review-summary.js",
    "ui/events.js",
    "data/starter-bundle.js",
    "index.html",
    "README.md",
    "PROJECT_STATUS.md",
    "tools/build-case-package.mjs",
    "tools/validate-case-package.mjs",
    "tools/build-case-library.mjs",
    "tools/bundle-case-library.mjs",
    "tools/audit-case-coverage.mjs",
    "tools/scaffold-case-config.mjs",
    "tools/sync-starter-bundle.mjs",
    "tools/audit-v1-readiness.mjs",
    "tools/audit-v1-evidence.mjs",
    "tools/browser-smoke.mjs",
    "tools/check-all.mjs",
    "cases/starter-classic-library.json",
    "tests/smoke.js",
    "tests/package-builder-smoke.mjs",
    "tests/case-package-validator-smoke.mjs",
    "tests/case-library-builder-smoke.mjs",
    "tests/case-library-bundler-smoke.mjs",
    "tests/case-coverage-audit-smoke.mjs",
    "tests/case-config-scaffold-smoke.mjs",
    "tests/case-library-coverage-smoke.js",
    "tests/trade-ledger-smoke.js",
    "tests/orders-smoke.js",
    "tests/portfolio-smoke.js",
    "tests/course-smoke.js",
    "tests/review-smoke.js",
    "tests/importers-smoke.js",
    "tests/runtime-smoke.js",
    "tests/session-state-smoke.js",
    "tests/ui-training-plan-smoke.js",
    "tests/ui-case-list-smoke.js",
    "tests/ui-risk-dashboard-smoke.js",
    "tests/ui-trade-form-smoke.js",
    "tests/ui-import-export-smoke.js",
    "tests/ui-profile-insights-smoke.js",
    "tests/ui-review-summary-smoke.js",
    "tests/ui-events-smoke.js",
    "docs/V1_COMPLETION_STANDARD.md",
  ];
  return `
const fs = require('fs');
const allowedConsole = new Set([
  'tests/smoke.js',
  'tests/package-builder-smoke.mjs',
  'tests/case-package-validator-smoke.mjs',
  'tests/case-library-builder-smoke.mjs',
  'tests/case-library-bundler-smoke.mjs',
  'tests/case-coverage-audit-smoke.mjs',
  'tests/case-config-scaffold-smoke.mjs',
]);
const files = ${JSON.stringify(files)};
const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  text.split(/\\r?\\n/).forEach((line, index) => {
    if (file === 'tools/check-all.mjs' && line.includes('hits.push')) return;
    if (/TODO|FIXME|debugger/.test(line)) hits.push(file + ':' + (index + 1) + ': ' + line.trim());
    if (/console\\.log\\(/.test(line) && !allowedConsole.has(file)) hits.push(file + ':' + (index + 1) + ': unexpected console.log');
  });
}
if (hits.length) {
  console.error(hits.join('\\n'));
  process.exit(1);
}
process.stdout.write('source hygiene passed\\n');
`;
}

function docsHygieneScript() {
  return `
const fs = require('fs');
const requiredFiles = [
  'README.md',
  'PROJECT_STATUS.md',
  'docs/CONTENT_PIPELINE.md',
  'docs/BLIND_TRAINING_POLICY.md',
  'docs/V1_COMPLETION_STANDARD.md',
];
const hits = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    hits.push(file + ': missing');
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  if (/�|锛|鈥|绗|鐨|妗/.test(text)) hits.push(file + ': possible mojibake');
}
const readme = fs.existsSync('README.md') ? fs.readFileSync('README.md', 'utf8') : '';
const pipeline = fs.existsSync('docs/CONTENT_PIPELINE.md') ? fs.readFileSync('docs/CONTENT_PIPELINE.md', 'utf8') : '';
const policy = fs.existsSync('docs/BLIND_TRAINING_POLICY.md') ? fs.readFileSync('docs/BLIND_TRAINING_POLICY.md', 'utf8') : '';
const v1Standard = fs.existsSync('docs/V1_COMPLETION_STANDARD.md') ? fs.readFileSync('docs/V1_COMPLETION_STANDARD.md', 'utf8') : '';
const packageJson = fs.existsSync('package.json') ? fs.readFileSync('package.json', 'utf8') : '';
if (!readme.includes('docs/V1_COMPLETION_STANDARD.md')) hits.push('README.md: missing v1 completion standard link');
if (!readme.includes('docs/CONTENT_PIPELINE.md')) hits.push('README.md: missing content pipeline link');
if (!readme.includes('docs/BLIND_TRAINING_POLICY.md')) hits.push('README.md: missing blind policy link');
if (!readme.includes('盲测防剧透是否达标')) hits.push('README.md: missing blind-safety validator note');
if (!readme.includes('npm run browser:smoke')) hits.push('README.md: missing browser smoke command');
if (!readme.includes('移动端是否没有横向溢出')) hits.push('README.md: missing mobile browser smoke note');
if (!readme.includes('案例库体检')) hits.push('README.md: missing case library coverage note');
if (!readme.includes('真实观望记录')) hits.push('README.md: missing decision browser smoke note');
if (!readme.includes('真实买入/卖出成交')) hits.push('README.md: missing trade browser smoke note');
if (!readme.includes('限价单挂起/成交/过期/取消')) hits.push('README.md: missing limit order browser smoke note');
if (!readme.includes('starter bundle 导入和重复跳过')) hits.push('README.md: missing starter bundle browser smoke note');
if (!readme.includes('完整备份导出和恢复')) hits.push('README.md: missing backup browser smoke note');
if (!readme.includes('cases/starter-classic-library.json')) hits.push('README.md: missing starter classic library note');
if (!readme.includes('packages/case-c-bundle.json')) hits.push('README.md: missing starter bundle path');
if (!pipeline.includes('docs/BLIND_TRAINING_POLICY.md')) hits.push('docs/CONTENT_PIPELINE.md: missing blind policy cross-link');
if (!pipeline.includes('训练前可见字段或文件名')) hits.push('docs/CONTENT_PIPELINE.md: missing blind-safety validation step');
if (!pipeline.includes('npm run browser:smoke')) hits.push('docs/CONTENT_PIPELINE.md: missing browser smoke step');
if (!pipeline.includes('复盘 Markdown 下载和移动端横向溢出')) hits.push('docs/CONTENT_PIPELINE.md: missing expanded browser smoke coverage');
if (!pipeline.includes('案例库体检')) hits.push('docs/CONTENT_PIPELINE.md: missing case library coverage browser smoke note');
if (!pipeline.includes('课程检查题、真实观望记录')) hits.push('docs/CONTENT_PIPELINE.md: missing decision browser smoke coverage');
if (!pipeline.includes('真实买入/卖出成交')) hits.push('docs/CONTENT_PIPELINE.md: missing trade browser smoke coverage');
if (!pipeline.includes('限价单挂起/成交/过期/取消')) hits.push('docs/CONTENT_PIPELINE.md: missing limit order browser smoke coverage');
if (!pipeline.includes('starter bundle 导入和重复跳过')) hits.push('docs/CONTENT_PIPELINE.md: missing starter bundle browser smoke coverage');
if (!pipeline.includes('完整备份导出和恢复')) hits.push('docs/CONTENT_PIPELINE.md: missing backup browser smoke coverage');
if (!pipeline.includes('cases/starter-classic-library.json')) hits.push('docs/CONTENT_PIPELINE.md: missing starter classic library workflow');
if (!pipeline.includes('packages/case-c-bundle.json')) hits.push('docs/CONTENT_PIPELINE.md: missing starter bundle path');
if (!policy.includes('污染样本')) hits.push('docs/BLIND_TRAINING_POLICY.md: missing contamination section');
if (!v1Standard.includes('V1-01') || !v1Standard.includes('V1-10')) hits.push('docs/V1_COMPLETION_STANDARD.md: missing numbered v1 requirements');
if (!v1Standard.includes('npm test') || !v1Standard.includes('npm run browser:smoke')) hits.push('docs/V1_COMPLETION_STANDARD.md: missing required verification commands');
if (!v1Standard.includes('tools/audit-v1-evidence.mjs')) hits.push('docs/V1_COMPLETION_STANDARD.md: missing v1 evidence audit command');
if (!packageJson.includes('check:starter') || !packageJson.includes('build:starter')) hits.push('package.json: missing starter library scripts');
if (hits.length) {
  console.error(hits.join('\\n'));
  process.exit(1);
}
process.stdout.write('docs hygiene passed\\n');
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
