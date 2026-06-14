const fs = require("fs");
const path = require("path");
const vm = require("vm");

const coveragePath = path.join(__dirname, "..", "core", "case-library-coverage.js");
const tradeLedgerPath = path.join(__dirname, "..", "core", "trade-ledger.js");
const ordersPath = path.join(__dirname, "..", "core", "orders.js");
const portfolioPath = path.join(__dirname, "..", "core", "portfolio.js");
const coursePath = path.join(__dirname, "..", "core", "course.js");
const reviewPath = path.join(__dirname, "..", "core", "review.js");
const importersPath = path.join(__dirname, "..", "core", "importers.js");
const runtimePath = path.join(__dirname, "..", "core", "runtime.js");
const sessionStatePath = path.join(__dirname, "..", "state", "session.js");
const trainingPlanUiPath = path.join(__dirname, "..", "ui", "training-plan.js");
const caseListUiPath = path.join(__dirname, "..", "ui", "case-list.js");
const riskDashboardUiPath = path.join(__dirname, "..", "ui", "risk-dashboard.js");
const tradeFormUiPath = path.join(__dirname, "..", "ui", "trade-form.js");
const importExportUiPath = path.join(__dirname, "..", "ui", "import-export.js");
const profileInsightsUiPath = path.join(__dirname, "..", "ui", "profile-insights.js");
const reviewSummaryUiPath = path.join(__dirname, "..", "ui", "review-summary.js");
const eventsUiPath = path.join(__dirname, "..", "ui", "events.js");
const starterBundleDataPath = path.join(__dirname, "..", "data", "starter-bundle.js");
const appPath = path.join(__dirname, "..", "app.js");
const coverageSource = fs.readFileSync(coveragePath, "utf8");
const tradeLedgerSource = fs.readFileSync(tradeLedgerPath, "utf8");
const ordersSource = fs.readFileSync(ordersPath, "utf8");
const portfolioSource = fs.readFileSync(portfolioPath, "utf8");
const courseSource = fs.readFileSync(coursePath, "utf8");
const reviewSource = fs.readFileSync(reviewPath, "utf8");
const importersSource = fs.readFileSync(importersPath, "utf8");
const runtimeSource = fs.readFileSync(runtimePath, "utf8");
const sessionStateSource = fs.readFileSync(sessionStatePath, "utf8");
const trainingPlanUiSource = fs.readFileSync(trainingPlanUiPath, "utf8");
const caseListUiSource = fs.readFileSync(caseListUiPath, "utf8");
const riskDashboardUiSource = fs.readFileSync(riskDashboardUiPath, "utf8");
const tradeFormUiSource = fs.readFileSync(tradeFormUiPath, "utf8");
const importExportUiSource = fs.readFileSync(importExportUiPath, "utf8");
const profileInsightsUiSource = fs.readFileSync(profileInsightsUiPath, "utf8");
const reviewSummaryUiSource = fs.readFileSync(reviewSummaryUiPath, "utf8");
const eventsUiSource = fs.readFileSync(eventsUiPath, "utf8");
const starterBundleDataSource = fs.readFileSync(starterBundleDataPath, "utf8");
const source = fs.readFileSync(appPath, "utf8");

function makeElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    className: "",
    disabled: false,
    checked: false,
    dataset: {},
    addEventListener() {},
    querySelector() {
      return makeElement();
    },
    closest() {
      return null;
    },
    getContext() {
      return {
        scale() {},
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        fill() {},
        fillRect() {},
        arc() {},
        fillText() {},
        setLineDash() {},
        createLinearGradient() {
          return { addColorStop() {} };
        },
      };
    },
    getBoundingClientRect() {
      return { width: 900, height: 360 };
    },
  };
}

const storage = new Map();
const document = {
  body: { appendChild() {} },
  createElement() {
    return { click() {}, remove() {} };
  },
  querySelector() {
    return makeElement();
  },
  querySelectorAll() {
    return [];
  },
};

const context = {
  console,
  document,
  window: {
    addEventListener() {},
    confirm: () => true,
    alert() {},
    setInterval,
    clearInterval,
    devicePixelRatio: 1,
  },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  Blob,
  URL: {
    createObjectURL: () => "blob:test",
    revokeObjectURL() {},
  },
  FileReader: function FileReader() {},
  Intl,
  Date,
  Math,
  JSON,
  Number,
  Array,
  Object,
  String,
  RegExp,
  Error,
  setInterval,
  clearInterval,
};

vm.createContext(context);
vm.runInContext(coverageSource, context, { filename: "core/case-library-coverage.js" });
vm.runInContext(tradeLedgerSource, context, { filename: "core/trade-ledger.js" });
vm.runInContext(ordersSource, context, { filename: "core/orders.js" });
vm.runInContext(portfolioSource, context, { filename: "core/portfolio.js" });
vm.runInContext(courseSource, context, { filename: "core/course.js" });
vm.runInContext(reviewSource, context, { filename: "core/review.js" });
vm.runInContext(importersSource, context, { filename: "core/importers.js" });
vm.runInContext(runtimeSource, context, { filename: "core/runtime.js" });
vm.runInContext(sessionStateSource, context, { filename: "state/session.js" });
vm.runInContext(trainingPlanUiSource, context, { filename: "ui/training-plan.js" });
vm.runInContext(caseListUiSource, context, { filename: "ui/case-list.js" });
vm.runInContext(riskDashboardUiSource, context, { filename: "ui/risk-dashboard.js" });
vm.runInContext(tradeFormUiSource, context, { filename: "ui/trade-form.js" });
vm.runInContext(importExportUiSource, context, { filename: "ui/import-export.js" });
vm.runInContext(profileInsightsUiSource, context, { filename: "ui/profile-insights.js" });
vm.runInContext(reviewSummaryUiSource, context, { filename: "ui/review-summary.js" });
vm.runInContext(eventsUiSource, context, { filename: "ui/events.js" });
vm.runInContext(starterBundleDataSource, context, { filename: "data/starter-bundle.js" });
vm.runInContext(source, context, { filename: "app.js" });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = vm.runInContext("allCases().map(c => ({ id: c.id, kind: c.kind, assets: c.assets.length, length: c.length, sources: [...new Set(c.assets.map(a => a.source))] }))", context);
assert(cases.length === 23, `expected 23 built-in cases, got ${cases.length}`);
assert(cases.filter((item) => item.kind === "historical").length === 9, "expected 9 historical cases");
assert(cases.filter((item) => item.kind === "synthetic").length === 14, "expected 14 synthetic cases");
assert(cases.filter((item) => item.kind === "historical").every((item) => item.sources.length === 1 && item.sources[0] === "yahoo-chart"), "historical cases must use yahoo-chart data");
assert(cases.every((item) => item.assets >= 2 && item.length >= 3), "every case needs enough assets and bars");
assert(vm.runInContext("allCases().filter(c => c.kind === 'historical').every(c => c.sourcePack && c.sourcePack.items.length >= 1 && c.sourcePack.items.every(item => item.publisher && item.title && item.url && item.reason))", context), "historical cases should include revealed external source packs");
assert(vm.runInContext("getCase('S-10').sourcePack.summary.includes('心理') && getCase('S-10').sourcePack.items[0].kind === '训练说明'", context), "synthetic cases should explain that they are not real news events");
assert(vm.runInContext("allCases().filter(c => c.assets[0]?.source === 'starter-builtin').length === 11 && getCase('C-011').maskedTitle.includes('订单')", context), "starter classic cases should be available as built-in training cases");

context.maliciousPackageText = JSON.stringify({
  title: "Unsafe package",
  maskedTitle: "<img src=x onerror=alert(1)>",
  maskedBrief: "Brief <script>alert(1)</script>",
  revealTitle: "Unsafe reveal",
  realPeriod: "2024-01-02 至 2024-01-03",
  tags: ["<b>tag</b>"],
  assets: [{
    symbol: "BAD",
    maskedSymbol: "BAD\" onclick=\"alert(1)",
    maskedName: "<svg onload=alert(1)>",
    type: "stock",
    sector: "custom",
    rows: [
      { date: "2024-01-02", open: 100, high: 105, low: 99, close: 103, volume: 1000000 },
      { date: "2024-01-03", open: 103, high: 106, low: 101, close: 104, volume: 1000000 },
    ],
  }, {
    symbol: "SPY",
    maskedSymbol: "SAFE-B",
    maskedName: "Benchmark",
    type: "etf",
    sector: "market",
    rows: [
      { date: "2024-01-02", open: 100, high: 101, low: 99, close: 100, volume: 1000000 },
      { date: "2024-01-03", open: 100, high: 102, low: 99, close: 101, volume: 1000000 },
    ],
  }],
  news: [{ day: 0, title: "Unsafe <img src=x>", category: "important" }],
  learning: {
    title: "Lesson <img src=x onerror=alert(2)>",
    concept: "Concept <script>alert(2)</script>",
    rules: ["Rule <iframe src=javascript:alert(2)>"],
    terms: [{ name: "Term <svg onload=alert(2)>", description: "Desc <img src=x onerror=alert(2)>" }],
    quiz: {
      question: "Question <script>alert(2)</script>",
      options: ["Option <b>bad</b>", "Safe option"],
      answer: 1,
      explanation: "Explanation <img src=x onerror=alert(2)>",
    },
  },
  sourcePack: { items: [{ title: "Unsafe link", url: "javascript:alert(1)", reason: "block" }] },
});
const escapedMaliciousUi = vm.runInContext(`
  const maliciousCase = createImportedScenarioPackageCase(maliciousPackageText);
  customCaseLibrary = [maliciousCase];
  state = defaultState(maliciousCase.id, 'novice');
  renderCaseList(maliciousCase);
  renderCaseBrief(maliciousCase);
  renderWatchlist(maliciousCase);
  renderRelativeStrengthPanel(maliciousCase);
  renderLearning(maliciousCase);
  elements.caseList.innerHTML + elements.caseTags.innerHTML + elements.watchlist.innerHTML + elements.relativeStrengthPanel.innerHTML + elements.lessonPanel.innerHTML;
`, context);
assert(!escapedMaliciousUi.includes("<img src=x onerror=alert(1)>"), "imported package title should not render raw image HTML");
assert(!escapedMaliciousUi.includes("<script>alert(1)</script>"), "imported package brief should not render raw script HTML");
assert(!escapedMaliciousUi.includes("<svg onload=alert(1)>"), "imported package asset name should not render raw SVG HTML");
assert(!escapedMaliciousUi.includes("<script>alert(2)</script>"), "imported package lesson should not render raw script HTML");
assert(!escapedMaliciousUi.includes("<iframe src=javascript:alert(2)>"), "imported package lesson rules should not render raw iframe HTML");
assert(!escapedMaliciousUi.includes("<svg onload=alert(2)>"), "imported package lesson terms should not render raw SVG HTML");
assert(!escapedMaliciousUi.includes('data-symbol="BAD" onclick="alert(1)"'), "imported package symbols should not break out of data attributes");
assert(escapedMaliciousUi.includes("&lt;img src=x onerror=alert(1)&gt;"), "imported package title should be escaped as visible text");
assert(escapedMaliciousUi.includes("&lt;svg onload=alert(1)&gt;"), "imported package asset name should be escaped as visible text");
assert(escapedMaliciousUi.includes("&lt;script&gt;alert(2)&lt;/script&gt;"), "imported package lesson scripts should be escaped as visible text");
vm.runInContext("customCaseLibrary = [];", context);

vm.runInContext("state = defaultState('C-03', 'exam'); renderCaseList(getCase('C-03')); renderCaseBrief(getCase('C-03')); renderTradeForm(getCase('C-03')); renderLearning(getCase('C-03')); renderCoursePath(); renderProfile();", context);
const examCaseListHtml = vm.runInContext("elements.caseList.innerHTML", context);
const examCaseBriefText = vm.runInContext("elements.caseTitle.textContent + ' ' + elements.caseBrief.textContent + ' ' + elements.caseTags.innerHTML", context);
const examTradeOptions = vm.runInContext("elements.symbolInput.innerHTML", context);
const examLessonHtml = vm.runInContext("elements.lessonPanel.innerHTML", context);
const examNavigationHtml = vm.runInContext("elements.coursePath.innerHTML + elements.profilePanel.innerHTML", context);
assert(examCaseListHtml.includes("M-03") && examCaseListHtml.includes("匿名训练包"), "exam mode should show anonymized case ids and titles");
assert(!/(2022 年 Meta|财报|科技|平台|估值|communication)/i.test(examCaseListHtml + examCaseBriefText + examTradeOptions + examLessonHtml + examNavigationHtml), "exam mode should hide case theme, asset names, tags, lesson concepts, and navigation hints before reveal");
assert(vm.runInContext("buildLessonGate(getCase('C-03')).passed", context), "exam mode should unlock trading without revealing the case-specific lesson gate");
vm.runInContext("state.revealed = true; renderCaseBrief(getCase('C-03'));", context);
assert(vm.runInContext("elements.caseTitle.textContent.includes('Meta')", context), "revealed exam case should show the real event title after review");
vm.runInContext("profile = loadProfileFromScratch(); state = defaultState('A-01', 'novice'); profile.completedRuns = [{ caseId: 'S-11' }];", context);
const blindPick = vm.runInContext("chooseRandomBlindCase({ random: () => 0 })", context);
assert(blindPick.caseId === "S-12" && blindPick.avoidedRecent, "random blind case picker should avoid the current case and recently completed cases when possible");
vm.runInContext("profile = loadProfileFromScratch(); state = defaultState('A-01', 'novice'); window.confirm = () => true; startRandomBlindExam(); renderCaseBrief(getCase());", context);
assert(vm.runInContext("state.mode === 'exam' && state.caseId !== 'A-01' && elements.caseTitle.textContent.includes('匿名训练包')", context), "random blind exam should switch to exam mode and start an anonymized unlocked case");
const cleanBlindReview = vm.runInContext("buildBlindIntegrityReview(getCase())", context);
assert(cleanBlindReview.active && cleanBlindReview.random && cleanBlindReview.score === 100, "clean random blind exam should start with full blind integrity");
vm.runInContext("state.mode = 'novice'; recordBlindViolation('mode-downgrade', 'test mode switch', 'danger');", context);
const downgradedBlindReview = vm.runInContext("buildBlindIntegrityReview(getCase())", context);
assert(downgradedBlindReview.dangerCount >= 1 && downgradedBlindReview.score < 100, "blind integrity review should penalize leaving exam mode");
vm.runInContext("state = defaultState('A-01', 'novice'); window.confirm = () => true; startRandomBlindExam(); const startedCase = state.caseId; const nextCase = allCases().find(c => c.id !== startedCase && getCasePathStatus(c).unlocked).id; setCase(nextCase);", context);
const switchedBlindReview = vm.runInContext("buildBlindIntegrityReview(getCase())", context);
assert(switchedBlindReview.rows.some((item) => item.type === 'manual-case-switch') && switchedBlindReview.score < 100, "manual case switching during a blind exam should remain visible in the blind integrity audit");
const blindMarkdown = vm.runInContext("buildReviewMarkdown(getCase(), buildReview(getCase()))", context);
assert(blindMarkdown.includes("## 盲测完整性审计"), "markdown export should include blind integrity audit");

const csvRows = vm.runInContext("parseCsvBars('Date,Open,High,Low,Close,Volume\\n2024-01-03,103,108,102,107,234567\\n2024-01-02,100,105,99,103,123456')", context);
assert(csvRows.length === 2, "CSV parser should parse two rows");
assert(csvRows[0].date === "2024-01-02", "CSV parser should sort rows by date");

const csvAssets = vm.runInContext("parseCsvAssets('Symbol,Date,Open,High,Low,Close,Volume\\nSPY,2024-01-02,100,105,99,103,123456\\nQQQ,2024-01-02,80,84,79,82,234567\\nSPY,2024-01-03,103,106,101,104,111111\\nQQQ,2024-01-03,82,86,81,85,222222')", context);
assert(csvAssets.length === 2, "multi-symbol CSV parser should produce two assets");
assert(csvAssets.every((item) => item.rows.length === 2), "each imported asset should have two bars");

const csvQuality = vm.runInContext("buildCsvQualityReport(parseCsvAssets('Symbol,Date,Open,High,Low,Close,Volume\\nSPY,2024-01-02,100,105,99,103,123456\\nQQQ,2024-01-02,80,84,79,82,234567\\nSPY,2024-01-03,103,106,101,104,111111\\nQQQ,2024-01-03,82,86,81,85,222222'))", context);
assert(csvQuality.symbolCount === 2, "CSV quality report should count imported symbols");
assert(csvQuality.totalRows === 4, "CSV quality report should count imported rows");
assert(csvQuality.warnings.some((item) => item.title === "样本偏短"), "CSV quality report should warn on short samples");

const abnormalCsvQuality = vm.runInContext("buildCsvQualityReport(parseCsvAssets('Date,Open,High,Low,Close,Volume\\n2024-01-02,100,105,99,100,1000\\n2024-01-03,100,230,95,220,1000\\n2024-02-20,220,222,210,215,0', 'JUMP'))", context);
assert(abnormalCsvQuality.status === "danger", "CSV quality report should flag severe gaps or extreme moves");
assert(abnormalCsvQuality.warnings.some((item) => item.title === "异常单日波动"), "CSV quality report should explain extreme moves");
assert(vm.runInContext("try { assertImportTextSize('x'.repeat(CSV_IMPORT_CHAR_LIMIT + 1), CSV_IMPORT_CHAR_LIMIT, 'CSV'); false; } catch (error) { error.message.includes('CSV 内容太大') && error.message.includes('请拆分文件'); }", context), "oversized CSV text should fail before parsing");
assert(vm.runInContext("try { importScenarioPackageFromText('x'.repeat(PACKAGE_IMPORT_CHAR_LIMIT + 1)); false; } catch (error) { error.message.includes('JSON 案例包 内容太大') && error.message.includes('请拆分文件'); }", context), "oversized scenario package text should fail before JSON parsing");
assert(vm.runInContext("formatByteSize(PACKAGE_FILE_BYTE_LIMIT).includes('MB')", context), "file size limit should be reported in MB");

