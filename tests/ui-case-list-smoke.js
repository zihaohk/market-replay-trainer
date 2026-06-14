const assert = require("node:assert/strict");

const ui = require("../ui/case-list.js");

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const caseListHtml = ui.renderCaseList([{
  id: "P-1\" onclick=\"alert(1)",
  idLabel: "M-01",
  title: "<img src=x onerror=alert(1)>",
  brief: "Brief <script>alert(1)</script>",
  level: "Custom",
  dataLabel: "案例包",
  statusLabel: "已解锁",
  statusReason: "继续训练",
  masteryLevel: "needs-work",
  masteryLabel: "需补练",
  masteryDetail: "Detail <svg onload=alert(1)>",
  selected: true,
  unlocked: true,
  recommended: true,
  custom: true,
}], { escapeHtml });

assert(caseListHtml.includes("&lt;img src=x onerror=alert(1)&gt;"));
assert(caseListHtml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
assert(caseListHtml.includes("&lt;svg onload=alert(1)&gt;"));
assert(!caseListHtml.includes("<img src=x onerror=alert(1)>"));
assert(!caseListHtml.includes("onclick=\"alert(1)"));
assert(caseListHtml.includes("推荐下一关"));

const coverageHtml = ui.renderCaseLibraryCoverage({
  level: "warn",
  summary: "Summary <b>bad</b>",
  covered: 1,
  totalDimensions: 2,
  rows: [{ level: "danger", label: "Label <img>", count: 0, target: 2, score: 25, action: "Action <script>" }],
}, { escapeHtml });

assert(coverageHtml.includes("Summary &lt;b&gt;bad&lt;/b&gt;"));
assert(coverageHtml.includes("Label &lt;img&gt;"));
assert(coverageHtml.includes("Action &lt;script&gt;"));

const hiddenCoverageHtml = ui.renderCaseLibraryCoverage({}, { hideDetails: true, casesLength: 3, escapeHtml });
assert(hiddenCoverageHtml.includes("考试模式隐藏覆盖详情"));
assert(hiddenCoverageHtml.includes("3 个训练包"));

const tagsHtml = ui.renderCaseTags(["<b>tag</b>"], {
  escapeHtml,
  activeRemediation: true,
  kindClass: "important",
  kindLabel: "<kind>",
});
assert(tagsHtml.includes("&lt;b&gt;tag&lt;/b&gt;"));
assert(tagsHtml.includes("补练中"));
assert(tagsHtml.includes("&lt;kind&gt;"));

const watchHtml = ui.renderWatchlist([{
  symbol: "BAD\" data-x=\"1",
  displaySymbol: "<BAD>",
  displayName: "<Name>",
  price: 12.3,
  changePct: -1.2,
  selected: true,
}], {
  escapeHtml,
  formatCurrency: (value) => `$${Number(value).toFixed(2)}`,
  formatPercent: (value) => `${Number(value).toFixed(1)}%`,
});
assert(watchHtml.includes("&lt;BAD&gt;"));
assert(watchHtml.includes("&lt;Name&gt;"));
assert(!watchHtml.includes('data-x="1"'));

const strengthHtml = ui.renderRelativeStrengthPanel({
  regime: { level: "warn", title: "<Regime>", detail: "<Detail>" },
  rows: [{
    symbol: "BAD\" onclick=\"alert(1)",
    displaySymbol: "<BAD>",
    roleLabel: "<role>",
    totalReturnPct: 2,
    relativeReturnPct: 1,
    recentVolatilityPct: 4,
    lookbackDays: 5,
  }],
}, {
  escapeHtml,
  selectedSymbol: "",
  formatPercent: (value) => `${Number(value).toFixed(1)}%`,
  formatPlainPercent: (value) => `${Number(value).toFixed(1)}%`,
});
assert(strengthHtml.includes("&lt;Regime&gt;"));
assert(strengthHtml.includes("&lt;BAD&gt;"));
assert(!strengthHtml.includes("onclick=\"alert(1)"));
