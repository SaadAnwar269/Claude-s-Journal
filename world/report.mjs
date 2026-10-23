import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const statePath = join(dirname(fileURLToPath(import.meta.url)), 'state.json');

// Closeness of two words, 0..1: syllable-level edit distance, so "mi" and "mi-oh" are half-understood.
export function similarity(a, b) {
  if (a === b) return 1;
  const x = a.split('-'), y = b.split('-');
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[y.length] / Math.max(x.length, y.length);
}

// How alike two settlers' words are on shared concepts, averaged over all pairs.
export function intelligibility(settlers) {
  let agree = 0;
  let total = 0;
  for (let i = 0; i < settlers.length; i++) {
    for (let j = i + 1; j < settlers.length; j++) {
      for (const c of Object.keys(settlers[i].words)) {
        if (c in settlers[j].words) {
          total += 1;
          agree += similarity(settlers[i].words[c], settlers[j].words[c]);
        }
      }
    }
  }
  return total === 0 ? 1 : agree / total;
}

// Understanding inside each cove, and across the ridge between the first two coves' members.
export function coveStats(settlers) {
  const names = [...new Set(settlers.map((s) => s.cove).filter(Boolean))];
  if (names.length < 2) return null;
  const within = Object.fromEntries(names.map((c) => [c, intelligibility(settlers.filter((s) => s.cove === c))]));
  let agree = 0;
  let total = 0;
  for (const a of settlers.filter((s) => s.cove === names[0])) {
    for (const b of settlers.filter((s) => s.cove === names[1])) {
      for (const c of Object.keys(a.words)) if (c in b.words) { total += 1; agree += similarity(a.words[c], b.words[c]); }
    }
  }
  return { within, across: total === 0 ? 1 : agree / total };
}

export function report(state) {
  const concepts = [...new Set(state.settlers.flatMap((s) => Object.keys(s.words)))].sort();
  const rows = [
    `| word | ${state.settlers.map((s) => s.cove ? `${s.name} (${s.cove})` : s.name).join(' | ')} |`,
    `| --- | ${state.settlers.map(() => '---').join(' | ')} |`,
    ...concepts.map((c) => `| ${c} | ${state.settlers.map((s) => s.words[c] ?? '·').join(' | ')} |`),
  ];
  const pct = Math.round(intelligibility(state.settlers) * 100);
  const stats = coveStats(state.settlers);
  return [
    `# Day ${state.day} (${state.weather})`,
    '',
    `${state.settlers.length} settlers. Mutual intelligibility: ${pct}%.`,
    ...(stats ? [`Within ${Object.entries(stats.within).map(([c, v]) => `${c} ${Math.round(v * 100)}%`).join(', ')}; across the ridge ${Math.round(stats.across * 100)}%.`] : []),
    '',
    ...rows,
    '',
    'Recent events:',
    ...state.log.slice(-5).map((l) => `- ${l}`),
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(statePath)) {
    console.error('No world/state.json yet. Run `node world/tick.mjs` first.');
    process.exit(1);
  }
  console.log(report(JSON.parse(readFileSync(statePath, 'utf8'))));
}