const importedMulti = vm.runInContext("createImportedCase({ title: 'Multi import', symbol: 'SPY', rows: parseCsvAssets('Symbol,Date,Open,High,Low,Close,Volume\\nSPY,2024-01-02,100,105,99,103,123456\\nQQQ,2024-01-02,80,84,79,82,234567\\nSPY,2024-01-03,103,106,101,104,111111\\nQQQ,2024-01-03,82,86,81,85,222222')[0].rows, assets: parseCsvAssets('Symbol,Date,Open,High,Low,Close,Volume\\nSPY,2024-01-02,100,105,99,103,123456\\nQQQ,2024-01-02,80,84,79,82,234567\\nSPY,2024-01-03,103,106,101,104,111111\\nQQQ,2024-01-03,82,86,81,85,222222'), qualityReport: buildCsvQualityReport(parseCsvAssets('Symbol,Date,Open,High,Low,Close,Volume\\nSPY,2024-01-02,100,105,99,103,123456\\nQQQ,2024-01-02,80,84,79,82,234567\\nSPY,2024-01-03,103,106,101,104,111111\\nQQQ,2024-01-03,82,86,81,85,222222')) })", context);
assert(importedMulti.assets.length === 2, "imported multi-symbol case should expose two assets");
assert(importedMulti.assets[1].maskedSymbol === "CUSTOM-B", "second imported asset should receive a masked symbol");
assert(importedMulti.importQualityReport && importedMulti.importQualityReport.symbolCount === 2, "imported case should keep its CSV quality report");
const scenarioPackageJson = JSON.stringify({
  title: "Package import drill",
  maskedTitle: "匿名案例包",
  maskedBrief: "训练包摘要",
  revealTitle: "Revealed package event",
  realPeriod: "2024-01-02 至 2024-01-04",
  tags: ["案例包", "真实行情"],
  assets: [
    {
      symbol: "PKGA",
      type: "stock",
      sector: "custom",
      rows: [
        { date: "2024-01-02", open: 100, high: 104, low: 99, close: 103, volume: 1000000 },
        { date: "2024-01-03", open: 103, high: 111, low: 102, close: 110, volume: 1800000 },
        { date: "2024-01-04", open: 110, high: 112, low: 101, close: 102, volume: 2100000 },
      ],
    },
    {
      symbol: "SPY",
      type: "etf",
      sector: "market",
      rows: [
        ["2024-01-02", 100, 101, 99, 100, 2000000],
        ["2024-01-03", 100, 102, 99, 101, 2000000],
        ["2024-01-04", 101, 102, 98, 99, 2000000],
      ],
    },
  ],
  news: [
    { day: 0, title: "公司发布重要业务更新", category: "important" },
    { day: 2, title: "市场开始重新评估前期涨幅", category: "lagging" },
  ],
  scheduledEvents: [{ day: 1, title: "财报窗口", type: "earnings", riskLevel: "danger", detail: "事件日前后限制追单。" }],
  lessons: ["重要新闻不等于立刻追高。", "对比基准确认相对强弱。"],
  learning: {
    title: "案例包新闻课程",
    concept: "先把新闻和价格反应分开判断。",
    rules: ["新闻先分类，再决定动作。", "价格确认前只允许小仓或观望。"],
    terms: [{ name: "新闻分类", description: "重要、噪音或滞后信息的区分。" }],
    quiz: {
      question: "案例包新闻出现时，第一步是什么？",
      options: ["先分类并等待价格验证", "立刻满仓", "忽略所有新闻"],
      answer: 0,
      explanation: "先分类，后行动。",
    },
  },
  mission: { objective: "练习案例包导入后的新闻和风险纪律。", checklist: ["保存合约", "记录新闻判断"], passCriteria: ["纪律达到 75"] },
  sourcePack: {
    summary: "用于测试导入来源。",
    items: [{ title: "Company IR release", publisher: "Company IR", date: "2024-01-02", kind: "投资者关系", url: "https://example.com/ir", reason: "核对事件背景。" }],
  },
});
const packageQuality = vm.runInContext(`buildScenarioPackageQualityReport(${JSON.stringify(scenarioPackageJson)})`, context);
assert(packageQuality.importedCase.assets.length === 2 && packageQuality.importedCase.news.length === 2, "scenario package import should keep assets and news");
assert(packageQuality.importedCase.scheduledEvents.length === 1 && packageQuality.importedCase.keyDays.includes(1), "scenario package import should keep event days as key days");
assert(packageQuality.importedCase.sourcePack.items[0].reason.includes("核对"), "scenario package import should normalize source pack fields");
assert(packageQuality.importedCase.assets.every((asset) => asset.source === "imported-package"), "scenario package assets should use imported-package source labels");
assert(packageQuality.summary.includes("案例包包含") && !packageQuality.summary.includes("undefined"), "scenario package quality should produce a readable summary");
assert(packageQuality.readiness.score >= 70 && packageQuality.readiness.rows.some((item) => item.label === "课程讲义"), "scenario package quality should score training readiness");
assert(packageQuality.readiness.rows.some((item) => item.label === "盲测防剧透" && item.level === "good"), "clean scenario packages should pass UI blind-safety readiness");
vm.runInContext(`renderScenarioPackageQualityReport(buildScenarioPackageQualityReport(${JSON.stringify(scenarioPackageJson)}))`, context);
assert(vm.runInContext("elements.importPackageQualityPanel.innerHTML.includes('完整度') && elements.importPackageQualityPanel.innerHTML.includes('课程讲义')", context), "scenario package quality UI should render training-readiness rows");
const leakyScenarioPackageJson = JSON.stringify({
  ...JSON.parse(scenarioPackageJson),
  maskedTitle: "PKGA 2024 暴跌前夜",
  maskedBrief: "这是 2024 年某股票后来导致股价腰斩的案例。",
  realPeriod: "2024-01-02 至 2024-01-04",
  news: [{ day: 0, title: "https://example.com/source 提前暴露来源", category: "important" }],
  learning: {
    ...JSON.parse(scenarioPackageJson).learning,
    quiz: {
      ...JSON.parse(scenarioPackageJson).learning.quiz,
      explanation: "第 2 天卖出是最好操作。",
    },
  },
});
const leakyScenarioQuality = vm.runInContext(`buildScenarioPackageQualityReport(${JSON.stringify(leakyScenarioPackageJson)})`, context);
assert(leakyScenarioQuality.readiness.rows.some((item) => item.label === "盲测防剧透" && item.level === "danger"), "leaky scenario packages should fail UI blind-safety readiness");
assert(leakyScenarioQuality.warnings.some((item) => item.title === "盲测防剧透" && item.message.includes("真实代码")), "UI package quality should warn when visible fields leak real symbols");
vm.runInContext(`renderScenarioPackageQualityReport(buildScenarioPackageQualityReport(${JSON.stringify(leakyScenarioPackageJson)}))`, context);
assert(vm.runInContext("elements.importPackageQualityPanel.innerHTML.includes('盲测防剧透') && elements.importPackageQualityPanel.innerHTML.includes('真实代码')", context), "scenario package quality UI should render blind-safety leaks");
const leakyFileNameQuality = vm.runInContext(`buildScenarioPackageQualityReport(${JSON.stringify(scenarioPackageJson)}, { sourceName: 'PKGA-2024-crash.json' })`, context);
assert(leakyFileNameQuality.readiness.rows.some((item) => item.label === "盲测防剧透" && item.level === "danger" && item.detail.includes("文件名暴露真实代码")), "UI package quality should inspect source file names for blind-safety leaks");
const thinPackageQuality = vm.runInContext(`
  buildScenarioPackageQualityReport(JSON.stringify({
    title: 'Thin package',
    assets: [{ symbol: 'THIN', rows: [
      { date: '2024-01-02', open: 10, high: 11, low: 9, close: 10.5, volume: 1000 },
      { date: '2024-01-03', open: 10.5, high: 11, low: 10, close: 10.8, volume: 1000 }
    ] }]
  }))
`, context);
assert(thinPackageQuality.readiness.score < packageQuality.readiness.score && thinPackageQuality.warnings.some((item) => item.title === "课程讲义" || item.message?.includes("课程")), "thin scenario packages should receive training-readiness warnings");
vm.runInContext(`customCaseLibrary = []; elements.importPackageInput.value = ${JSON.stringify(scenarioPackageJson)}; importScenarioPackageCase();`, context);
const storedPackageCase = vm.runInContext("customCaseLibrary[0]", context);
assert(storedPackageCase && storedPackageCase.sourcePack.items[0].url === "https://example.com/ir", "scenario package UI import should persist the custom case");
assert(vm.runInContext("state.caseId === customCaseLibrary[0].id && getCase().assets[0].source === 'imported-package'", context), "scenario package UI import should switch to the imported case");
const textImportedPackage = vm.runInContext(`
  customCaseLibrary = [];
  importScenarioPackageFromText(${JSON.stringify(scenarioPackageJson)}, 'case-h-001.package.json');
  ({ count: customCaseLibrary.length, message: elements.importMessage.textContent, textValue: elements.importPackageInput.value });
`, context);
assert(textImportedPackage.count === 1 && textImportedPackage.message.includes("case-h-001.package.json") && textImportedPackage.textValue === "", "scenario package text import should save the case and report the source file");
const packageImportRecovery = vm.runInContext(`
  customCaseLibrary = [];
  elements.importPackageInput.value = '{';
  elements.importPackageQualityPanel.innerHTML = '';
  importScenarioPackageCase();
  const failed = {
    count: customCaseLibrary.length,
    message: elements.importMessage.textContent,
    html: elements.importPackageQualityPanel.innerHTML,
    textValue: elements.importPackageInput.value,
  };
  elements.importPackageInput.value = ${JSON.stringify(scenarioPackageJson)};
  importScenarioPackageCase();
  ({
    failed,
    count: customCaseLibrary.length,
    message: elements.importMessage.textContent,
    html: elements.importPackageQualityPanel.innerHTML,
    textValue: elements.importPackageInput.value,
    currentCaseId: state.caseId,
  });
`, context);
assert(packageImportRecovery.failed.count === 0 && packageImportRecovery.failed.message.includes("不是有效 JSON"), "failed package import should show the parse error without saving a case");
assert(packageImportRecovery.failed.html.includes("案例包体检失败") && packageImportRecovery.failed.textValue === "{", "failed package import should keep the bad text available for correction");
assert(packageImportRecovery.count === 1 && packageImportRecovery.message.includes("已导入案例包") && packageImportRecovery.textValue === "", "package import should recover after a failed attempt");
assert(packageImportRecovery.html === "" && packageImportRecovery.currentCaseId === vm.runInContext("customCaseLibrary[0].id", context), "successful retry should clear the error panel and switch to the imported case");
const fileImportedPackage = vm.runInContext(`
  customCaseLibrary = [];
  elements.importPackageInput.value = '';
  elements.importPackageFileInput.value = 'C:/fake/case-h-002.package.json';
  FileReader = function FakeFileReader() {
    this.readAsText = function readAsText(file, encoding) {
      this.result = ${JSON.stringify(scenarioPackageJson)};
      this.encoding = encoding;
      this.onload();
    };
  };
  importScenarioPackageFile({ target: { files: [{ name: 'case-h-002.package.json' }] } });
  ({ count: customCaseLibrary.length, message: elements.importMessage.textContent, fileValue: elements.importPackageFileInput.value });
`, context);
assert(fileImportedPackage.count === 1 && fileImportedPackage.message.includes("case-h-002.package.json") && fileImportedPackage.fileValue === "", "scenario package file import should read JSON files and clear the file input");
const leakyFileImportedPackage = vm.runInContext(`
  customCaseLibrary = [];
  elements.importPackageQualityPanel.innerHTML = '';
  elements.importPackageFileInput.value = 'C:/fake/PKGA-2024-crash.json';
  FileReader = function FakeFileReader() {
    this.readAsText = function readAsText(file, encoding) {
      this.result = ${JSON.stringify(scenarioPackageJson)};
      this.encoding = encoding;
      this.onload();
    };
  };
  importScenarioPackageFile({ target: { files: [{ name: 'PKGA-2024-crash.json' }] } });
  ({ count: customCaseLibrary.length, html: elements.importPackageQualityPanel.innerHTML, message: elements.importMessage.textContent });
`, context);
assert(leakyFileImportedPackage.count === 1 && leakyFileImportedPackage.html.includes("文件名暴露真实代码") && leakyFileImportedPackage.message.includes("PKGA-2024-crash.json"), "single-file package import should retain blind-safety warnings caused by file names");
const duplicatePackageImport = vm.runInContext(`
  customCaseLibrary = [];
  importScenarioPackageFromText(${JSON.stringify(scenarioPackageJson)}, 'case-h-original.package.json');
  try {
    importScenarioPackageFromText(${JSON.stringify(scenarioPackageJson)}, 'case-h-copy.package.json');
    ({ duplicateBlocked: false, count: customCaseLibrary.length, message: elements.importMessage.textContent });
  } catch (error) {
    ({ duplicateBlocked: error.code === 'duplicate-scenario-package', count: customCaseLibrary.length, message: error.message });
  }
`, context);
assert(duplicatePackageImport.duplicateBlocked && duplicatePackageImport.count === 1 && duplicatePackageImport.message.includes("已导入为"), "duplicate package imports should be blocked by content fingerprint");
const batchImportedPackages = vm.runInContext(`
  customCaseLibrary = [];
  elements.importPackageInput.value = '';
  elements.importPackageFileInput.value = 'C:/fake/multiple';
  FileReader = function FakeFileReader() {
    this.readAsText = function readAsText(file, encoding) {
      this.result = file.payload;
      this.encoding = encoding;
      this.onload();
    };
  };
  importScenarioPackageFile({ target: { files: [
    { name: 'case-h-003.package.json', payload: ${JSON.stringify(scenarioPackageJson)} },
    { name: 'broken.package.json', payload: '{' },
    { name: 'case-h-004.package.json', payload: ${JSON.stringify(scenarioPackageJson)} }
  ] } });
  ({
    count: customCaseLibrary.length,
    ids: customCaseLibrary.map((item) => item.id),
    message: elements.importMessage.textContent,
    fileValue: elements.importPackageFileInput.value,
    currentCaseId: state.caseId
  });
`, context);
assert(batchImportedPackages.count === 1, "batch package import should keep valid files while skipping duplicates and invalid files");
assert(new Set(batchImportedPackages.ids).size === 1, "batch package import should generate unique imported case ids");
assert(batchImportedPackages.message.includes("已导入 1/3") && batchImportedPackages.message.includes("跳过重复 1") && batchImportedPackages.message.includes("broken.package.json") && batchImportedPackages.fileValue === "", "batch package import should summarize successes, duplicates, and failures");
assert(batchImportedPackages.currentCaseId === batchImportedPackages.ids[0], "batch package import should switch to the last successfully imported case");
assert(vm.runInContext("sourceLabel('imported-package') === '导入案例包'", context), "source label should describe imported package data");
const packageMissionPlan = vm.runInContext("getTrainingPlan(customCaseLibrary[0])", context);
assert(packageMissionPlan.custom && packageMissionPlan.objective.includes("案例包导入") && packageMissionPlan.rules.minNewsJudgments >= 1, "scenario package mission should override the default custom mission plan");
const packageLearning = vm.runInContext("getLearningModule(customCaseLibrary[0])", context);
assert(packageLearning.title === "案例包新闻课程" && packageLearning.quiz.question.includes("第一步"), "scenario package learning module should override the default custom lesson");
vm.runInContext("state.mode = 'novice'; state.revealed = false; renderLearning(customCaseLibrary[0])", context);
assert(vm.runInContext("elements.lessonPanel.innerHTML.includes('案例包新闻课程') && elements.lessonPanel.innerHTML.includes('先分类并等待价格验证')", context), "scenario package learning should render in the lesson panel");
const fallbackLearningRule = vm.runInContext(`
  getLearningModule(createImportedScenarioPackageCase(JSON.stringify({
    title: 'Fallback lessons package',
    assets: [{ symbol: 'FLBK', rows: [
      { date: '2024-01-02', open: 10, high: 11, low: 9, close: 10.5, volume: 1000 },
      { date: '2024-01-03', open: 10.5, high: 12, low: 10, close: 11.5, volume: 1200 }
    ] }],
    lessons: ['只提供 lessons 时也应该生成课程规则。']
  }))).rules[0]
`, context);
assert(fallbackLearningRule.includes("lessons"), "scenario package lessons should generate a fallback learning module");
const packageMissionNoNews = vm.runInContext(`
  state = defaultState(customCaseLibrary[0].id, 'novice');
  state.day = currentCaseLength();
  state.revealed = true;
  state.decisions = [{ day: 0, side: 'hold', symbol: getCase().assets[0].maskedSymbol, reason: '等待新闻判断和价格验证', invalidation: '如果价格和新闻验证失败就继续观望', emotion: 'calm', evidenceSources: ['news', 'price'] }];
  evaluateMission(getCase());
`, context);
assert(!packageMissionNoNews.passed && packageMissionNoNews.items.some((item) => item.title.includes("新闻判断") && item.status === "fail"), "scenario package mission should require saved news judgments");
const packageMissionWithNews = vm.runInContext(`
  const packageNewsItem = getCase().news[0];
  const packageNewsKey = newsItemKey(getCase(), packageNewsItem);
  state.newsJudgments[packageNewsKey] = { key: packageNewsKey, day: packageNewsItem.day, title: packageNewsItem.title, importance: 'important', outlook: 'watch', action: 'watch', reason: '先观察价格是否确认新闻影响' };
  evaluateMission(getCase());
`, context);
assert(packageMissionWithNews.items.some((item) => item.title.includes("新闻判断") && item.status === "pass"), "saved news judgments should satisfy scenario package mission scoring");
const exportedBuiltInPackage = vm.runInContext("buildCasePackageExport(getCase('A-01'))", context);
assert(exportedBuiltInPackage.assets.length >= 2 && exportedBuiltInPackage.news.length >= 1, "case package export should include assets and news");
assert(exportedBuiltInPackage.learning.quiz.options.length >= 3 && exportedBuiltInPackage.mission.rules.maxTrades > 0, "case package export should include learning and mission rules");
const reimportedBuiltInPackage = vm.runInContext(`createImportedScenarioPackageCase(JSON.stringify(buildCasePackageExport(getCase('A-01'))))`, context);
assert(reimportedBuiltInPackage.assets.length === exportedBuiltInPackage.assets.length && reimportedBuiltInPackage.news.length === exportedBuiltInPackage.news.length, "exported case packages should be importable without losing assets or news");
assert(reimportedBuiltInPackage.learning.title === exportedBuiltInPackage.learning.title && reimportedBuiltInPackage.sourcePack.items.length === exportedBuiltInPackage.sourcePack.items.length, "exported case package round trip should preserve core lesson and source-pack fields");
const exportedCaseDownload = vm.runInContext("state = defaultState('A-01', 'novice'); exportCurrentCasePackage()", context);
assert(exportedCaseDownload.ok && exportedCaseDownload.filename.endsWith(".json") && exportedCaseDownload.package.schemaVersion === 1, "exporting the current case should return a JSON package payload");
const libraryExportRoundTrip = vm.runInContext(`
  customCaseLibrary = [
    createImportedScenarioPackageCase(${JSON.stringify(scenarioPackageJson)}),
    createImportedScenarioPackageCase(JSON.stringify(buildCasePackageExport(getCase('A-01'))))
  ];
  var libraryPayloadSmoke = buildCustomCaseLibraryExport();
  customCaseLibrary = [];
  var libraryImportSmoke = importScenarioPackageFromText(JSON.stringify(libraryPayloadSmoke), 'case-library-bundle.json');
  ({
    schema: libraryPayloadSmoke.schema,
    caseCount: libraryPayloadSmoke.summary.caseCount,
    hasProfile: Boolean(libraryPayloadSmoke.profile || libraryPayloadSmoke.completedRuns || libraryPayloadSmoke.state),
    imported: libraryImportSmoke.imported.length,
    stored: customCaseLibrary.length,
    message: elements.importMessage.textContent,
    currentCaseId: state.caseId
  });
`, context);
assert(libraryExportRoundTrip.schema === "market-replay-case-library" && libraryExportRoundTrip.caseCount === 2 && !libraryExportRoundTrip.hasProfile, "case library export should carry only case content");
assert(libraryExportRoundTrip.imported === 2 && libraryExportRoundTrip.stored === 2 && libraryExportRoundTrip.message.includes("已导入案例库 2/2"), "case library bundle text import should restore multiple cases");
const libraryFileImport = vm.runInContext(`
  customCaseLibrary = [];
  elements.importPackageFileInput.value = 'C:/fake/case-library-bundle.json';
  FileReader = function FakeFileReader() {
    this.readAsText = function readAsText(file, encoding) {
      this.result = JSON.stringify(libraryPayloadSmoke);
      this.encoding = encoding;
      this.onload();
    };
  };
  importScenarioPackageFile({ target: { files: [{ name: 'case-library-bundle.json' }] } });
  ({ stored: customCaseLibrary.length, message: elements.importMessage.textContent, currentCaseId: state.caseId });
`, context);
assert(libraryFileImport.stored === 2 && libraryFileImport.message.includes("已导入 2/2"), "case library bundle file import should restore all package cases");
const builtInLibraryCoverage = vm.runInContext("customCaseLibrary = []; buildCaseLibraryCoverageReport(allCases())", context);
assert(builtInLibraryCoverage.score >= 95 && builtInLibraryCoverage.rows.length >= 10 && builtInLibraryCoverage.rows.every((item) => item.level === "good"), "built-in v1 library should be broad and balanced");
vm.runInContext("state = defaultState('A-01', 'exam'); renderCaseList(getCase('A-01'));", context);
const hiddenLibraryCoverageHtml = vm.runInContext("elements.caseLibraryCoverage.innerHTML", context);
assert(hiddenLibraryCoverageHtml.includes("考试模式隐藏覆盖详情") && !hiddenLibraryCoverageHtml.includes("财报预期差"), "exam mode should hide detailed case-library coverage themes");
const starterBundleText = fs.readFileSync(path.join(__dirname, "..", "packages", "case-c-bundle.json"), "utf8");
const starterLibraryCoverage = vm.runInContext(`
  state = defaultState('A-01', 'novice');
  customCaseLibrary = [];
  const starterImportResult = importScenarioPackageFromText(${JSON.stringify(starterBundleText)}, 'case-c-bundle.json');
  renderCaseList(getCase());
  ({
    report: buildCaseLibraryCoverageReport(allCases()),
    importResult: starterImportResult,
    customCount: customCaseLibrary.length,
    label: elements.caseLibraryCoverageLabel.textContent,
    html: elements.caseLibraryCoverage.innerHTML
  });
`, context);
assert(!starterLibraryCoverage.importResult.ok && starterLibraryCoverage.importResult.skipped.length === 11 && starterLibraryCoverage.customCount === 0, "starter bundle should be recognized as already built in");
assert(starterLibraryCoverage.report.score >= 95 && starterLibraryCoverage.report.rows.every((item) => item.level === "good"), "built-in starter library should make case-library coverage balanced");
assert(starterLibraryCoverage.label.includes("库结构均衡") && starterLibraryCoverage.html.includes("交易机制") && starterLibraryCoverage.html.includes("下一步"), "case library coverage UI should render score, dimensions, and next action");
const backupRoundTrip = vm.runInContext(`
  profile = loadProfileFromScratch();
  profile.completedRuns = [{ caseId: 'A-01', disciplineScore: 88, returnPct: 2.5, missionPassed: true }];
  profile.mistakeCounts = { '追高': 1 };
  customCaseLibrary = [createImportedScenarioPackageCase(${JSON.stringify(scenarioPackageJson)})];
  state = defaultState(customCaseLibrary[0].id, 'exam');
  state.day = 1;
  state.decisions = [{ day: 1, side: 'hold', symbol: getCase().assets[0].maskedSymbol, quantity: 0, price: 0, amount: 0, emotion: 'calm', evidenceSources: ['price'], reason: 'backup test', info: 'backup test', invalidation: 'backup test' }];
  var backupPayloadSmoke = buildBackupPayload();
  profile = loadProfileFromScratch();
  customCaseLibrary = [];
  state = defaultState('B-02', 'novice');
  var backupRestoreSummarySmoke = restoreBackupPayload(backupPayloadSmoke);
  ({
    schemaVersion: backupPayloadSmoke.schemaVersion,
    summary: backupRestoreSummarySmoke,
    runs: profile.completedRuns.length,
    mistakes: profile.mistakeCounts['追高'],
    customCases: customCaseLibrary.length,
    stateCaseId: state.caseId,
    stateDay: state.day,
    stateMode: state.mode,
    stateDecisionCount: state.decisions.length,
    savedProfileRuns: JSON.parse(localStorage.getItem(PROFILE_KEY)).completedRuns.length,
    savedCustomCases: JSON.parse(localStorage.getItem(CUSTOM_CASES_KEY)).length,
    savedStateCaseId: JSON.parse(localStorage.getItem(STORAGE_KEY)).caseId,
  })
`, context);
assert(backupRoundTrip.schemaVersion === 2 && backupRoundTrip.summary.restoredState, "full backup should carry schema v2 and restore current state");
assert(backupRoundTrip.runs === 1 && backupRoundTrip.mistakes === 1 && backupRoundTrip.customCases === 1, "full backup restore should recover profile and custom cases");
assert(backupRoundTrip.stateCaseId === backupRoundTrip.summary.currentCaseId && backupRoundTrip.stateDay === 1 && backupRoundTrip.stateMode === "exam" && backupRoundTrip.stateDecisionCount === 1, "full backup restore should recover active training state");
assert(backupRoundTrip.savedProfileRuns === 1 && backupRoundTrip.savedCustomCases === 1 && backupRoundTrip.savedStateCaseId === backupRoundTrip.stateCaseId, "full backup restore should persist recovered data to localStorage");
const legacyBackupRestore = vm.runInContext(`
  var legacyBackupSmoke = { profile: { completedRuns: [{ caseId: 'C-03', disciplineScore: 77 }], mistakeCounts: {}, emotionCounts: {}, completedCaseIds: ['C-03'], lessonStats: {}, rulebook: [] }, customCases: [] };
  state = defaultState('A-01', 'advanced');
  state.day = 2;
  var legacyRestoreSummarySmoke = restoreBackupPayload(legacyBackupSmoke);
  ({ summary: legacyRestoreSummarySmoke, runs: profile.completedRuns.length, caseId: state.caseId, day: state.day, mode: state.mode })
`, context);
assert(!legacyBackupRestore.summary.restoredState && legacyBackupRestore.runs === 1, "legacy profile backups should still import without a state payload");
assert(legacyBackupRestore.caseId === "A-01" && legacyBackupRestore.day === 2 && legacyBackupRestore.mode === "advanced", "legacy backup import should keep the current training state");
const legacyProfileMigration = vm.runInContext(`
  localStorage.setItem(PROFILE_KEY, JSON.stringify({
    mistakeCounts: { '追高': 2 },
    emotionCounts: 'bad old value',
    completedCaseIds: 'bad old value',
    lessonStats: { 'A-01': { attempts: 1, passes: 1 } },
    rulebook: [{ id: 'old-rule', text: '先观望再下单', active: true }]
  }));
  const migratedProfile = loadProfile();
  ({
    runs: migratedProfile.completedRuns.length,
    mistakeCount: migratedProfile.mistakeCounts['追高'],
    emotionIsObject: typeof migratedProfile.emotionCounts === 'object' && !Array.isArray(migratedProfile.emotionCounts),
    completedCaseIdsIsArray: Array.isArray(migratedProfile.completedCaseIds),
    lessonAttempts: migratedProfile.lessonStats['A-01'].attempts,
    ruleText: migratedProfile.rulebook[0].text,
  });
`, context);
assert(legacyProfileMigration.runs === 0 && legacyProfileMigration.mistakeCount === 2, "legacy localStorage profile should keep old count fields even without completedRuns");
assert(legacyProfileMigration.emotionIsObject && legacyProfileMigration.completedCaseIdsIsArray && legacyProfileMigration.lessonAttempts === 1 && legacyProfileMigration.ruleText.includes("观望"), "legacy localStorage profile migration should repair bad field types while preserving usable fields");
const partialLegacyBackupRestore = vm.runInContext(`
  profile = loadProfileFromScratch();
  const partialLegacyBackupSmoke = { profile: { mistakeCounts: { '缺少观望': 3 }, rulebook: [{ id: 'legacy-rule', text: '第一天必须观望', active: true }] }, customCases: [] };
  const partialLegacyRestoreSummarySmoke = restoreBackupPayload(partialLegacyBackupSmoke);
  ({
    summary: partialLegacyRestoreSummarySmoke,
    runs: profile.completedRuns.length,
    mistakeCount: profile.mistakeCounts['缺少观望'],
    ruleText: profile.rulebook[0].text,
  });
`, context);
assert(partialLegacyBackupRestore.runs === 0 && partialLegacyBackupRestore.mistakeCount === 3 && partialLegacyBackupRestore.ruleText.includes("第一天"), "partial legacy profile backups should migrate instead of being discarded");
assert(vm.runInContext("try { restoreBackupPayload({ customCases: [] }); false; } catch (error) { error.message.includes('profile'); }", context), "backup restore should still reject files without recognizable profile data");

