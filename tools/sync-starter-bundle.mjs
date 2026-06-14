import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const cwd = process.cwd();
const sourcePath = resolve(cwd, "packages", "case-c-bundle.json");
const targetPath = resolve(cwd, "data", "starter-bundle.js");

const bundleText = await readFile(sourcePath, "utf8");
const parsed = JSON.parse(bundleText);
if (parsed.schema !== "market-replay-case-library" || !Array.isArray(parsed.cases)) {
  throw new Error("packages/case-c-bundle.json 不是有效的 market-replay-case-library bundle。");
}

const output = `window.MarketReplayStarterBundle = ${JSON.stringify(parsed, null, 2)};\n`;

if (checkOnly) {
  const current = await readFile(targetPath, "utf8");
  if (current !== output) {
    throw new Error("data/starter-bundle.js 与 packages/case-c-bundle.json 不一致，请运行 npm run build:starter。");
  }
} else {
  await writeFile(targetPath, output, "utf8");
}
