// NPV, IRR and cash-flow pattern helpers, ported from the Streamlit app (interactive.py).

// Discount factor for each entered flow; flow i arrives at the end of year start + i (year 0 is today).
// With a perpetuity ({ index, g }), flow `index` repeats forever growing at g: its factor is
// 1 / (r - g) discounted back from the year before it starts. Undefined (NaN) when r <= g.
export function discountFactors(rate, n, start = 0, perp = null) {
  return Array.from({ length: n }, (_, i) => {
    if (perp && i === perp.index) {
      if (rate <= perp.g) return NaN;
      return 1 / ((rate - perp.g) * (1 + rate) ** (start + i - 1));
    }
    return 1 / (1 + rate) ** (start + i);
  });
}

// NPV at rate r: sum of each flow times its discount factor.
export function npv(rate, cashflows, start = 0, perp = null) {
  const factors = discountFactors(rate, cashflows.length, start, perp);
  return cashflows.reduce((sum, cf, i) => sum + cf * factors[i], 0);
}

// Newton-Raphson (numerical slope) from several starting guesses; null when none converges.
export function findIrr(cashflows, start = 0, perp = null, tol = 1e-6) {
  const floor = perp ? perp.g : -0.99;
  const guesses = [0.05, 0.10, 0.15, 0.20, 0.30, 0.50].map(x => perp ? Math.max(x, perp.g + 0.01) : x);
  for (const guess of guesses) {
    let r = guess;
    for (let i = 0; i < 1000; i++) {
      const value = npv(r, cashflows, start, perp);
      if (!Number.isFinite(value)) break;
      if (Math.abs(value) < tol) return r;
      const h = 1e-6;
      const slope = (npv(r + h, cashflows, start, perp) - value) / h;
      if (!Number.isFinite(slope) || Math.abs(slope) < 1e-10) break;
      r -= value / slope;
      if (r <= floor) break;
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