vm.runInContext("state = defaultState('A-01', 'exam'); state.day = 3; state.decisions.push({ day: 1, side: 'hold', symbol: 'ETF-A', quantity: 0, price: 0, amount: 0, emotion: 'calm', risk: 5, confidence: 3, evidenceSources: ['price'], reason: 'test', info: 'test', invalidation: 'test' });", context);
const review = vm.runInContext("buildReview(getCase('A-01'))", context);
assert(Array.isArray(review.benchmarks) && review.benchmarks.length >= 6, "review should include benchmark set");
assert(Number.isFinite(review.disciplineScore), "review should produce discipline score");
assert(Number.isFinite(review.turnoverPct), "review should produce turnover");
assert(Array.isArray(review.diagnostics), "review should include advanced diagnostics");
assert(Array.isArray(review.decisionAudit) && review.decisionAudit.length === 1, "review should audit each recorded decision");
assert(review.decisionAudit[0].verdict && review.decisionAudit[0].verdict.text, "decision audit should include a readable verdict");
assert(review.evidence && review.evidence.sources.length >= 2, "review should include evidence source rows");
assert(review.evidence.sourcePack && review.evidence.sourcePack.items.length >= 1, "review should include an external source pack after reveal");
assert(review.evidence.timeline.length >= 2, "review should include an event evidence timeline");
assert(review.evidence.timeline.every((item) => item.moves.every((move) => Number.isFinite(move.dayChangePct) && Number.isFinite(move.sinceStartPct))), "evidence timeline should calculate move metrics");
assert(review.rootCauseMatrix && review.rootCauseMatrix.items.length >= 6, "review should include a root-cause matrix");
assert(review.rootCauseMatrix.items[0].severityScore >= review.rootCauseMatrix.items[review.rootCauseMatrix.items.length - 1].severityScore, "root-cause matrix should rank strongest causes first");
assert(review.rootCauseMatrix.primary && review.rootCauseMatrix.summary.includes(review.rootCauseMatrix.primary.label), "root-cause matrix should expose a primary cause and summary");
const earlyReadiness = vm.runInContext("buildRevealReadiness(getCase('A-01'))", context);
assert(earlyReadiness.blocking && earlyReadiness.failCount >= 1, "early reveal readiness should require an explicit confirmation");
assert(earlyReadiness.items.some((item) => item.title === "训练进度" && item.status !== "pass"), "reveal readiness should check training progress");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.day = Math.floor(currentCaseLength() * 0.8);
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  state.trainingContract = { saved: true, objective: '完成盲测纪律检查', riskBudgetPct: 8, maxTrades: 5, maxPositionPct: 30, minHolds: 1, noAverageDown: true, savedAt: 'test' };
  state.decisions = [{
    day: 2,
    side: 'hold',
    symbol: 'ETF-A',
    quantity: 0,
    price: getPrice('ETF-A', 2),
    amount: 0,
    emotion: 'calm',
    risk: 5,
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'ETF-A 下跌且波动扩大',
    reason: '因为市场仍不稳定，所以先主动观望等待更清楚证据',
    invalidation: '如果后续重新站上均线并且波动下降，再考虑小仓位',
  }];
`, context);
const matureReadiness = vm.runInContext("buildRevealReadiness(getCase('A-01'))", context);
assert(matureReadiness.score > earlyReadiness.score, "completed setup should improve reveal readiness score");
vm.runInContext("state = defaultState('A-01', 'novice'); state.day = 1; window.confirm = () => false;", context);
const cancelledReveal = vm.runInContext("revealCase()", context);
assert(!cancelledReveal.ok && !vm.runInContext("state.revealed", context), "declining the reveal confirmation should keep the case blind");
vm.runInContext("window.confirm = () => true;", context);
const acceptedReveal = vm.runInContext("revealCase()", context);
assert(acceptedReveal.ok && vm.runInContext("state.revealed", context), "accepting the reveal confirmation should reveal the case");
assert(vm.runInContext("Boolean(state.revealReadinessSnapshot)", context), "revealing should save a readiness snapshot");
vm.runInContext("window.confirm = () => true; state = defaultState('A-01', 'exam'); state.day = 3; state.decisions.push({ day: 1, side: 'hold', symbol: 'ETF-A', quantity: 0, price: 0, amount: 0, emotion: 'calm', risk: 5, confidence: 3, evidenceSources: ['price'], reason: 'test', info: 'test', invalidation: 'test' });", context);
vm.runInContext("state.signalForecasts = { 2: { day: 2, outlook: 'risk-up', plan: 'stay defensive and wait for confirmation', savedAt: 'test' } };", context);
const signalCalibration = vm.runInContext("buildSignalCalibration(getCase('A-01'))", context);
assert(signalCalibration.items.length === 1 && Number.isFinite(signalCalibration.items[0].forwardReturnPct), "signal calibration should compare saved forecasts with later market movement");
vm.runInContext(`
  state.revealed = false;
  state.day = 3;
  document.querySelector = (selector) => ({
    value: ({
      '#signalForecastOutlook': 'uncertain',
      '#signalForecastPlan': 'wait for clearer evidence before adding risk',
    })[selector] || '',
  });
`, context);
const savedForecast = vm.runInContext("saveSignalForecast()", context);
assert(savedForecast.ok && vm.runInContext("state.signalForecasts[3].outlook", context) === "uncertain", "signal forecast saving should persist the current checkpoint note");
vm.runInContext(`
  const visibleNewsItem = getCase().news.find((item) => item.day <= state.day);
  const visibleNewsKey = newsItemKey(getCase(), visibleNewsItem);
  const newsValues = {
    '[data-news-importance]': visibleNewsItem.category,
    '[data-news-outlook]': 'uncertain',
    '[data-news-action]': 'watch',
    '[data-news-reason]': 'This news needs price confirmation before action',
  };
  const newsContainer = {
    dataset: { newsKey: visibleNewsKey },
    querySelector(selector) {
      return { value: newsValues[selector] || '' };
    },
  };
  saveNewsJudgment(newsContainer);
`, context);
const newsCalibration = vm.runInContext("buildNewsCalibration(getCase())", context);
assert(newsCalibration.items.length === 1 && Number.isFinite(newsCalibration.score), "news calibration should score saved news judgments");
assert(newsCalibration.items[0].categoryVerdict.level === "good", "news calibration should compare judged and actual news category");
vm.runInContext("state.revealed = true;", context);
const reviewMarkdown = vm.runInContext("buildReviewMarkdown(getCase('A-01'), buildReview(getCase('A-01')))", context);
assert(reviewMarkdown.includes("# 2020 年 COVID") && reviewMarkdown.includes("## 事件证据时间线"), "markdown export should include title and evidence timeline");
assert(reviewMarkdown.includes("## 复盘资料包") && reviewMarkdown.includes("Federal Reserve"), "markdown export should include revealed external source packs");
assert(reviewMarkdown.includes("## 新闻判断校准"), "markdown export should include news judgment calibration");
assert(reviewMarkdown.includes("## 逐笔决策审计") && reviewMarkdown.includes("## 弱项自动排课"), "markdown export should include audit and training queue sections");
assert(reviewMarkdown.includes("## 长期能力雷达"), "markdown export should include the long-term skill radar");
assert(reviewMarkdown.includes("## 关键节点校准"), "markdown export should include signal calibration");
assert(reviewMarkdown.includes("## 错误根因拆解"), "markdown export should include root-cause analysis");
assert(reviewMarkdown.includes("训练合约") && reviewMarkdown.includes("合约执行"), "markdown export should include training contract results");
assert(reviewMarkdown.includes("配置蓝图") && reviewMarkdown.includes("蓝图执行"), "markdown export should include allocation blueprint results");
assert(reviewMarkdown.includes("市场假设") && reviewMarkdown.includes("假设质量"), "markdown export should include session thesis results");
assert(reviewMarkdown.includes("## 决策文字质量"), "markdown export should include decision writing quality");
assert(reviewMarkdown.includes("## 资金与汇率复盘") && reviewMarkdown.includes("港币入金口径"), "markdown export should include funding and FX review");
assert(reviewMarkdown.includes("## 资金结算复盘"), "markdown export should include settlement review");
assert(reviewMarkdown.includes("## 隔夜跳空复盘"), "markdown export should include overnight gap review");
const exportedReview = vm.runInContext("exportCurrentReviewMarkdown()", context);
assert(exportedReview.ok && exportedReview.filename.endsWith(".md"), "review markdown export should return a downloadable markdown file");
vm.runInContext("state.revealed = false;", context);

vm.runInContext("elements.symbolInput.value = 'ETF-A'; elements.quantityInput.value = '2'; state.selectedSymbol = 'ETF-A'; state.selectedSide = 'buy';", context);
const preview = vm.runInContext("buildOrderPreview()", context);
assert(preview.amount > 0, "order preview should calculate amount");
assert(Number.isFinite(preview.frictionCost) && preview.frictionCost >= 0, "order preview should estimate trading friction");
assert(preview.price >= preview.referencePrice, "buy preview should use a simulated ask-side execution price");
assert(Number.isFinite(preview.symbolWeightPct), "order preview should calculate symbol weight");
assert(typeof preview.message === "string" && preview.message.length > 0, "order preview should provide coach message");
assert(preview.riskScenario && Number.isFinite(preview.riskScenario.accountRiskPct), "order preview should calculate single-trade risk budget");
assert(Number.isFinite(preview.riskScenario.stopPrice) && Number.isFinite(preview.riskScenario.rewardTargetPrice), "risk scenario should calculate stop and 2R target prices");
assert(preview.liquidityScenario && Number.isFinite(preview.liquidityScenario.volumeSharePct), "order preview should calculate liquidity and volume participation");
const currentVolumeForLiquidity = vm.runInContext("getAsset('ETF-A').prices[state.day].volume", context);
const oversizedLiquidityScenario = vm.runInContext("buildLiquidityScenario({ side: 'buy', symbol: 'ETF-A', quantity: Math.max(1, Math.ceil(getAsset('ETF-A').prices[state.day].volume * 0.03)), price: getPrice('ETF-A'), amount: Math.max(1, Math.ceil(getAsset('ETF-A').prices[state.day].volume * 0.03)) * getPrice('ETF-A') })", context);
assert(currentVolumeForLiquidity > 0 && oversizedLiquidityScenario.level === "danger", "liquidity scenario should flag orders that are too large versus daily volume");
const oversizedLiquidityValidation = vm.runInContext("validateLiquidity('buy', { liquidityScenario: buildLiquidityScenario({ side: 'buy', symbol: 'ETF-A', quantity: Math.max(1, Math.ceil(getAsset('ETF-A').prices[state.day].volume * 0.03)), price: getPrice('ETF-A'), amount: Math.max(1, Math.ceil(getAsset('ETF-A').prices[state.day].volume * 0.03)) * getPrice('ETF-A') }) })", context);
assert(!oversizedLiquidityValidation.ok && oversizedLiquidityValidation.message.includes("流动性不足"), "red liquidity should block order submission");
vm.runInContext("elements.riskInput.value = '5'; elements.targetRiskInput.value = '1';", context);
const riskSizing = vm.runInContext("calculateSizingQuantity({ symbol: 'ETF-A', side: 'buy', mode: 'risk', value: '1' })", context);
assert(riskSizing.quantity > 0 && riskSizing.message.includes("账户风险"), "sizing calculator should convert account risk budget into share quantity");
vm.runInContext("applySizing('risk', '1')", context);
assert(Number.parseInt(vm.runInContext("elements.quantityInput.value", context), 10) === riskSizing.quantity, "risk-based sizing should update the order quantity input");
vm.runInContext("state.trainingContract = { saved: true, objective: '严格限制单笔风险测试', riskBudgetPct: 0.5, maxTrades: 5, maxPositionPct: 80, minHolds: 0, noAverageDown: true, savedAt: 'test' }; elements.quantityInput.value = '200'; elements.riskInput.value = '20';", context);
const oversizedRiskPreview = vm.runInContext("buildOrderPreview()", context);
assert(oversizedRiskPreview.riskScenario.level === "danger", "risk scenario should flag trades that exceed the session risk budget");
const oversizedRiskValidation = vm.runInContext("validatePreviewRisk('buy', buildOrderPreview())", context);
assert(!oversizedRiskValidation.ok && oversizedRiskValidation.message.includes("单笔风险预算"), "red single-trade risk should block order submission");
vm.runInContext("state.trainingContract = defaultTrainingContract(); elements.quantityInput.value = '2'; elements.riskInput.value = '5';", context);
const relativePanel = vm.runInContext("state.day = 8; buildRelativeStrengthPanel(getCase('A-01'))", context);
assert(relativePanel.rows.length >= 2, "relative strength panel should compare multiple assets");
assert(relativePanel.rows.every((item) => Number.isFinite(item.totalReturnPct) && Number.isFinite(item.relativeReturnPct) && item.roleLabel), "relative strength rows should include returns, relative performance, and role labels");
assert(relativePanel.rows[0].totalReturnPct >= relativePanel.rows[relativePanel.rows.length - 1].totalReturnPct, "relative strength rows should sort strongest first");
assert(relativePanel.regime && relativePanel.regime.title && ["good", "warn", "danger"].includes(relativePanel.regime.level), "relative strength panel should classify market structure");
vm.runInContext(`
  state = defaultState('S-11', 'novice');
  const gapCandidate = getCase().assets
    .flatMap((assetItem) => assetItem.prices.map((_, day) => ({ assetItem, day, gapPct: assetOpenGapPct(assetItem, day), level: gapRiskLevel(assetItem, assetOpenGapPct(assetItem, day)) })))
    .find((item) => item.day > 0 && item.level !== 'good');
  state.day = gapCandidate.day;
  state.selectedSymbol = gapCandidate.assetItem.maskedSymbol;
  state.selectedSide = 'buy';
  elements.symbolInput.value = gapCandidate.assetItem.maskedSymbol;
  elements.quantityInput.value = '1';
  elements.orderTypeInput.value = 'market';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'visible gap risk setup';
  elements.reasonInput.value = 'reasonable decision text on gap day';
  elements.invalidInput.value = 'clear invalidation';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceVolumeInput.checked = true;
  elements.evidenceRiskInput.checked = true;
  globalThis.__gapCandidate = gapCandidate;
