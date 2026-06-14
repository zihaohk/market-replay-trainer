import assert from "node:assert/strict";
import {
  buildDateIndexMap,
  buildPackage,
  fetchAssetRows,
  normalizeConfig,
  normalizeTimedItem,
  tradingDaysBetween,
} from "../tools/build-case-package.mjs";

const config = normalizeConfig({
  title: "Offline builder test",
  start: "2024-01-02",
  end: "2024-01-05",
  assets: [
    {
      symbol: "AAA",
      type: "stock",
      rows: [
        { date: "2024-01-02", open: 10, high: 11, low: 9, close: 10.5, volume: 1000 },
        { date: "2024-01-03", open: 10.5, high: 12, low: 10, close: 11.5, volume: 1200 },
        { date: "2024-01-05", open: 11.5, high: 12, low: 10.8, close: 11, volume: 1300 },
      ],
    },
    {
      symbol: "BBB",
      type: "etf",
      rows: [
        ["2024-01-02", 20, 21, 19, 20.5, 2000],
        ["2024-01-03", 20.5, 22, 20, 21.5, 2200],
        ["2024-01-05", 21.5, 22, 20.8, 21, 2300],
      ],
    },
  ],
  news: [
    { date: "2024-01-03", title: "Important event", category: "important" },
  ],
  scheduledEvents: [
    { date: "2024-01-05", title: "Event window", type: "macro", riskLevel: "warn" },
  ],
});

const assets = await Promise.all(config.assets.map((asset) => fetchAssetRows(asset, config)));
assert.equal(assets.length, 2);
assert.equal(assets[0].rows.length, 3);
assert.equal(assets[1].rows[0].open, 20);

const packageJson = buildPackage(config, assets);
assert.equal(packageJson.news[0].day, 1);
assert.equal(packageJson.news[0].date, "2024-01-03");
assert.equal(packageJson.scheduledEvents[0].day, 2);
assert.equal(packageJson.assets[0].rows[2].date, "2024-01-05");
assert.equal(packageJson.learning.quiz.answer, 0);
assert.equal(packageJson.mission.rules.minNewsJudgments, 1);

const seriesConfig = normalizeConfig({
  title: "Series builder test",
  start: "2024-01-02",
  end: "2024-01-12",
  assets: [
    {
      symbol: "CCC",
      type: "etf",
      series: {
        closes: [100, 99, 98, 100, 102, 101, 103, 104],
        baseVolume: 500000,
        rangePct: 0.8,
        gapsPct: [0, -0.4, 0.2, 0, 0.3, -0.2, 0, 0.1],
      },
    },
  ],
});
const [seriesAsset] = await Promise.all(seriesConfig.assets.map((asset) => fetchAssetRows(asset, seriesConfig)));
assert.equal(seriesAsset.rows.length, 8);
assert.deepEqual(tradingDaysBetween("2024-01-05", "2024-01-09"), ["2024-01-05", "2024-01-08", "2024-01-09"]);
assert.equal(seriesAsset.rows[0].date, "2024-01-02");
assert.equal(seriesAsset.rows[3].date, "2024-01-05");
assert(seriesAsset.rows.every((row) => row.high >= Math.max(row.open, row.close) && row.low <= Math.min(row.open, row.close)), "series rows should have valid OHLC ranges");
assert(seriesAsset.rows.every((row) => row.volume >= 500000), "series rows should synthesize positive volume");

const dateMap = buildDateIndexMap(assets[0].rows);
assert.throws(
  () => normalizeTimedItem({ date: "2024-01-04", title: "not a trading day" }, dateMap, "news[bad]"),
  /not a trading day/,
);

assert.throws(
  () => normalizeConfig({ title: "bad", start: "2024-01-05", end: "2024-01-02", assets: [{ symbol: "AAA" }] }),
  /start must be before/,
);

console.log("package builder smoke tests passed");
