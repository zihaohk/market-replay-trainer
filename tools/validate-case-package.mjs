#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeInputBar } from "./build-case-package.mjs";

const HELP = `
Market Replay case package validator

Usage:
  node tools/validate-case-package.mjs packages/case.json
  node tools/validate-case-package.mjs packages/*.json --json

Options:
  --json       Print machine-readable JSON.
  --strict     Exit with failure when warnings are present.
  --help       Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  if (!args.files.length) throw new Error("Provide at least one case package JSON file.");
  const reports = [];
  for (const file of args.files) {
    const packageJson = await readJson(file);
    reports.push(...validateCasePackageInput(packageJson, { file }));
  }
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ reports }, null, 2)}\n`);
  } else {
    process.stdout.write(`${reports.map(formatReport).join("\n\n")}\n`);
  }
  const hasErrors = reports.some((report) => report.errors.length);
  const hasWarnings = reports.some((report) => report.warnings.length);
  if (hasErrors || args.strict && hasWarnings) process.exitCode = 1;
}

export function parseArgs(argv) {
  const args = { files: [], json: false, strict: false, help: false };
  argv.forEach((token) => {
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else if (token === "--strict") args.strict = true;
    else if (token.startsWith("--")) throw new Error(`Unexpected option: ${token}`);
    else args.files.push(token);
  });
  return args;
}

async function readJson(filePath) {
  const text = await readFile(resolve(filePath), "utf8");
  return JSON.parse(text);
}

export function validateCasePackage(packageJson, options = {}) {
  const context = {
    file: options.file || "",
    errors: [],
    warnings: [],
    rows: [],
  };
  if (!packageJson || typeof packageJson !== "object" || Array.isArray(packageJson)) {
    context.errors.push(issue("schema", "案例包根节点必须是 JSON 对象。"));
    return finalizeReport(packageJson, context);
  }

  const assets = validateAssets(packageJson.assets, context);
  const primaryRows = assets[0]?.rows || [];
  const dateMap = new Map(primaryRows.map((row, index) => [row.date, index]));
  validatePackageIdentity(packageJson, context);
  validateTimedItems(packageJson.news, dateMap, "news", context);
  validateTimedItems(packageJson.scheduledEvents || packageJson.events, dateMap, "scheduledEvents", context, { optional: true });
  validateLearning(packageJson.learning, packageJson.lessons, context);
  validateMission(packageJson.mission, context);
  validateSourcePack(packageJson.sourcePack, context);
  validateTrainingCoverage({ packageJson, assets }, context);
  validateBlindSafety({ packageJson, assets }, context);
  return finalizeReport(packageJson, context);
}

export function validateCasePackageInput(packageJson, options = {}) {
  if (isCaseLibraryBundle(packageJson)) {
    return validateCaseLibraryBundle(packageJson, options);
  }
  return [validateCasePackage(packageJson, options)];
}

function isCaseLibraryBundle(packageJson) {
  return Boolean(packageJson && typeof packageJson === "object" && !Array.isArray(packageJson) && Array.isArray(packageJson.cases));
}

function validateCaseLibraryBundle(bundleJson, options = {}) {
  const file = options.file || "";
  if (!bundleJson.cases.length) {
    const context = {
      file,
      errors: [issue("cases", "案例库 bundle 必须包含至少一个 case。")],
      warnings: [],
      rows: [],
    };
    return [finalizeReport({ title: bundleJson.title || bundleJson.schema || "Case library bundle" }, context)];
  }
  const seenFingerprints = new Map();
  return bundleJson.cases.map((casePackage, index) => {
    const childLabel = casePackage?.id || casePackage?.maskedTitle || `case-${index + 1}`;
    const report = validateCasePackage(casePackage, {
    ...options,
      file: `${file || "case-library"}#${childLabel}`,
    });
    const fingerprint = casePackageFingerprint(casePackage);
    if (fingerprint) {
      const first = seenFingerprints.get(fingerprint);
      if (first) {
        const duplicateMessage = `案例库 bundle 内重复：${childLabel} 与 ${first} 内容相同。`;
        report.warnings.push(issue("bundle.duplicates", duplicateMessage));
        report.recommendations = buildRecommendations({ rows: report.rows, errors: report.errors, warnings: report.warnings });
        report.summary = reportSummary({ score: report.score, level: report.level, errors: report.errors, warnings: report.warnings, rows: report.rows });
      } else {
        seenFingerprints.set(fingerprint, childLabel);
      }
    }
    return report;
  });
}

