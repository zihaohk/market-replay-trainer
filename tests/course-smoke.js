const course = require("../core/course.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = [
  { id: "A-01", kind: "historical" },
  { id: "S-11", kind: "synthetic" },
  { id: "S-12", kind: "synthetic" },
  { id: "C-03", kind: "historical" },
  { id: "F-06", kind: "historical" },
  { id: "H-08", kind: "historical" },
  { id: "I-09", kind: "historical" },
  { id: "S-10", kind: "synthetic" },
  { id: "B-02", kind: "historical" },
  { id: "D-04", kind: "historical" },
  { id: "E-05", kind: "historical" },
  { id: "G-07", kind: "historical" },
  { id: "CUSTOM-1", kind: "custom" },
];

let profile = { completedRuns: [], completedCaseIds: [] };
let state = { caseId: "A-01" };
const helpers = course.createCourseHelpers({
  getProfile: () => profile,
  getState: () => state,
  allCases: () => cases,
  getCase: (caseId) => cases.find((item) => item.id === caseId) || cases[0],
});

assert(course.defaultCoursePath.length === 3, "default course path should have three levels");
assert(helpers.getPathCaseIds(0).includes("A-01"), "level 1 should include A-01");
assert(helpers.getCasePathStatus(cases.find((item) => item.id === "A-01")).unlocked, "level 1 should be open");
assert(!helpers.getCasePathStatus(cases.find((item) => item.id === "C-03")).unlocked, "level 2 should lock before level 1 completion");
assert(helpers.getCasePathStatus(cases.find((item) => item.id === "CUSTOM-1")).unlocked, "custom cases should stay unlocked");
assert(helpers.findNextRecommendedCase().id === "A-01", "first recommendation should be the current level 1 case");

profile = {
  completedRuns: [
    { caseId: "A-01", missionPassed: true, lessonPassed: true, disciplineScore: 75, missionScore: 80, averageCoachScore: 70 },
    { caseId: "S-11", missionPassed: true, lessonPassed: true, disciplineScore: 70, missionScore: 70, averageCoachScore: 75 },
    { caseId: "S-12", missionPassed: true, lessonPassed: true, disciplineScore: 65, missionScore: 72, averageCoachScore: 74 },
  ],
  completedCaseIds: [],
};
assert(helpers.isCaseQualified("A-01"), "qualified run should qualify a case");
assert(helpers.getCasePathStatus(cases.find((item) => item.id === "C-03")).unlocked, "level 2 should unlock after level 1 completion");
assert(!helpers.getCasePathStatus(cases.find((item) => item.id === "D-04")).unlocked, "level 3 should stay locked before enough level 2 completions");

profile.completedRuns.push(
  { caseId: "C-03", missionPassed: true, lessonPassed: true, disciplineScore: 80 },
  { caseId: "F-06", missionPassed: true, lessonPassed: true, disciplineScore: 78 },
  { caseId: "H-08", missionPassed: true, lessonPassed: true, disciplineScore: 76 },
);
assert(helpers.getCasePathStatus(cases.find((item) => item.id === "D-04")).unlocked, "level 3 should unlock after level 1 plus three level 2 cases");

profile.completedRuns.push(
  { caseId: "A-01", missionPassed: true, lessonPassed: true, disciplineScore: 90, missionScore: 92, averageCoachScore: 88, contractScore: 90, writingQualityScore: 86 },
  { caseId: "A-01", missionPassed: true, lessonPassed: true, disciplineScore: 88, missionScore: 90, averageCoachScore: 88, contractScore: 90, writingQualityScore: 90 },
);
const mastery = helpers.buildCaseMastery("A-01");
assert(mastery.level === "mastered", `expected mastered case, got ${mastery.level}`);
assert(mastery.bestComposite >= 85, "mastered case should have a strong composite score");

state = { caseId: "A-01" };
profile.completedRuns = [
  { caseId: "S-11" },
  { caseId: "S-12" },
  { caseId: "C-03" },
];
const blindPick = helpers.chooseRandomBlindCase({ random: () => 0, recentWindow: 3 });
assert(blindPick.caseId !== "A-01", "blind pick should exclude the current case when possible");
assert(blindPick.avoidedRecent, "blind pick should avoid recent cases when possible");
assert(blindPick.recentIds.includes("C-03"), "blind pick should report recent ids");

assert(Number.isNaN(course.maxFinite([Number.NaN, undefined])), "maxFinite should return NaN for empty finite input");
assert(course.caseMasteryComposite({ disciplineScore: 100, missionScore: 50 }) > 70, "composite should weight available scores");
