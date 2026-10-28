// Checks the NPV/IRR helpers against PS3 Problem 2 and the pattern rules.
import assert from 'node:assert/strict';
import { npv, findIrr, detectPattern, applyGrowth } from '../src/lib/irr.js';

// PS3 Problem 2: forgo maintenance; nothing in year 0 (official IRR 8.19%).
const forgo = [0, 540, 540, 540, -1900];
const irr = findIrr(forgo);
console.log('Problem 2 IRR:', (irr * 100).toFixed(2) + '%', '| pattern:', detectPattern(forgo));
assert.equal((irr * 100).toFixed(2), '8.19');
assert.ok(Math.abs(npv(irr, forgo)) < 1e-6);

// Same flows typed from year 1, and the textbook patterns.
assert.equal(detectPattern(forgo), 'financing');
assert.equal(detectPattern([540, 540, 540, -1900]), 'financing');
assert.equal((findIrr([540, 540, 540, -1900], 1) * 100).toFixed(2), '8.19');
assert.equal(detectPattern([-1000, 300, 400, 500]), 'investment');
assert.equal(detectPattern([0, -1000, 300, 400]), 'investment');
assert.equal(detectPattern([-100, 230, -132]), 'mixed');
assert.equal(detectPattern([0, 0, 0]), 'mixed');

// Growth from year 1 at 10%: 100, 110, 121.
const grown = applyGrowth([-300, 100, 0, 0], 1, 10);
assert.deepEqual(grown.map(v => Math.round(v * 1e6) / 1e6), [-300, 100, 110, 121]);
// PS3 Problem 3: each business lasts forever; flow 1 is the perpetuity (official NPVs 1500/1400/1175/1050).
const shops = [
  ['Book store', [-300, 90], 0.03, 0.08, 1500, 33],
  ['Coffee shop', [-200, 80], 0.03, 0.08, 1400, 43],
  ['Music store', [-200, 110], 0, 0.08, 1175, 55],
  ['Gym', [-200, 100], 0.03, 0.11, 1050, 53],
];
for (const [name, flows, g, r, officialNpv, officialIrr] of shops) {
  const perp = { index: 1, g };
  const value = npv(r, flows, 0, perp);
  const rate = findIrr(flows, 0, perp);
  console.log(`${name}: NPV ${value.toFixed(2)} | IRR ${(rate * 100).toFixed(2)}%`);
  assert.equal(Math.round(value), officialNpv);
  assert.equal(Math.round(rate * 100), officialIrr);
}
assert.ok(Number.isNaN(npv(0.02, [-300, 90], 0, { index: 1, g: 0.03 })));
console.log('All IRR checks passed.');
