import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { intelligibility } from './report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const SKY = {
  clear: ['#4aa8e8', '#cdeeff'], still: ['#8fb3cc', '#e6eef3'], rain: ['#3d4f62', '#8397a8'],
  wind: ['#6a9db0', '#c6dce5'], fog: ['#8a959c', '#cfd5d8'],
};

export function loadHistory(path = join(here, 'history.jsonl')) {
  if (!existsSync(path)) throw new Error('No world/history.jsonl yet. Run `node world/tick.mjs` first.');
  return readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hue = (name) => { let n = 0; for (const ch of name) n = (n * 31 + ch.charCodeAt(0)) % 360; return n; };
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Static 640x360 summary image for one day. Needs no fonts or scripts, so it renders anywhere.
export function cardSVG(snap) {
  const sky = SKY[snap.weather] || SKY.clear;
  const pct = Math.round(intelligibility(snap.settlers) * 100);
  const n = snap.settlers.length;
  const dots = snap.settlers.map((s, i) => {
    const x = n === 1 ? 320 : 60 + (i * 520) / (n - 1);
    return `<circle cx="${x}" cy="262" r="13" fill="hsl(${hue(s.name)} 55% 58%)"/><text x="${x}" y="292" text-anchor="middle" font-size="12" fill="#3b2f1f" font-weight="700">${esc(s.name)}</text>`;
  }).join('');
  const events = snap.events.filter((e) => e.type !== 'quiet').slice(0, 3);
  const lines = (events.length ? events.map((e) => e.text) : [`${snap.weather}. Nothing changed.`])
    .map((t, i) => `<text x="32" y="${136 + i * 24}" font-size="14" fill="#16212d">${esc(clip(t, 62))}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" font-family="Courier New, monospace">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="640" height="360" fill="url(#g)"/>
<rect y="236" width="640" height="124" fill="#e9d8a6"/>
<text x="32" y="52" font-size="26" font-weight="700" fill="#10202e">Claude's Journal · Day ${snap.day}</text>
<text x="32" y="78" font-size="14" fill="#10202e">${esc(snap.weather)} · ${n} settler${n === 1 ? '' : 's'} · ${pct}% mutual understanding</text>
<rect x="24" y="96" width="592" height="${24 + Math.max(1, events.length) * 24 + 4}" rx="10" fill="#fff" opacity=".78"/>
<text x="32" y="114" font-size="11" fill="#5b6b7a" font-weight="700">TODAY</text>
${lines}
${dots}
</svg>
`;
}

export function buildSite() {
  const history = loadHistory();
  const template = readFileSync(join(here, 'site', 'template.html'), 'utf8');
  const data = JSON.stringify(history).replace(/</g, '\\u003c');
  const html = template.replace('/*__DATA__*/null', () => data);
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'index.html'), html);

  const latest = history.at(-1);
  const cardDir = join(root, 'summaries', 'cards');
  mkdirSync(cardDir, { recursive: true });
  const cardPath = join(cardDir, `day-${String(latest.day).padStart(3, '0')}.svg`);
  writeFileSync(cardPath, cardSVG(latest));
  return { days: history.length, cardPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { days, cardPath } = buildSite();
  console.log(`built docs/index.html (${days} days) and ${cardPath}`);
}
