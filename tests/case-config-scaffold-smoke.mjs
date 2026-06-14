import assert from "node:assert/strict";
import {
  listTemplateTypes,
  parseArgs,
  scaffoldCaseConfig,
} from "../tools/scaffold-case-config.mjs";
import { normalizeConfig } from "../tools/build-case-package.mjs";

const types = listTemplateTypes();
assert(types.some((item) => item.startsWith("earnings-expectation")), "template list should include earnings");
assert(types.some((item) => item.startsWith("mechanics-settlement-actions")), "template list should include mechanics");

const args = parseArgs([
  "--type", "earnings-expectation",
  "--symbols", "META,SPY",
  "--start", "2022-01-25",
  "--end", "2022-02-10",
  "--title", "Meta earnings replay",
]);
assert.equal(args.type, "earnings-expectation");
assert.equal(args.symbols, "META,SPY");

const config = scaffoldCaseConfig(args);
assert.equal(config.title, "Meta earnings replay");
assert.equal(config.assets.length, 2);
assert.equal(config.assets[0].symbol, "META");
assert.equal(config.assets[0].type, "stock");
assert.equal(config.assets[1].type, "etf");
assert(config.tags.includes("财报"));
assert(config.learning.quiz.options.length >= 3);
assert(config.mission.rules.minNewsJudgments >= 1);
assert(config.sourcePack.items.length >= 2);

const normalized = normalizeConfig(config);
assert.equal(normalized.start, "2022-01-25");
assert.equal(normalized.assets[0].maskedSymbol, "PKG-A");

const mechanicsConfig = scaffoldCaseConfig({
  type: "mechanics-settlement-actions",
  symbols: "AAPL,SPY",
  start: "2024-01-02",
  end: "2024-02-02",
});
assert(mechanicsConfig.tags.includes("T+1"));
assert(mechanicsConfig.learning.concept.includes("结算"));

assert.throws(
  () => scaffoldCaseConfig({ type: "unknown", symbols: "SPY", start: "2024-01-02", end: "2024-01-03" }),
  /Unknown template type/,
);
assert.throws(
  () => scaffoldCaseConfig({ type: "etf-systemic-risk", symbols: "", start: "2024-01-02", end: "2024-01-03" }),
  /Provide --symbols/,
);

console.log("case config scaffold smoke tests passed");
