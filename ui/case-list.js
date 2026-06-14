(function caseListUiModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayCaseListUI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCaseListUiApi() {
  function renderCaseList(rows = [], options = {}) {
    const escapeHtml = htmlEscaper(options);
    return rows.map((row) => {
      const selected = row.selected ? " is-selected" : "";
      const locked = row.unlocked ? "" : " is-locked";
      const masteryTone = row.masteryLevel === "mastered" ? "real" : row.masteryLevel === "needs-work" ? "important" : "";
      const recommended = row.recommended ? `<span class="tag important">推荐下一关</span>` : "";
      const deleteButton = row.custom
        ? `<button class="mini-danger-button" type="button" data-delete-case-id="${escapeHtml(row.id)}">删除</button>`
        : "";
      return `
        <div class="case-card${selected}${locked}" data-case-id="${escapeHtml(row.id)}">
          <button class="case-main-button" type="button" data-case-id="${escapeHtml(row.id)}" ${row.unlocked ? "" : "disabled"}>
            <strong>${escapeHtml(row.idLabel)} · ${escapeHtml(row.title)}</strong>
            <span>${escapeHtml(row.level)} · ${escapeHtml(row.dataLabel)} · ${escapeHtml(row.statusLabel)}</span>
            <p>${escapeHtml(row.brief)}</p>
            <div class="case-mastery-line is-${escapeHtml(row.masteryLevel)}">
              <span>${escapeHtml(row.masteryLabel)}</span>
              <small>${escapeHtml(row.masteryDetail)}</small>
            </div>
            <div class="course-meta">${recommended}<span class="tag ${masteryTone}">${escapeHtml(row.masteryLabel)}</span><span class="tag ${row.unlocked ? "" : "locked"}">${escapeHtml(row.statusReason)}</span></div>
          </button>
          ${deleteButton}
        </div>
      `;
    }).join("");
  }

  function renderCaseLibraryCoverage(report, options = {}) {
    const escapeHtml = htmlEscaper(options);
    const hideDetails = Boolean(options.hideDetails);
    const casesLength = Number(options.casesLength) || 0;
    if (hideDetails) {
      return `
      <section class="library-coverage-card is-muted">
        <strong>考试模式隐藏覆盖详情</strong>
        <p>当前案例库共 ${casesLength} 个训练包。具体主题、行业和补课建议会在复盘后显示，避免影响本轮盲测。</p>
      </section>
    `;
    }
    const rows = Array.isArray(report?.rows) ? report.rows : [];
    const weakRows = rows.filter((row) => row.level !== "good");
    return `
    <section class="library-coverage-card is-${escapeHtml(report?.level)}">
      <div class="library-coverage-head">
        <strong>${escapeHtml(report?.summary)}</strong>
        <span>${Number(report?.covered) || 0}/${Number(report?.totalDimensions) || 0} 类达标</span>
      </div>
      <div class="library-coverage-grid">
        ${rows.map((row) => `
          <article class="library-coverage-row is-${escapeHtml(row.level)}">
            <div>
              <strong>${escapeHtml(row.label)}</strong>
              <span>${Number(row.count) || 0}/${Number(row.target) || 0} 个案例</span>
            </div>
            <small>${Number(row.score) || 0}/100</small>
          </article>
        `).join("")}
      </div>
      <div class="library-coverage-next">
        <strong>${weakRows.length ? "优先补库" : "下一步"}</strong>
        <p>${escapeHtml(weakRows[0]?.action || "覆盖已经比较均衡。下一步把匿名形态逐步替换成核对过的真实历史案例。")}</p>
      </div>
    </section>
  `;
  }

  function renderCaseTags(tags = [], options = {}) {
    const escapeHtml = htmlEscaper(options);
    return [
      ...tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`),
      ...(options.activeRemediation ? [`<span class="tag important">补练中</span>`] : []),
      `<span class="tag ${options.kindClass === "important" ? "important" : "real"}">${escapeHtml(options.kindLabel)}</span>`,
    ].join("");
  }

  function renderWatchlist(rows = [], options = {}) {
    const escapeHtml = htmlEscaper(options);
    const formatCurrency = typeof options.formatCurrency === "function" ? options.formatCurrency : defaultCurrency;
    const formatPercent = typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent;
    return rows.map((row) => `
        <button class="watch-row${row.selected ? " is-selected" : ""}" type="button" data-symbol="${escapeHtml(row.symbol)}">
          <span>
            <strong>${escapeHtml(row.displaySymbol)}</strong>
            <span class="symbol-name">${escapeHtml(row.displayName)}</span>
          </span>
          <span class="row-price">
            <strong>${formatCurrency(row.price)}</strong>
            <span class="change ${Number(row.changePct) >= 0 ? "positive" : "negative"}">${formatPercent(row.changePct)}</span>
          </span>
        </button>
      `).join("");
  }

  function renderRelativeStrengthPanel(panel = {}, options = {}) {
    const escapeHtml = htmlEscaper(options);
    const formatPercent = typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent;
    const formatPlainPercent = typeof options.formatPlainPercent === "function" ? options.formatPlainPercent : defaultPlainPercent;
    const selectedSymbol = options.selectedSymbol || "";
    const rows = Array.isArray(panel.rows) ? panel.rows : [];
    const regime = panel.regime || {};
    return `
    <div class="relative-summary is-${escapeHtml(regime.level)}">
      <strong>${escapeHtml(regime.title)}</strong>
      <p>${escapeHtml(regime.detail)}</p>
    </div>
    <div class="relative-table">
      ${rows.map((row) => `
        <button class="relative-row${row.symbol === selectedSymbol ? " is-selected" : ""}" type="button" data-symbol="${escapeHtml(row.symbol)}">
          <span>
            <strong>${escapeHtml(row.displaySymbol)}</strong>
            <small>${escapeHtml(row.roleLabel)}</small>
          </span>
          <span>
            <strong class="${Number(row.totalReturnPct) >= 0 ? "positive" : "negative"}">${formatPercent(row.totalReturnPct)}</strong>
            <small>相对 ${formatPercent(row.relativeReturnPct)}</small>
          </span>
          <span>
            <strong>${formatPlainPercent(row.recentVolatilityPct)}</strong>
            <small>近 ${Number(row.lookbackDays) || 0} 日波动</small>
          </span>
        </button>
      `).join("")}
    </div>
  `;
  }

  function htmlEscaper(options) {
    return typeof options.escapeHtml === "function" ? options.escapeHtml : defaultEscapeHtml;
  }

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function defaultCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "$0.00";
    return `$${number.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function defaultPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  }

  function defaultPlainPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00%";
    return `${number.toFixed(2)}%`;
  }

  return {
    renderCaseList,
    renderCaseLibraryCoverage,
    renderCaseTags,
    renderWatchlist,
    renderRelativeStrengthPanel,
  };
});
