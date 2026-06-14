(function importExportUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayImportExportUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createImportExportUiApi() {
  function renderImportQualityReport(report, options = {}) {
    const helpers = buildHelpers(options);
    if (!report) return "";
    const warnings = report.warnings?.length
      ? report.warnings.map((item) => `
      <li>
        <strong>${helpers.escapeHtml(item.title)}</strong>
        <span>${helpers.escapeHtml(item.symbol ? `${item.symbol}：${item.detail}` : item.detail)}</span>
      </li>
    `).join("")
      : "<li><strong>未发现明显问题</strong><span>仍需确认复权、分红和数据源口径。</span></li>";
    const symbolRows = (report.symbolReports || []).map((item) => `
    <div class="quality-symbol-row">
      <strong>${helpers.escapeHtml(item.symbol)}</strong>
      <span>${Number(item.rowCount) || 0} 行</span>
      <span>${helpers.escapeHtml(item.firstDate)} 至 ${helpers.escapeHtml(item.lastDate)}</span>
      <span>${helpers.formatPercent(item.totalReturnPct)}</span>
      <span>最大回撤 ${helpers.formatPercent(item.maxDrawdownPct)}</span>
    </div>
  `).join("");
    return `
    <div class="quality-card is-${helpers.escapeHtml(report.status)}">
      <div class="quality-card-header">
        <strong>CSV 数据体检</strong>
        <span>${helpers.escapeHtml(helpers.statusLabel(report.status))}</span>
      </div>
      <p>${helpers.escapeHtml(report.summary)}</p>
      <div class="quality-grid">
        <span>${Number(report.symbolCount) || 0} 个标的</span>
        <span>${Number(report.totalRows) || 0} 行行情</span>
        <span>${helpers.escapeHtml(report.firstDate)} 至 ${helpers.escapeHtml(report.lastDate)}</span>
      </div>
      <ul class="quality-warning-list">${warnings}</ul>
      <div class="quality-symbol-grid">${symbolRows}</div>
    </div>
  `;
  }

  function renderScenarioPackageQualityReport(report, errorMessage = "", options = {}) {
    const helpers = buildHelpers(options);
    if (!report) {
      return errorMessage
        ? `<div class="quality-card is-danger"><div class="quality-card-header"><strong>案例包体检失败</strong><span>需修正</span></div><p>${helpers.escapeHtml(errorMessage)}</p></div>`
        : "";
    }
    const importedCase = report.importedCase || {};
    const sourceCount = (importedCase.sourcePack?.items || []).filter((item) => item.url).length;
    const warnings = report.warnings?.length
      ? report.warnings.slice(0, 8).map((item) => `
      <li>
        <strong>${helpers.escapeHtml(item.title || item.level || "注意")}</strong>
        <span>${helpers.escapeHtml(item.symbol ? `${item.symbol}：${item.detail || item.message}` : item.detail || item.message || "")}</span>
      </li>
    `).join("")
      : "<li><strong>未发现明显问题</strong><span>仍需复盘时核对一手来源、复权口径和新闻摘要。</span></li>";
    return `
    <div class="quality-card is-${helpers.escapeHtml(report.status)}">
      <div class="quality-card-header">
        <strong>案例包体检</strong>
        <span>${helpers.escapeHtml(helpers.statusLabel(report.status))}</span>
      </div>
      <p>${helpers.escapeHtml(report.summary)}</p>
      <div class="quality-grid">
        <span>${(importedCase.assets || []).length} 个标的</span>
        <span>${(importedCase.news || []).length} 条新闻</span>
        <span>${(importedCase.scheduledEvents || []).length} 个事件日</span>
        <span>${sourceCount} 条来源</span>
        <span>完整度 ${Number(report.readiness?.score) || 0}/100</span>
      </div>
      <ul class="quality-warning-list">${warnings}</ul>
      <div class="quality-readiness-grid">
        ${(report.readiness?.rows || []).map((item) => `
          <section class="quality-readiness-row is-${helpers.escapeHtml(item.level)}">
            <div>
              <strong>${helpers.escapeHtml(item.label)}</strong>
              <p>${helpers.escapeHtml(item.detail)}</p>
            </div>
            <span>${Number(item.score) || 0}/100</span>
          </section>
        `).join("")}
      </div>
    </div>
  `;
  }

  function caseLibraryImportSummary(summary = {}, lastCaseId = "") {
    const skipped = Array.isArray(summary.skipped) ? summary.skipped : [];
    const failed = Array.isArray(summary.failed) ? summary.failed : [];
    const imported = Array.isArray(summary.imported) ? summary.imported : [];
    const skippedText = skipped.length
      ? `跳过重复 ${skipped.length} 个。`
      : "";
    const failedText = failed.length
      ? `失败 ${failed.length} 个：${failed.slice(0, 3).map((item) => `${item.fileName}（${item.message}）`).join("；")}。`
      : "";
    return `已导入案例库 ${imported.length}/${Number(summary.total) || 0} 个案例，当前切到 ${lastCaseId}。${skippedText}${failedText}`;
  }

  function buildHelpers(options = {}) {
    return {
      escapeHtml: typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml,
      formatPercent: typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent,
      statusLabel: typeof options.statusLabel === "function" ? options.statusLabel : defaultStatusLabel,
    };
  }

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  }

  function defaultStatusLabel(status) {
    return {
      good: "可导入",
      warn: "需复核",
      danger: "需修正",
    }[status] || status || "未知";
  }

  return {
    renderImportQualityReport,
    renderScenarioPackageQualityReport,
    caseLibraryImportSummary,
  };
});
