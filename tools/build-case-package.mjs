#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `
Market Replay case package builder

Usage:
  node tools/build-case-package.mjs --config tools/example-case-config.json --out packages/example.json
  node tools/build-case-package.mjs --symbols SPY,QQQ --start 2020-02-18 --end 2020-04-29 --title "COVID replay" --out packages/covid.json

Options:
  --config <file>     JSON config with title, date range, assets, news, learning, mission and sourcePack.
                      If an asset includes rows or series.closes, the script uses local data instead of fetching Yahoo.
  --symbols <list>    Comma separated tickers when not using --config.
  --start <date>      Start date, YYYY-MM-DD.
  --end <date>        End date, YYYY-MM-DD, inclusive.
  --title <text>      Package title.
  --out <file>        Output JSON file. If omitted, prints to stdout.
  --help              Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }

  const config = args.config
    ? await readJson(args.config)
    : configFromArgs(args);
  const normalized = normalizeConfig(config);
  const assets = await Promise.all(normalized.assets.map((asset, index) => fetchAssetRows(asset, normalized, index)));
  const packageJson = buildPackage(normalized, assets);
  const output = JSON.stringify(packageJson, null, 2);
  if (args.out) {
    const outPath = resolve(args.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${output}\n`, "utf8");
    process.stderr.write(`Wrote ${outPath}\n`);
  } else {
    process.stdout.write(`${output}\n`);
  }
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    args[key] = value;
    index += 1;
  }
  return args;
}

async function readJson(filePath) {
  const text = await readFile(resolve(filePath), "utf8");
  return JSON.parse(text);
}

export function configFromArgs(args) {
  if (!args.symbols || !args.start || !args.end) {
    throw new Error("Without --config, provide --symbols, --start and --end.");
  }
  return {
    title: args.title || `${args.symbols} ${args.start} to ${args.end}`,
    start: args.start,
    end: args.end,
    assets: args.symbols.split(",").map((symbol, index) => ({
      symbol: symbol.trim().toUpperCase(),
      type: index === 0 ? "stock" : "etf",
      sector: index === 0 ? "custom" : "market",
    })),
  };
}

export function normalizeConfig(config) {
  if (!config || typeof config !== "object") throw new Error("Config must be a JSON object.");
  const start = normalizeDate(config.start, "start");
  const end = normalizeDate(config.end, "end");
  if (new Date(start) > new Date(end)) throw new Error("start must be before or equal to end.");
  const rawAssets = Array.isArray(config.assets) && config.assets.length
    ? config.assets
    : Array.isArray(config.symbols)
      ? config.symbols.map((symbol) => ({ symbol }))
      : [];
  if (!rawAssets.length) throw new Error("Config must include at least one asset.");
  if (rawAssets.length > 6) throw new Error("At most 6 assets are supported.");
  return {
    ...config,
    title: String(config.title || "Untitled replay package").trim(),
    start,
    end,
    assets: rawAssets.map((asset, index) => normalizeAssetConfig(asset, index)),
  };
}

export function normalizeAssetConfig(asset, index) {
  const symbol = String(asset.symbol || asset.ticker || "").trim().toUpperCase();
  if (!symbol) throw new Error(`Asset ${index + 1} is missing symbol.`);
  return {
    symbol,
    maskedSymbol: asset.maskedSymbol || `PKG-${String.fromCharCode(65 + index)}`,
    maskedName: asset.maskedName || (index === 0 ? "案例包主标的" : `案例包对比标的 ${index + 1}`),
    type: ["stock", "etf", "sector"].includes(asset.type) ? asset.type : index === 0 ? "stock" : "etf",
    sector: asset.sector || (index === 0 ? "custom" : "market"),
    rows: Array.isArray(asset.rows) ? asset.rows : undefined,
    series: asset.series && typeof asset.series === "object" ? asset.series : undefined,
  };
}

export function normalizeDate(value, label) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must be YYYY-MM-DD.`);
  return text;
}