`, context);
const gapRows = vm.runInContext("buildGapRiskRows(getCase(), state.day)", context);
assert(gapRows.some((item) => item.level !== "good" && Number.isFinite(item.gapPct)), "gap risk rows should flag meaningful overnight gaps");
vm.runInContext("renderRiskDashboard(getCase())", context);
assert(vm.runInContext("elements.riskDashboard.innerHTML.includes('隔夜跳空')", context), "risk dashboard should render overnight gap risk");
const gapCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(gapCoach.items.some((item) => item.title === "隔夜跳空"), "decision coach should include an overnight gap risk card");
const gapReview = vm.runInContext("state.decisions.unshift({ day: state.day, side: 'buy', symbol: state.selectedSymbol, quantity: 1, price: getPrice(state.selectedSymbol), amount: getPrice(state.selectedSymbol), orderType: 'market', intent: 'probe', horizon: 'days', emotion: 'calm', risk: 5, confidence: 3, evidenceSources: ['price', 'risk'], info: 'gap trade info', reason: 'gap trade reason text', invalidation: 'clear invalidation', profitPlan: 'take partial profit at 2R target' }); buildGapRiskReview(getCase())", context);
assert(gapReview.rows.length >= 1 && gapReview.gapTradeCount >= 1 && Number.isFinite(gapReview.score), "gap risk review should summarize gap nodes and gap-day trades");
vm.runInContext(`
  state = defaultState('S-10', 'novice');
  state.day = 5;
  state.selectedSymbol = 'STOCK-A';
  state.selectedSide = 'buy';
  elements.symbolInput.value = 'STOCK-A';
  elements.quantityInput.value = '120';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'event risk setup';
  elements.reasonInput.value = 'testing event window discipline';
  elements.invalidInput.value = 'sell or reassess if event reaction fails';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceNewsInput.checked = true;
  elements.evidenceRiskInput.checked = true;
`, context);
assert(vm.runInContext("getCase('S-10').scheduledEvents.length >= 1 && getCase('S-10').keyDays.includes(6)", context), "built-in cases should expose scheduled event risk days as key days");
const eventRiskRows = vm.runInContext("buildEventRiskRows(getCase('S-10'), state.day)", context);
assert(eventRiskRows.some((item) => item.daysUntil === 1 && item.level !== "good"), "event risk rows should surface upcoming event windows");
vm.runInContext("renderRiskDashboard(getCase('S-10'))", context);
assert(vm.runInContext("elements.riskDashboard.innerHTML.includes('事件日风险')", context), "risk dashboard should render scheduled event risk");
const eventCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(eventCoach.items.some((item) => item.title === "事件日风险" || item.title === "事件日重仓/追单"), "decision coach should include scheduled event risk guidance");
assert(vm.runInContext("collectSignals(getCase('S-10'), 6).some((item) => item.title === '事件日风险')", context), "signals should pause on scheduled event days");
const eventReview = vm.runInContext(`
  state.day = 7;
  state.decisions = [{
    day: 6,
    side: 'buy',
    symbol: 'STOCK-A',
    quantity: 120,
    price: getPrice('STOCK-A', 6),
    amount: getPrice('STOCK-A', 6) * 120,
    orderType: 'market',
    intent: 'probe',
    horizon: 'days',
    emotion: 'calm',
    risk: 5,
    confidence: 4,
    evidenceSources: ['price', 'news', 'risk'],
    info: 'event day trade info',
    reason: 'event day trade reason with risk noted',
    invalidation: 'sell or reassess if event reaction fails',
    profitPlan: 'take partial profit at 2R target',
  }];
  buildEventRiskReview(getCase('S-10'));
`, context);
assert(eventReview.eventTradeCount >= 1 && eventReview.dangerEventTradeCount >= 1 && Number.isFinite(eventReview.score), "event risk review should summarize event-window trades");
const eventMarkdown = vm.runInContext("buildReviewMarkdown(getCase('S-10'), buildReview(getCase('S-10')))", context);
assert(eventMarkdown.includes("## 事件日风险复盘"), "markdown export should include event risk review");
vm.runInContext("state = defaultState('A-01', 'novice'); state.day = 8; elements.symbolInput.value = 'ETF-A'; state.selectedSymbol = 'ETF-A'; state.selectedSide = 'buy'; elements.quantityInput.value = '2';", context);
vm.runInContext(`
  state = defaultState('S-12', 'novice');
  const stopEntryPrice = getPrice('ETF-A', 0);
  state.positions = { 'ETF-A': { quantity: 1, averageCost: stopEntryPrice } };
  state.decisions.unshift({
    day: 0,
    side: 'buy',
    symbol: 'ETF-A',
    quantity: 1,
    price: stopEntryPrice,
    amount: stopEntryPrice,
    risk: 0.5,
    intent: 'probe',
    horizon: 'days',
    emotion: 'calm',
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'stop trigger test info',
    reason: 'stop trigger test reason',
    invalidation: 'sell or reassess if stop line is breached',
    profitPlan: 'take partial profit at 2R target',
  });
  const stopPrice = stopEntryPrice * (1 - 0.5 / 100);
  globalThis.__stopTriggerDay = getAsset('ETF-A').prices.findIndex((bar, day) => day > 0 && bar.low <= stopPrice);
  state.day = __stopTriggerDay;
`, context);
assert(vm.runInContext("__stopTriggerDay > 0 && collectPositionTriggerSignals(getCase(), state.day).some((item) => item.type === 'stop-trigger')", context), "position trigger signals should detect breached stop/invalidation lines");
vm.runInContext(`
  state = defaultState('S-11', 'novice');
  const profitEntryPrice = getPrice('STOCK-B', 0);
  state.positions = { 'STOCK-B': { quantity: 1, averageCost: profitEntryPrice } };
  state.decisions.unshift({
    day: 0,
    side: 'buy',
    symbol: 'STOCK-B',
    quantity: 1,
    price: profitEntryPrice,
    amount: profitEntryPrice,
    risk: 6,
    intent: 'probe',
    horizon: 'days',
    emotion: 'calm',
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'profit trigger test info',
    reason: 'profit trigger test reason',
    invalidation: 'sell or reassess if stop line is breached',
    profitPlan: 'take partial profit at 2R target',
  });
  const targetPrice = profitEntryPrice * (1 + 12 / 100);
  globalThis.__profitTriggerDay = getAsset('STOCK-B').prices.findIndex((bar, day) => day > 0 && bar.high >= targetPrice);
  state.day = __profitTriggerDay;
`, context);
assert(vm.runInContext("__profitTriggerDay > 0 && collectPositionTriggerSignals(getCase(), state.day).some((item) => item.type === 'profit-trigger')", context), "position trigger signals should detect 2R profit windows");
const positionTriggerReview = vm.runInContext("buildPositionTriggerReview(buildInvalidationExecutionReview(getCase()), buildProfitPlanReview(getCase()))", context);
assert(positionTriggerReview.triggerCount >= 1 && Number.isFinite(positionTriggerReview.score), "position trigger review should summarize stop and profit trigger handling");
const triggerMarkdown = vm.runInContext("buildReviewMarkdown(getCase(), buildReview(getCase()))", context);
assert(triggerMarkdown.includes("## 持仓触发提醒"), "markdown export should include position trigger review");
vm.runInContext("state = defaultState('A-01', 'novice'); state.day = 8; elements.symbolInput.value = 'ETF-A'; state.selectedSymbol = 'ETF-A'; state.selectedSide = 'buy'; elements.quantityInput.value = '2';", context);

const blockedByLesson = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation' })", context);
assert(!blockedByLesson.ok && blockedByLesson.message.includes("检查题"), "decision validation should require passing the lesson gate");
vm.runInContext("state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };", context);
const lessonGate = vm.runInContext("buildLessonGate(getCase())", context);
assert(lessonGate.passed && lessonGate.firstTry, "lesson gate should pass after a correct quiz answer");
const missingPlanValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation' })", context);
assert(!missingPlanValidation.ok, "decision validation should reject missing trade plan");
const missingConfidenceValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price', 'risk'], emotion: 'calm', risk: 5, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation', profitPlan: 'take partial profit at 2R target' })", context);
assert(!missingConfidenceValidation.ok && missingConfidenceValidation.message.includes("判断信心"), "decision validation should require confidence calibration input");
const missingEvidenceValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation', profitPlan: 'take partial profit at 2R target' })", context);
assert(!missingEvidenceValidation.ok && missingEvidenceValidation.message.includes("证据来源"), "decision validation should require at least one structured evidence source");
const missingProfitPlanValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price', 'risk'], emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation' })", context);
assert(!missingProfitPlanValidation.ok && missingProfitPlanValidation.message.includes("判断对了"), "buy validation should require an upside/profit handling plan");
const completePlanValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price', 'risk'], emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation', profitPlan: 'take partial profit at 2R target' })", context);
assert(completePlanValidation.ok, "decision validation should accept a complete trade plan");
const holdPlanValidation = vm.runInContext("validateDecision({ side: 'hold', symbol: 'ETF-A', quantity: 0, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price'], emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation' })", context);
assert(!holdPlanValidation.ok, "hold decisions should require the wait intent");

vm.runInContext("elements.intentInput.value = ''; elements.horizonInput.value = ''; elements.emotionInput.value = ''; elements.riskInput.value = ''; elements.confidenceInput.value = ''; elements.checkedRiskInput.checked = false; elements.checkedMissionInput.checked = false; elements.checkedInvalidationInput.checked = false; evidenceSourceInputs().forEach((field) => field.checked = false);", context);
const coachMissing = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(coachMissing.items.some((item) => item.level === "danger" && item.title === "计划缺口"), "decision coach should flag missing plan as danger");
vm.runInContext("elements.intentInput.value = 'probe'; elements.horizonInput.value = 'days'; elements.emotionInput.value = 'calm'; elements.riskInput.value = '5'; elements.confidenceInput.value = '3'; elements.evidencePriceInput.checked = true; elements.evidenceRelativeInput.checked = true; elements.evidenceRiskInput.checked = true; elements.checkedRiskInput.checked = true; elements.checkedMissionInput.checked = true; elements.checkedInvalidationInput.checked = true;", context);
const coachComplete = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(coachComplete.items.length >= 10, "decision coach should include contract, risk-budget, relative-strength, and writing-quality checks");
assert(Number.isFinite(coachComplete.score), "decision coach should produce a numeric score");
assert(!coachComplete.items.some((item) => item.title === "计划缺口"), "complete plan should clear the missing-plan coach item");
assert(coachComplete.items.some((item) => item.title === "训练合约未保存"), "decision coach should remind users to save the session contract");
assert(coachComplete.items.some((item) => item.title === "相对强弱" || item.title.includes("标的")), "decision coach should include relative strength guidance");
assert(coachComplete.items.some((item) => item.title === "单笔风险预算"), "decision coach should include single-trade risk budget guidance");
assert(coachComplete.items.some((item) => item.title === "流动性"), "decision coach should include liquidity guidance");
assert(coachComplete.items.some((item) => item.title === "文字质量" || item.title === "文字质量提醒" || item.title === "文字不可复盘"), "decision coach should include decision writing quality guidance");
assert(coachComplete.items.some((item) => item.title === "证据来源"), "decision coach should include structured evidence source guidance");
assert(coachComplete.items.some((item) => item.title === "信心校准"), "decision coach should include confidence calibration guidance");
vm.runInContext("elements.confidenceInput.value = '5'; elements.evidenceRelativeInput.checked = false; elements.evidenceRiskInput.checked = false; elements.infoInput.value = '感觉不错'; elements.reasonInput.value = '肯定会涨所以买'; elements.invalidInput.value = '看情况'; elements.profitPlanInput.value = '';", context);
const overconfidentCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(overconfidentCoach.items.some((item) => item.title === "高信心低证据"), "decision coach should flag high confidence with weak evidence");
assert(overconfidentCoach.items.some((item) => item.title === "高信心证据不足" || item.title === "证据来源单薄"), "decision coach should flag high confidence with too few evidence sources");
assert(overconfidentCoach.items.some((item) => item.title === "缺少盈利计划"), "decision coach should require a profit handling plan for buys");
vm.runInContext("elements.confidenceInput.value = '3'; elements.evidenceRelativeInput.checked = true; elements.evidenceRiskInput.checked = true; elements.infoInput.value = ''; elements.reasonInput.value = ''; elements.invalidInput.value = ''; elements.profitPlanInput.value = 'take partial profit at 2R target';", context);
vm.runInContext("state.selectedSide = 'buy'; state.decisions = []; elements.quantityInput.value = '2'; profile.rulebook = [{ id: 'rule-test', text: 'Next run must include one active hold before any buy and single position under 5%', tags: ['hold-first', 'position-limit'], active: true, timesSeen: 1, sourceCaseId: 'A-01', createdAt: 'test' }];", context);
const rulebookCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(rulebookCoach.items.some((item) => item.title === "个人规则提醒" || item.title === "违反个人硬规则"), "decision coach should check active personal rulebook rules");
vm.runInContext("profile.rulebook[0].active = false;", context);
const pausedRulebookCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(!pausedRulebookCoach.items.some((item) => item.title === "个人规则提醒" || item.title === "违反个人硬规则"), "paused rulebook rules should not affect the decision coach");
vm.runInContext("profile.rulebook = [];", context);
const weakTextQuality = vm.runInContext("buildDecisionTextQuality({ side: 'buy', info: '感觉不错', reason: '肯定会涨所以买', invalidation: '看情况', risk: 25 })", context);
assert(weakTextQuality.level === "danger" && weakTextQuality.failed.length >= 3, "writing quality should flag vague and non-actionable decision text");
const strongTextQuality = vm.runInContext("buildDecisionTextQuality({ side: 'buy', info: '第 5 天 ETF-A 下跌 3%，成交量放大，相对基准仍弱', reason: '因为风险偏好下降但仓位很小，所以只做 2% 试探仓', invalidation: '如果再跌破前低 5%，我会减仓并停止加仓', risk: 5 })", context);
assert(strongTextQuality.level === "good" && strongTextQuality.score >= 80, "writing quality should reward concrete evidence and actionable invalidation");
vm.runInContext("elements.emotionInput.value = 'fomo';", context);
const coachEmotion = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(coachEmotion.items.some((item) => item.level === "danger" && item.title === "高风险情绪"), "decision coach should flag FOMO as a high-risk emotion");
const coachSnapshot = vm.runInContext("createCoachSnapshot(buildDecisionCoach(buildOrderPreview()))", context);
assert(Number.isFinite(coachSnapshot.score) && Array.isArray(coachSnapshot.issues), "coach snapshot should preserve score and issues");
vm.runInContext("elements.emotionInput.value = 'calm';", context);

vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '2';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'visible market info';
  elements.reasonInput.value = 'reasonable decision text';
  elements.invalidInput.value = 'clear invalidation';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceRelativeInput.checked = true;
  elements.evidenceRiskInput.checked = true;
  placeDecision({ preventDefault() {} });
`, context);
const savedFriction = vm.runInContext("state.decisions[0].frictionCost", context);
assert(Number.isFinite(savedFriction) && savedFriction >= 0, "submitted decisions should save simulated friction cost");
assert(vm.runInContext("state.decisions[0].liquidity && Number.isFinite(state.decisions[0].liquidity.volumeSharePct)", context), "submitted decisions should save liquidity snapshot");
assert(vm.runInContext("state.decisions[0].funding && state.decisions[0].funding.homeCurrency === 'HKD' && state.decisions[0].funding.amountHome > state.decisions[0].amount", context), "submitted decisions should save HKD funding snapshot");
assert(vm.runInContext("state.decisions[0].settlement && state.decisions[0].settlement.cycle === 'T+1'", context), "submitted decisions should save settlement snapshot");
assert(vm.runInContext("state.decisions[0].confidence === 3", context), "submitted decisions should save confidence calibration input");
assert(vm.runInContext("state.decisions[0].evidenceSources.includes('price') && state.decisions[0].evidenceSources.includes('risk')", context), "submitted decisions should save structured evidence sources");
const initialFundingSummary = vm.runInContext("buildFundingSummary(getPortfolioTotals())", context);
assert(initialFundingSummary.initialHomeDeposit > initialFundingSummary.equityHome && initialFundingSummary.initialFxCostHome > 0, "funding summary should include HKD deposit and FX cost drag");
const fundingPreviewHtml = vm.runInContext("renderOrderPreview(); elements.orderPreview.innerHTML", context);
assert(fundingPreviewHtml.includes("资金与汇率口径") && fundingPreviewHtml.includes("折合港币"), "order preview should render funding and FX scenario");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  const settlementPrice = getPrice('ETF-A');
  executeBuy('ETF-A', 900, settlementPrice, roundPrice(settlementPrice * 900));
  executeSell('ETF-A', 900, settlementPrice, roundPrice(settlementPrice * 900));
  state.selectedSymbol = 'ETF-A';
  state.selectedSide = 'buy';
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '200';
`, context);
const settlementSummary = vm.runInContext("buildSettlementSummary()", context);
assert(settlementSummary.pendingCount === 1 && settlementSummary.unsettledProceeds > 0 && settlementSummary.settledCash < settlementSummary.cash, "sell orders should create pending T+1 unsettled proceeds");
const settlementPreview = vm.runInContext("buildOrderPreview()", context);
assert(settlementPreview.settlementScenario.usesUnsettledCash, "buy preview should flag use of unsettled sale proceeds");
vm.runInContext("renderOrderPreview();", context);
assert(vm.runInContext("elements.orderPreview.innerHTML.includes('资金结算') && elements.orderPreview.innerHTML.includes('动用未结算')", context), "order preview should render settlement warnings");
vm.runInContext("nextDay(1, false)", context);
assert(vm.runInContext("buildSettlementSummary().pendingCount === 0 && state.settlementLedger[0].status === 'settled'", context), "T+1 settlement should settle pending sale proceeds on the next day");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  const cashRulePrice = getPrice('ETF-A');
  executeBuy('ETF-A', 900, cashRulePrice, roundPrice(cashRulePrice * 900));
  executeSell('ETF-A', 900, cashRulePrice, roundPrice(cashRulePrice * 900));
  const unsettledBuyScenario = buildSettlementScenario({ side: 'buy', amount: roundPrice(cashRulePrice * 200), nextCash: state.cash - roundPrice(cashRulePrice * 200) });
  state.positions['ETF-A'] = { quantity: 200, averageCost: cashRulePrice };
  state.decisions.unshift({
    day: state.day,
    side: 'buy',
    symbol: 'ETF-A',
    quantity: 200,
    price: cashRulePrice,
    amount: roundPrice(cashRulePrice * 200),
    orderType: 'market',
    settlement: buildDecisionSettlementSnapshot(unsettledBuyScenario),
    intent: 'probe',
    horizon: 'days',
    emotion: 'calm',
    risk: 5,
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'cash account warning setup',
    reason: 'cash account warning reason',
    invalidation: 'clear invalidation',
    profitPlan: 'take partial profit at 2R target',
  });
  const cashWarnings = findCashAccountSaleWarnings('ETF-A', 200, state.day);
  state.decisions.unshift({
    day: state.day,
    side: 'sell',
    symbol: 'ETF-A',
    quantity: 200,
    price: cashRulePrice,
    amount: roundPrice(cashRulePrice * 200),
    orderType: 'market',
    settlement: buildDecisionSettlementSnapshot(buildSettlementScenario({ side: 'sell', amount: roundPrice(cashRulePrice * 200), nextCash: state.cash + roundPrice(cashRulePrice * 200) })),
    cashAccountWarnings: cashWarnings,
    intent: 'risk-off',
    horizon: 'days',
    emotion: 'calm',
    risk: 5,
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'selling before unsettled purchase is paid',
    reason: 'cash account warning sell reason',
    invalidation: 'clear invalidation',
    profitPlan: '',
  });
`, context);
const cashAccountReview = vm.runInContext("buildSettlementReview()", context);
assert(cashAccountReview.cashAccountWarningCount >= 1 && cashAccountReview.score < 100, "settlement review should flag selling lots bought with unsettled proceeds before paid-for day");
const cashAccountMarkdown = vm.runInContext("buildReviewMarkdown(getCase(), buildReview(getCase()))", context);
assert(cashAccountMarkdown.includes("good faith") || cashAccountMarkdown.includes("现金账户纪律风险"), "markdown export should include cash account warning details");
vm.runInContext("state = defaultState('A-01', 'novice'); state.day = 8; elements.symbolInput.value = 'ETF-A'; state.selectedSymbol = 'ETF-A'; state.selectedSide = 'buy'; elements.quantityInput.value = '2';", context);
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  const limitAsset = getAsset('ETF-A');
  const currentLimitPrice = getPrice('ETF-A');
  const triggerIndex = limitAsset.prices.findIndex((bar, index) => index > state.day && bar.low <= currentLimitPrice * 0.999);
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '1';
  elements.orderTypeInput.value = 'limit';
  elements.limitPriceInput.value = String(roundPrice(currentLimitPrice * 0.999));
  elements.orderExpiryInput.value = '10';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'ETF-A has a nearby limit order test setup';
  elements.reasonInput.value = 'because I want to test a pending limit order fill';
  elements.invalidInput.value = 'if the limit never fills I will let the order expire';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceVolumeInput.checked = true;
  elements.evidenceRiskInput.checked = true;
  placeDecision({ preventDefault() {} });
  globalThis.__limitTriggerStep = triggerIndex > 0 ? triggerIndex - state.day : 1;
