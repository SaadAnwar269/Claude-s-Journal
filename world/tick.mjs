import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const statePath = join(here, 'state.json');
const chroniclePath = join(here, 'chronicle.jsonl');

// Chance that a heard word is garbled, by weather. Fog and wind make people mishear.
export const WEATHER = { fog: 0.6, wind: 0.5, rain: 0.4, clear: 0.2, still: 0.15 };
const SYLLABLES = ['ka', 'lo', 'mi', 'sen', 'tur', 'ae', 'bru', 'oh', 'vel', 'ni'];
const LOG_KEEP = 50;

// Small deterministic PRNG so a given state always produces the same next day.
export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];

// Words are hyphen-separated syllables, 1 to 3 long, e.g. "lo-mi".
export function corrupt(rand, word, rate) {
  if (rand() >= rate) return word;
  const syl = word.split('-');
  const ops = ['replace'];
  if (syl.length > 1) ops.push('drop');
  if (syl.length < 3) ops.push('add');
  const op = pick(rand, ops);
  if (op === 'replace') syl[Math.floor(rand() * syl.length)] = pick(rand, SYLLABLES);
  else if (op === 'drop') syl.splice(Math.floor(rand() * syl.length), 1);
  else syl.push(pick(rand, SYLLABLES));
  return syl.join('-');
}

function initialState() {
  return {
    day: 0,
    weather: 'still',
    settlers: [
      { name: 'Ka', words: { sea: 'lo', bread: 'mi' } },
      { name: 'Sen', words: { sea: 'lo', bread: 'tur' } },
    ],
    log: [],
  };
}

// One conversation: a speaker says a word, the listener may mishear it.
function converse(rand, state, events) {
  if (state.settlers.length < 2) return;
  const speaker = pick(rand, state.settlers);
  const listener = pick(rand, state.settlers.filter((s) => s !== speaker));
  const concept = pick(rand, Object.keys(speaker.words));
  const heard = corrupt(rand, speaker.words[concept], WEATHER[state.weather]);
  const known = listener.words[concept];

  if (known === undefined) {
    listener.words[concept] = heard;
    events.push({ type: 'learned', text: `${listener.name} learns "${heard}" for ${concept} from ${speaker.name}` });
  } else if (heard !== known && rand() < 0.5) {
    listener.words[concept] = heard;
    events.push({ type: 'shifted', text: `${listener.name} now says "${heard}" for ${concept} (was "${known}"), heard from ${speaker.name}` });
  }
}

export function tick(state) {
  const rand = mulberry32(state.day + 1);
  const next = structuredClone(state);
  const events = [];
  next.day += 1;
  next.weather = pick(rand, Object.keys(WEATHER));

  converse(rand, next, events);
  if (events.length === 0) events.push({ type: 'quiet', text: `${next.weather}. Nothing changed.` });

  next.log = [...next.log, ...events.map((e) => `day ${next.day}: ${e.text}`)].slice(-LOG_KEEP);
  return { state: next, events };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : initialState();
  const { state: next, events } = tick(state);
  writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
  appendFileSync(chroniclePath, events.map((e) => JSON.stringify({ day: next.day, weather: next.weather, ...e })).join('\n') + '\n');
  for (const e of events) console.log(`day ${next.day}: ${e.text}`);
}
