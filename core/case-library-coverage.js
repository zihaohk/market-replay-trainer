(function caseLibraryCoverageModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayCaseLibraryCoverage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCaseLibraryCoverageApi() {
  const dimensions = [
    {
      key: "etf-systemic-risk",
      label: "ETF 系统性风险",
      target: 3,
      patterns: [/ETF/i, /宽基/, /系统性/, /暴跌/, /回撤/, /market/i],
      action: "补宽基和成长 ETF 同跌、快速反弹、慢熊三类案例。",
    },
    {
      key: "single-stock-event",
      label: "单股事件",
      target: 3,
      patterns: [/单股/, /\bstock\b/i, /财报/, /监管/, /黑天鹅/, /平台/, /限制交易/],
      action: "补财报、监管、产品事故或商业模式变化案例。",
    },
    {
      key: "earnings-expectation",
      label: "财报预期差",
      target: 3,
      patterns: [/财报/, /业绩/, /earnings/i, /指引/, /预期/, /收入/, /利润/],
      action: "补好财报下跌、差财报上涨、指引变化三类案例。",
    },
    {
      key: "macro-rates-inflation",
      label: "宏观利率通胀",
      target: 3,
      patterns: [/利率/, /通胀/, /CPI/i, /宏观/, /央行/, /Federal Reserve/i, /Fed/i, /加息/, /降息/],
      action: "补 CPI、议息会议和利率重定价案例。",
    },
    {
      key: "liquidity-crisis",
      label: "流动性银行压力",
      target: 2,
      patterns: [/流动性/, /liquidity/i, /银行/, /bank/i, /挤兑/, /存款/, /FDIC/i, /融资/],
      action: "补银行压力、信用收缩或流动性冲击案例。",
    },
    {
      key: "sector-rotation",
      label: "行业轮动",
      target: 2,
      patterns: [/行业/, /轮动/, /sector/i, /能源/, /防御/, /成长/, /周期/, /板块/],
      action: "补强势行业追高和弱势行业假反转案例。",
    },
    {
      key: "momentum-bubble",
      label: "追高泡沫",
      target: 2,
      patterns: [/追高/, /泡沫/, /热门/, /情绪/, /FOMO/i, /meme/i, /暴涨/, /异常上涨/],
      action: "补热门股暴涨、情绪退潮和止损执行案例。",
    },
    {
      key: "defensive-allocation",
      label: "防御配置",
      target: 2,
      patterns: [/防御/, /现金/, /保守/, /低波动/, /核心仓/, /配置/, /再平衡/, /80\/20/],
      action: "补核心仓、现金底线和再平衡案例。",
    },
    {
      key: "psychology-discipline",
      label: "心理纪律",
      target: 3,
      patterns: [/纪律/, /情绪/, /恐惧/, /贪心/, /观望/, /补仓/, /止损/, /计划/, /失效条件/],
      action: "补冲动追涨、亏损补仓和提前揭晓污染样本案例。",
    },
    {
      key: "mechanics-settlement-actions",
      label: "交易机制",
      target: 2,
      patterns: [/T\+1/i, /结算/, /good faith/i, /分红/, /拆股/, /复权/, /股息/, /税/, /限价/, /滑点/, /取消挂单/],
      action: "补限价单、结算、分红税费和复权口径案例。",
    },
  ];

  function buildCaseLibraryCoverageReport(cases = [], options = {}) {
    const safeCases = (cases || []).filter(Boolean);
    const getText = typeof options.getText === "function" ? options.getText : defaultCaseText;
    const rows = dimensions.map((dimension) => buildCaseLibraryCoverageRow(dimension, safeCases, getText));
    const score = clampScore(averageFinite(rows.map((row) => row.score)));
    const covered = rows.filter((row) => row.level === "good").length;
    const weakRows = rows.filter((row) => row.level !== "good");
    const level = weakRows.length === 0 && score >= 85
      ? "good"
      : score >= 65 && covered >= Math.ceil(rows.length * 0.6)
        ? "warn"
        : "danger";
    return {
      score,
      level,
      rows,
      weakRows,
      covered,
      totalDimensions: rows.length,
      summary: caseLibraryCoverageSummary({ safeCases, score, covered, totalDimensions: rows.length, weakRows }),
    };
  }

  function buildCaseLibraryCoverageRow(dimension, cases, getText) {
    const matchedCases = cases.filter((caseItem) => caseLibraryCaseMatchesDimension(caseItem, dimension, getText));
    const score = clampScore(Math.min(1, matchedCases.length / dimension.target) * 100);
    return {
      key: dimension.key,
      label: dimension.label,
      target: dimension.target,
      action: dimension.action,
      count: matchedCases.length,
      score,
      level: score >= 100 ? "good" : score >= 50 ? "warn" : "danger",
      caseIds: matchedCases.map((caseItem) => caseItem.id),
    };
  }

  function caseLibraryCaseMatchesDimension(caseItem, dimension, getText) {
    const text = getText(caseItem);
    return dimension.patterns.some((pattern) => pattern.test(text));
  }

  function defaultCaseText(caseItem) {
    return [
      caseItem?.id,
      caseItem?.kind,
      caseItem?.maskedTitle,
      caseItem?.maskedBrief,
      caseItem?.revealTitle,
      caseItem?.realPeriod,
      caseItem?.dataQuality,
      ...(caseItem?.tags || []),
      ...(caseItem?.lessons || []),
      caseItem?.mission?.focus,
      caseItem?.mission?.objective,
      caseItem?.mission?.trap,
      caseItem?.mission?.drill,
      ...(caseItem?.mission?.checklist || []),
      ...(caseItem?.mission?.passCriteria || []),
      ...(caseItem?.learning?.rules || []),
      ...(caseItem?.news || []).map((item) => `${item.title} ${item.category}`),
      ...(caseItem?.scheduledEvents || []).map((item) => `${item.title} ${item.type} ${item.riskLevel} ${item.detail}`),
      caseItem?.sourcePack?.summary,
      ...(caseItem?.sourcePack?.items || []).map((item) => `${item.title} ${item.publisher} ${item.kind} ${item.reason}`),
      ...(caseItem?.assets || []).map((item) => `${item.realSymbol} ${item.maskedSymbol} ${item.maskedName} ${item.type} ${item.sector}`),
    ].filter(Boolean).join(" ");
  }

  function caseLibraryCoverageSummary({ safeCases, score, covered, totalDimensions, weakRows }) {
    if (!safeCases.length) return "还没有案例包。";
    if (weakRows.length) return `案例库覆盖 ${score}/100，${covered}/${totalDimensions} 类达标，最弱是“${weakRows[0].label}”。`;
    return `案例库覆盖 ${score}/100，${covered}/${totalDimensions} 类达标，结构比较均衡。`;
  }

  function caseLibraryCoverageLevelLabel(level) {
    return {
      good: "库结构均衡",
      warn: "库有偏科",
      danger: "库明显偏科",
    }[level] || "待检查";
  }

  function averageFinite(values) {
    const finite = (values || []).map(Number).filter(Number.isFinite);
    return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0;
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  return {
    dimensions,
    buildCaseLibraryCoverageReport,
    buildCaseLibraryCoverageRow,
    caseLibraryCaseMatchesDimension,
    caseLibraryCoverageLevelLabel,
  };
});
