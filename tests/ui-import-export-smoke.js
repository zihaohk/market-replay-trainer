const assert = require("node:assert/strict");

const ui = require("../ui/import-export.js");

const helpers = {
  escapeHtml: (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;"),
  formatPercent: (value) => `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`,
  statusLabel: (status) => ({ good: "良好", warn: "提醒", danger: "危险" })[status] || status,
};

const csvHtml = ui.renderImportQualityReport({
  status: "warn",
  summary: "CSV <script>",
  symbolCount: 2,
  totalRows: 12,
  firstDate: "2024-01-02",
  lastDate: "2024-01-10",
  warnings: [{
    title: "日期异常 <b>",
    symbol: "BAD<1>",
    detail: "重复日期 <script>",
  }],
  symbolReports: [{
    symbol: "BAD<1>",
    rowCount: 6,
    firstDate: "2024-01-02",
    lastDate: "2024-01-10",
    totalReturnPct: 3.2,
    maxDrawdownPct: -5.5,
  }],
}, helpers);

assert(csvHtml.includes("CSV 数据体检"));
assert(csvHtml.includes("CSV &lt;script&gt;"));
assert(csvHtml.includes("日期异常 &lt;b&gt;"));
assert(csvHtml.includes("BAD&lt;1&gt;"));
assert(!csvHtml.includes("<script>"));

const emptyCsvHtml = ui.renderImportQualityReport({
  status: "good",
  summary: "ok",
  symbolCount: 1,
  totalRows: 2,
  firstDate: "2024-01-02",
  lastDate: "2024-01-03",
  warnings: [],
  symbolReports: [],
}, helpers);
assert(emptyCsvHtml.includes("未发现明显问题"));

const packageHtml = ui.renderScenarioPackageQualityReport({
  status: "danger",
  summary: "Package <img>",
  importedCase: {
    assets: [{}, {}],
    news: [{}],
    scheduledEvents: [{}],
    sourcePack: { items: [{ url: "https://example.com" }, { url: "" }] },
  },
  warnings: [{
    title: "盲测防剧透 <b>",
    symbol: "AAPL<script>",
    detail: "真实代码泄漏 <img>",
  }],
  readiness: {
    score: 55,
    rows: [{
      level: "danger",
      label: "课程讲义 <b>",
      detail: "缺少检查题 <script>",
      score: 30,
    }],
  },
}, "", helpers);

assert(packageHtml.includes("案例包体检"));
assert(packageHtml.includes("Package &lt;img&gt;"));
assert(packageHtml.includes("AAPL&lt;script&gt;"));
assert(packageHtml.includes("缺少检查题 &lt;script&gt;"));
assert(packageHtml.includes("完整度 55/100"));
assert(!packageHtml.includes("<script>"));

const packageErrorHtml = ui.renderScenarioPackageQualityReport(null, "Bad <json>", helpers);
assert(packageErrorHtml.includes("案例包体检失败"));
assert(packageErrorHtml.includes("Bad &lt;json&gt;"));

assert(ui.renderScenarioPackageQualityReport(null, "", helpers) === "");
assert(ui.renderImportQualityReport(null, helpers) === "");

const summary = ui.caseLibraryImportSummary({
  total: 4,
  imported: [{ fileName: "one.json" }, { fileName: "two.json" }],
  skipped: [{ fileName: "dupe.json" }],
  failed: [{ fileName: "bad.json", message: "格式错误" }],
}, "case-002");
assert(summary.includes("已导入案例库 2/4 个案例"));
assert(summary.includes("跳过重复 1 个"));
assert(summary.includes("失败 1 个：bad.json（格式错误）"));
