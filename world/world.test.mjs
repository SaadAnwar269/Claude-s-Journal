import test from 'node:test';
import assert from 'node:assert/strict';
import { tick, corrupt, mulberry32 } from './tick.mjs';
import { intelligibility, coveStats, similarity } from './report.mjs';
import { cardSVG } from './build-site.mjs';

const seedState = () => ({
  day: 0,
  weather: 'still',
  settlers: [
    { name: 'Ka', words: { sea: 'lo', bread: 'mi' } },
    { name: 'Sen', words: { sea: 'lo', bread: 'tur' } },
  ],
  log: [],
});

test('tick is deterministic for a given state', () => {
  assert.deepEqual(tick(seedState()), tick(seedState()));
});

test('tick does not mutate its input', () => {
  const s = seedState();
  tick(s);
  assert.deepEqual(s, seedState());
});

test('corrupt with rate 0 never changes a word', () => {
  const rand = mulberry32(1);
  for (let i = 0; i < 50; i++) assert.equal(corrupt(rand, 'lo-mi', 0), 'lo-mi');
});

test('corrupt keeps words between 1 and 3 syllables', () => {
  const rand = mulberry32(7);
  let w = 'lo';
  for (let i = 0; i < 500; i++) {
    w = corrupt(rand, w, 1);
    const n = w.split('-').length;
    assert.ok(n >= 1 && n <= 3, `bad word ${w}`);
  }
});

test('a birth happens every 7 days and the child knows only parents\' concepts', () => {
  let s = seedState();
  for (let i = 0; i < 7; i++) s = tick(s).state;
  assert.equal(s.settlers.length, 3);
  const concepts = new Set(s.settlers.slice(0, 2).flatMap((p) => Object.keys(p.words)));
  for (const c of Object.keys(s.settlers[2].words)) assert.ok(concepts.has(c));
});

test('population is capped', () => {
  let s = seedState();
  for (let i = 0; i < 400; i++) s = tick(s).state;
  assert.ok(s.settlers.length <= 8);
});

test('log stays bounded', () => {
  let s = seedState();
  for (let i = 0; i < 400; i++) s = tick(s).state;
  assert.ok(s.log.length <= 50);
});

test('intelligibility is 1 for identical speakers and 0 for fully different', () => {
  assert.equal(intelligibility([{ words: { a: 'x' } }, { words: { a: 'x' } }]), 1);
  assert.equal(intelligibility([{ words: { a: 'x' } }, { words: { a: 'y' } }]), 0);
  assert.equal(intelligibility([{ words: { a: 'x' } }, { words: { b: 'y' } }]), 1);
});

test('card shows the day and escapes markup from event text', () => {
  const svg = cardSVG({
    day: 12, weather: 'fog',
    settlers: [{ name: 'A<b>', words: { sea: 'x' } }, { name: 'B', words: { sea: 'x' } }],
    events: [{ type: 'coined', text: 'A<b> names "fire" & more' }],
  });
  assert.match(svg, /Day 12/);
  assert.ok(!svg.includes('A<b>'));
  assert.match(svg, /A&lt;b&gt; names &quot;fire&quot; &amp; more/);
});

test('card handles a quiet day', () => {
  const svg = cardSVG({ day: 2, weather: 'clear', settlers: [{ name: 'Ka', words: {} }], events: [{ type: 'quiet', text: 'clear. Nothing changed.' }] });
  assert.match(svg, /Nothing changed/);
});

test('the village splits into two coves on day 5 and keeps them', () => {
  let s = seedState();
  for (let i = 0; i < 4; i++) s = tick(s).state;
  assert.ok(s.settlers.every((p) => !p.cove));
  const r = tick(s);
  assert.deepEqual(r.state.settlers.map((p) => p.cove), ['bay', 'ridge']);
  assert.ok(r.events.some((e) => e.type === 'split'));
});

test('children are born into a parental cove', () => {
  let s = seedState();
  for (let i = 0; i < 7; i++) s = tick(s).state;
  assert.ok(['bay', 'ridge'].includes(s.settlers[2].cove));
});

test('boat conversations only cross coves, and only in calm weather', () => {
  let s = seedState();
  for (let i = 0; i < 120; i++) {
    const r = tick(s);
    for (const e of r.events) if (e.text.includes('off the boat')) assert.ok(['clear', 'still'].includes(r.state.weather));
    s = r.state;
  }
});

test('coveStats reports within and across agreement', () => {
  const mk = (cove, w) => ({ cove, words: { sea: w } });
  const st = coveStats([mk('bay', 'a'), mk('bay', 'a'), mk('ridge', 'b'), mk('ridge', 'b')]);
  assert.equal(st.within.bay, 1);
  assert.equal(st.within.ridge, 1);
  assert.equal(st.across, 0);
  assert.equal(coveStats([mk(undefined, 'a'), mk(undefined, 'b')]), null);
});

test('similarity gives partial credit for near words', () => {
  assert.equal(similarity('mi', 'mi'), 1);
  assert.equal(similarity('mi', 'lo'), 0);
  assert.equal(similarity('mi', 'mi-oh'), 0.5);
  assert.ok(Math.abs(similarity('lo-ni', 'lo-ka') - 0.5) < 1e-9);
});