export async function fetchAssetRows(asset, config) {
  if (Array.isArray(asset.rows) && asset.rows.length) {
    const rows = asset.rows.map((row, index) => normalizeInputBar(row, `${asset.symbol} rows[${index}]`));
    rows.sort((a, b) => a.date.localeCompare(b.date));
    const uniqueDates = new Set(rows.map((row) => row.date));
    if (uniqueDates.size !== rows.length) throw new Error(`${asset.symbol} has duplicate row dates.`);
    if (rows.length < 2) throw new Error(`${asset.symbol} requires at least 2 rows.`);
    return { ...asset, rows };
  }
  if (asset.series?.closes) {
    return { ...asset, rows: buildRowsFromCloseSeries(asset, config) };
  }
  const period1 = dateToUnix(config.start);
  const period2 = dateToUnix(addDays(config.end, 1));
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(asset.symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
  const response = await fetch(url, {
    headers: { "User-Agent": "market-replay-trainer/1.0" },
  });
  if (!response.ok) throw new Error(`Yahoo request failed for ${asset.symbol}: HTTP ${response.status}`);
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  if (!result || payload.chart?.error) {
    throw new Error(`Yahoo returned no chart data for ${asset.symbol}.`);
  }
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const rows = timestamps.map((timestamp, index) => {
    const row = normalizeInputBar({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: quote.open?.[index],
      high: quote.high?.[index],
      low: quote.low?.[index],
      close: quote.close?.[index],
      volume: quote.volume?.[index] || 0,
    }, `${asset.symbol} yahoo[${index}]`, { allowNull: true });
    return row;
  }).filter(Boolean);
  if (rows.length < 2) throw new Error(`${asset.symbol} returned fewer than 2 usable bars.`);
  return { ...asset, rows };
}

export function buildRowsFromCloseSeries(asset, config) {
  const closes = asset.series?.closes;
  if (!Array.isArray(closes) || closes.length < 2) {
    throw new Error(`${asset.symbol} series.closes requires at least 2 prices.`);
  }
  const dates = tradingDaysBetween(config.start, config.end);
  if (closes.length > dates.length) {
    throw new Error(`${asset.symbol} series.closes has ${closes.length} prices but only ${dates.length} trading days between start and end.`);
  }
  const baseVolume = Number(asset.series.baseVolume || asset.series.volume || 1_000_000);
  const rangePct = Math.max(0.002, Number(asset.series.rangePct || 1.2) / 100);
  return closes.map((value, index) => {
    const close = roundPrice(Number(value));
    if (!Number.isFinite(close) || close <= 0) {
      throw new Error(`${asset.symbol} series.closes[${index}] must be a positive number.`);
    }
    const previousClose = index ? roundPrice(Number(closes[index - 1])) : close;
    const gapPct = Number(asset.series.gapsPct?.[index] || 0) / 100;
    const open = roundPrice(index ? previousClose * (1 + gapPct) : close * (1 - Math.min(0.006, rangePct / 2)));
    const high = roundPrice(Math.max(open, close) * (1 + rangePct));
    const low = roundPrice(Math.min(open, close) * (1 - rangePct));
    const movePct = previousClose ? Math.abs((close - previousClose) / previousClose) : 0;
    const volumeMultiplier = 1 + Math.min(2.5, movePct * 8) + Number(asset.series.volumeSteps?.[index] || 0);
    return normalizeInputBar({
      date: dates[index],
      open,
      high,
      low,
      close,
      volume: Math.round(baseVolume * volumeMultiplier),
    }, `${asset.symbol} series[${index}]`);
  });
}

export function tradingDaysBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function buildPackage(config, assets) {
  const dateMap = buildDateIndexMap(assets[0].rows);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    title: config.title,
    maskedTitle: config.maskedTitle || config.title,
    maskedBrief: config.maskedBrief || `自动生成案例包：${assets.map((asset) => asset.symbol).join("/")}，${config.start} 至 ${config.end}。`,
    revealTitle: config.revealTitle || config.title,
    realPeriod: config.realPeriod || `${config.start} 至 ${config.end}`,
    tags: config.tags || ["案例包", "Yahoo OHLCV", assets.length > 1 ? "多标的" : "单标的"],
    dataQuality: config.dataQuality || "Yahoo Finance Chart API 日线 OHLCV 自动生成；新闻、课程、任务和来源由配置文件提供，导入前仍需人工核对。",
    assets: assets.map((asset) => ({
      symbol: asset.symbol,
      maskedSymbol: asset.maskedSymbol,
      maskedName: asset.maskedName,
      type: asset.type,
      sector: asset.sector,
      rows: asset.rows,
    })),
    news: normalizeTimedItems(config.news, dateMap, "news") || [{
      day: 0,
      date: assets[0].rows[0].date,
      title: "自动生成包未提供新闻摘要。请补充当时可见的重要信息。",
      category: "important",
    }],
    scheduledEvents: normalizeTimedItems(config.scheduledEvents || config.events, dateMap, "scheduledEvents") || [],
    lessons: config.lessons || [
      "自动生成行情只解决价格数据，不等于完成训练课程。",
      "请补充新闻摘要、事件日、任务规则和复盘来源后再用于严肃训练。",
    ],
    learning: config.learning || defaultLearning(config),
    mission: config.mission || defaultMission(),
    sourcePack: config.sourcePack || {
      summary: "自动生成包未提供外部来源。复盘前请补充公司 IR、SEC、FRED、BLS、EIA 或其他一手资料。",
      items: [],
    },
  };
}

