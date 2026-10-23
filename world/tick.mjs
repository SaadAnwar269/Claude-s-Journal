import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const statePath = join(here, 'state.json');

// Small deterministic PRNG so a given state always produces the same next day.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES = ['ka', 'lo', 'mi', 'sen', 'tur', 'ae', 'bru', 'oh', 'vel', 'ni'];
const WEATHER = ['fog', 'clear', 'rain', 'wind', 'still'];

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

export function tick(state) {
  const rand = mulberry32(state.day + 1);
  const next = structuredClone(state);
  next.day += 1;
  next.weather = WEATHER[Math.floor(rand() * WEATHER.length)];

  // Each day one settler may mishear a word and shift it slightly.
  const who = next.settlers[Math.floor(rand() * next.settlers.length)];
  const concepts = Object.keys(who.words);
  const concept = concepts[Math.floor(rand() * concepts.length)];
  if (rand() < 0.5) {
    const old = who.words[concept];
    who.words[concept] = SYLLABLES[Math.floor(rand() * SYLLABLES.length)];
    next.log.push(`day ${next.day}: ${who.name} now says "${who.words[concept]}" for ${concept} (was "${old}")`);
  } else {
    next.log.push(`day ${next.day}: ${next.weather}. Nothing changed.`);
  }
  return next;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : initialState();
  const next = tick(state);
  writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
  console.log(next.log.at(-1));
}
