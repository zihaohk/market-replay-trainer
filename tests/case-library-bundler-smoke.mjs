import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildCaseLibraryBundle,
  bundleCaseLibrary,
  collectSourceFiles,
  parseArgs,
} from "../tools/bundle-case-library.mjs";

const basePackage = JSON.parse(await readFile("tools/example-case-package.json", "utf8"));
const secondPackage = structuredClone(basePackage);
secondPackage.title = "Example package: second offline replay";
secondPackage.revealTitle = "Example second offline replay package";
secondPackage.realPeriod = "2024-02-01 至 2024-02-10";
secondPackage.assets = secondPackage.assets.map((asset) => ({
  ...asset,
  rows: asset.rows.map((row) => ({
    ...row,
    open: row.open + 3,
    high: row.high + 3,
    low: row.low + 3,
    close: row.close + 3,
  })),
}));

const outDir = await mkdtemp(join(tmpdir(), "market-replay-bundler-"));
try {
  const caseA = join(outDir, "case-a.json");
  const caseB = join(outDir, "case-b.json");
  const out = join(outDir, "library.bundle.json");
  await writeFile(caseA, `${JSON.stringify(basePackage, null, 2)}\n`, "utf8");
  await writeFile(caseB, `${JSON.stringify(secondPackage, null, 2)}\n`, "utf8");

  const result = await bundleCaseLibrary({
    files: [caseA, caseB],
    out,
    id: "test-bundle",
    title: "Test bundle",
    exportedAt: "2026-06-14T00:00:00.000Z",
  });
  assert.equal(result.failed, false);
  assert.equal(result.written, true);
  assert.equal(result.total, 2);
  assert.equal(result.errorCount, 0);
  assert(result.averageScore >= 80, `expected strong average score, got ${result.averageScore}`);

  const written = JSON.parse(await readFile(out, "utf8"));
  assert.equal(written.schema, "market-replay-case-library");
  assert.equal(written.summary.contentOnly, true);
  assert.equal(written.cases.length, 2);
  assert(!JSON.stringify(written).includes("trainingHistory"), "bundle should not include profile or training state");

  const dryRun = await bundleCaseLibrary({ dir: outDir, dryRun: true });
  assert.equal(dryRun.written, false);
  assert.equal(dryRun.total, 4, "directory mode should expand package files and existing bundle cases");

  const manifestPath = join(outDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    outDir,
    cases: [
      { id: "case-a", out: "case-a.json", config: { assets: [] } },
      { id: "case-b", out: "case-b.json", config: { assets: [] } },
    ],
  }), "utf8");
  const manifestFiles = await collectSourceFiles({ manifest: manifestPath });
  assert.deepEqual(manifestFiles.sort(), [caseA, caseB].sort());

  const caseACopy = join(outDir, "case-a-copy.json");
  await writeFile(caseACopy, `${JSON.stringify(basePackage, null, 2)}\n`, "utf8");
  const duplicateOut = join(outDir, "duplicate.bundle.json");
  const duplicateResult = await bundleCaseLibrary({
    files: [caseA, caseACopy],
    out: duplicateOut,
    strict: true,
  });
  assert.equal(duplicateResult.failed, true);
  assert.equal(duplicateResult.written, false);
  assert.equal(duplicateResult.warningCount > 0, true);
  assert.equal(duplicateResult.skippedWriteReason, "strict validation warnings");

  const args = parseArgs(["--dir", "packages", "--out", "library.json", "--id", "lib", "--title", "Library", "--json", "--strict", "--dry-run"]);
  assert.equal(args.dir, "packages");
  assert.equal(args.out, "library.json");
  assert.equal(args.id, "lib");
  assert.equal(args.title, "Library");
  assert.equal(args.json, true);
  assert.equal(args.strict, true);
  assert.equal(args.dryRun, true);

  const bundle = buildCaseLibraryBundle([basePackage], { id: "one", title: "One", exportedAt: "2026-06-14T00:00:00.000Z" });
  assert.equal(bundle.id, "one");
  assert.equal(bundle.summary.caseCount, 1);
} finally {
  await rm(outDir, { recursive: true, force: true });
}

console.log("case library bundler smoke tests passed");
