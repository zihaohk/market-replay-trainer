#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCasePackageInput } from "./validate-case-package.mjs";
import { normalizeManifest } from "./build-case-library.mjs";

const HELP = `
Market Replay case library bundler

Usage:
  node tools/bundle-case-library.mjs packages/case-a.json packages/case-b.json --out packages/library.bundle.json
  node tools/bundle-case-library.mjs --dir packages --out packages/library.bundle.json
  node tools/bundle-case-library.mjs --manifest tools/example-case-library.json --dir packages --out packages/library.bundle.json --strict

Options:
  --out <file>        Output market-replay-case-library bundle JSON.
  --dir <dir>         Add every .json case package in a directory.
  --manifest <file>   Read case output names from a build-case-library manifest.
  --id <id>           Bundle id. Defaults to case-library.
  --title <title>     Bundle title. Defaults to Market Replay case library.
  --json              Print machine-readable JSON summary.
  --strict            Fail when validation warnings are present.
  --dry-run           Validate and summarize without writing the bundle.
  --skip-validate     Write without package validation.
  --help              Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  if (!args.out && !args.dryRun) throw new Error("Provide --out <file>, or use --dry-run.");
  const result = await bundleCaseLibrary(args);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatBundleResult(result)}\n`);
  }
  if (result.failed) process.exitCode = 1;
}

export function parseArgs(argv) {
  const args = {
    files: [],
    out: "",
    dir: "",
    manifest: "",
    id: "case-library",
    title: "Market Replay case library",
    json: false,
    strict: false,
    dryRun: false,
    skipValidate: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else if (token === "--strict") args.strict = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--skip-validate") args.skipValidate = true;
    else if (["--out", "--dir", "--manifest", "--id", "--title"].includes(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      args[token.slice(2)] = value;
      index += 1;
    } else if (token.startsWith("--")) {
      throw new Error(`Unexpected option: ${token}`);
    } else {
      args.files.push(token);
    }
  }
  return args;
}

export async function bundleCaseLibrary(options = {}) {
  const sourceFiles = await collectSourceFiles(options);
  if (!sourceFiles.length) throw new Error("Provide at least one case package file, --dir, or --manifest.");

  const caseEntries = await readCaseEntries(sourceFiles);
  const bundle = buildCaseLibraryBundle(caseEntries.map((entry) => entry.packageJson), {
    id: options.id,
    title: options.title,
    exportedAt: options.exportedAt,
  });
  const validate = options.skipValidate !== true && options.validate !== false;
  const reports = validate ? validateCasePackageInput(bundle, { file: options.out || "case-library-bundle.json" }) : [];
  const errorCount = reports.reduce((sum, report) => sum + report.errors.length, 0);
  const warningCount = reports.reduce((sum, report) => sum + report.warnings.length, 0);
  const failed = errorCount > 0 || Boolean(options.strict && warningCount > 0);
  const outPath = options.out ? resolve(options.out) : "";
  let written = false;
  let skippedWriteReason = "";
  if (options.dryRun) {
    skippedWriteReason = "dry-run";
  } else if (failed) {
    skippedWriteReason = options.strict && warningCount > 0 && errorCount === 0
      ? "strict validation warnings"
      : "validation errors";
  } else {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    written = true;
  }

  return {
    id: bundle.id,
    title: bundle.title,
    out: outPath,
    dryRun: Boolean(options.dryRun),
    validate,
    strict: Boolean(options.strict),
    total: bundle.cases.length,
    sourceFileCount: sourceFiles.length,
    written,
    failed,
    skippedWriteReason,
    errorCount,
    warningCount,
    averageScore: average(reports.map((report) => report.score).filter(Number.isFinite)),
    sourceFiles,
    reports,
    bundle: options.includeBundle ? bundle : undefined,
  };
}

export function buildCaseLibraryBundle(casePackages, options = {}) {
  const title = cleanText(options.title, "Market Replay case library");
  return {
    schema: "market-replay-case-library",
    schemaVersion: 1,
    id: cleanText(options.id, "case-library"),
    title,
    exportedAt: options.exportedAt || new Date().toISOString(),
    summary: {
      caseCount: casePackages.length,
      generatedBy: "tools/bundle-case-library.mjs",
      contentOnly: true,
      note: "只包含案例内容，不包含账户、训练记录、长期画像或当前训练状态。",
    },
    cases: casePackages,
  };
}

export async function collectSourceFiles(options = {}) {
  const sources = [];
  if (options.manifest) {
    const manifestPath = resolve(options.manifest);
    const manifest = await readJson(manifestPath);
    const normalized = normalizeManifest(manifest);
    const sourceDir = resolve(options.dir || normalized.outDir || "packages");
    normalized.cases.forEach((entry) => {
      sources.push(resolve(sourceDir, entry.out));
    });
  } else if (options.dir) {
    sources.push(...await listJsonFiles(resolve(options.dir)));
  }
  for (const file of options.files || []) {
    sources.push(...await expandFilePattern(file));
  }
  return [...new Set(sources.map((file) => resolve(file)))];
}

async function readCaseEntries(sourceFiles) {
  const entries = [];
  for (const file of sourceFiles) {
    const packageJson = await readJson(file);
    if (isCaseLibraryBundle(packageJson)) {
      packageJson.cases.forEach((casePackage, index) => {
        entries.push({ source: `${file}#${index + 1}`, packageJson: casePackage });
      });
    } else {
      entries.push({ source: file, packageJson });
    }
  }
  return entries;
}

async function readJson(filePath) {
  const text = await readFile(resolve(filePath), "utf8");
  return JSON.parse(text);
}

async function listJsonFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => resolve(dirPath, entry.name))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

async function expandFilePattern(pattern) {
  if (!pattern.includes("*")) return [resolve(pattern)];
  const patternPath = resolve(pattern);
  const dirPath = dirname(patternPath);
  const matcher = wildcardToRegExp(basename(patternPath));
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && matcher.test(entry.name))
    .map((entry) => resolve(dirPath, entry.name))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

function wildcardToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function isCaseLibraryBundle(packageJson) {
  return Boolean(packageJson && typeof packageJson === "object" && !Array.isArray(packageJson) && Array.isArray(packageJson.cases));
}

function formatBundleResult(result) {
  const lines = [
    `${result.title}`,
    `  Cases: ${result.total}; Sources: ${result.sourceFileCount}; Errors: ${result.errorCount}; Warnings: ${result.warningCount}; Average score: ${Number.isFinite(result.averageScore) ? `${Math.round(result.averageScore)}/100` : "n/a"}`,
    `  Output: ${result.out || "(none)"}${result.dryRun ? " (dry run)" : ""}`,
    `  Written: ${result.written ? "yes" : "no"}${result.skippedWriteReason ? ` (${result.skippedWriteReason})` : ""}`,
  ];
  result.reports.forEach((report) => {
    lines.push(`  - ${report.file}: ${report.score}/100 ${report.level}; errors ${report.errors.length}; warnings ${report.warnings.length}`);
    report.errors.slice(0, 3).forEach((item) => lines.push(`    ERROR ${item.path}: ${item.message}`));
    report.warnings.slice(0, 3).forEach((item) => lines.push(`    WARN ${item.path}: ${item.message}`));
  });
  return lines.join("\n");
}

function cleanText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
