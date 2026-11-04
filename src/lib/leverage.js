// Two-state leverage examples (Tutorial 4 Recap 4 and 5; PS4 Question 1): debt V_D changes equity's
// cash flows, returns and r_E; WACC stays at r_A without taxes and falls with them.
// Taxes follow Recap 5: r_E is unchanged and only the cost of debt becomes r_D(1 - tau).

// ============================================================
//                          CONSTANTS
// ============================================================

// Two worked examples: assets worth `today` at date 1, then `up` or `down` at date 2, each with
// probability 1/2. The Tutorial 4 recap, and PS4 Question 1 (the lecture example with debt of 700).
export const SCENARIOS = {
  recap: { label: 'Recap example', today: 100, up: 130, down: 90, vdStart: 50 },
  ps4: { label: 'PS4, Question 1', today: 1000, up: 1400, down: 900, vdStart: 700 }
};

// Debt is riskless at 5% only while the Bad state can repay 1.05 x V_D.
export const RATE_DEBT = 0.05;

// ============================================================
//                          SCENARIO
// ============================================================

// One example's fixed numbers and chart scales, built from its three asset values.
// Axes end where equity's Good return and r_E peak: at the riskless debt limit.
export function scenario(key) {
  const s = SCENARIOS[key];
  if (!s) throw new RangeError(`Unknown scenario ${key}`);

  // The riskless debt limit and the asset returns.
  const debtMax = s.down / (1 + RATE_DEBT);
  const rA = (s.up + s.down) / 2 / s.today - 1;
  const equityAtLimit = s.today - debtMax;

  // Ranges: returns from -100% to the Good-state peak, rates to 5 points above r_E's peak, the WACC bar to 1.2 x r_A.
  const retMax = (s.up - s.down) / equityAtLimit - 1;
  const rateMaxPct = Math.round(((s.up + s.down) / 2 - s.down) / equityAtLimit * 100) - 100 + 5;
  const stackMax = rA * 1.2;

  // Tick values: returns in percent, rates in percent, V_D in the example's units.
  const retTicks = [-100, 0, 100, Math.round(retMax * 100)];
  const rateStep = rateMaxPct > 50 ? 20 : 10;
  const rateTicks = Array.from({ length: Math.ceil(rateMaxPct / rateStep) }, (_, k) => k * rateStep);

  return {
    ...s, key, debtMax, debtMaxPct: (debtMax / s.today) * 100, rA,
    retUp: s.up / s.today - 1, retDown: s.down / s.today - 1,
    retTicks, rateTicks, xTicks: [0, 0.2, 0.4, 0.6, 0.8].map(f => f * s.today),
    // Tree nodes are drawn at 25% of the box width per date-1 value.
    nodeToday: 25, nodeUp: (25 * s.up) / s.today, nodeDown: (25 * s.down) / s.today,
    // Every chart works in percent of its own box.
    returnPos: r => ((r + 1) / (retMax + 1)) * 100,
    ratePos: r => (r * 100 / rateMaxPct) * 100,
    stackPos: r => (r / stackMax) * 100
  };
}

// ============================================================
//                            MODEL
// ============================================================

// Claims, state returns and costs of capital for debt vd raised at date 1, tax rate tau and example s.
// Equity gets assets minus 1.05 x vd in each state; WACC weights are date-1 values over the assets.
export function leverage(vd, tau, s) {
  if (!(vd >= 0 && vd <= s.debtMax)) throw new RangeError(`V_D must lie in [0, ${s.debtMax.toFixed(2)}], got ${vd}`);
  if (!(tau >= 0 && tau < 1)) throw new RangeError(`Tax rate must lie in [0, 1), got ${tau}`);

  // Debt is paid first and in full, so equity is the residual in each state.
  const debtOwed = vd * (1 + RATE_DEBT);
  const equityToday = s.today - vd;
  const equityUp = s.up - debtOwed;
  const equityDown = s.down - debtOwed;

  // Expected cash flow over the stake invested gives r_E.
  const equityExpected = 0.5 * equityUp + 0.5 * equityDown;
  const returnUp = equityUp / equityToday - 1;
  const returnDown = equityDown / equityToday - 1;
  const rE = equityExpected / equityToday - 1;

  // Recap 5: weights stay V_E/V and V_D/V; tax only lowers the cost of debt.
  const wE = equityToday / s.today;
  const wD = vd / s.today;
  const rDCost = RATE_DEBT * (1 - tau);

  // WACC pieces; the shield is the part of the debt cost the tax deduction removes.
  const equityPiece = wE * rE;
  const debtPiece = wD * rDCost;
  const shieldPiece = wD * RATE_DEBT * tau;

  return { vd, tau, debtOwed, equityToday, equityUp, equityDown, equityExpected, returnUp, returnDown, rE, wE, wD, rDCost, equityPiece, debtPiece, shieldPiece, wacc: equityPiece + debtPiece };
}

// ============================================================
//                      CHART GEOMETRY
// ============================================================

// Positions for the current slider value; tau sets where the (possibly hidden) tax lines sit.
export function geometry(m, tau, s) {
  // r_E against V_D, from no debt to the riskless limit, as an SVG path in a 0-100 box.
  const grid = Array.from({ length: 86 }, (_, k) => (k * s.today) / 100).concat(s.debtMax);
  const rEPath = grid.map((v, i) => `${i === 0 ? 'M' : 'L'}${((v / s.today) * 100).toFixed(2)},${(100 - s.ratePos(leverage(v, 0, s).rE)).toFixed(2)}`).join(' ');
  const waccTaxEnd = leverage(s.debtMax, tau, s).wacc;

  return {
    rEPath,
    x: (m.vd / s.today) * 100,
    yRDTax: 100 - s.ratePos(RATE_DEBT * (1 - tau)),
    yWaccTaxEnd: 100 - s.ratePos(waccTaxEnd),
    rateE: s.ratePos(m.rE), rateW: s.ratePos(m.wacc),
    retUp: s.returnPos(m.returnUp), retDown: s.returnPos(m.returnDown), retExp: s.returnPos(m.rE),
    stEq: s.stackPos(m.equityPiece), stDebt: s.stackPos(m.debtPiece), stShield: s.stackPos(m.shieldPiece),
    // Tree nodes are drawn at 25% of the box width per date-1 value.
    debtUpShare: (m.debtOwed / s.up) * 100, debtDownShare: (m.debtOwed / s.down) * 100, debtEdge: (m.debtOwed * 25) / s.today
  };
}

// ============================================================
//                         FORMATTING
// ============================================================

// Values to two decimals without trailing zeros (52.5, 89.25); rates as percentages.
export const fmtNum = x => String(Math.round(x * 100) / 100);
export function fmtPct(x, digits) {
  const rounded = Math.round(x * 100 * 10 ** digits) / 10 ** digits;
  return `${(rounded === 0 ? 0 : rounded).toFixed(digits)}%`;
}
export const fmtSigned = x => (Math.round(x * 1000) > 0 ? '+' : '') + fmtPct(x, 1);
