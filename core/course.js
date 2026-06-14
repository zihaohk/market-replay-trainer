(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MarketReplayCourse = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const defaultCoursePath = [
    {
      id: "foundation",
      title: "Level 1：ETF 和基础纪律",
      cases: ["A-01", "S-11", "S-12"],
      goal: "先学会少交易、写理由、控制仓位。",
    },
    {
      id: "single-stock",
      title: "Level 2：单股和行业风险",
      cases: ["C-03", "F-06", "H-08", "I-09", "S-10"],
      goal: "理解财报、预期差、行业轮动和高波动资产。",
    },
    {
      id: "stress",
      title: "Level 3：危机和宏观冲击",
      cases: ["B-02", "D-04", "E-05", "G-07"],
      goal: "训练恐慌、追高、慢跌和系统性风险下的判断。",
    },
  ];

  function createCourseHelpers({
    coursePath = defaultCoursePath,
    getProfile = () => ({}),
    getState = () => ({}),
    allCases = () => [],
    getCase = null,
  } = {}) {
    function caseById(caseId) {
      if (typeof getCase === "function") return getCase(caseId);
      return allCases().find((item) => item.id === caseId) || allCases()[0] || null;
    }

    function isCaseQualified(caseId) {
      const profile = getProfile() || {};
      const runs = (profile.completedRuns || []).filter((item) => item.caseId === caseId);
      if (!runs.length) return (profile.completedCaseIds || []).includes(caseId);
      return runs.some((item) => (
        item.missionPassed !== false
        && (!Number.isFinite(item.disciplineScore) || item.disciplineScore >= 60)
        && item.lessonPassed !== false
      ));
    }

    function getPathCaseIds(levelIndex) {
      return coursePath[levelIndex]?.cases || [];
    }

    function countQualifiedCases(caseIds) {
      return caseIds.filter((caseId) => isCaseQualified(caseId)).length;
    }

    function getCasePathStatus(caseItem) {
      const state = getState() || {};
      if (!caseItem) return { unlocked: false, qualified: false, reason: "案例不存在。", label: "不可用" };
      if (caseItem.kind === "custom") {
        return { unlocked: true, qualified: false, reason: "自定义 CSV 案例不受课程路径限制。", label: "自定义" };
      }
      const qualified = isCaseQualified(caseItem.id);
      if (qualified) return { unlocked: true, qualified, reason: "已经完成合格训练。", label: "已合格" };
      if (state.activeRemediation?.nextCaseId === caseItem.id || state.caseId === caseItem.id) {
        return { unlocked: true, qualified, reason: "当前案例或处方补练案例可继续训练。", label: "进行中" };
      }

      const levelIndex = coursePath.findIndex((level) => level.cases.includes(caseItem.id));
      if (levelIndex < 0) {
        return { unlocked: true, qualified, reason: "扩展训练案例不阻塞主课程路径，可按弱项自由补练。", label: "扩展训练" };
      }
      if (levelIndex === 0) {
        return { unlocked: true, qualified, reason: "Level 1 基础案例始终开放。", label: "可训练" };
      }

      const level1Ids = getPathCaseIds(0);
      const level2Ids = getPathCaseIds(1);
      const level1Done = countQualifiedCases(level1Ids);
      if (levelIndex === 1 && level1Done < level1Ids.length) {
        return {
          unlocked: false,
          qualified,
          reason: `先完成 Level 1 基础训练：${level1Done}/${level1Ids.length} 合格。`,
          label: "未解锁",
        };
      }

      const level2Done = countQualifiedCases(level2Ids);
      if (levelIndex >= 2 && (level1Done < level1Ids.length || level2Done < 3)) {
        return {
          unlocked: false,
          qualified,
          reason: `先完成 Level 1 全部合格，并至少完成 3 个 Level 2：当前 Level 1 ${level1Done}/${level1Ids.length}，Level 2 ${level2Done}/3。`,
          label: "未解锁",
        };
      }

      return { unlocked: true, qualified, reason: "已满足前置训练要求。", label: "可训练" };
    }

    function buildCaseMastery(caseId) {
      const profile = getProfile() || {};
      const runs = (profile.completedRuns || []).filter((item) => item.caseId === caseId);
      if (!runs.length) {
        return {
          caseId,
          attempts: 0,
          level: "untried",
          label: "未练",
          bestDiscipline: Number.NaN,
          bestMission: Number.NaN,
          bestCoach: Number.NaN,
          bestComposite: Number.NaN,
          lastRun: null,
          detail: "还没有训练记录。",
        };
      }
      const bestDiscipline = maxFinite(runs.map((item) => Number(item.disciplineScore)));
      const bestMission = maxFinite(runs.map((item) => Number(item.missionScore)));
      const bestCoach = maxFinite(runs.map((item) => Number(item.averageCoachScore)));
      const bestContract = maxFinite(runs.map((item) => Number(item.contractScore)));
      const bestWriting = maxFinite(runs.map((item) => Number(item.writingQualityScore)));
      const composites = runs.map((item) => caseMasteryComposite(item)).filter(Number.isFinite);
      const bestComposite = maxFinite(composites);
      const qualifiedRuns = runs.filter((item) => (
        item.missionPassed !== false
        && (!Number.isFinite(item.disciplineScore) || item.disciplineScore >= 60)
        && item.lessonPassed !== false
      ));
      const strongRuns = runs.filter((item) => caseMasteryComposite(item) >= 85);
      const lastRun = runs[runs.length - 1];
      let level = "needs-work";
      let label = "需补练";
      if (strongRuns.length >= 2 || (strongRuns.length >= 1 && runs.length >= 3 && bestComposite >= 88)) {
        level = "mastered";
        label = "已掌握";
      } else if (qualifiedRuns.length) {
        level = "qualified";
        label = "已合格";
      }
      const lastIssue = lastRun?.remediation?.primaryIssue || lastRun?.flags?.[0] || "";
      return {
        caseId,
        attempts: runs.length,
        level,
        label,
        bestDiscipline,
        bestMission,
        bestCoach,
        bestContract,
        bestWriting,
        bestComposite,
        lastRun,
        detail: [
          `${runs.length} 次训练`,
          Number.isFinite(bestDiscipline) ? `最佳纪律 ${Math.round(bestDiscipline)}` : "纪律旧记录",
          Number.isFinite(bestMission) ? `最佳任务 ${Math.round(bestMission)}` : "任务旧记录",
          Number.isFinite(bestCoach) ? `最佳下单 ${Math.round(bestCoach)}` : "下单旧记录",
          lastIssue ? `最近问题：${lastIssue}` : "",
        ].filter(Boolean).join(" · "),
      };
    }

    function findNextRecommendedCase() {
      const state = getState() || {};
      if (state.activeRemediation?.nextCaseId) {
        const remediationCase = caseById(state.activeRemediation.nextCaseId);
        if (remediationCase) return remediationCase;
      }
      for (const level of coursePath) {
        for (const caseId of level.cases) {
          const caseItem = allCases().find((item) => item.id === caseId);
          if (!caseItem) continue;
          const status = getCasePathStatus(caseItem);
          if (status.unlocked && !status.qualified) return caseItem;
        }
      }
      return allCases().find((item) => item.kind === "custom") || allCases()[0];
    }

    function chooseRandomBlindCase({ excludeCurrent = true, recentWindow = 3, random = Math.random } = {}) {
      const state = getState() || {};
      const profile = getProfile() || {};
      const cases = allCases();
      const unlocked = cases.filter((caseItem) => getCasePathStatus(caseItem).unlocked);
      const basePool = unlocked.length ? unlocked : cases;
      const recentIds = new Set((profile.completedRuns || []).slice(-recentWindow).map((run) => run.caseId));
      const filtered = basePool.filter((caseItem) => {
        if (excludeCurrent && caseItem.id === state.caseId && basePool.length > 1) return false;
        return !recentIds.has(caseItem.id);
      });
      const pool = filtered.length ? filtered : basePool.filter((caseItem) => !excludeCurrent || caseItem.id !== state.caseId) || basePool;
      const finalPool = pool.length ? pool : basePool;
      const index = Math.floor(Math.max(0, Math.min(0.999999, Number(random()) || 0)) * finalPool.length);
      const selected = finalPool[index] || finalPool[0] || cases[0];
      return {
        caseId: selected.id,
        poolSize: finalPool.length,
        avoidedRecent: filtered.length > 0,
        recentIds: [...recentIds],
      };
    }

    return {
      coursePath,
      isCaseQualified,
      getPathCaseIds,
      countQualifiedCases,
      getCasePathStatus,
      buildCaseMastery,
      caseMasteryComposite,
      maxFinite,
      findNextRecommendedCase,
      chooseRandomBlindCase,
    };
  }

  function caseMasteryComposite(run) {
    const parts = [
      { value: Number(run.disciplineScore), weight: 0.28 },
      { value: Number(run.missionScore), weight: 0.24 },
      { value: Number(run.averageCoachScore), weight: 0.18 },
      { value: Number(run.contractScore), weight: 0.15 },
      { value: Number(run.writingQualityScore), weight: 0.15 },
    ].filter((item) => Number.isFinite(item.value));
    if (!parts.length) return Number.NaN;
    const weight = parts.reduce((sum, item) => sum + item.weight, 0);
    return parts.reduce((sum, item) => sum + item.value * item.weight, 0) / weight;
  }

  function maxFinite(values) {
    const cleanValues = values.filter(Number.isFinite);
    return cleanValues.length ? Math.max(...cleanValues) : Number.NaN;
  }

  return {
    defaultCoursePath,
    createCourseHelpers,
    caseMasteryComposite,
    maxFinite,
  };
});