function casePackageFingerprint(casePackage) {
  if (!casePackage || typeof casePackage !== "object" || Array.isArray(casePackage)) return "";
  const payload = {
    revealTitle: cleanText(casePackage.revealTitle),
    realPeriod: cleanText(casePackage.realPeriod),
    assets: (casePackage.assets || []).map((asset) => ({
      symbol: cleanText(asset?.symbol || asset?.realSymbol || asset?.ticker).toUpperCase(),
      rows: (asset?.rows || []).map((row) => {
        const source = Array.isArray(row)
          ? { date: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] }
          : row || {};
        return [
          cleanText(source.date),
          Number(source.open),
          Number(source.high),
          Number(source.low),
          Number(source.close),
          Number(source.volume || 0),
        ];
      }),
    })),
    news: (casePackage.news || []).map((item) => [item?.day ?? item?.date ?? "", cleanText(item?.title), cleanText(item?.category)]),
    scheduledEvents: (casePackage.scheduledEvents || casePackage.events || []).map((item) => [item?.day ?? item?.date ?? "", cleanText(item?.title), cleanText(item?.type)]),
  };
  return stableHash(stableJson(payload));
}

function validatePackageIdentity(packageJson, context) {
  scoreRow(context, "identity", "基本信息", packageJson.title && packageJson.maskedTitle && packageJson.revealTitle ? 100 : 55, [
    packageJson.title ? "" : "缺少 title。",
    packageJson.maskedTitle ? "" : "缺少 maskedTitle，盲测列表会不够清楚。",
    packageJson.revealTitle ? "" : "缺少 revealTitle，复盘揭晓会不够完整。",
    packageJson.realPeriod ? "" : "建议填写 realPeriod，方便复盘核对真实区间。",
  ].filter(Boolean));
}

function validateAssets(rawAssets, context) {
  if (!Array.isArray(rawAssets) || !rawAssets.length) {
    context.errors.push(issue("assets", "必须包含 assets 数组。"));
    scoreRow(context, "assets", "行情数据", 0, ["没有可用行情。"]);
    return [];
  }
  if (rawAssets.length > 6) {
    context.errors.push(issue("assets", "一次最多 6 个标的，避免训练界面过载。"));
  }
  const assets = rawAssets.map((asset, assetIndex) => validateAsset(asset, assetIndex, context)).filter(Boolean);
  const totalRows = assets.reduce((sum, asset) => sum + asset.rows.length, 0);
  const minRows = Math.min(...assets.map((asset) => asset.rows.length));
  const commonDates = intersectionCount(assets.map((asset) => new Set(asset.rows.map((row) => row.date))));
  const duplicateMaskedSymbols = findDuplicates(assets.map((asset) => asset.maskedSymbol));
  if (duplicateMaskedSymbols.length) {
    context.errors.push(issue("assets", `maskedSymbol 重复：${duplicateMaskedSymbols.join(", ")}。`));
  }
  const score = clampScore(
    (minRows >= 60 ? 35 : minRows >= 20 ? 25 : minRows >= 5 ? 12 : 0)
    + (assets.length >= 2 ? 25 : 12)
    + (commonDates >= Math.min(20, minRows) ? 20 : commonDates >= 5 ? 12 : 0)
    + (assets.every((asset) => asset.zeroVolumeRatio < 0.25) ? 10 : 3)
    + (assets.every((asset) => asset.largeMoveCount <= Math.max(2, asset.rows.length * 0.08)) ? 10 : 4),
  );
  const details = [
    `${assets.length} 个标的，共 ${totalRows} 行；最短标的 ${Number.isFinite(minRows) ? minRows : 0} 行，共同交易日 ${commonDates} 天。`,
    assets.length >= 2 ? "有对照标的，可训练相对强弱。" : "只有单标的，仍可训练纪律，但基准比较较弱。",
  ];
  scoreRow(context, "assets", "行情数据", score, details);
  return assets;
}

