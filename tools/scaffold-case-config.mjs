#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_TYPES = {
  "etf-systemic-risk": {
    title: "ETF systemic risk replay",
    maskedTitle: "匿名 ETF 系统性风险训练",
    tags: ["ETF", "系统性风险", "暴跌", "现金"],
    focus: "ETF 系统性风险",
    concept: "ETF 分散的是单公司风险，不是市场一起下跌的系统性风险。训练目标是先控制仓位、现金和节奏。",
    lessons: [
      "ETF 也会在系统性风险中下跌。",
      "第一笔买入应该是验证判断，不是证明自己猜到底部。",
      "现金是风险管理工具，不是没有想法。",
    ],
    eventType: "volatility",
    eventTitle: "高波动风险窗口",
    sourceKinds: ["指数资料", "政策资料", "市场结构资料"],
  },
  "single-stock-event": {
    title: "Single stock event replay",
    maskedTitle: "匿名单股事件训练",
    tags: ["单股", "公司事件", "波动", "仓位"],
    focus: "单股事件仓位控制",
    concept: "单个公司会因为财报、监管、产品、融资或交易限制快速重定价，新手要用小仓位处理不确定性。",
    lessons: [
      "单股波动通常大于 ETF，不能用核心仓思路处理。",
      "事件行情里，先问最大亏损能否承受。",
      "消息热度不等于可交易优势。",
    ],
    eventType: "company",
    eventTitle: "公司事件窗口",
    sourceKinds: ["公司 IR", "监管文件", "交易所公告"],
  },
  "earnings-expectation": {
    title: "Earnings expectation gap replay",
    maskedTitle: "匿名财报预期差训练",
    tags: ["财报", "预期差", "收入", "利润", "指引"],
    focus: "财报与预期差",
    concept: "股价反应不只取决于财报好坏，还取决于是否超过已经反映在价格里的预期。",
    lessons: [
      "好财报不一定上涨，坏财报也不一定继续下跌。",
      "财报前后不要用市价单追情绪。",
      "复盘时要比较新闻出现当天和后续价格反应。",
    ],
    eventType: "earnings",
    eventTitle: "财报窗口",
    sourceKinds: ["公司财报", "投资者关系", "SEC 文件"],
  },
  "macro-rates-inflation": {
    title: "Macro rates and inflation replay",
    maskedTitle: "匿名宏观利率训练",
    tags: ["宏观", "利率", "通胀", "CPI", "央行"],
    focus: "宏观利率与通胀",
    concept: "利率和通胀会影响估值中枢，成长股和长久期资产通常更敏感。",
    lessons: [
      "宏观数据会改变整组资产的定价。",
      "高波动数据日前后要降低追单冲动。",
      "ETF 之间也要比较相对强弱。",
    ],
    eventType: "macro",
    eventTitle: "宏观数据窗口",
    sourceKinds: ["Federal Reserve", "BLS", "FRED"],
  },
  "liquidity-crisis": {
    title: "Liquidity crisis replay",
    maskedTitle: "匿名流动性压力训练",
    tags: ["流动性", "银行", "融资", "现金", "风险扩散"],
    focus: "流动性与银行压力",
    concept: "流动性压力会让相关资产一起重定价。训练目标是先保护现金、识别传染风险和避免连续补仓。",
    lessons: [
      "流动性压力下，相关股票可能同步下跌。",
      "现金底线比猜反弹更重要。",
      "监管或救助消息出现后，也要等价格验证。",
    ],
    eventType: "liquidity",
    eventTitle: "流动性压力窗口",
    sourceKinds: ["FDIC", "监管公告", "公司公告"],
  },
  "sector-rotation": {
    title: "Sector rotation replay",
    maskedTitle: "匿名行业轮动训练",
    tags: ["行业", "轮动", "相对强弱", "周期", "防御"],
    focus: "行业轮动",
    concept: "行业轮动不是简单追涨，而是比较相对强弱、估值压力、宏观环境和仓位角色。",
    lessons: [
      "强势行业不等于可以无脑追。",
      "弱势行业也不一定已经便宜。",
      "行业 ETF 适合训练横向比较和再平衡。",
    ],
    eventType: "sector",
    eventTitle: "行业轮动窗口",
    sourceKinds: ["行业 ETF 资料", "能源/行业数据", "公司资料"],
  },
  "momentum-bubble": {
    title: "Momentum bubble replay",
    maskedTitle: "匿名追高泡沫训练",
    tags: ["追高", "泡沫", "FOMO", "情绪", "暴涨"],
    focus: "追高与泡沫",
    concept: "暴涨行情最容易让新手把他人的收益截图当成交易依据。训练目标是小仓、少交易、先写退出条件。",
    lessons: [
      "涨得快不代表风险低。",
      "社交热度不是风险预算。",
      "错过一段上涨，比无计划重仓更可接受。",
    ],
    eventType: "sentiment",
    eventTitle: "情绪过热窗口",
    sourceKinds: ["交易所资料", "券商限制说明", "公司公告"],
  },
  "defensive-allocation": {
    title: "Defensive allocation replay",
    maskedTitle: "匿名防御配置训练",
    tags: ["防御", "现金", "核心仓", "配置", "再平衡"],
    focus: "防御配置",
    concept: "防御配置训练的是先活下来：现金底线、核心仓、卫星仓、行业集中度和再平衡纪律。",
    lessons: [
      "不交易也是主动决策。",
      "防御不是永远空仓，而是控制组合承压能力。",
      "再平衡要有规则，不能靠情绪。",
    ],
    eventType: "defensive",
    eventTitle: "防御配置检查窗口",
    sourceKinds: ["ETF 资料", "组合配置资料", "风险模型说明"],
  },
  "psychology-discipline": {
    title: "Psychology discipline replay",
    maskedTitle: "匿名心理纪律训练",
    tags: ["心理", "纪律", "补仓", "止损", "失效条件"],
    focus: "心理纪律",
    concept: "训练重点不是猜方向，而是在亏损、反弹、错过和后悔时仍按计划执行。",
    lessons: [
      "亏损后连续补仓通常是在扩大错误。",
      "止损线不是情绪线，而是计划失效线。",
      "每轮复盘必须沉淀下一条硬规则。",
    ],
    eventType: "discipline",
    eventTitle: "心理压力窗口",
    sourceKinds: ["训练说明", "交易记录", "风险规则"],
  },
  "mechanics-settlement-actions": {
    title: "Trading mechanics replay",
    maskedTitle: "匿名交易机制训练",
    tags: ["T+1", "结算", "分红", "拆股", "复权", "限价", "滑点"],
    focus: "交易机制与公司行动",
    concept: "真实交易不只看涨跌，还要理解结算、现金账户纪律、限价成交、分红税、拆股和复权口径。",
    lessons: [
      "卖出款不等于立即完全可用现金。",
      "限价单保护价格，但也可能不成交。",
      "分红和拆股要看总资产和复权口径。",
    ],
    eventType: "mechanics",
    eventTitle: "交易机制检查窗口",
    sourceKinds: ["券商规则", "公司行动公告", "税务资料"],
  },
};