`, context);
assert(vm.runInContext("activePendingOrders().length === 1 && state.decisions.length === 0", context), "non-marketable limit order should become an active pending order without immediate fill");
vm.runInContext("nextDay(__limitTriggerStep, false)", context);
assert(vm.runInContext("state.pendingOrders[0].status === 'filled' && state.decisions[0].orderType === 'limit' && state.decisions[0].orderStatus === 'filled'", context), "pending limit order should fill when later OHLC reaches the limit price");
const orderExecutionAfterFill = vm.runInContext("buildOrderExecutionReview()", context);
assert(orderExecutionAfterFill.submittedCount >= 1 && orderExecutionAfterFill.filledCount >= 1, "order execution review should count filled limit orders");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '1';
  elements.orderTypeInput.value = 'limit';
  elements.limitPriceInput.value = String(roundPrice(getPrice('ETF-A') * 0.1));
  elements.orderExpiryInput.value = '1';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'ETF-A has an intentionally low limit order';
  elements.reasonInput.value = 'because I want to test order expiry behavior';
  elements.invalidInput.value = 'if the order does not fill quickly I will not chase';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceVolumeInput.checked = true;
  elements.evidenceRiskInput.checked = true;
  placeDecision({ preventDefault() {} });
  nextDay(2, false);
`, context);
assert(vm.runInContext("state.pendingOrders[0].status === 'expired' && state.decisions.length === 0", context), "limit orders should expire when price never reaches the limit before expiry");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '1';
  elements.orderTypeInput.value = 'limit';
  elements.limitPriceInput.value = String(roundPrice(getPrice('ETF-A') * 0.1));
  elements.orderExpiryInput.value = '10';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'ETF-A has a cancellable limit order';
  elements.reasonInput.value = 'because I want to test active order cancellation';
  elements.invalidInput.value = 'if plan changes I cancel the order';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceRiskInput.checked = true;
  placeDecision({ preventDefault() {} });
`, context);
const canceledLimitOrder = vm.runInContext(`
  const orderId = state.pendingOrders[0].id;
  const result = cancelPendingOrder(orderId, '测试取消');
  const review = buildOrderExecutionReview();
  ({
    ok: result.ok,
    status: state.pendingOrders[0].status,
    reason: state.pendingOrders[0].cancelReason,
    active: activePendingOrders().length,
    message: elements.tradeMessage.textContent,
    canceledCount: review.canceledCount,
    decisionCount: state.decisions.length
  });
`, context);
assert(canceledLimitOrder.ok && canceledLimitOrder.status === "canceled" && canceledLimitOrder.reason === "测试取消", "active limit orders should be cancellable with a reason");
assert(canceledLimitOrder.active === 0 && canceledLimitOrder.decisionCount === 0, "canceling a limit order should not create a trade decision");
assert(canceledLimitOrder.message.includes("已取消限价单") && canceledLimitOrder.canceledCount >= 1, "canceling a limit order should update UI message and order execution review");
vm.runInContext(`
  state = defaultState('S-11', 'novice');
  executeBuy('ETF-A', 10, getPrice('ETF-A'), roundPrice(getPrice('ETF-A') * 10));
  const cashBeforeDividend = state.cash;
  nextDay(12, false);
  globalThis.__cashBeforeDividend = cashBeforeDividend;
`, context);
assert(vm.runInContext("state.corporateActionLog.length === 1 && state.corporateActionLog[0].type === 'dividend'", context), "dividend corporate actions should be logged when time advances");
assert(vm.runInContext("state.corporateActionLog[0].grossDividend === 3.5 && state.corporateActionLog[0].taxWithheld === 1.05 && state.corporateActionLog[0].cashDelta === 2.45", context), "dividend corporate actions should calculate gross, withholding, and net cash");
assert(vm.runInContext("roundPrice(state.cash - __cashBeforeDividend) === 2.45", context), "dividend corporate actions should add net after-tax cash for held shares");
const corporateDividendReview = vm.runInContext("buildCorporateActionReview(getCase('S-11'))", context);
assert(corporateDividendReview.appliedCount === 1 && corporateDividendReview.affectedCount === 1 && corporateDividendReview.dividendGrossCash === 3.5 && corporateDividendReview.dividendTaxWithheld === 1.05 && corporateDividendReview.dividendCash === 2.45, "corporate action review should summarize after-tax dividend effects");
vm.runInContext(`
  state = defaultState('S-10', 'novice');
  executeBuy('STOCK-A', 2, getPrice('STOCK-A'), roundPrice(getPrice('STOCK-A') * 2));
  const quantityBeforeSplit = state.positions['STOCK-A'].quantity;
  const costBeforeSplit = state.positions['STOCK-A'].averageCost;
  nextDay(9, false);
  globalThis.__quantityBeforeSplit = quantityBeforeSplit;
  globalThis.__costBeforeSplit = costBeforeSplit;
`, context);
assert(vm.runInContext("state.corporateActionLog[0].type === 'split' && state.corporateActionLog[0].adjustHolding === false", context), "split corporate actions should be logged as adjusted-price awareness events");
assert(vm.runInContext("state.positions['STOCK-A'].quantity === __quantityBeforeSplit && state.positions['STOCK-A'].averageCost === __costBeforeSplit", context), "adjusted-price split awareness should not duplicate-adjust holdings");
assert(vm.runInContext("renderNews(getCase('S-10')); elements.newsFeed.innerHTML.includes('公司行动')", context), "news feed should surface visible corporate action events");
assert(vm.runInContext("buildEvidenceDossier(getCase('S-10')).timeline.some((item) => item.category === 'corporate')", context), "evidence timeline should include corporate action nodes");
const corporateMarkdown = vm.runInContext("state.revealed = true; buildReviewMarkdown(getCase('S-10'), buildReview(getCase('S-10')))", context);
assert(corporateMarkdown.includes("## 公司行动复盘") && corporateMarkdown.includes("拆股") && corporateMarkdown.includes("预扣税"), "markdown export should include corporate action tax review");
const initialContractStatus = vm.runInContext("buildTrainingContractStatus()", context);
assert(initialContractStatus.items.some((item) => item.title === "先保存训练合约" && item.status === "pending"), "training contract should start unsaved");
vm.runInContext(`
  state.trainingContract = { saved: true, objective: '练习先小仓位试探并严格执行纪律', riskBudgetPct: 3, maxTrades: 0, maxPositionPct: 2, minHolds: 1, noAverageDown: true, savedAt: 'test' };
  state.decisions.unshift({
    day: 2,
    side: 'buy',
    symbol: 'ETF-A',
    quantity: 2,
    price: getPrice('ETF-A', 2),
    amount: getPrice('ETF-A', 2) * 2,
    intent: 'scale',
    horizon: 'days',
    emotion: 'calm',
    risk: 5,
    confidence: 3,
    evidenceSources: ['price', 'risk'],
    info: 'visible market info',
    reason: 'second buy to test contract',
    invalidation: 'clear invalidation',
    profitPlan: 'take partial profit at 2R target',
  });
`, context);
const failedContractStatus = vm.runInContext("buildTrainingContractStatus()", context);
assert(failedContractStatus.score < 100 && failedContractStatus.items.some((item) => item.status === "fail"), "training contract should score and expose failed constraints");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.day = 3;
  state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };
  state.trainingContract = { saved: true, objective: '回撤超预算后进入风险冷却', riskBudgetPct: 5, maxTrades: 5, maxPositionPct: 80, minHolds: 0, noAverageDown: true, savedAt: 'test' };
  state.equityCurve = [{ day: 0, equity: riskPolicy.initialCash }, { day: 2, equity: riskPolicy.initialCash * 0.94 }];
  state.selectedSide = 'buy';
  elements.symbolInput.value = 'ETF-A';
  elements.quantityInput.value = '1';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'ETF-A has visible price weakness and account drawdown breached budget';
  elements.reasonInput.value = 'because this tests whether risk cooldown blocks new risk';
  elements.invalidInput.value = 'if risk stays above budget I will stop buying and sell';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceRiskInput.checked = true;
`, context);
const cooldownStatus = vm.runInContext("getRiskCooldownStatus()", context);
assert(cooldownStatus.active && cooldownStatus.breachDay === 2, "risk cooldown should activate after contract drawdown budget is breached");
const cooldownValidation = vm.runInContext("validateDecision({ side: 'buy', symbol: 'ETF-A', quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price', 'risk'], emotion: 'calm', risk: 5, confidence: 3, info: 'ETF-A has visible price weakness and account drawdown breached budget', reason: 'because this tests whether risk cooldown blocks new risk', invalidation: 'if risk stays above budget I will stop buying and sell', profitPlan: 'take partial profit at 2R target' })", context);
assert(!cooldownValidation.ok && cooldownValidation.message.includes("风险冷却"), "risk cooldown should block new buy decisions");
const cooldownCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(cooldownCoach.items.some((item) => item.title === "风险冷却中" && item.level === "danger"), "decision coach should show a danger item during risk cooldown");
const cooldownDashboard = vm.runInContext("buildRiskDashboard(getCase('A-01'))", context);
assert(cooldownDashboard.alerts.some((item) => item.title === "风险冷却已启动"), "risk dashboard should surface active risk cooldown");
vm.runInContext("state.decisions = [{ day: 3, side: 'buy', symbol: 'ETF-A', quantity: 1, price: getPrice('ETF-A', 3), amount: getPrice('ETF-A', 3), intent: 'probe', horizon: 'days', emotion: 'calm', risk: 5, confidence: 3, evidenceSources: ['price', 'risk'], info: 'test', reason: 'test reason long enough', invalidation: 'test invalidation', profitPlan: 'take partial profit at 2R target' }];", context);
const riskCoolingReview = vm.runInContext("buildRiskCoolingReview()", context);
assert(riskCoolingReview.active && riskCoolingReview.forbiddenBuyCount === 1 && riskCoolingReview.level === "danger", "risk cooling review should flag buys after a drawdown breach");
const cooldownMarkdown = vm.runInContext("buildReviewMarkdown(getCase('A-01'), buildReview(getCase('A-01')))", context);
assert(cooldownMarkdown.includes("## 风险冷却审计"), "markdown export should include risk cooling review");
vm.runInContext(`
  state = defaultState('A-01', 'novice');
  document.querySelector = (selector) => ({
    value: ({
      '#allocationObjectiveInput': 'ETF 做核心仓，行业和单股只做小仓试探',
      '#allocationMinEtfInput': '50',
      '#allocationMaxSatelliteInput': '20',
      '#allocationMaxSingleInput': '10',
      '#allocationMaxSectorInput': '25',
      '#allocationMinCashInput': '10',
    })[selector] || '',
    checked: selector === '#contractNoAverageDownInput',
  });
`, context);
const savedAllocation = vm.runInContext("saveAllocationBlueprint()", context);
assert(savedAllocation.ok && vm.runInContext("state.allocationBlueprint.saved", context), "allocation blueprint should save a complete portfolio plan");
const initialAllocationStatus = vm.runInContext("buildAllocationStatus()", context);
assert(initialAllocationStatus.blueprint.saved && Number.isFinite(initialAllocationStatus.score), "allocation status should score a saved blueprint");
vm.runInContext(`
  state.allocationBlueprint = { saved: true, objective: '严格限制卫星仓测试', minEtfPct: 50, maxSatellitePct: 1, maxSingleStockPct: 5, maxSectorPct: 10, minCashPct: 10, savedAt: 'test' };
  elements.symbolInput.value = 'STOCK-C';
  state.selectedSymbol = 'STOCK-C';
  state.selectedSide = 'buy';
  elements.quantityInput.value = '50';
  elements.intentInput.value = 'probe';
  elements.horizonInput.value = 'days';
  elements.emotionInput.value = 'calm';
  elements.riskInput.value = '5';
  elements.confidenceInput.value = '3';
  elements.infoInput.value = 'visible market info';
  elements.reasonInput.value = 'reasonable decision text';
  elements.invalidInput.value = 'clear invalidation';
  elements.profitPlanInput.value = 'take partial profit at 2R target';
  elements.checkedRiskInput.checked = true;
  elements.checkedMissionInput.checked = true;
  elements.checkedInvalidationInput.checked = true;
  elements.evidencePriceInput.checked = true;
  elements.evidenceRelativeInput.checked = true;
  elements.evidenceRiskInput.checked = true;
`, context);
const allocationCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(allocationCoach.items.some((item) => item.title === '违背配置蓝图'), "decision coach should flag trades that violate the allocation blueprint");
const initialThesisQuality = vm.runInContext("buildSessionThesisQuality()", context);
assert(!initialThesisQuality.thesis.saved && initialThesisQuality.items.some((item) => item.title === "先保存市场假设"), "session thesis should start unsaved");
vm.runInContext(`
  document.querySelector = (selector) => ({
    value: ({
      '#thesisBaseInput': '市场刚经历快速下跌，当前更像高波动反弹而不是稳定趋势',
      '#thesisBullInput': '基准 ETF 重新站上均线且波动下降',
      '#thesisBearInput': '再次跌破前低并且防御资产继续占优',
      '#thesisRiskInput': '如果 ETF-A 跌破前低就停止加仓并减仓',
      '#thesisOpportunityInput': '如果 ETF-A 连续两天企稳并跑赢基准才小仓试探',
      '#thesisActionInput': 'wait',
      '#thesisExposureInput': '12',
    })[selector] || '',
    checked: selector === '#contractNoAverageDownInput',
  });
`, context);
const savedThesis = vm.runInContext("saveSessionThesis()", context);
assert(savedThesis.ok && vm.runInContext("state.sessionThesis.saved", context), "session thesis should save complete pre-trade assumptions");
const savedThesisQuality = vm.runInContext("buildSessionThesisQuality()", context);
assert(savedThesisQuality.score >= 80 && savedThesisQuality.passed, "complete session thesis should produce a passing quality score");
const thesisCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(thesisCoach.items.some((item) => item.title === "动作违背假设"), "decision coach should warn when a buy conflicts with a wait thesis");
vm.runInContext("state.sessionThesis.preferredAction = 'risk-off';", context);
const riskOffThesisCoach = vm.runInContext("buildDecisionCoach(buildOrderPreview())", context);
assert(riskOffThesisCoach.items.some((item) => item.level === 'danger' && item.title === '动作违背假设'), "decision coach should block buys that contradict a risk-off thesis");
vm.runInContext("state.sessionThesis.preferredAction = 'probe';", context);
vm.runInContext("state = defaultState('A-01', 'novice'); elements.symbolInput.value = 'ETF-A'; elements.quantityInput.value = '2'; state.selectedSymbol = 'ETF-A'; state.selectedSide = 'buy'; state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };", context);

