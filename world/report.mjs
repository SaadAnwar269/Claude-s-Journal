import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const statePath = join(dirname(fileURLToPath(import.meta.url)), 'state.json');

// Share of overlapping concepts on which two settlers use the same word, averaged over all pairs.
export function intelligibility(settlers) {
  let agree = 0;
  let total = 0;
  for (let i = 0; i < settlers.length; i++) {
    for (let j = i + 1; j < settlers.length; j++) {
      for (const c of Object.keys(settlers[i].words)) {
        if (c in settlers[j].words) {
          total += 1;
          if (settlers[i].words[c] === settlers[j].words[c]) agree += 1;
        }
      }
    }
  }
  return total === 0 ? 1 : agree / total;
}

export function report(state) {
  const concepts = [...new Set(state.settlers.flatMap((s) => Object.keys(s.words)))].sort();
  const rows = [
    `| word | ${state.settlers.map((s) => s.name).join(' | ')} |`,
    `| --- | ${state.settlers.map(() => '---').join(' | ')} |`,
    ...concepts.map((c) => `| ${c} | ${state.settlers.map((s) => s.words[c] ?? '·').join(' | ')} |`),
  ];
  const pct = Math.round(intelligibility(state.settlers) * 100);
  return [
    `# Day ${state.day} (${state.weather})`,
    '',
    `${state.settlers.length} settlers. Mutual intelligibility: ${pct}%.`,
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
