#!/usr/bin/env node

import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const HELP = `
Market Replay browser smoke test

Usage:
  node tools/browser-smoke.mjs
  node tools/browser-smoke.mjs --headed

Options:
  --headed        Show the Chromium window while testing.
  --help          Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  const result = await runBrowserSmoke(args);
  process.stdout.write(`${formatResult(result)}\n`);
}

export function parseArgs(argv) {
  const args = { headed: false, help: false };
  argv.forEach((token) => {
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--headed") args.headed = true;
    else throw new Error(`Unexpected argument: ${token}`);
  });
  return args;
}

export async function runBrowserSmoke(options = {}) {
  const cwd = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const outputDir = resolve(cwd, "output", "playwright");
  await mkdir(outputDir, { recursive: true });
  const screenshotPath = resolve(outputDir, "browser-smoke-qa.png");
  const reviewScreenshotPath = resolve(outputDir, "browser-smoke-review-qa.png");
  const mobileScreenshotPath = resolve(outputDir, "browser-smoke-mobile-qa.png");
  const decisionScreenshotPath = resolve(outputDir, "browser-smoke-decision-qa.png");
  const tradeScreenshotPath = resolve(outputDir, "browser-smoke-trade-qa.png");
  const limitOrderScreenshotPath = resolve(outputDir, "browser-smoke-limit-order-qa.png");
  const limitOrderExpiryScreenshotPath = resolve(outputDir, "browser-smoke-limit-order-expiry-qa.png");
  const limitOrderCancelScreenshotPath = resolve(outputDir, "browser-smoke-limit-order-cancel-qa.png");
  const fileImportScreenshotPath = resolve(outputDir, "browser-smoke-file-import-qa.png");
  const starterBundleImportScreenshotPath = resolve(outputDir, "browser-smoke-starter-bundle-import-qa.png");
  const packageDownloadPath = resolve(outputDir, "browser-smoke-case-package.json");
  const libraryDownloadPath = resolve(outputDir, "browser-smoke-case-library.json");
  const reviewDownloadPath = resolve(outputDir, "browser-smoke-review.md");
  const backupDownloadPath = resolve(outputDir, "browser-smoke-backup.json");
  const pageErrors = [];
  const consoleErrors = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: !options.headed });
  } catch (error) {
    throw new Error(`${error.message}\n如果提示缺少浏览器，请运行：npx playwright install chromium`);
  }
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("dialog", (dialog) => dialog.accept());

  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    await assertText(page, "h1", "美股历史盲测训练器", "页面标题没有正常渲染。");
    await assertText(page, ".scope-notice", "训练工具，不是投资建议", "页面没有显示投资建议边界提示。");
    await assertText(page, ".scope-notice", "税费、汇率、滑点和成交假设", "页面没有显示训练假设提示。");
    await assertText(page, "#todayPlanPanel", "今日建议训练", "首屏没有显示今日建议训练入口。");
    await assertText(page, "#todayPlanPanel", "按建议开始", "首屏今日建议训练入口缺少启动按钮。");
    const caseCount = await page.locator("#caseList .case-card").count();
    assert(caseCount >= 20, `案例列表数量异常：预期至少 20 个，实际 ${caseCount} 个。`);
    await assertCanvasNonBlank(page, "#priceChart", "价格图没有绘制有效像素。");
    const liveReadinessGateChecked = await assertLiveReadinessGate(page);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await page.click("#randomExamButton");
    await page.waitForFunction(() => {
      const mode = document.querySelector("#modeInput")?.value;
      const title = document.querySelector("#caseTitle")?.textContent || "";
      return mode === "exam" && title.includes("匿名训练包");
    }, null, { timeout: 10_000 });
    await page.selectOption("#modeInput", "novice");
    await page.waitForFunction(() => document.querySelector("#modeInput")?.value === "novice", null, { timeout: 10_000 });

    const packageText = await readFile(resolve(cwd, "tools", "example-case-package.json"), "utf8");
    await page.fill("#importPackageInput", packageText);
    await assertText(page, "#importPackageQualityPanel", "盲测防剧透", "案例包导入体检没有显示盲测防剧透评分。");
    await page.click("#importPackageButton");
    await page.waitForFunction(() => {
      const message = document.querySelector("#importMessage")?.textContent || "";
      return message.includes("已导入案例包");
    }, null, { timeout: 10_000 });

    const decisionResult = await recordHoldDecision(page, decisionScreenshotPath);

    const packageDownload = await downloadFromClick(page, "#exportCasePackageButton");
    await packageDownload.saveAs(packageDownloadPath);
    const exportedPackage = JSON.parse(await readFile(packageDownloadPath, "utf8"));
    assert(Array.isArray(exportedPackage.assets) && exportedPackage.assets.length >= 2, "导出的案例包缺少多标的行情。");
    assert(exportedPackage.maskedTitle && exportedPackage.revealTitle, "导出的案例包缺少盲测标题或揭晓标题。");

    const libraryDownload = await downloadFromClick(page, "#exportCaseLibraryButton");
    await libraryDownload.saveAs(libraryDownloadPath);
    const exportedLibrary = JSON.parse(await readFile(libraryDownloadPath, "utf8"));
    assert(exportedLibrary.schema === "market-replay-case-library", "导出的案例库 schema 不正确。");
    assert(Array.isArray(exportedLibrary.cases) && exportedLibrary.cases.length >= 1, "导出的案例库没有包含自定义案例。");

    await page.click("#revealButton");
    await page.waitForFunction(() => {
      const label = document.querySelector("#reviewStateLabel")?.textContent || "";
      const content = document.querySelector("#reviewContent")?.textContent || "";
      return label.includes("已揭晓") && content.includes("复盘资料包") && content.includes("盲测完整性");
    }, null, { timeout: 10_000 });
    await page.screenshot({ path: reviewScreenshotPath, fullPage: true });
    const reviewDownload = await downloadFromClick(page, "[data-export-review]");
    await reviewDownload.saveAs(reviewDownloadPath);
    const reviewMarkdown = await readFile(reviewDownloadPath, "utf8");
    assert(reviewMarkdown.includes("## 复盘资料包"), "导出的 Markdown 缺少复盘资料包。");
    assert(reviewMarkdown.includes("## 盲测完整性审计"), "导出的 Markdown 缺少盲测完整性审计。");

    const tradeResult = await runBuySellSmoke(browser, cwd, tradeScreenshotPath);
    const limitOrderResult = await runLimitOrderSmoke(browser, cwd, limitOrderScreenshotPath);
    const limitOrderExpiryResult = await runLimitOrderExpirySmoke(browser, cwd, limitOrderExpiryScreenshotPath);
    const limitOrderCancelResult = await runLimitOrderCancelSmoke(browser, cwd, limitOrderCancelScreenshotPath);
    const fileImportResult = await runFileImportBackupSmoke(browser, cwd, {
      screenshotPath: fileImportScreenshotPath,
      backupDownloadPath,
    });
    const starterBundleImportResult = await runStarterBundleImportSmoke(browser, cwd, starterBundleImportScreenshotPath);
    const mobileResult = await runMobileSmoke(context, screenshotPath, mobileScreenshotPath);

    if (pageErrors.length || consoleErrors.length) {
      throw new Error(`浏览器运行出现错误：${[...pageErrors, ...consoleErrors].join(" | ")}`);
    }

    return {
      ok: true,
      caseCount,
      screenshotPath,
      reviewScreenshotPath,
      mobileScreenshotPath,
      decisionScreenshotPath,
      tradeScreenshotPath,
      limitOrderScreenshotPath,
      limitOrderExpiryScreenshotPath,
      limitOrderCancelScreenshotPath,
      fileImportScreenshotPath,
      starterBundleImportScreenshotPath,
      packageDownloadPath,
      libraryDownloadPath,
      reviewDownloadPath,
      backupDownloadPath,
      mobileOverflowPx: mobileResult.overflowPx,
      decisionHistoryCount: decisionResult.historyCount,
      tradeHistoryCount: tradeResult.historyCount,
      limitOrderStatus: limitOrderResult.status,
      limitOrderExpiryStatus: limitOrderExpiryResult.status,
      limitOrderCancelStatus: limitOrderCancelResult.status,
      fileImportCaseCount: fileImportResult.caseCount,
      restoredCustomCases: fileImportResult.restoredCustomCases,
      starterBundleCaseCount: starterBundleImportResult.caseCount,
      starterBundleImported: starterBundleImportResult.imported,
      starterBundleDuplicateSkipped: starterBundleImportResult.duplicateSkipped,
      liveReadinessGateChecked,
    };
  } finally {
    await browser.close();
  }
}

async function assertLiveReadinessGate(page) {
  const profileText = await page.evaluate(() => {
    profile = loadProfileFromScratch();
    profile.mistakeCounts = { "追高": 3 };
    profile.rulebook = [];
    profile.completedRuns = [
      { caseId: "A-01", disciplineScore: 62, missionScore: 60, missionPassed: false, averageCoachScore: 58, contractScore: 55, contractPassed: false, maxDrawdown: 13, riskCoolingForbiddenBuyCount: 1, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, flags: ["追高"], reflection: { nextRule: "reduce risk" } },
      { caseId: "S-11", disciplineScore: 60, missionScore: 58, missionPassed: false, averageCoachScore: 56, contractScore: 54, contractPassed: false, maxDrawdown: 14, riskCoolingForbiddenBuyCount: 1, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, flags: ["追高"], reflection: { nextRule: "wait before buying" } },
      { caseId: "S-12", disciplineScore: 58, missionScore: 55, missionPassed: false, averageCoachScore: 54, contractScore: 50, contractPassed: false, maxDrawdown: 15, riskCoolingForbiddenBuyCount: 1, blindIntegrityActive: true, blindIntegrityRandom: true, blindIntegrityScore: 100, blindIntegrityDangerCount: 0, flags: ["追高"], reflection: { nextRule: "no new risk" } },
    ];
    renderProfile();
    return document.querySelector("#profilePanel")?.textContent || "";
  });
  assert(profileText.includes("实盘前准备度"), "长期画像没有渲染实盘前准备度。");
  assert(profileText.includes("硬门槛"), "长期画像没有渲染实盘前硬门槛。");
  assert(profileText.includes("有效随机盲测"), "实盘前硬门槛没有显示有效随机盲测缺口。");
  assert(profileText.includes("合约破坏"), "实盘前硬门槛没有显示训练合约破坏缺口。");
  return true;
}

async function runStarterBundleImportSmoke(browser, cwd, starterBundleImportScreenshotPath) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const bundlePath = resolve(cwd, "packages", "case-c-bundle.json");
    await page.setInputFiles("#importPackageFileInput", bundlePath);
    await page.waitForFunction(() => {
      const message = document.querySelector("#importMessage")?.textContent || "";
      const countLabel = document.querySelector("#caseCountLabel")?.textContent || "";
      const title = document.querySelector("#caseTitle")?.textContent || "";
      return message.includes("没有新增案例包")
        && message.includes("已跳过重复导入")
        && countLabel.includes("23 个训练包")
        && title.length > 0;
    }, null, { timeout: 10_000 });
    await assertText(page, "#caseList", "匿名订单执行案例", "starter bundle 内置案例列表没有出现最后一个训练包。");
    await assertText(page, "#caseLibraryCoverage", "结构比较均衡", "starter bundle 导入后案例库体检没有显示均衡状态。");
    await assertText(page, "#caseLibraryCoverage", "交易机制", "starter bundle 导入后案例库体检没有显示交易机制维度。");
    await page.screenshot({ path: starterBundleImportScreenshotPath, fullPage: true });

    const caseCount = await page.locator("#caseList .case-card").count();
    assert(caseCount === 23, `starter bundle 重复导入后案例数量异常：${caseCount}`);
    return { caseCount, imported: 0, duplicateSkipped: 11 };
  } finally {
    await context.close();
  }
}

async function runLimitOrderCancelSmoke(browser, cwd, limitOrderCancelScreenshotPath) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const setup = await page.evaluate(() => ({
      answer: getLearningModule(getCase()).quiz.answer,
      limitPrice: roundPrice(getPrice("ETF-A") * 0.1),
    }));
    await page.click(`[data-quiz-answer="${setup.answer}"]`);
    await page.waitForFunction(() => !document.querySelector("#submitOrder")?.disabled, null, { timeout: 10_000 });
    await fillTradeDecision(page, {
      side: "buy",
      intent: "probe",
      orderType: "limit",
      limitPrice: String(setup.limitPrice),
      orderExpiry: "10",
      info: "我先提交一张可取消的低价限价单。",
      reason: "计划改变时应该主动取消挂单，而不是让旧计划继续暴露。",
      invalidation: "如果取消后仍然显示等待成交，说明挂单控制有问题。",
      profitPlan: "如果成交才执行后续盈利计划；未成交则优先保护纪律。",
    });
    await page.click("#submitOrder");
    await page.waitForFunction(() => {
      const history = document.querySelector("#historyList")?.textContent || "";
      return history.includes("等待成交") && Boolean(document.querySelector("[data-cancel-pending-order]"));
    }, null, { timeout: 10_000 });
    await page.click("[data-cancel-pending-order]");
    await page.waitForFunction(() => {
      const message = document.querySelector("#tradeMessage")?.textContent || "";
      const history = document.querySelector("#historyList")?.textContent || "";
      return message.includes("已取消限价单") && history.includes("已取消") && !document.querySelector("[data-cancel-pending-order]");
    }, null, { timeout: 10_000 });
    await page.screenshot({ path: limitOrderCancelScreenshotPath, fullPage: true });
    const status = await page.evaluate(() => state.pendingOrders?.[0]?.status || "");
    assert(status === "canceled", `限价单取消状态异常：${status}`);
    const decisionCount = await page.evaluate(() => state.decisions.length);
    assert(decisionCount === 0, `取消限价单不应该生成成交决策，实际 ${decisionCount} 条。`);
    return { status };
  } finally {
    await context.close();
  }
}

async function runLimitOrderExpirySmoke(browser, cwd, limitOrderExpiryScreenshotPath) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const setup = await page.evaluate(() => ({
      answer: getLearningModule(getCase()).quiz.answer,
      limitPrice: roundPrice(getPrice("ETF-A") * 0.1),
    }));
    await page.click(`[data-quiz-answer="${setup.answer}"]`);
    await page.waitForFunction(() => !document.querySelector("#submitOrder")?.disabled, null, { timeout: 10_000 });
    await fillTradeDecision(page, {
      side: "buy",
      intent: "probe",
      orderType: "limit",
      limitPrice: String(setup.limitPrice),
      orderExpiry: "1",
      info: "我用明显偏低的限价单测试未成交后过期路径。",
      reason: "价格没有到计划价时应该允许订单过期，而不是随意追价。",
      invalidation: "如果过期后系统仍显示等待成交，说明订单生命周期有问题。",
      profitPlan: "如果极端低价意外成交，我会按风险计划重新评估。",
    });
    await page.click("#submitOrder");
    await page.waitForFunction(() => {
      const message = document.querySelector("#tradeMessage")?.textContent || "";
      const history = document.querySelector("#historyList")?.textContent || "";
      return message.includes("限价单已挂起") && history.includes("等待成交");
    }, null, { timeout: 10_000 });
    await page.evaluate(() => nextDay(2, false));
    await page.waitForFunction(() => {
      const history = document.querySelector("#historyList")?.textContent || "";
      return history.includes("已过期") && history.includes("限价买入");
    }, null, { timeout: 10_000 });
    await page.screenshot({ path: limitOrderExpiryScreenshotPath, fullPage: true });
    const status = await page.evaluate(() => state.pendingOrders?.[0]?.status || "");
    assert(status === "expired", `限价单过期状态异常：${status}`);
    const decisionCount = await page.evaluate(() => state.decisions.length);
    assert(decisionCount === 0, `过期限价单不应该生成成交决策，实际 ${decisionCount} 条。`);
    return { status };
  } finally {
    await context.close();
  }
}

async function runFileImportBackupSmoke(browser, cwd, options) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    await page.setInputFiles("#importPackageFileInput", resolve(cwd, "tools", "example-case-package.json"));
    await page.waitForFunction(() => {
      const message = document.querySelector("#importMessage")?.textContent || "";
      return message.includes("已导入 1/1 个案例包") && message.includes("example-case-package.json");
    }, null, { timeout: 10_000 });
    await assertText(page, "#caseCountLabel", "24 个训练包", "文件导入案例包后案例数量没有增加。");

    const backupDownload = await downloadFromClick(page, "#exportProfileButton");
    await backupDownload.saveAs(options.backupDownloadPath);
    const backupPayload = JSON.parse(await readFile(options.backupDownloadPath, "utf8"));
    assert(backupPayload.schema === "market-replay-trainer-backup", "导出的备份 schema 不正确。");
    assert(backupPayload.summary?.customCases === 1, "导出的备份没有包含自定义案例。");

    const restorePage = await context.newPage();
    await restorePage.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await restorePage.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const dialogPromise = restorePage.waitForEvent("dialog", { timeout: 10_000 });
    await restorePage.setInputFiles("#backupFileInput", options.backupDownloadPath);
    const dialog = await dialogPromise;
    const dialogText = dialog.message();
    await dialog.accept();
    assert(dialogText.includes("已导入备份") && dialogText.includes("1 个自定义案例"), `备份导入弹窗异常：${dialogText}`);
    await restorePage.waitForFunction(() => (document.querySelector("#caseCountLabel")?.textContent || "").includes("24 个训练包"), null, { timeout: 10_000 });
    await restorePage.screenshot({ path: options.screenshotPath, fullPage: true });
    const caseCount = await restorePage.locator("#caseList .case-card").count();
    await restorePage.close();
    return { caseCount, restoredCustomCases: backupPayload.summary.customCases };
  } finally {
    await context.close();
  }
}

async function runLimitOrderSmoke(browser, cwd, limitOrderScreenshotPath) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const setup = await page.evaluate(() => {
      const answer = getLearningModule(getCase()).quiz.answer;
      const asset = getAsset("ETF-A");
      const currentPrice = getPrice("ETF-A");
      const limitPrice = roundPrice(currentPrice * 0.999);
      const triggerIndex = asset.prices.findIndex((bar, index) => index > state.day && Number(bar.low) <= limitPrice);
      return { answer, limitPrice, triggerStep: triggerIndex > 0 ? triggerIndex - state.day : 1 };
    });
    await page.click(`[data-quiz-answer="${setup.answer}"]`);
    await page.waitForFunction(() => !document.querySelector("#submitOrder")?.disabled, null, { timeout: 10_000 });
    await fillTradeDecision(page, {
      side: "buy",
      intent: "probe",
      orderType: "limit",
      limitPrice: String(setup.limitPrice),
      orderExpiry: "10",
      info: "我用略低于当前价格的限价单测试等待成交路径。",
      reason: "限价单不应该立刻成交，只有后续价格触及才进入决策历史。",
      invalidation: "如果价格没有触及限价，我不会追价成交。",
      profitPlan: "如果成交后上涨到计划区间，我会按规则止盈或再平衡。",
    });
    await page.click("#submitOrder");
    await page.waitForFunction(() => {
      const message = document.querySelector("#tradeMessage")?.textContent || "";
      const history = document.querySelector("#historyList")?.textContent || "";
      return message.includes("限价单已挂起") && history.includes("等待成交");
    }, null, { timeout: 10_000 });
    await page.evaluate((step) => nextDay(step, false), setup.triggerStep);
    await page.waitForFunction(() => {
      const history = document.querySelector("#historyList")?.textContent || "";
      return history.includes("已成交") && history.includes("限价买入") && history.includes("买入");
    }, null, { timeout: 10_000 });
    await assertText(page, "#historyList", "成交价", "限价单成交后没有显示成交价。");
    await page.screenshot({ path: limitOrderScreenshotPath, fullPage: true });
    const status = await page.evaluate(() => state.pendingOrders?.[0]?.status || "");
    assert(status === "filled", `限价单状态异常：${status}`);
    return { status };
  } finally {
    await context.close();
  }
}

async function runBuySellSmoke(browser, cwd, tradeScreenshotPath) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(resolve(cwd, "index.html")).href, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
    const answerIndex = await page.evaluate(() => getLearningModule(getCase()).quiz.answer);
    await page.click(`[data-quiz-answer="${answerIndex}"]`);
    await page.waitForFunction(() => !document.querySelector("#submitOrder")?.disabled, null, { timeout: 10_000 });

    await fillTradeDecision(page, {
      side: "buy",
      intent: "probe",
      info: "宽基 ETF 第一日波动可控，我只用一股做执行路径验证。",
      reason: "小仓试探能验证下单流程，同时不会让仓位主导训练结果。",
      invalidation: "如果价格跌破计划区间并且风险升高，我会卖出而不是补仓。",
      profitPlan: "如果判断正确出现明显盈利，我会先减仓或重新平衡。",
    });
    await page.click("#submitOrder");
    await page.waitForFunction(() => {
      const message = document.querySelector("#tradeMessage")?.textContent || "";
      const positions = document.querySelector("#positionsTable")?.textContent || "";
      const history = document.querySelector("#historyList")?.textContent || "";
      return message.includes("决策已记录并成交") && positions.includes("ETF-A") && history.includes("买入");
    }, null, { timeout: 10_000 });

    await page.click("#nextDayButton");
    await page.waitForFunction(() => (document.querySelector("#dayLabel")?.textContent || "").includes("第 2 天"), null, { timeout: 10_000 });

    await fillTradeDecision(page, {
      side: "sell",
      intent: "risk-off",
      info: "已经推进到下一交易日，现在验证卖出持仓和结算记录路径。",
      reason: "这次卖出不是预测行情，而是确认买入后的退出动作可以被系统正确记录。",
      invalidation: "如果系统显示持仓不足或历史不更新，说明交易闭环有问题。",
      profitPlan: "",
    });
    await page.click("#submitOrder");
    await page.waitForFunction(() => {
      const message = document.querySelector("#tradeMessage")?.textContent || "";
      const history = document.querySelector("#historyList")?.textContent || "";
      return message.includes("决策已记录并成交") && history.includes("买入") && history.includes("卖出");
    }, null, { timeout: 10_000 });
    await assertText(page, "#historyList", "资金口径", "买卖历史没有显示资金口径。");
    await assertText(page, "#historyList", "结算口径", "买卖历史没有显示结算口径。");
    await page.screenshot({ path: tradeScreenshotPath, fullPage: true });
    const historyCount = await page.locator("#historyList .history-item").count();
    assert(historyCount >= 2, "买入卖出后历史记录不足 2 条。");
    return { historyCount };
  } finally {
    await context.close();
  }
}

async function fillTradeDecision(page, options) {
  await page.click(`.side-button[data-side="${options.side}"]`);
  await page.fill("#quantityInput", "1");
  await page.selectOption("#orderTypeInput", options.orderType || "market");
  if (options.orderType === "limit") {
    await page.fill("#limitPriceInput", options.limitPrice);
    await page.selectOption("#orderExpiryInput", options.orderExpiry || "5");
  }
  await page.selectOption("#intentInput", options.intent);
  await page.selectOption("#horizonInput", "days");
  await ensureChecked(page, "#checkedRiskInput");
  await ensureChecked(page, "#checkedMissionInput");
  await ensureChecked(page, "#checkedInvalidationInput");
  await ensureChecked(page, "#evidencePriceInput");
  await ensureChecked(page, "#evidenceRiskInput");
  await page.selectOption("#emotionInput", "calm");
  await page.selectOption("#riskInput", "5");
  await page.selectOption("#confidenceInput", "3");
  await page.fill("#infoInput", options.info);
  await page.fill("#reasonInput", options.reason);
  await page.fill("#invalidInput", options.invalidation);
  await page.fill("#profitPlanInput", options.profitPlan || "");
}

async function ensureChecked(page, selector) {
  if (!await page.locator(selector).isChecked()) await page.check(selector);
}

async function recordHoldDecision(page, decisionScreenshotPath) {
  const answerIndex = await page.evaluate(() => getLearningModule(getCase()).quiz.answer);
  await page.click(`[data-quiz-answer="${answerIndex}"]`);
  await page.waitForFunction(() => !document.querySelector("#submitOrder")?.disabled, null, { timeout: 10_000 });
  await page.click('.side-button[data-side="hold"]');
  await page.selectOption("#intentInput", "wait");
  await page.selectOption("#horizonInput", "days");
  await page.check("#checkedRiskInput");
  await page.check("#checkedMissionInput");
  await page.check("#checkedInvalidationInput");
  await page.check("#evidencePriceInput");
  await page.check("#evidenceRiskInput");
  await page.selectOption("#emotionInput", "calm");
  await page.selectOption("#riskInput", "5");
  await page.selectOption("#confidenceInput", "3");
  await page.fill("#infoInput", "当前价格波动扩大，我先观察风险仪表盘和新闻节奏。");
  await page.fill("#reasonInput", "现在证据还不够清晰，主动观望比为了训练而下单更符合纪律。");
  await page.fill("#invalidInput", "如果后续价格重新站稳并且风险下降，我再重新评估。");
  await page.click("#submitOrder");
  await page.waitForFunction(() => {
    const message = document.querySelector("#tradeMessage")?.textContent || "";
    const history = document.querySelector("#historyList")?.textContent || "";
    return message.includes("已记录") && history.includes("观望");
  }, null, { timeout: 10_000 });
  await assertText(page, "#historyList", "主动观望", "决策历史没有记录真实观望动作。");
  await page.screenshot({ path: decisionScreenshotPath, fullPage: true });
  const historyCount = await page.locator("#historyList .history-item").count();
  assert(historyCount >= 1, "提交观望后历史记录为空。");
  return { historyCount };
}

async function runMobileSmoke(context, desktopScreenshotPath, mobileScreenshotPath) {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(pathToFileURL(resolve(fileURLToPath(new URL("..", import.meta.url)), "index.html")).href, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#caseList .case-card", { timeout: 10_000 });
  await assertText(page, "h1", "美股历史盲测训练器", "移动端页面标题没有正常渲染。");
  await assertCanvasNonBlank(page, "#priceChart", "移动端价格图没有绘制有效像素。");
  const overflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  assert(overflowPx <= 4, `移动端存在横向溢出：${overflowPx}px。`);
  const visibleTopActions = await page.locator("#randomExamButton").isVisible();
  assert(visibleTopActions, "移动端随机盲测按钮不可见。");
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
  await page.close();
  return { screenshotPath: desktopScreenshotPath, mobileScreenshotPath, overflowPx };
}

async function downloadFromClick(page, selector) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10_000 }),
    page.click(selector),
  ]);
  return download;
}

async function assertText(page, selector, expected, message) {
  const text = await page.locator(selector).first().textContent({ timeout: 10_000 });
  assert((text || "").includes(expected), `${message} 需要包含“${expected}”，实际是“${text || ""}”。`);
}

async function assertCanvasNonBlank(page, selector, message) {
  const nonBlank = await page.locator(selector).evaluate((canvas) => {
    const context = canvas.getContext("2d");
    if (!context) return false;
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    let painted = 0;
    for (let index = 0; index < data.length; index += 4 * 37) {
      const alpha = data[index + 3];
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      if (alpha > 0 && (red !== 0 || green !== 0 || blue !== 0)) painted += 1;
      if (painted > 100) return true;
    }
    return false;
  });
  assert(nonBlank, message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function formatResult(result) {
  return [
    "Browser smoke passed",
    `  Cases: ${result.caseCount}`,
    `  Screenshot: ${result.screenshotPath}`,
    `  Review screenshot: ${result.reviewScreenshotPath}`,
    `  Mobile screenshot: ${result.mobileScreenshotPath}`,
    `  Decision screenshot: ${result.decisionScreenshotPath}`,
    `  Trade screenshot: ${result.tradeScreenshotPath}`,
    `  Limit order screenshot: ${result.limitOrderScreenshotPath}`,
    `  Limit order expiry screenshot: ${result.limitOrderExpiryScreenshotPath}`,
    `  Limit order cancel screenshot: ${result.limitOrderCancelScreenshotPath}`,
    `  File import screenshot: ${result.fileImportScreenshotPath}`,
    `  Starter bundle import screenshot: ${result.starterBundleImportScreenshotPath}`,
    `  Case package: ${result.packageDownloadPath}`,
    `  Case library: ${result.libraryDownloadPath}`,
    `  Backup: ${result.backupDownloadPath}`,
    `  Review markdown: ${result.reviewDownloadPath}`,
    `  Decision history items: ${result.decisionHistoryCount}`,
    `  Trade history items: ${result.tradeHistoryCount}`,
    `  Limit order status: ${result.limitOrderStatus}`,
    `  Limit order expiry status: ${result.limitOrderExpiryStatus}`,
    `  Limit order cancel status: ${result.limitOrderCancelStatus}`,
    `  File import cases: ${result.fileImportCaseCount}`,
    `  Restored custom cases: ${result.restoredCustomCases}`,
    `  Starter bundle cases: ${result.starterBundleCaseCount}`,
    `  Starter bundle imported: ${result.starterBundleImported}`,
    `  Starter bundle duplicate skipped: ${result.starterBundleDuplicateSkipped}`,
    `  Live readiness gate checked: ${result.liveReadinessGateChecked ? "yes" : "no"}`,
    `  Mobile overflow: ${result.mobileOverflowPx}px`,
  ].join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
