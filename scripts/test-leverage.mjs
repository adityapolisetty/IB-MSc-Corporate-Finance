// Checks the leverage helpers against Tutorial 4 Recap 4 (debt of 50) and Recap 5 (tau = 20%).
import assert from 'node:assert/strict';
import { leverage, DEBT_MAX, fmtNum, fmtPct } from '../src/lib/leverage.js';

// ============================================================
//                    RECAP 4: DEBT OF 50
// ============================================================

// Debt 52.5 in both states; equity 77.5 / 37.5, expected 57.5; returns +55% / -25%; r_E 15%; WACC 10%.
const deck = leverage(50, 0);
console.log('V_D 50:', fmtNum(deck.debtOwed), fmtNum(deck.equityUp), fmtNum(deck.equityDown), fmtNum(deck.equityExpected), fmtPct(deck.rE, 1), fmtPct(deck.wacc, 1));
assert.deepEqual([fmtNum(deck.debtOwed), fmtNum(deck.equityUp), fmtNum(deck.equityDown), fmtNum(deck.equityExpected)], ['52.5', '77.5', '37.5', '57.5']);
assert.deepEqual([fmtPct(deck.returnUp, 1), fmtPct(deck.returnDown, 1), fmtPct(deck.rE, 1), fmtPct(deck.wacc, 1)], ['55.0%', '-25.0%', '15.0%', '10.0%']);

// ============================================================
//                  RECAP 5: TAXES AT 20%
// ============================================================

// r_E stays 15%; cost of debt 4%; WACC 9.5%.
const taxed = leverage(50, 0.2);
console.log('V_D 50, tau 20%:', fmtPct(taxed.rE, 1), fmtPct(taxed.rDCost, 1), fmtPct(taxed.wacc, 1));
assert.deepEqual([fmtPct(taxed.rE, 1), fmtPct(taxed.rDCost, 1), fmtPct(taxed.wacc, 1)], ['15.0%', '4.0%', '9.5%']);

// ============================================================
//                         SLIDER EDGES
// ============================================================

// No debt: equity is the assets. At 85 the down state just repays; past 85.71 the helper refuses.
assert.equal(fmtPct(leverage(0, 0).rE, 1), '10.0%');
assert.equal(fmtNum(leverage(85, 0).equityDown), '0.75');
assert.equal(fmtPct(leverage(85, 0).wacc, 1), '10.0%');
assert.throws(() => leverage(86, 0), RangeError);
assert.ok(Number.isFinite(leverage(DEBT_MAX, 0.2).wacc));
console.log('All leverage checks passed.');
