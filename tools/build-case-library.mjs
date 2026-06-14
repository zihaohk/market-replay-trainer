#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPackage,
  fetchAssetRows,
  normalizeConfig,
} from "./build-case-package.mjs";
import { validateCasePackage } from "./validate-case-package.mjs";

const HELP = `
Market Replay case library builder

Usage:
  node tools/build-case-library.mjs --manifest tools/example-case-library.json --out-dir packages
  node tools/build-case-library.mjs --manifest tools/example-case-library.json --json --strict

Options:
  --manifest <file>   JSON manifest with a cases array.
  --out-dir <dir>     Output directory. Overrides manifest.outDir.
  --json              Print machine-readable JSON summary.
  --strict            Exit with failure when validation warnings are present.
  --dry-run           Build and validate in memory without writing files.
  --skip-validate     Build packages without validation.
  --help              Show this help.
`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(HELP.trimStart());
    return;
  }
  if (!args.manifest) throw new Error("Provide --manifest <file>.");
  const manifestPath = resolve(args.manifest);
  const manifest = await readJson(manifestPath);
  const result = await buildCaseLibrary(manifest, {
    manifestPath,
    outDir: args.outDir,
    dryRun: args.dryRun,
    validate: !args.skipValidate,
    strict: args.strict,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatLibraryResult(result)}\n`);
  }
  if (result.failed || args.strict && result.warningCount) process.exitCode = 1;
}

export function parseArgs(argv) {
  const args = { json: false, strict: false, dryRun: false, skipValidate: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--json") args.json = true;
    else if (token === "--strict") args.strict = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--skip-validate") args.skipValidate = true;
    else if (token === "--manifest" || token === "--out-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      args[token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value;
      index += 1;
    } else if (token.startsWith("--")) {
      throw new Error(`Unexpected option: ${token}`);
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }
  return args;
}

async function readJson(filePath) {
  const text = await readFile(resolve(filePath), "utf8");
  return JSON.parse(text);
}

export async function buildCaseLibrary(manifest, options = {}) {
  const normalized = normalizeManifest(manifest);
  const manifestDir = options.manifestPath ? dirname(resolve(options.manifestPath)) : process.cwd();
  const outputDir = resolve(options.outDir || normalized.outDir || "packages");
  const validate = options.validate !== false;
  const cases = [];
  for (const entry of normalized.cases) {
    cases.push(await buildCaseEntry(entry, {
      manifestDir,
      outputDir,
      dryRun: Boolean(options.dryRun),
      validate,
    }));
  }
  const failedCases = cases.filter((item) => item.status === "error" || item.validation?.errors?.length);
  const warningCount = cases.reduce((sum, item) => sum + (item.validation?.warnings?.length || 0), 0);
  const averageScore = average(cases.map((item) => item.validation?.score).filter(Number.isFinite));
  return {
    id: normalized.id,
    title: normalized.title,
    outputDir,
    dryRun: Boolean(options.dryRun),
    validate,
    total: cases.length,
    written: cases.filter((item) => item.written).length,
    failed: failedCases.length > 0,
    failedCount: failedCases.length,
    warningCount,
    averageScore,
    cases,
  };
}

export function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Manifest must be a JSON object.");
  }
  const cases = Array.isArray(manifest.cases) ? manifest.cases : [];
  if (!cases.length) throw new Error("Manifest must include a non-empty cases array.");
  return {
    id: cleanText(manifest.id, "case-library"),
    title: cleanText(manifest.title, "Market Replay case library"),
    outDir: manifest.outDir ? cleanText(manifest.outDir) : "",
    cases: cases.map((entry, index) => normalizeCaseEntry(entry, index)),
  };
}

export function normalizeCaseEntry(entry, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`cases[${index}] must be an object.`);
  }
  const id = cleanText(entry.id, `case-${index + 1}`);
  if (!entry.config && !entry.configFile) {
    throw new Error(`${id} must include config or configFile.`);
  }
  return {
    id,
    title: cleanText(entry.title, id),
    out: cleanText(entry.out, `${id}.json`),
    config: entry.config || null,
    configFile: entry.configFile ? cleanText(entry.configFile) : "",
  };
}

async function buildCaseEntry(entry, options) {
  try {
    const config = entry.configFile
      ? await readJson(resolve(options.manifestDir, entry.configFile))
      : entry.config;
    const normalizedConfig = normalizeConfig({ title: entry.title, ...config });
    const assets = await Promise.all(normalizedConfig.assets.map((asset) => fetchAssetRows(asset, normalizedConfig)));
    const packageJson = buildPackage(normalizedConfig, assets);
    const outPath = resolve(options.outputDir, entry.out);
    let validation = null;
    if (options.validate) validation = validateCasePackage(packageJson, { file: outPath });
    if (!options.dryRun) {
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
    }
    return {
      id: entry.id,
      title: packageJson.title,
      out: outPath,
      written: !options.dryRun,
      status: validation?.errors?.length ? "error" : "ok",
      validation,
    };
  } catch (error) {
    return {
      id: entry.id,
      title: entry.title,
      out: resolve(options.outputDir, entry.out),
      written: false,
      status: "error",
      error: error.message,
      validation: null,
    };
  }
}

function formatLibraryResult(result) {
  const lines = [
    `${result.title}`,
    `  Cases: ${result.total}; Written: ${result.written}; Failed: ${result.failedCount}; Warnings: ${result.warningCount}; Average score: ${Number.isFinite(result.averageScore) ? `${Math.round(result.averageScore)}/100` : "n/a"}`,
    `  Output: ${result.outputDir}${result.dryRun ? " (dry run)" : ""}`,
    ...result.cases.map(formatCaseResult),
  ];
  return lines.join("\n");
}

function formatCaseResult(item) {
  if (item.error) return `  - ${item.id}: ERROR ${item.error}`;
  const validationText = item.validation
    ? `${item.validation.score}/100 ${item.validation.level}; errors ${item.validation.errors.length}; warnings ${item.validation.warnings.length}`
    : "validation skipped";
  return `  - ${item.id}: ${item.status.toUpperCase()} ${validationText} -> ${item.out}`;
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
