import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildCaseLibrary,
  normalizeManifest,
  parseArgs,
} from "../tools/build-case-library.mjs";

const rows = [
  { date: "2024-01-02", open: 100, high: 102, low: 99, close: 101, volume: 1200000 },
  { date: "2024-01-03", open: 101, high: 102, low: 97, close: 98, volume: 1600000 },
  { date: "2024-01-04", open: 98, high: 99, low: 94, close: 95, volume: 2100000 },
  { date: "2024-01-05", open: 95, high: 98, low: 94, close: 97, volume: 1800000 },
  { date: "2024-01-08", open: 97, high: 100, low: 96, close: 99, volume: 1500000 },
  { date: "2024-01-09", open: 99, high: 101, low: 98, close: 100, volume: 1300000 },
  { date: "2024-01-10", open: 100, high: 103, low: 99, close: 102, volume: 1400000 },
];

const manifest = {
  id: "test-library",
  title: "Test library",
  cases: [
    {
      id: "offline-case",
      title: "Offline case",
      out: "offline-case.json",
      config: {
        start: "2024-01-02",
        end: "2024-01-10",
        maskedTitle: "匿名测试案例",
        maskedBrief: "ETF 风险测试案例。",
        revealTitle: "Offline case reveal",
        tags: ["ETF", "风险"],
        assets: [
          { symbol: "AAA", maskedSymbol: "LIB-A", type: "etf", rows },
          { symbol: "BBB", maskedSymbol: "LIB-B", type: "etf", rows: rows.map((row) => ({ ...row, open: row.open * 1.01, high: row.high * 1.01, low: row.low * 1.01, close: row.close * 1.01 })) },
        ],
        news: [
          { date: "2024-01-03", title: "风险资产回落。", category: "important" },
          { date: "2024-01-05", title: "市场初步反弹。", category: "important" },
        ],
        scheduledEvents: [
          { date: "2024-01-04", title: "高波动窗口", type: "volatility", riskLevel: "danger" },
        ],
        learning: {
          title: "ETF 风险课程",
          concept: "先控制仓位。",
          rules: ["小仓试探。", "主动观望。", "比较强弱。"],
          terms: [
            { name: "风险", description: "可能亏损。" },
            { name: "观望", description: "主动不交易。" },
            { name: "强弱", description: "比较资产表现。" },
          ],
          quiz: {
            question: "第一步？",
            options: ["控风险", "满仓", "忽略"],
            answer: 0,
            explanation: "先控制风险。",
          },
        },
        mission: {
          focus: "ETF 风险纪律",
          objective: "训练风险控制。",
          checklist: ["保存合约。", "主动观望。", "比较强弱。"],
          passCriteria: ["观望 1 次。", "新闻判断 1 条。", "仓位不超过 45%。"],
          rules: { minHolds: 1, maxTrades: 5, maxTurnoverPct: 70, maxConcentrationPct: 45, minNewsJudgments: 1 },
          trap: "把 ETF 当绝对安全。",
          drill: "小仓重练。",
        },
        sourcePack: {
          summary: "示例来源。",
          items: [
            { title: "Federal Reserve", publisher: "Federal Reserve", date: "2024", url: "https://www.federalreserve.gov/", reason: "核对宏观背景。" },
            { title: "Company IR", publisher: "Company IR", date: "2024", url: "https://example.com/ir", reason: "核对资料。" },
          ],
        },
      },
    },
  ],
};

const normalized = normalizeManifest(manifest);
assert.equal(normalized.cases[0].out, "offline-case.json");

const outDir = await mkdtemp(join(tmpdir(), "market-replay-library-"));
try {
  const result = await buildCaseLibrary(manifest, { outDir, validate: true });
  assert.equal(result.total, 1);
  assert.equal(result.written, 1);
  assert.equal(result.failed, false);
  assert(result.averageScore >= 80, `expected strong score, got ${result.averageScore}`);
  const written = JSON.parse(await readFile(join(outDir, "offline-case.json"), "utf8"));
  assert.equal(written.title, "Offline case");
  assert.equal(written.news[0].day, 1);
  assert.equal(written.scheduledEvents[0].day, 2);

  const dryRun = await buildCaseLibrary(manifest, { outDir, dryRun: true, validate: true });
  assert.equal(dryRun.written, 0);
  assert.equal(dryRun.dryRun, true);
} finally {
  await rm(outDir, { recursive: true, force: true });
}

const args = parseArgs(["--manifest", "library.json", "--out-dir", "packages", "--json", "--strict", "--dry-run"]);
assert.equal(args.manifest, "library.json");
assert.equal(args.outDir, "packages");
assert.equal(args.json, true);
assert.equal(args.strict, true);
assert.equal(args.dryRun, true);

assert.throws(() => normalizeManifest({ cases: [{}] }), /config or configFile/);

console.log("case library builder smoke tests passed");