function validateAsset(asset, assetIndex, context) {
  if (!asset || typeof asset !== "object") {
    context.errors.push(issue(`assets[${assetIndex}]`, "asset 必须是对象。"));
    return null;
  }
  const symbol = cleanText(asset.symbol || asset.realSymbol || asset.ticker);
  const maskedSymbol = cleanText(asset.maskedSymbol || `PKG-${String.fromCharCode(65 + assetIndex)}`);
  if (!symbol) context.errors.push(issue(`assets[${assetIndex}].symbol`, "缺少真实 symbol。"));
  const rawRows = Array.isArray(asset.rows) ? asset.rows : [];
  if (rawRows.length < 2) context.errors.push(issue(`${symbol || `assets[${assetIndex}]`}.rows`, "至少需要 2 行行情。"));
  const rows = [];
  rawRows.forEach((row, rowIndex) => {
    try {
      rows.push(normalizeInputBar(row, `${symbol || `asset ${assetIndex + 1}`} rows[${rowIndex}]`));
    } catch (error) {
      context.errors.push(issue(`${symbol || `assets[${assetIndex}]`}.rows[${rowIndex}]`, error.message));
    }
  });
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const duplicateDates = findDuplicates(rows.map((row) => row.date));
  if (duplicateDates.length) context.errors.push(issue(`${symbol}.rows`, `存在重复日期：${duplicateDates.join(", ")}。`));
  const zeroVolumeRatio = rows.length ? rows.filter((row) => !row.volume).length / rows.length : 1;
  if (zeroVolumeRatio > 0.25) {
    context.warnings.push(issue(`${symbol}.volume`, `零成交量占 ${Math.round(zeroVolumeRatio * 100)}%，流动性训练可能失真。`));
  }
  const largeMoveCount = countLargeMoves(rows, asset.type === "etf" ? 8 : 18);
  if (largeMoveCount > Math.max(2, rows.length * 0.08)) {
    context.warnings.push(issue(`${symbol}.prices`, `异常大涨跌较多（${largeMoveCount} 天），请核对拆股、复权或录入错误。`));
  }
  return {
    symbol,
    maskedSymbol,
    type: asset.type || "stock",
    rows,
    zeroVolumeRatio,
    largeMoveCount,
  };
}

function validateTimedItems(items, dateMap, label, context, options = {}) {
  if (!Array.isArray(items) || !items.length) {
    const score = options.optional ? 65 : 25;
    const detail = options.optional ? "未提供事件日；如果是财报、宏观或监管案例，建议补上。" : "未提供新闻摘要，训练信息环境偏薄。";
    scoreRow(context, label, label === "news" ? "新闻摘要" : "事件日", score, [detail]);
    if (!options.optional) context.warnings.push(issue(label, detail));
    return;
  }
  let invalidCount = 0;
  let importantCount = 0;
  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      context.errors.push(issue(`${label}[${index}]`, "条目必须是对象。"));
      invalidCount += 1;
      return;
    }
    const hasDay = Number.isInteger(item.day);
    const hasDate = typeof item.date === "string" && dateMap.has(item.date);
    if (!hasDay && !hasDate) {
      context.errors.push(issue(`${label}[${index}]`, "必须提供有效 day，或主标的交易日 date。"));
      invalidCount += 1;
    }
    const maxDay = Math.max(0, dateMap.size - 1);
    if (hasDay && (item.day < 0 || item.day > maxDay)) {
      context.errors.push(issue(`${label}[${index}].day`, `day 超出范围 0-${maxDay}。`));
      invalidCount += 1;
    }
    if (label === "news" && item.category === "important") importantCount += 1;
    if (!cleanText(item.title)) {
      context.warnings.push(issue(`${label}[${index}].title`, "缺少标题。"));
    }
  });
  const score = clampScore(
    100
    - invalidCount * 25
    - (label === "news" && importantCount < 1 ? 25 : 0)
    - (items.length < (label === "news" ? 2 : 1) ? 10 : 0),
  );
  scoreRow(context, label, label === "news" ? "新闻摘要" : "事件日", score, [
    `${items.length} 条${label === "news" ? "新闻" : "事件"}，${label === "news" ? `重要新闻 ${importantCount} 条。` : "用于提醒高风险窗口。"}`,
  ]);
}

