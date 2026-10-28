// NPV, IRR and cash-flow pattern helpers, ported from the Streamlit app (interactive.py).

// NPV at rate r; cashflows[i] arrives at the end of year start + i (year 0 is today).
export function npv(rate, cashflows, start = 0) {
  return cashflows.reduce((sum, cf, i) => sum + cf / (1 + rate) ** (start + i), 0);
}

// Newton-Raphson from several starting guesses; null when none converges.
export function findIrr(cashflows, start = 0, tol = 1e-6) {
  for (const guess of [0.05, 0.10, 0.15, 0.20]) {
    let r = guess;
    for (let i = 0; i < 1000; i++) {
      const value = npv(r, cashflows, start);
      if (Math.abs(value) < tol) return r;
      const slope = cashflows.reduce((sum, cf, i) => sum - (start + i) * cf / (1 + r) ** (start + i + 1), 0);
      if (Math.abs(slope) < 1e-10) break;
      r -= value / slope;
      if (r < -0.99) break;
    }
  }
  return null;
}

// Zero cash flows are skipped, so a project with nothing in year 0 is classified by its first real flow.
// investment: outflow first, inflows after; financing: inflows first, one outflow at the end; else mixed.
export function detectPattern(cashflows) {
  const flows = cashflows.filter(cf => cf !== 0);
  if (flows.length < 2) return 'mixed';
  const rest = flows.slice(1);
  if (flows[0] < 0 && rest.every(cf => cf > 0)) return 'investment';
  if (flows.slice(0, -1).every(cf => cf > 0) && flows.at(-1) < 0) return 'financing';
  return 'mixed';
}

// From the base year on, each later flow is the base-year flow grown at g per year.
export function applyGrowth(cashflows, baseIndex, growthPct) {
  if (growthPct === 0 || baseIndex >= cashflows.length) return [...cashflows];
  const base = cashflows[baseIndex];
  return cashflows.map((cf, i) => i > baseIndex ? base * (1 + growthPct / 100) ** (i - baseIndex) : cf);
}