const sizingBuy = vm.runInContext("calculateSizingQuantity({ symbol: 'ETF-A', side: 'buy', mode: 'weight', value: 5 })", context);
assert(sizingBuy.quantity > 0, "position sizing should convert target weight into buy quantity");
assert(sizingBuy.tradeValue <= vm.runInContext("state.cash", context), "buy sizing should not exceed cash");
vm.runInContext("applySizing('weight', 5)", context);
assert(Number.parseInt(vm.runInContext("elements.quantityInput.value", context), 10) === sizingBuy.quantity, "apply sizing should update quantity input");

vm.runInContext("executeBuy('ETF-A', 20, getPrice('ETF-A'), roundPrice(getPrice('ETF-A') * 20));", context);
const sizingSell = vm.runInContext("calculateSizingQuantity({ symbol: 'ETF-A', side: 'sell', mode: 'weight', value: 1 })", context);
assert(sizingSell.quantity > 0, "position sizing should convert lower target weight into sell quantity");
assert(sizingSell.tradeValue <= sizingSell.currentValue, "sell sizing should not exceed current holding value");

const missionPlanCount = vm.runInContext("allCases().filter((caseItem) => !!getTrainingPlan(caseItem)).length", context);
assert(missionPlanCount === 23, "every built-in case should have a training mission");

vm.runInContext("profile = loadProfileFromScratch(); state = defaultState('A-01', 'novice');", context);
const firstRecommendation = vm.runInContext("findNextRecommendedCase().id", context);
assert(firstRecommendation === "A-01", "path should recommend the first foundation case for a new learner");
const untriedMastery = vm.runInContext("buildCaseMastery('A-01')", context);
assert(untriedMastery.level === "untried" && untriedMastery.attempts === 0, "case mastery should identify untried cases");
const lockedLevel2 = vm.runInContext("getCasePathStatus(getCase('C-03'))", context);
assert(!lockedLevel2.unlocked && lockedLevel2.reason.includes("Level 1"), "level 2 should stay locked before foundation cases are qualified");
vm.runInContext(`
  profile.completedRuns = [
    { caseId: 'A-01', disciplineScore: 80, missionPassed: true, lessonPassed: true },
    { caseId: 'S-11', disciplineScore: 78, missionPassed: true, lessonPassed: true },
    { caseId: 'S-12', disciplineScore: 76, missionPassed: true, lessonPassed: true },
  ];
`, context);
const qualifiedMastery = vm.runInContext("buildCaseMastery('A-01')", context);
assert(qualifiedMastery.level === "qualified" && qualifiedMastery.attempts === 1, "case mastery should identify qualified cases");
const unlockedLevel2 = vm.runInContext("getCasePathStatus(getCase('C-03'))", context);
assert(unlockedLevel2.unlocked, "level 2 should unlock after all foundation cases are qualified");
const lockedLevel3 = vm.runInContext("getCasePathStatus(getCase('D-04'))", context);
assert(!lockedLevel3.unlocked && lockedLevel3.reason.includes("Level 2"), "level 3 should require enough qualified level 2 cases");
vm.runInContext(`
  profile.completedRuns.push(
    { caseId: 'C-03', disciplineScore: 80, missionPassed: true, lessonPassed: true },
    { caseId: 'F-06', disciplineScore: 80, missionPassed: true, lessonPassed: true },
    { caseId: 'H-08', disciplineScore: 80, missionPassed: true, lessonPassed: true },
  );
`, context);
const unlockedLevel3 = vm.runInContext("getCasePathStatus(getCase('D-04'))", context);
assert(unlockedLevel3.unlocked, "level 3 should unlock after foundation and three level 2 cases are qualified");
vm.runInContext(`
  profile.mistakeCounts = { '追高': 3 };
  profile.completedRuns.push({ caseId: 'B-02', disciplineScore: 52, missionPassed: false, lessonPassed: true, averageCoachScore: 60 });
  profile.completedRuns.push(
    { caseId: 'A-01', disciplineScore: 92, missionScore: 90, missionPassed: true, lessonPassed: true, averageCoachScore: 88, contractScore: 90, writingQualityScore: 91 },
    { caseId: 'A-01', disciplineScore: 94, missionScore: 92, missionPassed: true, lessonPassed: true, averageCoachScore: 90, contractScore: 91, writingQualityScore: 93 },
  );
  profile.completedRuns[0].rootCausePrimary = '执行纪律';
  profile.completedRuns[1].rootCausePrimary = '执行纪律';
`, context);
const masteredCase = vm.runInContext("buildCaseMastery('A-01')", context);
assert(masteredCase.level === "mastered" && masteredCase.attempts >= 3 && Number.isFinite(masteredCase.bestComposite), "case mastery should identify mastered cases from repeated strong runs");
const needsWorkCase = vm.runInContext("buildCaseMastery('B-02')", context);
assert(needsWorkCase.level === "needs-work" && needsWorkCase.detail.includes("最近问题") === false, "case mastery should identify weak attempts as needing work");
vm.runInContext("renderCaseList(getCase('A-01'))", context);
const caseListHtml = vm.runInContext("elements.caseList.innerHTML", context);
assert(caseListHtml.includes("case-mastery-line") && caseListHtml.includes("已掌握"), "case list should render mastery details");
const trainingQueue = vm.runInContext("buildTrainingQueue({ averageCoachScore: 60, missionPassRate: 50, lessonPassRate: 80, lessonFirstTryRate: 50 })", context);
assert(trainingQueue.length >= 3, "training queue should generate multiple planned drills");
assert(trainingQueue.some((item) => item.focus === "追高"), "training queue should include drills for frequent mistake patterns");
assert(trainingQueue.some((item) => item.focus === "下单质量低"), "training queue should include coach-quality drills");
const trainingQueueUnlocked = vm.runInContext("buildTrainingQueue({ averageCoachScore: 60, missionPassRate: 50, lessonPassRate: 80, lessonFirstTryRate: 50 }).every((item) => getCasePathStatus(getCase(item.caseId)).unlocked)", context);
assert(trainingQueueUnlocked, "training queue should choose unlocked cases");
const dailyPlan = vm.runInContext("buildDailyTrainingPlan({ trainingQueue: buildTrainingQueue({ averageCoachScore: 60, missionPassRate: 50, lessonPassRate: 80, lessonFirstTryRate: 50 }) })", context);
assert(dailyPlan.primary && dailyPlan.steps.length === 4 && dailyPlan.stopRules.length >= 3, "daily training plan should turn the queue into a concrete workflow");
assert(Number.isFinite(dailyPlan.estimatedMinutes) && ["novice", "advanced", "exam"].includes(dailyPlan.modeSuggestion), "daily training plan should include duration and mode guidance");
vm.runInContext("renderProfile()", context);
const profileHtmlWithPlan = vm.runInContext("elements.profilePanel.innerHTML", context);
assert(profileHtmlWithPlan.includes("今日") && profileHtmlWithPlan.includes("daily-plan-card"), "profile should render a daily training plan card");
vm.runInContext("renderTodayPlanStrip()", context);
const todayPlanStripHtml = vm.runInContext("elements.todayPlanPanel.innerHTML", context);
assert(todayPlanStripHtml.includes("今日建议训练") && todayPlanStripHtml.includes("data-start-plan-case") && todayPlanStripHtml.includes("按建议开始"), "top start strip should expose the daily training recommendation on first screen");
assert(profileHtmlWithPlan.includes("高频根因") && profileHtmlWithPlan.includes("执行纪律"), "profile should render frequent root causes");
assert(profileHtmlWithPlan.includes("样本质量") && profileHtmlWithPlan.includes("有效盲测"), "profile should render training sample quality");
assert(profileHtmlWithPlan.includes("真实考试成绩") && profileHtmlWithPlan.includes("有效考试"), "profile should render valid blind exam performance separately");
assert(profileHtmlWithPlan.includes("市场场景覆盖") && profileHtmlWithPlan.includes("平均覆盖"), "profile should render scenario coverage");
assert(profileHtmlWithPlan.includes("实盘前准备度") && profileHtmlWithPlan.includes("建议阶段"), "profile should render live-readiness gate");
assert(profileHtmlWithPlan.includes("训练记录账本") && profileHtmlWithPlan.includes("最弱回看"), "profile should render the training ledger");
assert(profileHtmlWithPlan.includes("错题本") && profileHtmlWithPlan.includes("高优先级"), "profile should render the mistake notebook");
assert(profileHtmlWithPlan.includes("开始错题补练"), "mistake notebook cards should expose a direct drill launcher");
assert(profileHtmlWithPlan.includes("计划执行画像") && profileHtmlWithPlan.includes("计划训练"), "profile should render plan adherence");
assert(profileHtmlWithPlan.includes("间隔复训日程") && profileHtmlWithPlan.includes("开始复训"), "profile should render the spaced review schedule");
vm.runInContext("const q = buildTrainingQueue({ averageCoachScore: 60, missionPassRate: 50, lessonPassRate: 80, lessonFirstTryRate: 50 }); startScheduledTrainingCase(q[0].caseId, q[0].focus);", context);
const activePlan = vm.runInContext("state.activeTrainingPlan", context);
assert(activePlan && activePlan.caseId === vm.runInContext("state.caseId", context) && activePlan.passCriteria.length >= 3, "starting a scheduled training should persist the active plan");
assert(vm.runInContext("elements.todayPlanPanel.innerHTML.includes('当前计划')", context), "top start strip should reflect the active training plan after launch");
const missionPanelWithPlan = vm.runInContext("elements.missionPanel.innerHTML", context);
assert(missionPanelWithPlan.includes("今日训练计划") && (activePlan.launchMode === "random-blind" ? missionPanelWithPlan.includes("强盲测") : missionPanelWithPlan.includes(activePlan.focus)), "mission panel should show the active training plan");
assert(activePlan.launchMode !== "random-blind" || vm.runInContext("state.mode === 'exam' && state.blindSession.active && state.blindSession.random", context), "blind sample training plans should launch directly into a random exam");
const sampleQuality = vm.runInContext(`
  buildSampleQualityReport([
    { disciplineScore: 88, missionScore: 86, missionPassed: true, averageCoachScore: 84, returnPct: 4, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0 },
    { disciplineScore: 72, missionScore: 70, missionPassed: false, averageCoachScore: 70, returnPct: -2, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 68, blindIntegrityDangerCount: 1 },
    { disciplineScore: 90, missionScore: 88, missionPassed: true, averageCoachScore: 90, returnPct: 5 },
  ])
`, context);
assert(sampleQuality.validBlindRuns === 1 && sampleQuality.corruptedBlindRuns === 1 && sampleQuality.practiceRuns === 1, "sample quality should separate valid blind exams, corrupted blind exams, and practice runs");
assert(sampleQuality.summary && !sampleQuality.summary.includes("undefined"), "sample quality should include a readable summary");
assert(sampleQuality.rows.some((item) => item.label === "样本污染" && item.level === "danger"), "sample quality should flag corrupted blind exams");
const blindSampleQueue = vm.runInContext("buildTrainingQueue({ runs: [{ disciplineScore: 80 }, { disciplineScore: 82 }], sampleQuality: buildSampleQualityReport([{ disciplineScore: 80 }, { disciplineScore: 82 }]) })", context);
assert(blindSampleQueue.some((item) => item.focus === "盲测样本"), "training queue should prioritize building valid blind samples when practice records dominate");
assert(blindSampleQueue.find((item) => item.focus === "盲测样本").launchMode === "random-blind", "blind sample queue items should launch through random blind exam mode");
const examReport = vm.runInContext(`
  buildValidBlindExamReport([
    { disciplineScore: 88, missionScore: 86, missionPassed: true, averageCoachScore: 84, returnPct: 4, maxDrawdown: 3, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'wait before adding risk' } },
    { disciplineScore: 82, missionScore: 84, missionPassed: true, averageCoachScore: 80, returnPct: 1, maxDrawdown: 4, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'cap position size' } },
    { disciplineScore: 76, missionScore: 81, missionPassed: true, averageCoachScore: 77, returnPct: -1, maxDrawdown: 5, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 95, blindIntegrityDangerCount: 0, reflection: { nextRule: 'hold before buying' } },
    { disciplineScore: 95, missionScore: 95, missionPassed: true, averageCoachScore: 95, returnPct: 8, maxDrawdown: 2 },
  ])
`, context);
assert(examReport.validRuns === 3 && examReport.passedRuns === 3 && examReport.currentPassStreak === 3, "valid blind exam report should only score valid random blind exams");
assert(examReport.rows.some((item) => item.label === "最近趋势"), "valid blind exam report should include a trend row");
const weakExamRunsLiteral = `[
  { disciplineScore: 62, missionScore: 58, missionPassed: false, averageCoachScore: 60, returnPct: -4, maxDrawdown: 12, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'reduce risk' } },
  { disciplineScore: 60, missionScore: 55, missionPassed: false, averageCoachScore: 58, returnPct: -5, maxDrawdown: 13, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'wait more' } },
  { disciplineScore: 58, missionScore: 52, missionPassed: false, averageCoachScore: 56, returnPct: -6, maxDrawdown: 14, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'no new risk' } },
]`;
const weakExamQueue = vm.runInContext(`buildTrainingQueue({ runs: ${weakExamRunsLiteral}, sampleQuality: buildSampleQualityReport(${weakExamRunsLiteral}), examReport: buildValidBlindExamReport(${weakExamRunsLiteral}) })`, context);
assert(weakExamQueue.some((item) => item.focus === "考试稳定" && item.launchMode === "random-blind"), "weak valid exam performance should schedule a random blind stability drill");
const weakExamRecommendation = vm.runInContext(`buildProfileRecommendation({ topMistakes: [], topEmotions: [], averageScore: 80, missionPassRate: 80, sampleQuality: buildSampleQualityReport(${weakExamRunsLiteral}), examReport: buildValidBlindExamReport(${weakExamRunsLiteral}) })`, context);
assert(weakExamRecommendation.includes("真实考试稳定性"), "profile recommendation should prioritize rebuilding weak valid exam performance");
const scenarioCoverage = vm.runInContext(`
  buildScenarioCoverageReport([
    { caseId: 'A-01', disciplineScore: 84, missionScore: 86, missionPassed: true, lessonPassed: true, averageCoachScore: 82, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0 },
    { caseId: 'S-11', disciplineScore: 82, missionScore: 84, missionPassed: true, lessonPassed: true, averageCoachScore: 80 },
    { caseId: 'S-12', disciplineScore: 80, missionScore: 82, missionPassed: true, lessonPassed: true, averageCoachScore: 80 },
    { caseId: 'A-01', disciplineScore: 86, missionScore: 88, missionPassed: true, lessonPassed: true, averageCoachScore: 84 },
  ])
`, context);
assert(scenarioCoverage.rows.length >= 7 && scenarioCoverage.weakRows.length >= 1, "scenario coverage should expose multiple market regimes and weak rows");
assert(scenarioCoverage.rows.some((item) => item.label === "单股财报与估值" && item.level === "danger"), "scenario coverage should flag untrained regimes");
const coverageOnlyRunsLiteral = `[
  { caseId: 'A-01', disciplineScore: 84, missionScore: 86, missionPassed: true, lessonPassed: true, averageCoachScore: 82, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0 },
  { caseId: 'S-11', disciplineScore: 82, missionScore: 84, missionPassed: true, lessonPassed: true, averageCoachScore: 80 },
  { caseId: 'S-12', disciplineScore: 80, missionScore: 82, missionPassed: true, lessonPassed: true, averageCoachScore: 80 },
  { caseId: 'A-01', disciplineScore: 86, missionScore: 88, missionPassed: true, lessonPassed: true, averageCoachScore: 84 },
]`;
const coverageQueue = vm.runInContext(`buildTrainingQueue({ runs: ${coverageOnlyRunsLiteral}, sampleQuality: { totalRuns: 4, validBlindRuns: 3, randomBlindRuns: 3, corruptedBlindRuns: 0 }, examReport: { validRuns: 3, level: 'warn', trend: { level: 'warn' } }, coverageReport: buildScenarioCoverageReport(${coverageOnlyRunsLiteral}) })`, context);
assert(coverageQueue.some((item) => item.title === "补市场场景覆盖"), "training queue should schedule under-covered scenario drills after basics");
const weakReadinessRunsLiteral = `[
  { caseId: 'A-01', disciplineScore: 88, missionScore: 88, missionPassed: true, lessonPassed: true, averageCoachScore: 84, contractScore: 82, writingQualityScore: 84, maxDrawdown: 4, maxConcentrationPct: 25, settlementScore: 42, settlementUnsettledBuyCount: 2, settlementCashAccountWarningCount: 1, corporateActionScore: 55, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'cap risk' } },
  { caseId: 'S-11', disciplineScore: 86, missionScore: 86, missionPassed: true, lessonPassed: true, averageCoachScore: 84, contractScore: 82, writingQualityScore: 84, maxDrawdown: 4, maxConcentrationPct: 25, settlementScore: 45, settlementUnsettledBuyCount: 1, settlementCashAccountWarningCount: 1, corporateActionScore: 58, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'no fomo' } },
  { caseId: 'S-12', disciplineScore: 85, missionScore: 85, missionPassed: true, lessonPassed: true, averageCoachScore: 83, contractScore: 82, writingQualityScore: 84, maxDrawdown: 5, maxConcentrationPct: 25, settlementScore: 48, settlementUnsettledBuyCount: 1, settlementCashAccountWarningCount: 0, corporateActionScore: 60, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'no averaging down' } },
  { caseId: 'A-01', disciplineScore: 87, missionScore: 87, missionPassed: true, lessonPassed: true, averageCoachScore: 84, contractScore: 83, writingQualityScore: 85, maxDrawdown: 4, maxConcentrationPct: 25, settlementScore: 46, settlementUnsettledBuyCount: 1, settlementCashAccountWarningCount: 0, corporateActionScore: 58, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'wait settlement' } },
  { caseId: 'S-11', disciplineScore: 88, missionScore: 88, missionPassed: true, lessonPassed: true, averageCoachScore: 85, contractScore: 84, writingQualityScore: 85, maxDrawdown: 4, maxConcentrationPct: 25, settlementScore: 44, settlementUnsettledBuyCount: 1, settlementCashAccountWarningCount: 0, corporateActionScore: 56, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, reflection: { nextRule: 'check cash' } },
]`;
const weakReadiness = vm.runInContext(`buildLiveReadinessReport({ runs: ${weakReadinessRunsLiteral}, sampleQuality: buildSampleQualityReport(${weakReadinessRunsLiteral}), examReport: buildValidBlindExamReport(${weakReadinessRunsLiteral}), coverageReport: buildScenarioCoverageReport(${weakReadinessRunsLiteral}), activeRuleCount: 2 })`, context);
assert(weakReadiness.rows.some((item) => item.label === "交易机制" && item.level === "danger"), "live-readiness should flag weak broker mechanics");
assert(weakReadiness.blockers.some((item) => item.includes("交易机制")), "live-readiness should expose hard blockers");
assert(weakReadiness.summary.includes("准备度") && !weakReadiness.summary.includes("undefined"), "live-readiness should produce a readable summary");
const readinessQueue = vm.runInContext(`buildTrainingQueue({ runs: ${weakReadinessRunsLiteral}, sampleQuality: buildSampleQualityReport(${weakReadinessRunsLiteral}), examReport: buildValidBlindExamReport(${weakReadinessRunsLiteral}), coverageReport: buildScenarioCoverageReport(${weakReadinessRunsLiteral}), liveReadiness: buildLiveReadinessReport({ runs: ${weakReadinessRunsLiteral}, sampleQuality: buildSampleQualityReport(${weakReadinessRunsLiteral}), examReport: buildValidBlindExamReport(${weakReadinessRunsLiteral}), coverageReport: buildScenarioCoverageReport(${weakReadinessRunsLiteral}), activeRuleCount: 2 }) })`, context);
assert(readinessQueue.some((item) => item.title === "实盘前纪律闸门"), "training queue should schedule live-readiness gate drills");
const readinessRecommendation = vm.runInContext(`buildProfileRecommendation({ topMistakes: [], topEmotions: [], averageScore: 85, missionPassRate: 90, sampleQuality: buildSampleQualityReport(${weakReadinessRunsLiteral}), examReport: buildValidBlindExamReport(${weakReadinessRunsLiteral}), coverageReport: { averageScore: 70, weakest: { label: '交易机制' } }, liveReadiness: buildLiveReadinessReport({ runs: ${weakReadinessRunsLiteral}, sampleQuality: buildSampleQualityReport(${weakReadinessRunsLiteral}), examReport: buildValidBlindExamReport(${weakReadinessRunsLiteral}), coverageReport: { averageScore: 70, coveredDimensions: 5, totalDimensions: 7, weakest: { label: '交易机制' } }, activeRuleCount: 2 }) })`, context);
assert(readinessRecommendation.includes("实盘前纪律闸门"), "profile recommendation should prioritize live-readiness blockers");
const ledgerReport = vm.runInContext(`
  buildTrainingLedgerReport([
    { caseId: 'A-01', title: 'Foundation', completedAt: '2026-01-01T00:00:00Z', disciplineScore: 88, missionScore: 86, missionPassed: true, averageCoachScore: 84, contractScore: 82, writingQualityScore: 80, evidenceSourceScore: 82, maxDrawdown: 4, maxConcentrationPct: 25, returnPct: 2, rootCausePrimary: '执行纪律', rootCauseItems: [{ level: 'warn', nextAction: 'keep position small' }] },
    { caseId: 'B-02', title: 'Sentiment', completedAt: '2026-01-02T00:00:00Z', disciplineScore: 52, missionScore: 48, missionPassed: false, averageCoachScore: 55, contractScore: 50, writingQualityScore: 52, evidenceSourceScore: 50, maxDrawdown: 14, maxConcentrationPct: 55, returnPct: -8, coachDangerCount: 2, rootCausePrimary: '情绪控制', rootCauseItems: [{ level: 'danger', nextAction: 'reduce FOMO risk' }] },
    { caseId: 'B-02', title: 'Sentiment', completedAt: '2026-01-03T00:00:00Z', disciplineScore: 58, missionScore: 55, missionPassed: false, averageCoachScore: 58, contractScore: 56, writingQualityScore: 58, evidenceSourceScore: 55, maxDrawdown: 12, maxConcentrationPct: 50, returnPct: -5, coachDangerCount: 1, flags: ['追高'] },
  ])
`, context);
assert(ledgerReport.totalRuns === 3 && ledgerReport.weakRows[0].caseId === 'B-02', "training ledger should rank weak runs first");
assert(ledgerReport.repeatRows.some((item) => item.caseId === 'B-02' && item.weakAttempts === 2), "training ledger should identify repeated weak cases");
assert(ledgerReport.summary.includes("账本均分") && !ledgerReport.summary.includes("undefined"), "training ledger should produce a readable summary");
const mistakeNotebook = vm.runInContext(`
  buildMistakeNotebookReport([
    { id: 'r1', caseId: 'B-02', completedAt: '2026-01-01T00:00:00Z', flags: ['追高'], rootCauseItems: [{ label: '情绪控制', level: 'danger', severityScore: 34, nextAction: 'reduce FOMO risk' }], reflection: { mistake: '看到热门上涨就冲动买入', nextRule: 'wait before buying' } },
    { id: 'r2', caseId: 'S-11', completedAt: '2026-01-02T00:00:00Z', flags: ['追高'], rootCauseItems: [{ label: '执行纪律', level: 'warn', severityScore: 18, nextAction: 'write invalidation first' }] },
    { id: 'r3', caseId: 'S-12', completedAt: '2026-01-03T00:00:00Z', flags: ['连续向下补仓'], rootCauseItems: [{ label: '仓位风控', level: 'danger', severityScore: 32, nextAction: 'cap position risk' }] },
  ], { '追高': 2 })
`, context);
assert(mistakeNotebook.cards.length >= 3 && mistakeNotebook.cards[0].priorityScore >= mistakeNotebook.cards[1].priorityScore, "mistake notebook should rank issue cards by priority");
assert(mistakeNotebook.cards.some((item) => item.label === "追高" && item.constraint.includes("大涨")), "mistake notebook should reuse remediation rules for known mistakes");
assert(mistakeNotebook.cards.some((item) => item.label === "情绪控制" && item.nextAction.includes("reduce")), "mistake notebook should preserve root-cause next actions");
assert(mistakeNotebook.summary.includes("错题本") && !mistakeNotebook.summary.includes("undefined"), "mistake notebook should produce a readable summary");
vm.runInContext(`
  profile.mistakeCounts = { '追高': 2 };
  profile.completedRuns = [
    { id: 'm1', caseId: 'S-11', completedAt: '2026-01-01T00:00:00Z', flags: ['追高'], disciplineScore: 60, missionScore: 55, missionPassed: false, averageCoachScore: 58, rootCauseItems: [{ label: '情绪控制', level: 'danger', severityScore: 30, nextAction: 'reduce FOMO risk' }] },
    { id: 'm2', caseId: 'S-11', completedAt: '2026-01-02T00:00:00Z', flags: ['追高'], disciplineScore: 62, missionScore: 58, missionPassed: false, averageCoachScore: 60 },
  ];
  state.decisions = [];
  window.confirm = () => true;
  startMistakeNotebookDrill('追高');
`, context);
const activeMistakePlan = vm.runInContext("state.activeTrainingPlan", context);
assert(activeMistakePlan && activeMistakePlan.launchMode === "mistake-drill" && activeMistakePlan.title.includes("错题补练"), "starting a mistake card should create an active mistake-drill plan");
assert(vm.runInContext("elements.missionPanel.innerHTML.includes('错题补练') && elements.missionPanel.innerHTML.includes('硬限制')", context), "mistake drill should render its constraints in the mission panel");
const planDecisionCheck = vm.runInContext(`
  state.activeTrainingPlan = { title: '错题补练：追高', focus: '追高', constraint: '大涨后只能小仓试探', launchMode: 'mistake-drill', priority: 'high' };
  activeTrainingPlanDecisionCheck({ side: 'buy', intent: 'scale', horizon: 'days', amountPct: 2, dayChangePct: 5, emotion: 'calm' })
`, context);
assert(planDecisionCheck.level === "danger" && !planDecisionCheck.ok, "active training plan check should flag plan violations before trading");
const blockedPlanDecision = vm.runInContext(`
  validateActiveTrainingPlan({ side: 'buy', symbol: getCase().assets[0].maskedSymbol, quantity: 1, intent: 'scale', horizon: 'days', emotion: 'calm' })
`, context);
assert(blockedPlanDecision.ok === false && blockedPlanDecision.message.includes("训练计划限制"), "active training plan validation should block hard violations");
const activePlanResult = vm.runInContext(`
  state.decisions = [{ day: 1, side: 'buy', symbol: getCase().assets[0].maskedSymbol, amount: 5000, price: getPrice(getCase().assets[0].maskedSymbol, 1), intent: 'scale', horizon: 'days', coach: { score: 55, level: 'danger', issues: [{ level: 'danger', title: '训练计划限制' }] } }];
  evaluateActiveTrainingPlanResult({ mission: { passed: false, score: 55 }, coachStats: { sampleCount: 1, averageScore: 55, dangerCount: 1 } })
`, context);
assert(activePlanResult && !activePlanResult.passed && activePlanResult.items.some((item) => item.title === "完成计划关键动作" && item.status === "fail"), "review should mark active training plan execution as failed when constraints are violated");
const planAdherence = vm.runInContext(`
  buildPlanAdherenceReport([
    { caseId: 'S-11', disciplineScore: 82, missionScore: 84, averageCoachScore: 82, activeTrainingPlanPassed: true, activeTrainingPlanFocus: '追高', activeTrainingPlanLaunchMode: 'mistake-drill' },
    { caseId: 'S-11', disciplineScore: 58, missionScore: 55, averageCoachScore: 60, activeTrainingPlanPassed: false, activeTrainingPlanFocus: '追高', activeTrainingPlanLaunchMode: 'mistake-drill' },
    { caseId: 'A-01', disciplineScore: 88, missionScore: 90, averageCoachScore: 86, activeTrainingPlanPassed: true, activeTrainingPlanFocus: '盲测样本', activeTrainingPlanLaunchMode: 'random-blind' },
  ])
`, context);
assert(planAdherence.plannedRuns === 3 && Math.round(planAdherence.passRate) === 67, "plan adherence should compute planned-run pass rate");
assert(planAdherence.typeRows.some((item) => item.label === "错题补练" && item.count === 2), "plan adherence should group by launch mode");
assert(planAdherence.focusRows.some((item) => item.label === "追高" && item.passed === 1), "plan adherence should group by training focus");
assert(planAdherence.summary.includes("计划训练") && !planAdherence.summary.includes("undefined"), "plan adherence should produce a readable summary");
const reviewSchedule = vm.runInContext(`
  buildReviewScheduleReport([
    { caseId: 'A-01', completedAt: '2026-01-01T00:00:00Z', disciplineScore: 60, missionScore: 55, missionPassed: false, averageCoachScore: 58, flags: ['追高'] },
    { caseId: 'B-02', completedAt: '2026-01-08T00:00:00Z', disciplineScore: 92, missionScore: 90, missionPassed: true, averageCoachScore: 88, contractScore: 90, writingQualityScore: 90 },
  ], '2026-01-10T00:00:00')
`, context);
assert(reviewSchedule.dueNowCount >= 1 && reviewSchedule.rows[0].level === "danger", "review schedule should put weak overdue runs first");
assert(reviewSchedule.rows.some((item) => item.type === "case" && item.focus), "review schedule should create case review rows with a focus");
assert(reviewSchedule.summary.includes("复训") && !reviewSchedule.summary.includes("undefined"), "review schedule should produce a readable summary");
vm.runInContext("state.decisions = []; window.confirm = () => true; startReviewScheduleDrill('A-01', '巩固案例纪律');", context);
const activeReviewPlan = vm.runInContext("state.activeTrainingPlan", context);
assert(activeReviewPlan && activeReviewPlan.launchMode === "review-schedule" && activeReviewPlan.title.includes("间隔复训"), "starting a review schedule item should create an active review plan");
assert(vm.runInContext("elements.missionPanel.innerHTML.includes('间隔复训') && elements.missionPanel.innerHTML.includes('硬限制')", context), "review schedule drills should render constraints in the mission panel");
const skillRadar = vm.runInContext("buildSkillRadarMetrics({ averageScore: 72, missionPassRate: 60, averageCoachScore: 75, lessonPassRate: 80, lessonFirstTryRate: 50, reflectionRate: 40 })", context);
assert(skillRadar.length === 7 && skillRadar.some((item) => item.label === "盲测完整"), "skill radar should expose seven tracked capability dimensions including blind integrity");
assert(skillRadar.every((item) => Number.isFinite(item.score) && item.score >= 0 && item.score <= 100 && item.detail), "skill radar should produce bounded scores and details");
const improvingTrend = vm.runInContext(`
  buildTrainingTrend([
    { disciplineScore: 55, missionScore: 50, averageCoachScore: 52, contractScore: 50, writingQualityScore: 48, maxDrawdown: 12 },
    { disciplineScore: 58, missionScore: 55, averageCoachScore: 55, contractScore: 52, writingQualityScore: 50, maxDrawdown: 10 },
    { disciplineScore: 60, missionScore: 58, averageCoachScore: 58, contractScore: 55, writingQualityScore: 55, maxDrawdown: 9 },
    { disciplineScore: 76, missionScore: 78, averageCoachScore: 80, contractScore: 82, writingQualityScore: 78, maxDrawdown: 5 },
    { disciplineScore: 80, missionScore: 82, averageCoachScore: 84, contractScore: 86, writingQualityScore: 82, maxDrawdown: 4 },
    { disciplineScore: 84, missionScore: 85, averageCoachScore: 88, contractScore: 90, writingQualityScore: 86, maxDrawdown: 3 },
  ])
`, context);
assert(improvingTrend.level === "good" && improvingTrend.rows.some((item) => item.key === "maxDrawdown" && item.level === "good"), "training trend should detect improvement and lower drawdowns as positive");
const decliningTrend = vm.runInContext(`
  buildTrainingTrend([
    { disciplineScore: 85, missionScore: 84, averageCoachScore: 86, contractScore: 88, writingQualityScore: 82, maxDrawdown: 3 },
    { disciplineScore: 82, missionScore: 80, averageCoachScore: 84, contractScore: 86, writingQualityScore: 80, maxDrawdown: 4 },
    { disciplineScore: 80, missionScore: 78, averageCoachScore: 82, contractScore: 84, writingQualityScore: 78, maxDrawdown: 5 },
    { disciplineScore: 60, missionScore: 58, averageCoachScore: 62, contractScore: 60, writingQualityScore: 58, maxDrawdown: 11 },
    { disciplineScore: 58, missionScore: 55, averageCoachScore: 60, contractScore: 58, writingQualityScore: 55, maxDrawdown: 12 },
    { disciplineScore: 56, missionScore: 52, averageCoachScore: 58, contractScore: 55, writingQualityScore: 52, maxDrawdown: 13 },
  ])
`, context);
assert(decliningTrend.level === "danger" && decliningTrend.summary.includes("退步"), "training trend should detect recent regression");

