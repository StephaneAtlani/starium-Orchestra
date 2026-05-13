#!/usr/bin/env node
/**
 * Lance `pnpm -r run test` puis affiche un tableau récapitulatif (Markdown)
 * à partir des JSON écrits dans `.test-recap/` par api / web / budget-exercise-calendar.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const recapDir = path.join(root, '.test-recap');

/** Ordre d’affichage : packages puis apps, noms npm. */
const RECAP_ROWS = [
  { name: '@starium-orchestra/budget-exercise-calendar', report: 'budget-exercise-calendar.json' },
  { name: '@starium-orchestra/rbac-permissions', report: 'rbac-permissions.json' },
  { name: '@starium-orchestra/config', report: null },
  { name: '@starium-orchestra/types', report: null },
  { name: '@starium-orchestra/api', report: 'api.json' },
  { name: '@starium-orchestra/web', report: 'web.json' },
];

function readJsonReport(fileName) {
  if (!fileName) return null;
  const p = path.join(recapDir, fileName);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function summarizeReport(report) {
  if (!report || typeof report !== 'object') return null;
  const testsOk = Number(report.numPassedTests ?? 0);
  const testsTotal = Number(report.numTotalTests ?? 0);
  const files = Array.isArray(report.testResults) ? report.testResults : [];
  const filesTotal = files.length;
  const filesOk = files.filter((f) => f.status === 'passed').length;
  const ok =
    report.success === true &&
    Number(report.numFailedTests ?? 0) === 0 &&
    Number(report.numFailedTestSuites ?? 0) === 0;
  return { filesOk, filesTotal, testsOk, testsTotal, ok };
}

function printRecapTable(globalExitCode) {
  const lines = [
    '',
    '## Récapitulatif des tests (workspace)',
    '',
    '| Workspace | Fichiers (OK / total) | Tests (OK / total) | Statut |',
    '| :---------- | :--------------------: | :-----------------: | :----- |',
  ];

  let sumFilesOk = 0;
  let sumFilesTot = 0;
  let sumTestsOk = 0;
  let sumTestsTot = 0;
  let anyReport = false;
  let anyReportFailed = false;

  for (const row of RECAP_ROWS) {
    if (!row.report) {
      lines.push(`| ${row.name} | — | — | stub |`);
      continue;
    }
    const raw = readJsonReport(row.report);
    const s = summarizeReport(raw);
    if (!s) {
      lines.push(`| ${row.name} | — | — | ${globalExitCode === 0 ? 'OK' : 'rapport absent'} |`);
      continue;
    }
    anyReport = true;
    if (!s.ok) anyReportFailed = true;
    sumFilesOk += s.filesOk;
    sumFilesTot += s.filesTotal;
    sumTestsOk += s.testsOk;
    sumTestsTot += s.testsTotal;
    const st = s.ok ? 'OK' : 'ERREUR';
    lines.push(
      `| ${row.name} | ${s.filesOk} / ${s.filesTotal} | ${s.testsOk} / ${s.testsTotal} | ${st} |`,
    );
  }

  if (anyReport && sumTestsTot > 0) {
    lines.push(
      `| **Total** (packages avec rapport JSON) | ${sumFilesOk} / ${sumFilesTot} | ${sumTestsOk} / ${sumTestsTot} | ${anyReportFailed || globalExitCode !== 0 ? '—' : 'OK'} |`,
    );
  }

  lines.push('');
  console.log(lines.join('\n'));
}

fs.mkdirSync(recapDir, { recursive: true });

const run = spawnSync('pnpm', ['-r', 'run', 'test'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env },
});

const exitCode = run.status === 0 ? 0 : run.status ?? 1;
printRecapTable(exitCode);
process.exit(exitCode);