const HELP = `
Market Replay case config scaffolder

Usage:
  node tools/scaffold-case-config.mjs --type earnings-expectation --symbols META,SPY --start 2022-01-25 --end 2022-02-10 --out configs/meta-earnings.json
  node tools/scaffold-case-config.mjs --list

Options:
  --type <key>        Template type. Use --list to see keys.
  --symbols <list>    Comma separated symbols. First symbol is the main asset.
  --start <date>      Start date, YYYY-MM-DD.
  --end <date>        End date, YYYY-MM-DD.
  --title <text>      Optional title.
  --out <file>        Write JSON config to file. If omitted, prints to stdout.
  --list              List available template types.
  --help              Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  if (args.list) {
    process.stdout.write(`${listTemplateTypes().join("\n")}\n`);
    return;
  }
  const config = scaffoldCaseConfig(args);
  const output = `${JSON.stringify(config, null, 2)}\n`;
  if (args.out) {
    const outPath = resolve(args.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, output, "utf8");
    process.stderr.write(`Wrote ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

export function parseArgs(argv) {
  const args = { list: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--list") args.list = true;
    else if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}.`);
      args[key] = value;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }
  return args;
}

export function listTemplateTypes() {
  return Object.entries(TEMPLATE_TYPES).map(([key, template]) => `${key} - ${template.focus}`);
}

export function scaffoldCaseConfig(args) {
  const type = String(args.type || "").trim();
  const template = TEMPLATE_TYPES[type];
  if (!template) throw new Error(`Unknown template type: ${type || "(empty)"}. Use --list.`);
  const symbols = parseSymbols(args.symbols);
  const start = normalizeDate(args.start, "start");
  const end = normalizeDate(args.end, "end");
  if (new Date(start) > new Date(end)) throw new Error("start must be before or equal to end.");
  const title = String(args.title || template.title).trim();
  const mainSymbol = symbols[0];
  return {
    title,
    maskedTitle: template.maskedTitle,
    maskedBrief: `训练主题：${template.focus}。真实代码和日期在训练中隐藏，复盘后再核对。`,
    revealTitle: title,
    start,
    end,
    tags: template.tags,
    assets: symbols.map((symbol, index) => ({
      symbol,
      maskedSymbol: `PKG-${String.fromCharCode(65 + index)}`,
      maskedName: index === 0 ? "匿名主标的" : `匿名对照标的 ${index + 1}`,
      type: index === 0 && !/ETF|SPY|QQQ|DIA|IWM|XL[A-Z]/i.test(symbol) ? "stock" : "etf",
      sector: index === 0 ? "primary" : "benchmark",
    })),
    news: [
      {
        date: start,
        title: `训练起点：围绕${template.focus}建立基准假设，先记录风险而不是急着交易。`,
        category: "important",
      },
      {
        date: start,
        title: `关键观察：${mainSymbol} 出现与本主题相关的可见信息，等待价格和成交量验证。`,
        category: "important",
      },
    ],
    scheduledEvents: [
      {
        date: start,
        title: template.eventTitle,
        type: template.eventType,
        riskLevel: "danger",
        detail: "事件窗口前后限制追单，先检查仓位、现金、失效条件和是否需要主动观望。",
      },
    ],
    lessons: template.lessons,
    learning: buildLearning(template),
    mission: buildMission(template),
    sourcePack: buildSourcePack(template, mainSymbol),
  };
}

function buildLearning(template) {
  return {
    title: `${template.focus}课程`,
    concept: template.concept,
    rules: [
      ...template.lessons,
      "每次买入前必须写最大可接受亏损、失效条件和盈利处理计划。",
    ],
    terms: [
      { name: template.focus, description: template.concept },
      { name: "失效条件", description: "证明原计划不再成立时必须执行或重新评估的条件。" },
      { name: "主动观望", description: "在证据不足或风险过高时，有计划地不交易。" },
    ],
    quiz: {
      question: `这个案例训练“${template.focus}”时，第一优先级是什么？`,
      options: ["先控制风险和证据质量", "直接追求最大收益", "只看最后涨跌"],
      answer: 0,
      explanation: "训练目标是纪律和可复盘决策，不是事后猜中最高点或最低点。",
    },
  };
}

function buildMission(template) {
  return {
    focus: template.focus,
    objective: `训练${template.focus}场景下的证据、仓位、情绪和复盘纪律。`,
    checklist: [
      "保存训练合约和最大回撤预算。",
      "至少完成一次主动观望。",
      "买入或卖出前写清失效条件和后续处理计划。",
    ],
    passCriteria: [
      "至少 1 次主动观望。",
      "至少保存 1 条新闻判断。",
      "平均下单质量达到 80/100。",
      "复盘后保存下一轮硬规则。",
    ],
    rules: {
      minHolds: 1,
      maxTrades: 5,
      maxTurnoverPct: 65,
      maxConcentrationPct: 45,
      minNewsJudgments: 1,
      calmOnly: true,
    },
    trap: `最大陷阱是把${template.focus}场景当成普通涨跌来处理，忽视仓位和失效条件。`,
    drill: `重新训练同类${template.focus}案例，第一笔只允许小仓试探或主动观望。`,
  };
}

function buildSourcePack(template, mainSymbol) {
  return {
    summary: `请在正式训练前替换为 ${mainSymbol} 对应时期的一手资料和官方来源。`,
    items: template.sourceKinds.map((kind) => ({
      title: `${kind} source for ${mainSymbol}`,
      publisher: kind,
      date: "",
      kind,
      url: "https://example.com/replace-with-primary-source",
      reason: `复盘时核对${kind}，不要在训练前用来源标题猜答案。`,
    })),
  };
}

function parseSymbols(value) {
  const symbols = String(value || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (!symbols.length) throw new Error("Provide --symbols.");
  if (symbols.length > 6) throw new Error("At most 6 symbols are supported.");
  return symbols;
}

function normalizeDate(value, label) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must be YYYY-MM-DD.`);
  return text;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