const learningModuleCount = vm.runInContext("allCases().filter((caseItem) => !!getLearningModule(caseItem)).length", context);
assert(learningModuleCount === 23, "every built-in case should have a learning module");
const lessonShapeOk = vm.runInContext("allCases().every(c => { const m = getLearningModule(c); return m.title && m.concept && m.terms.length >= 3 && m.quiz.options.length >= 3; })", context);
assert(lessonShapeOk, "learning modules should include concept, terms, and quiz options");

const mission = vm.runInContext("evaluateMission(getCase('A-01'))", context);
assert(mission.items.length >= 6, "mission should include enough pass/fail criteria");
assert(Number.isFinite(mission.score), "mission should produce a numeric score");
assert(typeof mission.plan.drill === "string" && mission.plan.drill.length > 0, "mission should include a follow-up drill");

vm.runInContext("state = defaultState('A-01', 'novice'); state.day = 4; executeBuy('ETF-A', 10, getPrice('ETF-A'), roundPrice(getPrice('ETF-A') * 10));", context);
const riskDashboard = vm.runInContext("buildRiskDashboard(getCase('A-01'))", context);
assert(Number.isFinite(riskDashboard.cashPct), "risk dashboard should calculate cash percentage");
assert(Array.isArray(riskDashboard.positionRows) && riskDashboard.positionRows.length >= 1, "risk dashboard should include position exposure rows");
assert(Array.isArray(riskDashboard.sectorRows) && riskDashboard.sectorRows.length >= 1, "risk dashboard should include sector exposure rows");
assert(Array.isArray(riskDashboard.alerts) && riskDashboard.alerts.length >= 1, "risk dashboard should include risk alerts");
assert(Array.isArray(riskDashboard.equitySeries) && riskDashboard.equitySeries.length >= 1, "risk dashboard should include account equity series");
assert(Array.isArray(riskDashboard.benchmarkSeries) && riskDashboard.benchmarkSeries.length >= 1, "risk dashboard should include benchmark equity series");
assert(Array.isArray(riskDashboard.stressRows) && riskDashboard.stressRows.length >= 4, "risk dashboard should include portfolio stress scenarios");
assert(riskDashboard.stressRows.every((item) => Number.isFinite(item.loss) && Number.isFinite(item.afterEquity)), "stress scenarios should calculate loss and after-shock equity");
assert(Array.isArray(riskDashboard.planRows) && riskDashboard.planRows.length >= 1, "risk dashboard should include position plan rows");
assert(riskDashboard.allocationStatus && Array.isArray(riskDashboard.allocationStatus.items), "risk dashboard should include allocation blueprint status");
assert(riskDashboard.planRows.some((item) => item.level === "danger" && item.statusLabel === "缺少计划"), "position plan tracker should flag holdings without a recorded buy plan");
vm.runInContext("state.positions = {}; state.cash = riskPolicy.initialCash;", context);
const cashStress = vm.runInContext("buildStressRows(getPortfolioTotals().equity)", context);
assert(cashStress.length === 1 && cashStress[0].id === "cash-only", "stress scenarios should handle all-cash portfolios");

vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.day = 4;
  const plannedEntryPrice = getPrice('ETF-A', 4);
  executeBuy('ETF-A', 10, plannedEntryPrice, roundPrice(plannedEntryPrice * 10));
  state.decisions.unshift({
    day: 4,
    side: 'buy',
    symbol: 'ETF-A',
    quantity: 10,
    price: plannedEntryPrice,
    amount: roundPrice(plannedEntryPrice * 10),
    intent: 'probe',
    horizon: 'weeks',
    emotion: 'calm',
    risk: 5,
    confidence: 4,
    evidenceSources: ['price', 'relative', 'risk'],
    info: 'visible market info',
    reason: 'planned buy with a clear invalidation',
    invalidation: 'sell if it breaks my loss limit',
    profitPlan: 'take partial profit at 2R target and rebalance',
  });
  state.day = 24;
`, context);
const plannedRows = vm.runInContext("buildOpenPositionPlanRows()", context);
assert(plannedRows.some((item) => item.symbol === "ETF-A"), "position plan tracker should keep open buy lots");
assert(plannedRows.some((item) => item.level === "danger" && item.statusLabel === "触发亏损线"), "position plan tracker should detect breached self-defined loss limits");
vm.runInContext("state.checkpointLogs.push({ id: 'test-checkpoint', day: 23, symbol: 'ETF-A', bias: 'deteriorating', action: 'add-no', riskChanged: true, note: 'risk has deteriorated so I will not add more', savedAt: 'test' });", context);
assert(vm.runInContext("latestPlanTouchDay('ETF-A', 4) === 23", context), "checkpoint logs should refresh the latest position plan touch day");
const checkpointReview = vm.runInContext("buildCheckpointReview(getCase('A-01'))", context);
assert(checkpointReview.sampleCount === 1 && Number.isFinite(checkpointReview.score), "checkpoint review should score saved position reviews");
const invalidationExecution = vm.runInContext("buildInvalidationExecutionReview(getCase('A-01'))", context);
assert(invalidationExecution.breachedCount >= 1 && invalidationExecution.failedCount >= 1, "invalidation execution review should flag breached plans without a timely response");
const profitPlanReview = vm.runInContext("buildProfitPlanReview(getCase('A-01'))", context);
assert(Number.isFinite(profitPlanReview.score) && Array.isArray(profitPlanReview.items), "profit plan review should score upside plan execution opportunities");
const plannedDashboard = vm.runInContext("buildRiskDashboard(getCase('A-01'))", context);
assert(plannedDashboard.alerts.some((item) => item.title === "持仓计划失效"), "risk alerts should surface breached position plans");

const ma5 = vm.runInContext("movingAverage(getCase('A-01').assets[0].prices, 4, 5)", context);
assert(Number.isFinite(ma5), "moving average should calculate once enough bars are available");

vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.day = 6;
  state.decisions = [
    { day: 1, side: 'buy', symbol: 'ETF-A', quantity: 2, price: getPrice('ETF-A', 1), amount: getPrice('ETF-A', 1) * 2, emotion: 'calm', risk: 5, confidence: 4, evidenceSources: ['price', 'relative', 'risk'], info: 'test', reason: 'test reason long enough', invalidation: 'test invalidation', profitPlan: 'take partial profit at 2R target', coach: { score: 85, level: 'warn', issues: [] } },
    { day: 3, side: 'hold', symbol: 'ETF-A', quantity: 0, price: 0, amount: 0, emotion: 'calm', risk: 5, confidence: 2, evidenceSources: ['price'], info: 'test', reason: 'test reason long enough', invalidation: 'test invalidation', coach: { score: 90, level: 'good', issues: [] } },
    { day: 5, side: 'sell', symbol: 'ETF-A', quantity: 1, price: getPrice('ETF-A', 5), amount: getPrice('ETF-A', 5), emotion: 'calm', risk: 5, confidence: 5, evidenceSources: ['price', 'risk'], info: 'test', reason: 'test reason long enough', invalidation: 'test invalidation', coach: { score: 55, level: 'danger', issues: [{ title: 'test', level: 'danger' }] } },
  ];
`, context);
const chartMarkers = vm.runInContext("buildDecisionMarkers(getCase('A-01').assets[0], getCase('A-01').assets[0].prices.slice(0, state.day + 1))", context);
assert(chartMarkers.length === 3, "chart should expose buy/hold/sell decision markers");
assert(chartMarkers.map((item) => item.label).join("") === "BHS", "decision markers should use B/H/S labels");
assert(chartMarkers[2].coachLevel === "danger", "decision markers should preserve coach risk level");
const decisionAudit = vm.runInContext("buildDecisionOutcomeAudit(getCase('A-01'))", context);
assert(decisionAudit.length === 3, "decision audit should include buy, hold, and sell rows");
assert(decisionAudit.every((item) => Number.isFinite(item.marketMovePct) && Number.isFinite(item.adversePct) && Number.isFinite(item.favorablePct)), "decision audit should calculate movement metrics");
assert(decisionAudit.map((item) => item.side).join("") === "buyholdsell", "decision audit should preserve chronological decision order");
assert(decisionAudit.every((item) => item.verdict && ["good", "warn", "danger"].includes(item.verdict.level)), "decision audit should classify each decision");
assert(decisionAudit.every((item) => item.counterfactual && Number.isFinite(item.counterfactual.benchmarkReturnPct) && item.counterfactual.best), "decision audit should include counterfactual comparisons");
assert(decisionAudit.some((item) => item.counterfactual.alternatives.some((alternative) => alternative.id === "benchmark")), "counterfactual comparisons should include the benchmark alternative");
const confidenceCalibration = vm.runInContext("buildConfidenceCalibration(buildDecisionOutcomeAudit(getCase('A-01')))", context);
assert(confidenceCalibration.sampleCount === 3 && Number.isFinite(confidenceCalibration.score), "confidence calibration should score decisions with saved confidence");
assert(confidenceCalibration.items.some((item) => item.overconfident || item.underconfident || Number.isFinite(item.calibrationError)), "confidence calibration should expose per-decision calibration details");
const evidenceSourceReview = vm.runInContext("buildEvidenceSourceReview(state.decisions)", context);
assert(evidenceSourceReview.sampleCount === 3 && evidenceSourceReview.score >= 0 && evidenceSourceReview.sourceCounts.length >= 1, "evidence source review should summarize structured evidence usage");
const liquidityReview = vm.runInContext("buildLiquidityReview(state.decisions)", context);
assert(liquidityReview.sampleCount >= 2 && Number.isFinite(liquidityReview.score), "liquidity review should summarize saved trade liquidity snapshots");
const tradeLedger = vm.runInContext("buildTradeLedger(getCase('A-01'))", context);
assert(tradeLedger.closedLots.length === 1, "trade ledger should close sold quantities against prior buys");
assert(tradeLedger.openLots.length === 1, "trade ledger should keep the unsold lot open");
assert(Number.isFinite(tradeLedger.summary.realizedPnl) && Number.isFinite(tradeLedger.summary.unrealizedPnl), "trade ledger should calculate realized and unrealized P&L");
assert(Number.isFinite(tradeLedger.summary.frictionCost), "trade ledger should summarize saved friction costs");
assert(Number.isFinite(tradeLedger.summary.liquidityImpactCost), "trade ledger should summarize estimated liquidity impact costs");
const pnlAttribution = vm.runInContext("buildPnlAttribution(buildTradeLedger(getCase('A-01')))", context);
assert(pnlAttribution.rows.length >= 1 && Number.isFinite(pnlAttribution.totalPnl), "P&L attribution should summarize contribution by symbol");
assert(pnlAttribution.rows.every((item) => Number.isFinite(item.realizedPnl) && Number.isFinite(item.unrealizedPnl) && Number.isFinite(item.contributionPct)), "P&L attribution rows should include realized, unrealized, and contribution metrics");
vm.runInContext(`
  document.querySelector = (selector) => ({
    value: ({
      '#checkpointSymbolInput': 'ETF-A',
      '#checkpointBiasInput': 'unchanged',
      '#checkpointActionInput': 'hold',
      '#checkpointNoteInput': 'original plan still holds after review',
    })[selector] || '',
    checked: false,
  });
`, context);
const checkpointSave = vm.runInContext("saveCheckpointLog()", context);
assert(checkpointSave.ok && vm.runInContext("state.checkpointLogs.length >= 1", context), "checkpoint log form should save a review note");
const ledgerMarkdown = vm.runInContext("buildReviewMarkdown(getCase('A-01'), buildReview(getCase('A-01')))", context);
assert(ledgerMarkdown.includes("## 交易闭环账本"), "markdown export should include the trade ledger section");
assert(ledgerMarkdown.includes("## 盈亏归因"), "markdown export should include P&L attribution");
assert(ledgerMarkdown.includes("## 盈利计划执行"), "markdown export should include profit plan execution review");
assert(ledgerMarkdown.includes("## 盘中复查日志"), "markdown export should include checkpoint review logs");
assert(ledgerMarkdown.includes("## 流动性复盘"), "markdown export should include liquidity review");
assert(ledgerMarkdown.includes("## 订单执行复盘"), "markdown export should include order execution review");
assert(ledgerMarkdown.includes("最佳反事实") && ledgerMarkdown.includes("实际动作"), "markdown export should include counterfactual audit columns");
assert(ledgerMarkdown.includes("## 证据来源复盘"), "markdown export should include structured evidence source review");
assert(ledgerMarkdown.includes("## 信心校准"), "markdown export should include confidence calibration");
assert(ledgerMarkdown.includes("## 失效条件执行"), "markdown export should include invalidation execution review");

vm.runInContext("state.chartMode = 'candles'; state.showVolume = true; state.showMovingAverage = true; renderTimeline(getCase('A-01'));", context);
const barStatsHtml = vm.runInContext("elements.barStats.innerHTML", context);
assert(barStatsHtml.includes("开") && barStatsHtml.includes("量"), "bar stats should include OHLC and volume");

vm.runInContext(`
  state = defaultState('A-01', 'novice');
  state.day = 24;
  state.decisions = [{
    day: 4,
    side: 'buy',
    symbol: 'ETF-A',
    quantity: 10,
    price: getPrice('ETF-A', 4),
    amount: getPrice('ETF-A', 4) * 10,
    emotion: 'calm',
    risk: 5,
    confidence: 5,
    evidenceSources: ['price'],
    info: 'test info',
    reason: 'test reason long enough',
    invalidation: 'test invalidation',
    profitPlan: 'take partial profit at 2R target',
    coach: { score: 45, level: 'danger', summary: 'test', issues: [{ level: 'danger', title: '高风险情绪', detail: 'test' }] },
  }];
`, context);
const diagnostics = vm.runInContext("buildAdvancedDiagnostics(getCase('A-01')).map(item => item.type)", context);
assert(diagnostics.includes("early-bottom-fishing"), "advanced diagnostics should detect early bottom fishing");
assert(diagnostics.includes("ignored-risk-limit"), "advanced diagnostics should detect ignored risk limits");
assert(diagnostics.includes("incomplete-plan"), "advanced diagnostics should detect incomplete trade plans");
assert(diagnostics.includes("low-coach-score"), "advanced diagnostics should detect low coach quality");
const coachStats = vm.runInContext("buildCoachStats(state.decisions)", context);
assert(coachStats.sampleCount === 1 && coachStats.dangerCount === 1, "coach stats should summarize saved decision snapshots");
const coachReview = vm.runInContext("buildReview(getCase('A-01')).coachStats", context);
assert(coachReview.sampleCount === 1 && Number.isFinite(coachReview.averageScore), "review should include coach quality stats");
const writingReview = vm.runInContext("buildReview(getCase('A-01')).writingQuality", context);
assert(writingReview.sampleCount === 1 && Number.isFinite(writingReview.averageScore), "review should include decision writing quality stats");
vm.runInContext("state.trainingContract = { saved: true, objective: '练习小仓位并及时承认错误', riskBudgetPct: 8, maxTrades: 3, maxPositionPct: 20, minHolds: 1, noAverageDown: true, savedAt: 'test' };", context);
vm.runInContext("state.allocationBlueprint = { saved: true, objective: 'ETF 做核心，单股和行业只做卫星仓', minEtfPct: 40, maxSatellitePct: 30, maxSingleStockPct: 15, maxSectorPct: 25, minCashPct: 10, savedAt: 'test' };", context);
vm.runInContext("state.sessionThesis = { saved: true, baseCase: '当前更像高波动后的反弹阶段，需要先控制仓位', bullCase: '基准重新站上均线并跑赢', bearCase: '跌破前低并继续放量', riskTrigger: '跌破前低就减仓并停止加仓', opportunityTrigger: '重新企稳并连续跑赢基准', preferredAction: 'probe', maxExposurePct: 15, savedAt: 'test' };", context);
vm.runInContext(`
  const reviewNewsItem = getCase().news.find((item) => item.day <= state.day);
  const reviewNewsKey = newsItemKey(getCase(), reviewNewsItem);
  state.newsJudgments = {
    [reviewNewsKey]: {
      key: reviewNewsKey,
      day: reviewNewsItem.day,
      title: reviewNewsItem.title,
      importance: reviewNewsItem.category,
      outlook: 'uncertain',
      action: 'watch',
      reason: 'watch for confirmation before taking action',
      savedAt: 'test',
    },
  };
`, context);
const remediation = vm.runInContext("buildReview(getCase('A-01')).remediation", context);
assert(remediation && remediation.nextCaseId && remediation.constraint && remediation.checklist.length >= 3, "review should include a concrete remediation prescription");
vm.runInContext("state.checkpointLogs = [{ id: 'run-checkpoint', day: 12, symbol: 'ETF-A', bias: 'deteriorating', action: 'add-no', riskChanged: true, note: 'risk changed so I will not add more', savedAt: 'test' }]; state.revealed = true; state.reviewSaved = false; profile = loadProfileFromScratch(); recordCompletedRun();", context);
const savedRemediation = vm.runInContext("profile.completedRuns[0].remediation", context);
assert(savedRemediation && savedRemediation.nextCaseId, "completed run should save remediation prescription");
const savedContract = vm.runInContext("profile.completedRuns[0].trainingContract", context);
assert(savedContract && savedContract.saved && Number.isFinite(vm.runInContext("profile.completedRuns[0].contractScore", context)), "completed run should save the training contract and score");
const savedAllocationRun = vm.runInContext("profile.completedRuns[0].allocationBlueprint", context);
assert(savedAllocationRun && savedAllocationRun.saved && Number.isFinite(vm.runInContext("profile.completedRuns[0].allocationScore", context)), "completed run should save allocation blueprint and score");
const savedThesisRun = vm.runInContext("profile.completedRuns[0].sessionThesis", context);
assert(savedThesisRun && savedThesisRun.saved && Number.isFinite(vm.runInContext("profile.completedRuns[0].thesisScore", context)), "completed run should save the session thesis and score");
assert(vm.runInContext("profile.completedRuns[0].rootCausePrimary && profile.completedRuns[0].rootCauseItems.length >= 6", context), "completed run should save root-cause analysis");
assert(vm.runInContext("profile.completedRuns[0].newsJudgmentCount >= 1 && Number.isFinite(profile.completedRuns[0].newsCalibrationScore)", context), "completed run should save news calibration metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].writingQualityScore", context)), "completed run should save writing quality score");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].invalidationExecutionScore", context)), "completed run should save invalidation execution score");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].profitPlanScore", context)), "completed run should save profit plan execution score");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].positionTriggerScore", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].positionTriggerCount", context)), "completed run should save position trigger review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].checkpointScore", context)) && vm.runInContext("profile.completedRuns[0].checkpointCount >= 1", context), "completed run should save checkpoint review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].riskCoolingScore", context)), "completed run should save risk cooling review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].liquidityScore", context)), "completed run should save liquidity review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].orderExecutionScore", context)), "completed run should save order execution review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].gapRiskScore", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].gapDangerCount", context)), "completed run should save overnight gap review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].eventRiskScore", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].eventRiskTradeCount", context)), "completed run should save scheduled event risk metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].corporateActionScore", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].corporateActionDividendCash", context)), "completed run should save corporate action review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].corporateActionDividendTaxWithheld", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].dividendWithholdingRatePct", context)), "completed run should save dividend withholding tax metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].fundingHomeReturnPct", context)) && vm.runInContext("profile.completedRuns[0].fundingInitialFxCostHome > 0", context), "completed run should save funding and FX metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].settlementScore", context)) && vm.runInContext("profile.completedRuns[0].settlementCycle === 'T+1'", context), "completed run should save settlement review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].settlementCashAccountWarningCount", context)), "completed run should save cash account warning metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].blindIntegrityScore", context)) && Number.isFinite(vm.runInContext("profile.completedRuns[0].blindIntegrityViolationCount", context)), "completed run should save blind integrity review metrics");
assert(Number.isFinite(vm.runInContext("profile.completedRuns[0].pnlAttributionTotal", context)), "completed run should save P&L attribution totals");
vm.runInContext(`
  document.querySelector = (selector) => ({
    value: ({
      '#reflectionWinInput': 'I kept the first position small enough',
      '#reflectionMistakeInput': 'I entered before enough confirmation',
      '#reflectionNextRuleInput': 'Next run must include one active hold before any buy',
    })[selector] || '',
  });
`, context);
const reflectionSave = vm.runInContext("saveReviewReflection()", context);
assert(reflectionSave.ok, "review reflection should save when all prompts are complete");
assert(vm.runInContext("elements.tradeMessage.textContent", context).includes("导出备份"), "saving reflection should remind the user to export a backup");
const savedReflection = vm.runInContext("profile.completedRuns[0].reflection", context);
assert(savedReflection && savedReflection.nextRule.includes("active hold"), "completed run should store saved reflection");
const rulebookAfterReflection = vm.runInContext("profile.rulebook", context);
assert(rulebookAfterReflection.length >= 1 && rulebookAfterReflection[0].text.includes("active hold"), "saving reflection should add the next hard rule to the personal rulebook");
vm.runInContext("renderProfile()", context);
const rulebookProfileHtml = vm.runInContext("elements.profilePanel.innerHTML", context);
assert(rulebookProfileHtml.includes("个人纪律规则库") && rulebookProfileHtml.includes("active hold"), "profile should render personal rulebook rules");
vm.runInContext("toggleRulebookRule(profile.rulebook[0].id)", context);
assert(vm.runInContext("profile.rulebook[0].active === false", context), "rulebook rules should be pausable from the profile");
vm.runInContext("startRemediation('profile')", context);
const activeRemediation = vm.runInContext("state.activeRemediation", context);
assert(activeRemediation && activeRemediation.nextCaseId === vm.runInContext("state.caseId", context), "starting remediation should switch to the prescribed case");
if (activeRemediation.primaryIssue === "缺少观望") {
  vm.runInContext("state.lessonAnswers[state.caseId] = { selected: getLearningModule(getCase()).quiz.answer, attempts: 1, correct: true, answeredAt: 'test', correctAt: 'test' };", context);
  const blockedBuy = vm.runInContext("validateDecision({ side: 'buy', symbol: getCase().assets[0].maskedSymbol, quantity: 1, intent: 'probe', horizon: 'days', planChecks: { risk: true, mission: true, invalidation: true }, evidenceSources: ['price', 'risk'], emotion: 'calm', risk: 5, confidence: 3, info: 'visible market info', reason: 'reasonable decision text', invalidation: 'clear invalidation', profitPlan: 'take partial profit at 2R target' })", context);
  assert(!blockedBuy.ok, "active remediation should block first-day buys when the prescription requires observation");
}

console.log("smoke tests passed");
