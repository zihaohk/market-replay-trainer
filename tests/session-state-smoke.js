const assert = require("node:assert/strict");

const sessionState = require("../state/session.js");

const cases = [
  {
    id: "A-01",
    length: 6,
    assets: [
      { maskedSymbol: "ETF-A", prices: Array.from({ length: 6 }, (_, day) => ({ close: 100 + day })) },
      { maskedSymbol: "STOCK-A", prices: Array.from({ length: 6 }, (_, day) => ({ close: 50 + day })) },
    ],
  },
  {
    id: "B-02",
    assets: [
      { maskedSymbol: "ETF-B", prices: Array.from({ length: 4 }, (_, day) => ({ close: 80 + day })) },
    ],
  },
];

const storage = new Map();
const helpers = sessionState.createSessionStateHelpers({
  storage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
  storageKey: "session-test",
  riskPolicy: { initialCash: 100000 },
  fundingPolicy: { homeCurrency: "HKD", tradingCurrency: "USD", usdHkdRate: 7.8, fxFeeBps: 20 },
  taxPolicy: { dividendWithholdingRatePct: 30, sourceLabel: "test tax" },
  modePolicies: { novice: {}, exam: {} },
  getCase: (caseId) => cases.find((item) => item.id === caseId) || cases[0],
  hasCase: (caseId) => cases.some((item) => item.id === caseId),
  firstCaseId: () => cases[0].id,
  clampInteger: (value, min, max, fallback) => {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  },
  roundPrice: (value) => Math.round(Number(value) * 100) / 100,
});

const fresh = helpers.defaultState("A-01", "exam");
assert.equal(fresh.caseId, "A-01");
assert.equal(fresh.mode, "exam");
assert.equal(fresh.selectedSymbol, "ETF-A");
assert.equal(fresh.cash, 100000);
assert.equal(fresh.funding.homeCurrency, "HKD");
assert.equal(fresh.funding.initialUsdCash, 100000);
assert.equal(fresh.tax.dividendWithholdingRatePct, 30);
assert.deepEqual(fresh.decisions, []);
assert.deepEqual(fresh.pendingOrders, []);
assert.equal(fresh.trainingContract.riskBudgetPct, 8);
assert.equal(fresh.allocationBlueprint.minEtfPct, 50);
assert.equal(fresh.sessionThesis.preferredAction, "wait");
assert.equal(fresh.blindSession.active, false);
assert.equal(fresh.reviewReflection.nextRule, "");
assert.equal(fresh.pauseReason, "训练已开始：你只能看到第 1 天的信息。");

const normalized = helpers.normalizeStateData({
  caseId: "A-01",
  mode: "unknown",
  day: 99,
  selectedSymbol: "MISSING",
  positions: null,
  decisions: null,
  pendingOrders: "bad",
  settlementLedger: null,
  corporateActionLog: null,
  equityCurve: [],
  lessonAnswers: null,
  newsJudgments: null,
  signalForecasts: null,
  checkpointLogs: "bad",
}, "exam");
assert.equal(normalized.mode, "exam");
assert.equal(normalized.day, 5);
assert.equal(normalized.selectedSymbol, "ETF-A");
assert.deepEqual(normalized.positions, {});
assert.deepEqual(normalized.decisions, []);
assert.deepEqual(normalized.pendingOrders, []);
assert.deepEqual(normalized.settlementLedger, []);
assert.deepEqual(normalized.corporateActionLog, []);
assert.deepEqual(normalized.equityCurve, [{ day: 0, equity: 100000 }]);
assert.deepEqual(normalized.lessonAnswers, {});
assert.deepEqual(normalized.newsJudgments, {});
assert.deepEqual(normalized.signalForecasts, {});
assert.deepEqual(normalized.checkpointLogs, []);

const fallback = helpers.normalizeStateData({ caseId: "missing", day: 3 }, "novice");
assert.equal(fallback.caseId, "A-01");
assert.equal(fallback.mode, "novice");
assert.equal(fallback.day, 0);

helpers.saveState({ caseId: "B-02", mode: "exam", day: 2, selectedSymbol: "ETF-B" });
const loaded = helpers.loadState();
assert.equal(loaded.caseId, "B-02");
assert.equal(loaded.mode, "exam");
assert.equal(loaded.day, 2);
assert.equal(loaded.selectedSymbol, "ETF-B");

storage.set("session-test", "{bad json");
const recovered = helpers.loadState();
assert.equal(recovered.caseId, "A-01");
assert.equal(recovered.day, 0);
