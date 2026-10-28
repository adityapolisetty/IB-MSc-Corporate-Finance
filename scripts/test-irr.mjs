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
console.log('All IRR checks passed.');