function validateLearning(learning, lessons, context) {
  const lessonCount = Array.isArray(lessons) ? lessons.filter(Boolean).length : 0;
  if (!learning || typeof learning !== "object") {
    const score = lessonCount >= 3 ? 70 : lessonCount ? 55 : 25;
    scoreRow(context, "learning", "课程讲义", score, [
      lessonCount ? `只提供 lessons ${lessonCount} 条，网页会生成基础课程；建议补完整 learning。` : "缺少 learning 和 lessons，训练前置教学不足。",
    ]);
    return;
  }
  const termCount = Array.isArray(learning.terms) ? learning.terms.length : 0;
  const ruleCount = Array.isArray(learning.rules) ? learning.rules.length : 0;
  const quizOptions = Array.isArray(learning.quiz?.options) ? learning.quiz.options.length : 0;
  const hasAnswer = Number.isInteger(learning.quiz?.answer) && learning.quiz.answer >= 0 && learning.quiz.answer < quizOptions;
  const score = clampScore(
    (learning.title ? 12 : 0)
    + (learning.concept ? 18 : 0)
    + Math.min(20, ruleCount * 7)
    + Math.min(20, termCount * 7)
    + (learning.quiz?.question && quizOptions >= 3 && hasAnswer ? 25 : quizOptions ? 12 : 0)
    + (learning.quiz?.explanation ? 5 : 0),
  );
  scoreRow(context, "learning", "课程讲义", score, [
    `规则 ${ruleCount} 条，术语 ${termCount} 张，检查题选项 ${quizOptions} 个。`,
  ]);
}

function validateMission(mission, context) {
  if (!mission || typeof mission !== "object") {
    scoreRow(context, "mission", "任务规则", 35, ["缺少 mission，只能使用默认任务，无法体现这个经典场景的专项训练目标。"]);
    return;
  }
  const rules = mission.rules && typeof mission.rules === "object" ? mission.rules : {};
  const checklistCount = Array.isArray(mission.checklist) ? mission.checklist.length : 0;
  const passCount = Array.isArray(mission.passCriteria) ? mission.passCriteria.length : 0;
  const numericRules = ["minHolds", "maxTrades", "maxTurnoverPct", "maxConcentrationPct", "minNewsJudgments"]
    .filter((key) => Number.isFinite(Number(rules[key]))).length;
  const score = clampScore(
    (mission.focus ? 12 : 0)
    + (mission.objective ? 18 : 0)
    + Math.min(20, checklistCount * 7)
    + Math.min(20, passCount * 7)
    + Math.min(25, numericRules * 5)
    + (mission.trap && mission.drill ? 5 : 0),
  );
  scoreRow(context, "mission", "任务规则", score, [
    `检查项 ${checklistCount} 条，通过标准 ${passCount} 条，数值规则 ${numericRules}/5。`,
  ]);
}

function validateSourcePack(sourcePack, context) {
  const items = Array.isArray(sourcePack?.items) ? sourcePack.items : [];
  const linkedItems = items.filter((item) => item?.url);
  const officialishItems = linkedItems.filter((item) => /sec|federal|reserve|fdic|bls|eia|investor|relations|ir|company|treasury/i.test(`${item.publisher} ${item.url}`));
  const score = clampScore(
    (sourcePack?.summary ? 20 : 0)
    + Math.min(35, linkedItems.length * 18)
    + Math.min(25, officialishItems.length * 13)
    + Math.min(20, items.filter((item) => item?.reason).length * 7),
  );
  scoreRow(context, "sourcePack", "复盘来源", score, [
    `来源 ${items.length} 条，带链接 ${linkedItems.length} 条，疑似一手/官方来源 ${officialishItems.length} 条。`,
  ]);
  if (!linkedItems.length) context.warnings.push(issue("sourcePack", "缺少复盘来源链接，严肃训练后无法核对背景。"));
}

function validateTrainingCoverage({ packageJson, assets }, context) {
  const tags = Array.isArray(packageJson.tags) ? packageJson.tags.join(" ") : "";
  const hasRiskTheme = /暴跌|危机|财报|利率|通胀|流动性|轮动|ETF|单股|监管|防御|追高|泡沫|risk|earnings|inflation|liquidity/i.test(`${tags} ${packageJson.title || ""} ${packageJson.maskedBrief || ""}`);
  const hasBenchmark = assets.length >= 2;
  const hasImportantNews = Array.isArray(packageJson.news) && packageJson.news.some((item) => item.category === "important");
  const hasMissionNewsRule = Number(packageJson.mission?.rules?.minNewsJudgments) >= 1;
  const score = clampScore((hasRiskTheme ? 25 : 8) + (hasBenchmark ? 25 : 12) + (hasImportantNews ? 25 : 8) + (hasMissionNewsRule ? 25 : 10));
  scoreRow(context, "trainingCoverage", "训练覆盖", score, [
    `${hasRiskTheme ? "主题明确" : "主题不够明确"}；${hasBenchmark ? "有对照标的" : "缺少对照标的"}；${hasImportantNews ? "有重要新闻" : "缺少重要新闻"}；${hasMissionNewsRule ? "任务要求新闻判断" : "任务未要求新闻判断"}。`,
  ]);
}

