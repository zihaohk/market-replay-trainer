(function importersModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayImporters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createImportersApi() {
  function parseCsvBars(csvText) {
    const lines = csvLines(csvText);
    if (lines.length < 3) throw new Error("CSV 至少需要表头和 2 行数据。");
    const header = splitCsvLine(lines[0]).map((item) => item.toLowerCase());
    const indexes = csvIndexes(header, ["date", "open", "high", "low", "close", "volume"]);
    if (Object.values(indexes).some((index) => index < 0)) {
      throw new Error("CSV 表头必须包含 Date,Open,High,Low,Close,Volume。");
    }
    const rows = lines.slice(1).map((line, offset) => parseCsvBarLine(line, indexes, offset));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }

  function parseJsonPayload(packageText) {
    const text = `${packageText || ""}`.trim();
    if (!text) throw new Error("请粘贴 JSON 案例包。");
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("案例包不是有效 JSON。请检查逗号、引号和括号。");
    }
  }

  function isScenarioPackageBundle(parsedPayload) {
    return Boolean(parsedPayload && typeof parsedPayload === "object" && !Array.isArray(parsedPayload) && Array.isArray(parsedPayload.cases));
  }

  function parseScenarioPackage(packageText) {
    const parsed = parseJsonPayload(packageText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("案例包根节点必须是对象。");
    if (!Array.isArray(parsed.assets) || !parsed.assets.length) throw new Error("案例包必须包含 assets 数组。");
    if (parsed.assets.length > 6) throw new Error("一次最多导入 6 个标的，避免训练界面过载。");
    return parsed;
  }

  function normalizeScenarioPackageAsset(asset, index) {
    if (!asset || typeof asset !== "object") throw new Error(`第 ${index + 1} 个 asset 不是对象。`);
    const symbol = cleanPackageText(asset.symbol || asset.realSymbol, `ASSET${index + 1}`).toUpperCase();
    const rawRows = Array.isArray(asset.rows) ? asset.rows : Array.isArray(asset.prices) ? asset.prices : [];
    if (rawRows.length < 2) throw new Error(`${symbol} 至少需要 2 行行情。`);
    const rows = rawRows.map((row, rowIndex) => normalizeScenarioPackageBar(row, `${symbol} 第 ${rowIndex + 1} 行`));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const uniqueDates = new Set(rows.map((row) => row.date));
    if (uniqueDates.size !== rows.length) throw new Error(`${symbol} 存在重复日期。`);
    return {
      symbol,
      rows,
      maskedSymbol: cleanPackageText(asset.maskedSymbol, `PKG-${String.fromCharCode(65 + index)}`),
      maskedName: cleanPackageText(asset.maskedName || asset.name, index === 0 ? "案例包主标的" : `案例包对比标的 ${index + 1}`),
      type: ["etf", "stock", "sector"].includes(asset.type) ? asset.type : index === 0 ? "stock" : "etf",
      sector: cleanPackageText(asset.sector, index === 0 ? "custom" : `custom-${index + 1}`),
    };
  }

  function normalizeScenarioPackageBar(row, label) {
    const source = Array.isArray(row)
      ? { date: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] }
      : row;
    const date = `${source?.date || ""}`.trim();
    const open = Number(source?.open);
    const high = Number(source?.high);
    const low = Number(source?.low);
    const close = Number(source?.close);
    const volume = Math.max(0, Number.parseInt(source?.volume, 10) || 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${label} 日期格式应为 YYYY-MM-DD。`);
    if (![open, high, low, close].every(Number.isFinite)) throw new Error(`${label} 价格不是有效数字。`);
    if (high < Math.max(open, close) || low > Math.min(open, close)) throw new Error(`${label} high/low 不合理。`);
    return { date, open, high, low, close, volume };
  }

  function normalizeScenarioPackageNews(newsItems = [], assets = []) {
    const maxDay = Math.max(0, ...assets.map((asset) => asset.rows.length - 1));
    const normalized = (Array.isArray(newsItems) ? newsItems : [])
      .map((item, index) => {
        const day = clampInteger(item?.day, 0, maxDay, 0);
        const title = cleanPackageText(item?.title || item?.summary, "");
        if (!title) return null;
        const category = ["important", "noise", "lagging"].includes(item?.category) ? item.category : index === 0 ? "important" : "noise";
        return { day, title, category };
      })
      .filter(Boolean)
      .sort((a, b) => a.day - b.day);
    if (normalized.length) return normalized;
    return [{ day: 0, title: "案例包没有提供新闻摘要。本轮只根据价格、成交量、风险和你自己的研究训练。", category: "important" }];
  }

  function normalizeScenarioPackageEvents(events = [], assets = []) {
    const maxDay = Math.max(0, ...assets.map((asset) => asset.rows.length - 1));
    return (Array.isArray(events) ? events : [])
      .map((item) => {
        const title = cleanPackageText(item?.title, "");
        if (!title) return null;
        return {
          day: clampInteger(item.day, 0, maxDay, 0),
          title,
          type: cleanPackageText(item.type, "custom"),
          riskLevel: ["good", "warn", "danger"].includes(item.riskLevel) ? item.riskLevel : "warn",
          detail: cleanPackageText(item.detail, ""),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.day - b.day);
  }

  function normalizeScenarioPackageSourcePack(sourcePack, title) {
    const rawItems = Array.isArray(sourcePack?.items)
      ? sourcePack.items
      : Array.isArray(sourcePack)
        ? sourcePack
        : [];
    const items = rawItems
      .map((item) => ({
        title: cleanPackageText(item?.title || item?.name, ""),
        publisher: cleanPackageText(item?.publisher || item?.source, "导入来源"),
        date: cleanPackageText(item?.date, "复盘补充"),
        kind: cleanPackageText(item?.kind || item?.type, "导入资料"),
        url: cleanPackageText(item?.url || item?.link, ""),
        reason: cleanPackageText(item?.reason || item?.purpose || item?.description, "复盘时核对背景和数据口径。"),
      }))
      .filter((item) => item.title && item.url);
    return {
      title: cleanPackageText(sourcePack?.title, `${title} 复盘资料包`),
      summary: cleanPackageText(sourcePack?.summary, `导入案例包提供 ${items.length} 条复盘资料。训练前隐藏真实来源，揭晓后用于核对背景和数据口径。`),
      items: items.length ? items : [{
        title: "导入案例包未提供外部链接",
        publisher: "本地导入",
        date: "复盘补充",
        kind: "来源缺失",
        url: "",
        reason: "复盘时请自行补充 SEC、公司 IR、FRED、BLS、EIA 或其他一手来源。",
      }],
    };
  }

  function normalizeScenarioPackageMission(mission) {
    if (!mission || typeof mission !== "object") return null;
    const rules = mission.rules && typeof mission.rules === "object" ? mission.rules : {};
    return {
      focus: cleanPackageText(mission.focus, "案例包纪律训练"),
      objective: cleanPackageText(mission.objective, "按案例包目标完成一次有纪律的盲测训练。"),
      checklist: normalizeStringList(mission.checklist, [
        "先写训练合约和失效条件。",
        "至少记录一次观望或风险复查。",
        "复盘时比较新闻判断和后续价格反应。",
      ]),
      passCriteria: normalizeStringList(mission.passCriteria, [
        "纪律评分达到 75/100 以上。",
        "没有违反训练合约和风险预算。",
        "复盘写下一条可执行的新规则。",
      ]),
      rules: {
        minHolds: clampInteger(rules.minHolds, 0, 20, 1),
        maxTrades: clampInteger(rules.maxTrades, 0, 30, 5),
        maxTurnoverPct: clampNumber(Number(rules.maxTurnoverPct), 5, 200, 60),
        maxConcentrationPct: clampNumber(Number(rules.maxConcentrationPct), 5, 100, 40),
        calmOnly: rules.calmOnly !== false,
        minNewsJudgments: clampInteger(rules.minNewsJudgments, 0, 20, 1),
      },
      trap: cleanPackageText(mission.trap, "最大陷阱是把导入前知道的真实背景带入盲测，而不是只根据当前可见证据行动。"),
      drill: cleanPackageText(mission.drill, "重新选择同一案例包或另一个陌生案例包，重点补齐新闻判断、风险预算和复盘规则。"),
    };
  }

  function normalizeScenarioPackageLearning(learning, parsed) {
    if (!learning || typeof learning !== "object") return null;
    const quiz = learning.quiz && typeof learning.quiz === "object" ? learning.quiz : {};
    const options = normalizeStringList(quiz.options, []);
    const answer = clampInteger(quiz.answer, 0, Math.max(0, options.length - 1), 0);
    return {
      title: cleanPackageText(learning.title, `${cleanPackageText(parsed.title, "案例包")} 课程`),
      concept: cleanPackageText(learning.concept, "先理解案例包的核心训练概念，再进入行情回放。"),
      rules: normalizeStringList(learning.rules, normalizeStringList(parsed.lessons, [])),
      terms: (Array.isArray(learning.terms) ? learning.terms : [])
        .map((item) => ({
          name: cleanPackageText(item?.name, ""),
          description: cleanPackageText(item?.description, ""),
        }))
        .filter((item) => item.name && item.description)
        .slice(0, 6),
      quiz: {
        question: cleanPackageText(quiz.question, "导入案例包训练前，最应该先确认什么？"),
        options: options.length >= 2 ? options.slice(0, 4) : [
          "先看案例包课程、新闻摘要和数据质量，再按合约行动。",
          "因为知道真实背景，所以直接按记忆交易。",
          "只看最后收益，不需要记录新闻判断。",
        ],
        answer,
        explanation: cleanPackageText(quiz.explanation, "案例包训练仍然要保护盲测纪律，先理解课程和数据质量，再用新闻与价格验证判断。"),
      },
    };
  }

  function buildScenarioPackageTrainingReadiness({ importedCase, parsed = {}, priceReport = null, sourceName = "", learningModule = null, missionPlan = null } = {}) {
    const explicitLessons = Array.isArray(parsed.lessons) ? parsed.lessons.filter((item) => `${item || ""}`.trim()).length : 0;
    const explicitLearning = parsed.learning && typeof parsed.learning === "object" || parsed.lessonModule && typeof parsed.lessonModule === "object";
    const sourceCount = (importedCase?.sourcePack?.items || []).filter((item) => item.url).length;
    const importantNews = (importedCase?.news || []).filter((item) => item.category === "important").length;
    const safeMissionPlan = missionPlan || importedCase?.mission || normalizeScenarioPackageMission(parsed.mission) || { rules: { minNewsJudgments: 1, maxTrades: 5 } };
    const safeLearningModule = learningModule || importedCase?.learning || normalizeScenarioPackageLearning(parsed.learning || parsed.lessonModule, parsed) || { terms: [], quiz: { options: [] } };
    const blindSafety = buildScenarioPackageBlindSafetyReport(parsed, importedCase, { sourceName });
    const rows = [
      scenarioReadinessRow({
        label: "行情样本",
        score: priceReport?.totalRows >= 60 ? 100 : priceReport?.totalRows >= 20 ? 75 : 45,
        detail: `共 ${priceReport?.totalRows || 0} 行行情，${importedCase?.assets?.length || 0} 个标的。样本太短只能试流程，不适合严肃训练。`,
      }),
      scenarioReadinessRow({
        label: "对照标的",
        score: (importedCase?.assets?.length || 0) >= 2 ? 100 : 65,
        detail: (importedCase?.assets?.length || 0) >= 2 ? "有对照标的，可以训练相对强弱和基准比较。" : "只有单标的，仍可训练纪律，但相对强弱和组合比较较弱。",
      }),
      scenarioReadinessRow({
        label: "新闻节点",
        score: importantNews >= 2 ? 100 : importantNews >= 1 ? 80 : (importedCase?.news?.length || 0) ? 55 : 25,
        detail: `新闻 ${importedCase?.news?.length || 0} 条，重要新闻 ${importantNews} 条。经典场景最好至少有 1 条重要新闻和后续验证节点。`,
      }),
      scenarioReadinessRow({
        label: "事件日",
        score: (importedCase?.scheduledEvents?.length || 0) >= 1 || importantNews >= 2 ? 90 : 65,
        detail: importedCase?.scheduledEvents?.length ? `已标记 ${importedCase.scheduledEvents.length} 个事件日。` : "没有事件日；如果这是财报、宏观数据或监管案例，建议补 scheduledEvents。",
      }),
      scenarioReadinessRow({
        label: "课程讲义",
        score: explicitLearning ? 100 : explicitLessons >= 3 ? 80 : explicitLessons >= 1 ? 65 : 35,
        detail: explicitLearning
          ? `已提供 learning 课程，包含 ${safeLearningModule.terms?.length || 0} 张术语卡和 ${safeLearningModule.quiz?.options?.length || 0} 个检查题选项。`
          : explicitLessons
            ? `只提供 ${explicitLessons} 条 lessons，系统会生成基础课程；建议补 learning.title/concept/terms/quiz。`
            : "没有提供课程内容，系统只能使用通用课程，训练针对性不足。",
      }),
      scenarioReadinessRow({
        label: "任务规则",
        score: parsed.mission ? (safeMissionPlan.rules?.minNewsJudgments || 0) >= 1 ? 100 : 82 : 45,
        detail: parsed.mission
          ? `已提供 mission，新闻判断要求 ${safeMissionPlan.rules?.minNewsJudgments || 0} 条，最多交易 ${safeMissionPlan.rules?.maxTrades || 0} 次。`
          : "没有提供 mission，系统只能使用默认任务，无法体现这个经典场景的专项训练目标。",
      }),
      scenarioReadinessRow({
        label: "复盘来源",
        score: sourceCount >= 2 ? 100 : sourceCount === 1 ? 80 : 35,
        detail: sourceCount ? `已提供 ${sourceCount} 条外部来源。` : "没有有效来源链接，复盘时无法从一手资料继续深挖。",
      }),
      scenarioReadinessRow({
        label: "盲测防剧透",
        score: blindSafety.score,
        detail: blindSafety.leaks.length ? `发现 ${blindSafety.leaks.length} 个潜在剧透点：${blindSafety.leaks.slice(0, 3).join("；")}` : "训练前可见字段没有发现真实代码、真实年份、来源链接或明显结果暗示。",
      }),
    ];
    const score = Math.round(rows.reduce((sum, item) => sum + item.score, 0) / rows.length);
    const level = score >= 85 ? "good" : score >= 65 ? "warn" : "danger";
    return {
      score,
      level,
      rows,
      summary: scenarioReadinessSummary(score, rows),
    };
  }

  function buildScenarioPackageBlindSafetyReport(parsed = {}, importedCase = null, options = {}) {
    const entries = collectScenarioPackageVisibleText(parsed);
    const fileText = cleanPackageText(options.sourceName, "");
    const normalizedFileName = fileText.toLowerCase();
    const leaks = [];
    const realSymbols = (importedCase?.assets || [])
      .map((assetItem) => assetItem.realSymbol || assetItem.symbol)
      .filter((symbol) => symbol && symbol.length >= 3);
    realSymbols.forEach((symbol) => {
      const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(symbol)}([^A-Za-z0-9]|$)`, "i");
      const hit = entries.find((entry) => pattern.test(entry.text));
      if (hit) leaks.push(`${hit.path} 暴露真实代码 ${symbol}`);
      if (normalizedFileName && normalizedFileName.includes(symbol.toLowerCase())) leaks.push(`文件名暴露真实代码 ${symbol}`);
    });
    extractYears(parsed.realPeriod || "").forEach((year) => {
      const hit = entries.find((entry) => entry.text.includes(year));
      if (hit) leaks.push(`${hit.path} 暴露真实年份 ${year}`);
      if (normalizedFileName && normalizedFileName.includes(year)) leaks.push(`文件名暴露真实年份 ${year}`);
    });
    entries.forEach((entry) => {
      if (/https?:\/\//i.test(entry.text)) leaks.push(`${entry.path} 包含训练前不应显示的来源链接`);
      if (/暴跌前夜|泡沫顶点|历史大底|史诗级暴雷|后来导致|股价腰斩|主跌浪|最好操作|最佳买点|最佳卖点|最高峰值|最低谷底/.test(entry.text)) {
        leaks.push(`${entry.path} 含有明显事后结果暗示`);
      }
      if (/第\s*\d+\s*天之后会|第\s*\d+\s*天卖出|第\s*\d+\s*天买入/.test(entry.text)) {
        leaks.push(`${entry.path} 暗示关键交易日期`);
      }
    });
    const uniqueLeaks = [...new Set(leaks)].slice(0, 10);
    return {
      score: clampScore(100 - uniqueLeaks.length * 25),
      leaks: uniqueLeaks,
      fileText,
    };
  }

  function collectScenarioPackageVisibleText(parsed = {}) {
    const entries = [];
    const push = (path, value) => {
      const text = cleanPackageText(value, "");
      if (text) entries.push({ path, text });
    };
    push("maskedTitle", parsed.maskedTitle);
    push("maskedBrief", parsed.maskedBrief);
    (parsed.assets || []).forEach((asset, index) => {
      push(`assets[${index}].maskedSymbol`, asset?.maskedSymbol);
      push(`assets[${index}].maskedName`, asset?.maskedName || asset?.name);
    });
    (parsed.news || []).forEach((item, index) => {
      push(`news[${index}].title`, item?.title);
      push(`news[${index}].detail`, item?.detail);
    });
    (parsed.scheduledEvents || parsed.events || []).forEach((item, index) => {
      push(`scheduledEvents[${index}].title`, item?.title);
      push(`scheduledEvents[${index}].detail`, item?.detail);
    });
    const learning = parsed.learning || parsed.lessonModule;
    if (learning && typeof learning === "object") {
      push("learning.title", learning.title);
      push("learning.concept", learning.concept);
      (learning.rules || []).forEach((item, index) => push(`learning.rules[${index}]`, item));
      (learning.terms || []).forEach((item, index) => {
        push(`learning.terms[${index}].name`, item?.name);
        push(`learning.terms[${index}].description`, item?.description);
      });
      push("learning.quiz.question", learning.quiz?.question);
      (learning.quiz?.options || []).forEach((item, index) => push(`learning.quiz.options[${index}]`, item));
      push("learning.quiz.explanation", learning.quiz?.explanation);
    }
    const mission = parsed.mission;
    if (mission && typeof mission === "object") {
      push("mission.focus", mission.focus);
      push("mission.objective", mission.objective);
      (mission.checklist || []).forEach((item, index) => push(`mission.checklist[${index}]`, item));
      (mission.passCriteria || []).forEach((item, index) => push(`mission.passCriteria[${index}]`, item));
      push("mission.trap", mission.trap);
      push("mission.drill", mission.drill);
    }
    return entries;
  }

  function scenarioReadinessRow({ label, score, detail }) {
    const normalizedScore = clampScore(score);
    return {
      label,
      score: normalizedScore,
      level: normalizedScore >= 80 ? "good" : normalizedScore >= 60 ? "warn" : "danger",
      detail,
    };
  }

  function scenarioReadinessSummary(score, rows) {
    const weakest = [...rows].sort((a, b) => a.score - b.score)[0];
    if (score >= 85) return `训练完整度 ${score}/100，可以作为比较完整的案例包训练。`;
    if (score >= 65) return `训练完整度 ${score}/100，最需要补的是“${weakest.label}”：${weakest.detail}`;
    return `训练完整度 ${score}/100，当前案例包偏薄。先补“${weakest.label}”，再用于严肃训练。`;
  }

  function parseCsvAssets(csvText, fallbackSymbol = "CUSTOM") {
    const lines = csvLines(csvText);
    if (lines.length < 3) throw new Error("CSV 至少需要表头和 2 行数据。");
    const header = splitCsvLine(lines[0]).map((item) => item.toLowerCase());
    const symbolIndex = header.indexOf("symbol");
    if (symbolIndex < 0) {
      const rows = parseCsvBars(csvText);
      return [{ symbol: String(fallbackSymbol || "CUSTOM").trim().toUpperCase(), rows, type: "stock", sector: "custom" }];
    }
    const indexes = csvIndexes(header, ["symbol", "date", "open", "high", "low", "close", "volume"]);
    if (Object.values(indexes).some((index) => index < 0)) {
      throw new Error("多标的 CSV 表头必须包含 Symbol,Date,Open,High,Low,Close,Volume。");
    }
    const grouped = new Map();
    lines.slice(1).forEach((line, offset) => {
      const cells = splitCsvLine(line);
      const symbol = (cells[indexes.symbol] || "").trim().toUpperCase();
      if (!symbol) throw new Error(`第 ${offset + 2} 行缺少 Symbol。`);
      const bar = parseCsvBarCells(cells, indexes, offset);
      if (!grouped.has(symbol)) grouped.set(symbol, []);
      grouped.get(symbol).push(bar);
    });
    if (grouped.size < 1) throw new Error("CSV 没有可导入的标的。");
    if (grouped.size > 6) throw new Error("一次最多导入 6 个标的，避免训练界面过载。");
    return [...grouped.entries()].map(([symbol, rows], index) => {
      rows.sort((a, b) => a.date.localeCompare(b.date));
      const uniqueDates = new Set(rows.map((item) => item.date));
      if (uniqueDates.size !== rows.length) throw new Error(`${symbol} 存在重复日期。`);
      if (rows.length < 2) throw new Error(`${symbol} 至少需要 2 行行情。`);
      return {
        symbol,
        rows,
        type: index === 0 ? "stock" : "etf",
        sector: index === 0 ? "custom" : `custom-${index + 1}`,
      };
    });
  }

  function buildCsvQualityReport(assets, options = {}) {
    const formatPercent = typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent;
    const symbolReports = (assets || []).map((asset) => buildCsvAssetQuality(asset, { formatPercent }));
    const warnings = symbolReports.flatMap((item) => item.warnings.map((warning) => ({
      ...warning,
      symbol: item.symbol,
    })));
    const allDates = new Set();
    const dateSets = (assets || []).map((asset) => {
      const dates = new Set(asset.rows.map((row) => row.date));
      dates.forEach((date) => allDates.add(date));
      return dates;
    });
    if ((assets || []).length > 1) {
      const sharedDates = [...allDates].filter((date) => dateSets.every((dates) => dates.has(date)));
      const overlapRatio = allDates.size ? sharedDates.length / allDates.size : 1;
      if (overlapRatio < 0.7) {
        warnings.push({
          level: "warn",
          title: "多标的日期对齐较差",
          detail: `所有标的共同交易日只占 ${formatPlainPercent(overlapRatio * 100)}，对比收益和组合风险时可能失真。`,
        });
      }
    }
    const totalRows = (assets || []).reduce((sum, item) => sum + item.rows.length, 0);
    const firstDate = symbolReports.reduce((min, item) => !min || item.firstDate < min ? item.firstDate : min, "");
    const lastDate = symbolReports.reduce((max, item) => !max || item.lastDate > max ? item.lastDate : max, "");
    const status = classifyCsvQuality(warnings);
    return {
      status,
      symbolCount: (assets || []).length,
      totalRows,
      firstDate,
      lastDate,
      warnings,
      symbolReports,
      summary: csvQualitySummary(status, warnings.length),
    };
  }

  function buildCsvAssetQuality(asset, options = {}) {
    const formatPercent = typeof options.formatPercent === "function" ? options.formatPercent : defaultPercent;
    const rows = asset.rows || [];
    const warnings = [];
    const rowCount = rows.length;
    const firstDate = rows[0]?.date || "";
    const lastDate = rows[rows.length - 1]?.date || "";
    const zeroVolumeCount = rows.filter((row) => !Number.isFinite(row.volume) || row.volume <= 0).length;
    const extremeMoves = [];
    const largeGaps = [];
    rows.forEach((row, index) => {
      if (index === 0) return;
      const previous = rows[index - 1];
      const movePct = previous.close ? ((row.close - previous.close) / previous.close) * 100 : 0;
      if (Math.abs(movePct) >= 35) extremeMoves.push({ date: row.date, movePct });
      const gapDays = daysBetweenDates(previous.date, row.date);
      if (gapDays > 10) largeGaps.push({ from: previous.date, to: row.date, gapDays });
    });
    if (rowCount < 20) {
      warnings.push({
        level: "warn",
        title: "样本偏短",
        detail: `${asset.symbol} 只有 ${rowCount} 行行情，适合试功能，但不适合严肃训练。`,
      });
    }
    if (largeGaps.length) {
      const worstGap = largeGaps.reduce((max, item) => item.gapDays > max.gapDays ? item : max, largeGaps[0]);
      warnings.push({
        level: worstGap.gapDays > 21 ? "danger" : "warn",
        title: "日期缺口较大",
        detail: `${asset.symbol} 从 ${worstGap.from} 到 ${worstGap.to} 间隔 ${worstGap.gapDays} 天，可能包含缺失数据、停牌或不同频率。`,
      });
    }
    if (extremeMoves.length) {
      const worstMove = extremeMoves.reduce((max, item) => Math.abs(item.movePct) > Math.abs(max.movePct) ? item : max, extremeMoves[0]);
      warnings.push({
        level: Math.abs(worstMove.movePct) >= 60 ? "danger" : "warn",
        title: "异常单日波动",
        detail: `${asset.symbol} 在 ${worstMove.date} 单日 ${formatPercent(worstMove.movePct)}，请确认是否未复权、拆股或录入错误。`,
      });
    }
    if (rowCount && zeroVolumeCount / rowCount > 0.2) {
      warnings.push({
        level: "warn",
        title: "零成交量较多",
        detail: `${asset.symbol} 有 ${zeroVolumeCount} 行成交量为 0，可能影响流动性和摩擦判断。`,
      });
    }
    return {
      symbol: asset.symbol,
      rowCount,
      firstDate,
      lastDate,
      startClose: rows[0]?.close || 0,
      endClose: rows[rows.length - 1]?.close || 0,
      totalReturnPct: rows.length > 1 ? ((rows[rows.length - 1].close - rows[0].close) / rows[0].close) * 100 : 0,
      maxDrawdownPct: maxDrawdownFromRows(rows),
      zeroVolumeCount,
      warnings,
    };
  }

  function csvLines(csvText) {
    return String(csvText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function csvIndexes(header, fields) {
    return Object.fromEntries(fields.map((field) => [field, header.indexOf(field)]));
  }

  function parseCsvBarLine(line, indexes, offset) {
    return parseCsvBarCells(splitCsvLine(line), indexes, offset);
  }

  function parseCsvBarCells(cells, indexes, offset) {
    const date = cells[indexes.date];
    const open = Number.parseFloat(cells[indexes.open]);
    const high = Number.parseFloat(cells[indexes.high]);
    const low = Number.parseFloat(cells[indexes.low]);
    const close = Number.parseFloat(cells[indexes.close]);
    const volume = Number.parseInt(cells[indexes.volume], 10) || 0;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`第 ${offset + 2} 行日期格式应为 YYYY-MM-DD。`);
    if (![open, high, low, close].every(Number.isFinite)) throw new Error(`第 ${offset + 2} 行价格不是有效数字。`);
    if (high < Math.max(open, close) || low > Math.min(open, close)) throw new Error(`第 ${offset + 2} 行 high/low 不合理。`);
    return { date, open, high, low, close, volume };
  }

  function maxDrawdownFromRows(rows) {
    let peak = rows[0]?.close || 0;
    let maxDrawdown = 0;
    rows.forEach((row) => {
      peak = Math.max(peak, row.close);
      if (peak > 0) maxDrawdown = Math.min(maxDrawdown, ((row.close - peak) / peak) * 100);
    });
    return maxDrawdown;
  }

  function daysBetweenDates(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
    return Math.round((end - start) / 86400000);
  }

  function classifyCsvQuality(warnings) {
    if ((warnings || []).some((item) => item.level === "danger")) return "danger";
    if ((warnings || []).some((item) => item.level === "warn")) return "warn";
    return "good";
  }

  function csvQualitySummary(status, warningCount) {
    if (status === "good") return "数据结构看起来正常，可以作为训练案例。";
    if (status === "danger") return `发现 ${warningCount} 个明显风险点，建议先核对数据再训练。`;
    return `发现 ${warningCount} 个注意点，可以导入，但复盘时要记住这些限制。`;
  }

  function csvQualityStatusLabel(status) {
    if (status === "good") return "通过";
    if (status === "danger") return "需核对";
    return "注意";
  }

  function cleanPackageText(value, fallback = "") {
    const text = `${value ?? ""}`.trim();
    return text || fallback;
  }

  function normalizeStringList(value, fallback = []) {
    const list = Array.isArray(value) ? value : [];
    const normalized = list.map((item) => `${item ?? ""}`.trim()).filter(Boolean);
    return normalized.length ? normalized : fallback;
  }

  function clampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }

  function clampScore(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function extractYears(text) {
    return [...new Set((`${text || ""}`.match(/\b20\d{2}\b/g) || []))];
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function splitCsvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < String(line || "").length; index += 1) {
      const char = line[index];
      if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function formatPlainPercent(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return `${safe.toFixed(2)}%`;
  }

  function defaultPercent(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return `${safe >= 0 ? "+" : ""}${safe.toFixed(2)}%`;
  }

  return {
    parseCsvBars,
    parseCsvAssets,
    parseJsonPayload,
    isScenarioPackageBundle,
    parseScenarioPackage,
    normalizeScenarioPackageAsset,
    normalizeScenarioPackageBar,
    normalizeScenarioPackageNews,
    normalizeScenarioPackageEvents,
    normalizeScenarioPackageSourcePack,
    normalizeScenarioPackageMission,
    normalizeScenarioPackageLearning,
    buildScenarioPackageTrainingReadiness,
    buildScenarioPackageBlindSafetyReport,
    collectScenarioPackageVisibleText,
    scenarioReadinessRow,
    scenarioReadinessSummary,
    buildCsvQualityReport,
    buildCsvAssetQuality,
    maxDrawdownFromRows,
    daysBetweenDates,
    classifyCsvQuality,
    csvQualitySummary,
    csvQualityStatusLabel,
    splitCsvLine,
    cleanPackageText,
    normalizeStringList,
    extractYears,
    escapeRegExp,
  };
});