export function buildDateIndexMap(rows) {
  return new Map(rows.map((row, index) => [row.date, index]));
}

export function normalizeTimedItems(items, dateMap, label) {
  if (!Array.isArray(items)) return null;
  return items.map((item, index) => normalizeTimedItem(item, dateMap, `${label}[${index}]`));
}

export function normalizeTimedItem(item, dateMap, label) {
  if (!item || typeof item !== "object") throw new Error(`${label} must be an object.`);
  const hasDay = Number.isInteger(item.day);
  const date = item.date ? normalizeDate(item.date, `${label}.date`) : null;
  let day = hasDay ? item.day : null;
  if (date) {
    if (!dateMap.has(date)) {
      throw new Error(`${label}.date ${date} is not a trading day in the primary asset rows.`);
    }
    day = dateMap.get(date);
  }
  if (!Number.isInteger(day) || day < 0 || day >= dateMap.size) {
    throw new Error(`${label} must include a valid day index or trading date.`);
  }
  return {
    ...item,
    day,
    date: date || [...dateMap.entries()].find(([, index]) => index === day)?.[0],
  };
}

export function defaultLearning(config) {
  return {
    title: `${config.title} 课程草稿`,
    concept: "先用价格数据复现当时环境，再补充新闻和来源材料，避免用事后记忆交易。",
    rules: [
      "自动抓取的行情需要人工核对复权、拆股、停牌和异常数据。",
      "补充新闻摘要时只写训练必要信息，不复制新闻原文。",
      "没有复盘来源的包只适合草稿，不适合严肃训练。",
    ],
    terms: [
      { name: "OHLCV", description: "开盘、最高、最低、收盘和成交量，是行情回放的基础数据。" },
      { name: "复权", description: "拆股和分红会改变历史价格口径，需要复盘时确认。" },
      { name: "训练摘要", description: "用自己的话概括当时信息环境，避免复制新闻原文。" },
    ],
    quiz: {
      question: "自动生成行情包后，最应该补什么？",
      options: ["新闻摘要、课程任务和复盘来源", "直接满仓训练", "只看最终涨跌"],
      answer: 0,
      explanation: "价格只是训练材料的一部分。完整案例还需要新闻、任务、课程和来源核对。",
    },
  };
}

export function defaultMission() {
  return {
    focus: "自动生成案例包补全训练",
    objective: "先把自动行情包补成完整训练案例，再进行盲测。",
    checklist: ["核对行情数据质量。", "补充新闻摘要和事件日。", "补充课程、任务和复盘来源。"],
    passCriteria: ["训练完整度达到 80/100 以上。", "至少 1 条新闻判断。", "复盘保存一条硬规则。"],
    rules: {
      minHolds: 1,
      maxTrades: 5,
      maxTurnoverPct: 60,
      maxConcentrationPct: 40,
      minNewsJudgments: 1,
      calmOnly: true,
    },
  };
}

export function normalizeInputBar(row, label, options = {}) {
  const source = Array.isArray(row)
    ? { date: row[0], open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5] }
    : row;
  const date = String(source?.date || "").trim();
  const open = Number(source?.open);
  const high = Number(source?.high);
  const low = Number(source?.low);
  const close = Number(source?.close);
  if (![open, high, low, close].every(Number.isFinite)) {
    if (options.allowNull) return null;
    throw new Error(`${label} has invalid OHLC values.`);
  }
  normalizeDate(date, `${label}.date`);
  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    throw new Error(`${label} has invalid high/low values.`);
  }
  return {
    date,
    open: roundPrice(open),
    high: roundPrice(high),
    low: roundPrice(low),
    close: roundPrice(close),
    volume: Math.max(0, Math.round(Number(source?.volume) || 0)),
  };
}

export function dateToUnix(dateText) {
  return Math.floor(new Date(`${dateText}T00:00:00Z`).getTime() / 1000);
}

export function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function roundPrice(value) {
  return Math.round(Number(value) * 10000) / 10000;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