function validateBlindSafety({ packageJson, assets }, context) {
  const visibleEntries = collectBlindVisibleText(packageJson);
  const visibleText = visibleEntries.map((item) => item.text).join("\n");
  const fileName = context.file ? basename(context.file).toLowerCase() : "";
  const realSymbols = assets.map((asset) => asset.symbol).filter((symbol) => symbol && symbol.length >= 3);
  const revealTokens = tokenizeLeakWords(`${packageJson.revealTitle || ""} ${packageJson.realPeriod || ""}`);
  const leaks = [];

  realSymbols.forEach((symbol) => {
    const symbolPattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(symbol)}([^A-Za-z0-9]|$)`, "i");
    const visibleHit = visibleEntries.find((item) => symbolPattern.test(item.text));
    if (visibleHit) leaks.push(`${visibleHit.path} 暴露真实代码 ${symbol}`);
    if (fileName && fileName.includes(symbol.toLowerCase())) leaks.push(`文件名暴露真实代码 ${symbol}`);
  });

  revealTokens.slice(0, 12).forEach((token) => {
    const tokenLower = token.toLowerCase();
    if (fileName && fileName.includes(tokenLower)) leaks.push(`文件名疑似暴露真实事件词 ${token}`);
  });

  const realYears = extractYears(packageJson.realPeriod || "");
  realYears.forEach((year) => {
    const visibleHit = visibleEntries.find((item) => item.text.includes(year));
    if (visibleHit) leaks.push(`${visibleHit.path} 暴露真实年份 ${year}`);
    if (fileName && fileName.includes(year)) leaks.push(`文件名暴露真实年份 ${year}`);
  });

  visibleEntries.forEach((entry) => {
    if (/https?:\/\//i.test(entry.text)) leaks.push(`${entry.path} 包含训练前不应显示的来源链接`);
    if (/暴跌前夜|泡沫顶点|历史大底|史诗级暴雷|后来导致|股价腰斩|主跌浪|最好操作|最佳买点|最佳卖点|最高峰值|最低谷底/.test(entry.text)) {
      leaks.push(`${entry.path} 含有明显事后结果暗示`);
    }
    if (/第\s*\d+\s*天之后会|第\s*\d+\s*天卖出|第\s*\d+\s*天买入/.test(entry.text)) {
      leaks.push(`${entry.path} 暗示关键交易日期`);
    }
  });

  const uniqueLeaks = [...new Set(leaks)].slice(0, 12);
  uniqueLeaks.forEach((message) => context.warnings.push(issue("blindSafety", message)));
  const score = clampScore(100 - uniqueLeaks.length * 20);
  scoreRow(context, "blindSafety", "盲测防剧透", score, [
    uniqueLeaks.length ? `发现 ${uniqueLeaks.length} 个潜在剧透点。` : "训练前可见字段未发现真实代码、真实年份、来源链接或明显结果暗示。",
  ], 1.1);
}

function collectBlindVisibleText(packageJson) {
  const entries = [];
  const push = (path, value) => {
    const text = cleanText(value);
    if (text) entries.push({ path, text });
  };
  push("maskedTitle", packageJson.maskedTitle);
  push("maskedBrief", packageJson.maskedBrief);
  (packageJson.assets || []).forEach((asset, index) => {
    push(`assets[${index}].maskedSymbol`, asset?.maskedSymbol);
    push(`assets[${index}].maskedName`, asset?.maskedName || asset?.name);
  });
  (packageJson.news || []).forEach((item, index) => {
    push(`news[${index}].title`, item?.title);
    push(`news[${index}].detail`, item?.detail);
  });
  (packageJson.scheduledEvents || packageJson.events || []).forEach((item, index) => {
    push(`scheduledEvents[${index}].title`, item?.title);
    push(`scheduledEvents[${index}].detail`, item?.detail);
  });
  const learning = packageJson.learning || packageJson.lessonModule;
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
  const mission = packageJson.mission;
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

function tokenizeLeakWords(text) {
  return cleanText(text)
    .split(/[^A-Za-z0-9\u4e00-\u9fff]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4 && !/^(case|replay|package|event|training|example|complete|validator|reveal|drill|202\d)$|^20\d{2}$|^至$/.test(item.toLowerCase()));
}

function extractYears(text) {
  return [...new Set((cleanText(text).match(/\b20\d{2}\b/g) || []))];
}

function finalizeReport(packageJson, context) {
  const rows = context.rows;
  const score = rows.length ? clampScore(rows.reduce((sum, row) => sum + row.score * row.weight, 0) / rows.reduce((sum, row) => sum + row.weight, 0)) : 0;
  const level = context.errors.length ? "error" : score >= 85 ? "ready" : score >= 70 ? "usable" : score >= 55 ? "draft" : "thin";
  return {
    file: context.file,
    title: packageJson?.title || "Untitled package",
    score,
    level,
    summary: reportSummary({ score, level, errors: context.errors, warnings: context.warnings, rows }),
    rows,
    errors: context.errors,
    warnings: context.warnings,
    recommendations: buildRecommendations({ rows, errors: context.errors, warnings: context.warnings }),
  };
}

function reportSummary({ score, level, errors, warnings, rows }) {
  if (errors.length) return `校验失败：${errors.length} 个错误，先修复结构和行情。`;
  const weakest = [...rows].sort((a, b) => a.score - b.score)[0];
  if (level === "ready") return `训练完整度 ${score}/100，可以作为正式训练包。`;
  if (level === "usable") return `训练完整度 ${score}/100，可以试训，但建议补强“${weakest.label}”。`;
  if (level === "draft") return `训练完整度 ${score}/100，目前是草稿。先补“${weakest.label}”。`;
  return `训练完整度 ${score}/100，材料太薄，不适合严肃训练。`;
}

function buildRecommendations({ rows, errors, warnings }) {
  const recommendations = [];
  errors.slice(0, 4).forEach((item) => recommendations.push(`修复错误：${item.message}`));
  rows.filter((row) => row.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .forEach((row) => recommendations.push(`补强${row.label}：${row.details[0]}`));
  warnings.slice(0, 3).forEach((item) => recommendations.push(`核对提醒：${item.message}`));
  return [...new Set(recommendations)].slice(0, 8);
}

function scoreRow(context, key, label, score, details, weight = 1) {
  context.rows.push({
    key,
    label,
    score: clampScore(score),
    level: score >= 85 ? "good" : score >= 70 ? "warn" : "danger",
    weight,
    details,
  });
}

function issue(path, message) {
  return { path, message };
}

function formatReport(report) {
  const lines = [
    `${report.file || report.title}`,
    `  ${report.summary}`,
    `  Level: ${report.level}; Score: ${report.score}/100; Errors: ${report.errors.length}; Warnings: ${report.warnings.length}`,
    ...report.rows.map((row) => `  - ${row.label}: ${row.score}/100 (${row.details.join(" ")})`),
  ];
  if (report.errors.length) lines.push("  Errors:", ...report.errors.map((item) => `    - ${item.path}: ${item.message}`));
  if (report.warnings.length) lines.push("  Warnings:", ...report.warnings.map((item) => `    - ${item.path}: ${item.message}`));
  if (report.recommendations.length) lines.push("  Next:", ...report.recommendations.map((item) => `    - ${item}`));
  return lines.join("\n");
}

function intersectionCount(sets) {
  if (!sets.length) return 0;
  const [first, ...rest] = sets;
  return [...first].filter((value) => rest.every((set) => set.has(value))).length;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  values.filter(Boolean).forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
}

function countLargeMoves(rows, thresholdPct) {
  let count = 0;
  rows.forEach((row, index) => {
    if (!index) return;
    const previous = rows[index - 1].close;
    const movePct = previous ? Math.abs((row.close - previous) / previous * 100) : 0;
    if (movePct >= thresholdPct) count += 1;
  });
  return count;
}

function cleanText(value) {
  return String(value || "").trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(text) {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).toUpperCase();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
