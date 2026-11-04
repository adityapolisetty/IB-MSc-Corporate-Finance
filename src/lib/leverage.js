// Two-state leverage example from Tutorial 4 (Recap 4 and 5): debt V_D changes equity's
// cash flows, returns and r_E; WACC stays at r_A without taxes and falls with them.
// Taxes follow Recap 5: r_E is unchanged and only the cost of debt becomes r_D(1 - tau).

// ============================================================
//                          CONSTANTS
// ============================================================

// Assets are worth 100 at date 1 and 130 or 90 at date 2, each with probability 1/2.
export const ASSETS_TODAY = 100;
export const ASSETS_UP = 130;
export const ASSETS_DOWN = 90;

// Debt is riskless at 5% only while the down state can repay 1.05 x V_D.
export const RATE_DEBT = 0.05;
export const DEBT_MAX = ASSETS_DOWN / (1 + RATE_DEBT);
export const DEBT_MAX_PCT = (DEBT_MAX / ASSETS_TODAY) * 100;

// ============================================================
//                            MODEL
// ============================================================

// Claims, state returns and costs of capital for debt vd raised at date 1 and tax rate tau.
// Equity gets assets minus 1.05 x vd in each state; WACC weights are date-1 values out of 100.
export function leverage(vd, tau) {
  if (!(vd >= 0 && vd <= DEBT_MAX)) throw new RangeError(`V_D must lie in [0, ${DEBT_MAX.toFixed(2)}], got ${vd}`);
  if (!(tau >= 0 && tau < 1)) throw new RangeError(`Tax rate must lie in [0, 1), got ${tau}`);

  // Debt is paid first and in full, so equity is the residual in each state.
  const debtOwed = vd * (1 + RATE_DEBT);
  const equityToday = ASSETS_TODAY - vd;
  const equityUp = ASSETS_UP - debtOwed;
  const equityDown = ASSETS_DOWN - debtOwed;

  // Expected cash flow over the stake invested gives r_E.
  const equityExpected = 0.5 * equityUp + 0.5 * equityDown;
  const returnUp = equityUp / equityToday - 1;
  const returnDown = equityDown / equityToday - 1;
  const rE = equityExpected / equityToday - 1;

  // Recap 5: weights stay V_E/100 and V_D/100; tax only lowers the cost of debt.
  const wE = equityToday / ASSETS_TODAY;
  const wD = vd / ASSETS_TODAY;
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

// Every chart works in percent of its own box: returns -100% to +180%, rates 0-45%, WACC 0-12%.
const returnPos = r => ((r * 100 + 100) / 280) * 100;
const ratePos = r => (r / 0.45) * 100;
const stackPos = r => (r / 0.12) * 100;

// Positions for the current slider value; tau sets where the (possibly hidden) tax lines sit.
export function geometry(m, tau) {
  // r_E against V_D, from no debt to the riskless limit, as an SVG path in a 0-100 box.
  const grid = Array.from({ length: 86 }, (_, v) => v).concat(DEBT_MAX);
  const rEPath = grid.map((v, i) => `${i === 0 ? 'M' : 'L'}${v.toFixed(2)},${(100 - ratePos(leverage(v, 0).rE)).toFixed(2)}`).join(' ');
  const waccTaxEnd = leverage(DEBT_MAX, tau).wacc;

  return {
    rEPath,
    yRDTax: 100 - ratePos(RATE_DEBT * (1 - tau)),
    yWaccTaxEnd: 100 - ratePos(waccTaxEnd),
    rateE: ratePos(m.rE), rateW: ratePos(m.wacc),
    retUp: returnPos(m.returnUp), retDown: returnPos(m.returnDown), retExp: returnPos(m.rE),
    stEq: stackPos(m.equityPiece), stDebt: stackPos(m.debtPiece), stShield: stackPos(m.shieldPiece),
    // Tree nodes are drawn at 0.25% of the box width per unit of value.
    debtUpShare: (m.debtOwed / ASSETS_UP) * 100, debtDownShare: (m.debtOwed / ASSETS_DOWN) * 100, debtEdge: m.debtOwed * 0.25
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
