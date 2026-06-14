(function sessionStateModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplaySessionState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSessionStateApi() {
  function createSessionStateHelpers(options) {
    const deps = normalizeDependencies(options);

    function defaultState(caseId = deps.firstCaseId(), mode = "novice") {
      const selectedCase = deps.getCase(caseId);
      return {
        caseId,
        mode,
        day: 0,
        selectedSymbol: selectedCase.assets[0].maskedSymbol,
        selectedSide: "buy",
        cash: deps.riskPolicy.initialCash,
        funding: defaultFundingPlan(),
        tax: defaultTaxProfile(),
        positions: {},
        decisions: [],
        pendingOrders: [],
        settlementLedger: [],
        corporateActionLog: [],
        equityCurve: [{ day: 0, equity: deps.riskPolicy.initialCash }],
        chartMode: "line",
        showVolume: true,
        showMovingAverage: true,
        lessonAnswers: {},
        newsJudgments: {},
        signalForecasts: {},
        checkpointLogs: [],
        trainingContract: defaultTrainingContract(),
        allocationBlueprint: defaultAllocationBlueprint(),
        sessionThesis: defaultSessionThesis(),
        activeRemediation: null,
        activeTrainingPlan: null,
        blindSession: defaultBlindSession(),
        reviewReflection: { win: "", mistake: "", nextRule: "", savedAt: null },
        completedRunId: null,
        revealReadinessSnapshot: null,
        revealed: false,
        reviewSaved: false,
        pauseReason: "训练已开始：你只能看到第 1 天的信息。",
      };
    }

    function defaultFundingPlan() {
      const feeRate = deps.fundingPolicy.fxFeeBps / 10000;
      const grossUsd = deps.riskPolicy.initialCash / Math.max(0.0001, 1 - feeRate);
      const fxCostUsd = grossUsd - deps.riskPolicy.initialCash;
      return {
        homeCurrency: deps.fundingPolicy.homeCurrency,
        tradingCurrency: deps.fundingPolicy.tradingCurrency,
        usdHkdRate: deps.fundingPolicy.usdHkdRate,
        fxFeeBps: deps.fundingPolicy.fxFeeBps,
        initialUsdCash: deps.riskPolicy.initialCash,
        initialHomeDeposit: deps.roundPrice(grossUsd * deps.fundingPolicy.usdHkdRate),
        initialFxCostUsd: deps.roundPrice(fxCostUsd),
        initialFxCostHome: deps.roundPrice(fxCostUsd * deps.fundingPolicy.usdHkdRate),
      };
    }

    function defaultTaxProfile() {
      return {
        dividendWithholdingRatePct: deps.taxPolicy.dividendWithholdingRatePct,
        sourceLabel: deps.taxPolicy.sourceLabel,
      };
    }

    function defaultTrainingContract() {
      return {
        saved: false,
        objective: "",
        riskBudgetPct: 8,
        maxTrades: 4,
        maxPositionPct: 20,
        minHolds: 1,
        noAverageDown: true,
        savedAt: null,
      };
    }

    function defaultAllocationBlueprint() {
      return {
        saved: false,
        objective: "",
        minEtfPct: 50,
        maxSatellitePct: 30,
        maxSingleStockPct: 15,
        maxSectorPct: 35,
        minCashPct: 10,
        savedAt: null,
      };
    }

    function defaultSessionThesis() {
      return {
        saved: false,
        baseCase: "",
        bullCase: "",
        bearCase: "",
        riskTrigger: "",
        opportunityTrigger: "",
        preferredAction: "wait",
        maxExposurePct: 20,
        savedAt: null,
      };
    }

    function defaultBlindSession() {
      return {
        active: false,
        random: false,
        startedAt: null,
        startedCaseId: null,
        startedMode: null,
        pickPoolSize: 0,
        avoidedRecent: false,
        violations: [],
      };
    }

    function loadState() {
      try {
        const parsed = JSON.parse(deps.storage.getItem(deps.storageKey));
        return normalizeStateData(parsed);
      } catch {
        return defaultState();
      }
    }

    function normalizeStateData(rawState, fallbackMode = "novice") {
      if (!rawState || typeof rawState !== "object" || !deps.hasCase(rawState.caseId)) {
        return defaultState(deps.firstCaseId(), fallbackMode);
      }
      const mode = deps.modePolicies[rawState.mode] ? rawState.mode : fallbackMode;
      const base = defaultState(rawState.caseId, mode);
      const selectedCase = deps.getCase(rawState.caseId);
      const merged = { ...base, ...rawState, mode };
      merged.day = deps.clampInteger(merged.day, 0, currentCaseLengthForCase(selectedCase), 0);
      if (!selectedCase.assets.some((assetItem) => assetItem.maskedSymbol === merged.selectedSymbol)) {
        merged.selectedSymbol = selectedCase.assets[0].maskedSymbol;
      }
      merged.positions = merged.positions && typeof merged.positions === "object" ? merged.positions : {};
      merged.decisions = Array.isArray(merged.decisions) ? merged.decisions : [];
      merged.pendingOrders = Array.isArray(merged.pendingOrders) ? merged.pendingOrders : [];
      merged.settlementLedger = Array.isArray(merged.settlementLedger) ? merged.settlementLedger : [];
      merged.corporateActionLog = Array.isArray(merged.corporateActionLog) ? merged.corporateActionLog : [];
      merged.equityCurve = Array.isArray(merged.equityCurve) && merged.equityCurve.length ? merged.equityCurve : base.equityCurve;
      merged.lessonAnswers = merged.lessonAnswers && typeof merged.lessonAnswers === "object" ? merged.lessonAnswers : {};
      merged.newsJudgments = merged.newsJudgments && typeof merged.newsJudgments === "object" ? merged.newsJudgments : {};
      merged.signalForecasts = merged.signalForecasts && typeof merged.signalForecasts === "object" ? merged.signalForecasts : {};
      merged.checkpointLogs = Array.isArray(merged.checkpointLogs) ? merged.checkpointLogs : [];
      return merged;
    }

    function currentCaseLengthForCase(selectedCase) {
      return Math.max(0, (selectedCase?.length || selectedCase?.assets?.[0]?.prices?.length || 1) - 1);
    }

    function saveState(state) {
      deps.storage.setItem(deps.storageKey, JSON.stringify(state));
    }

    return {
      defaultState,
      defaultFundingPlan,
      defaultTaxProfile,
      defaultTrainingContract,
      defaultAllocationBlueprint,
      defaultSessionThesis,
      defaultBlindSession,
      loadState,
      normalizeStateData,
      currentCaseLengthForCase,
      saveState,
    };
  }

  function normalizeDependencies(options = {}) {
    const required = ["riskPolicy", "fundingPolicy", "taxPolicy", "modePolicies", "getCase", "firstCaseId"];
    required.forEach((key) => {
      if (options[key] === undefined || options[key] === null) throw new Error(`Missing session state dependency: ${key}`);
    });
    return {
      ...options,
      storage: options.storage || localStorage,
      storageKey: options.storageKey || "market-replay-trainer-v1",
      hasCase: typeof options.hasCase === "function" ? options.hasCase : (caseId) => Boolean(options.getCase(caseId)),
      clampInteger: typeof options.clampInteger === "function" ? options.clampInteger : defaultClampInteger,
      roundPrice: typeof options.roundPrice === "function" ? options.roundPrice : defaultRoundPrice,
    };
  }

  function defaultClampInteger(value, min, max, fallback) {
    const number = Number.parseInt(value, 10);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function defaultRoundPrice(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  return {
    createSessionStateHelpers,
  };
});
