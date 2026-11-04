// Checks the leverage helpers against Tutorial 4 Recap 4 (debt of 50) and Recap 5 (tau = 20%),
// and PS4 Question 1 (debt of 700 in the 1000 / 1400 / 900 lecture example).
import assert from 'node:assert/strict';
import { leverage, scenario, fmtNum, fmtPct } from '../src/lib/leverage.js';

const RECAP = scenario('recap');
const PS4 = scenario('ps4');

// ============================================================
//                    RECAP 4: DEBT OF 50
// ============================================================

// Debt 52.5 in both states; equity 77.5 / 37.5, expected 57.5; returns +55% / -25%; r_E 15%; WACC 10%.
const deck = leverage(50, 0, RECAP);
console.log('V_D 50:', fmtNum(deck.debtOwed), fmtNum(deck.equityUp), fmtNum(deck.equityDown), fmtNum(deck.equityExpected), fmtPct(deck.rE, 1), fmtPct(deck.wacc, 1));
assert.deepEqual([fmtNum(deck.debtOwed), fmtNum(deck.equityUp), fmtNum(deck.equityDown), fmtNum(deck.equityExpected)], ['52.5', '77.5', '37.5', '57.5']);
assert.deepEqual([fmtPct(deck.returnUp, 1), fmtPct(deck.returnDown, 1), fmtPct(deck.rE, 1), fmtPct(deck.wacc, 1)], ['55.0%', '-25.0%', '15.0%', '10.0%']);

// ============================================================
//                  RECAP 5: TAXES AT 20%
// ============================================================

// r_E stays 15%; cost of debt 4%; WACC 9.5%.
const taxed = leverage(50, 0.2, RECAP);
console.log('V_D 50, tau 20%:', fmtPct(taxed.rE, 1), fmtPct(taxed.rDCost, 1), fmtPct(taxed.wacc, 1));
assert.deepEqual([fmtPct(taxed.rE, 1), fmtPct(taxed.rDCost, 1), fmtPct(taxed.wacc, 1)], ['15.0%', '4.0%', '9.5%']);

// ============================================================
//                 PS4 QUESTION 1: DEBT OF 700
// ============================================================

// Solutions tables: equity 300; debt 735 in both states; equity 665 / 165; returns 122% / -45%; r_E 38%; WACC 15%.
const ps4 = leverage(700, 0, PS4);
console.log('PS4 V_D 700:', fmtNum(ps4.equityToday), fmtNum(ps4.debtOwed), fmtNum(ps4.equityUp), fmtNum(ps4.equityDown), fmtPct(ps4.returnUp, 1), fmtPct(ps4.returnDown, 1), fmtPct(ps4.rE, 1), fmtPct(ps4.wacc, 1));
assert.deepEqual([fmtNum(ps4.equityToday), fmtNum(ps4.debtOwed), fmtNum(ps4.equityUp), fmtNum(ps4.equityDown)], ['300', '735', '665', '165']);
assert.deepEqual([fmtPct(ps4.returnUp, 0), fmtPct(ps4.returnDown, 0), fmtPct(ps4.rE, 0), fmtPct(ps4.wacc, 0)], ['122%', '-45%', '38%', '15%']);

// ============================================================
//                         SLIDER EDGES
// ============================================================

// No debt: equity is the assets. At 85 the down state just repays; past 85.71 the helper refuses.
assert.equal(fmtPct(leverage(0, 0, RECAP).rE, 1), '10.0%');
assert.equal(fmtNum(leverage(85, 0, RECAP).equityDown), '0.75');
assert.equal(fmtPct(leverage(85, 0, RECAP).wacc, 1), '10.0%');
assert.throws(() => leverage(86, 0, RECAP), RangeError);
assert.ok(Number.isFinite(leverage(RECAP.debtMax, 0.2, RECAP).wacc));

// PS4: no debt gives r_A = 15%; past 857.14 the Bad state's 900 cannot repay.
assert.equal(fmtPct(leverage(0, 0, PS4).rE, 1), '15.0%');
assert.throws(() => leverage(860, 0, PS4), RangeError);
console.log('Axes:', RECAP.retTicks.join(' '), '|', PS4.retTicks.join(' '), '| rates', RECAP.rateTicks.join(' '), '|', PS4.rateTicks.join(' '));
console.log('All leverage checks passed.');
