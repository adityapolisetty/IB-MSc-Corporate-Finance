<script>
  // Three live panels under the event tree: returns in each state, costs of capital against V_D,
  // and WACC built from its weighted pieces. All positions are percent of each chart box.
  import { fmtPct, fmtSigned, DEBT_MAX_PCT } from '../lib/leverage.js';
  export let m;
  export let g;
  export let taxOn;
  export let taxPct;

  // Labels at the slider sit right of the marker until the r_E curve gets steep, then left.
  $: labelShift = m.vd <= 55 ? 'translateX(10px)' : 'translateX(calc(-100% - 10px))';
  $: spread = `${(Math.round((m.returnUp - m.returnDown) * 1000) / 10).toFixed(1)} pts`;
</script>

<div class="panels">
  <div class="panel">
    <h3>Return in each state</h3>
    <div class="ranges">
      <span>Assets</span>
      <div class="lane"><div class="zero"></div><div class="band assets" style:left="32.143%" style:width="14.286%"></div><div class="dot ring" style:left="39.286%"></div></div>
      <span>Debt</span>
      <div class="lane"><div class="zero"></div><div class="dot debt" style:left="37.5%"></div></div>
      <span class="eq">Equity</span>
      <div class="lane"><div class="zero"></div><div class="band equity" style:left="{g.retDown}%" style:width="{g.retUp - g.retDown}%"></div><div class="dot ring eq-ring" style:left="{g.retExp}%"></div></div>
      <span></span>
      <div class="axis" aria-hidden="true"><span style:left="0%">-100%</span><span style:left="35.714%">0</span><span style:left="100%">+180%</span></div>
    </div>
    <p class="foot">equity {fmtSigned(m.returnDown)} to {fmtSigned(m.returnUp)}<br />spread {spread} vs assets 40.0 pts</p>
  </div>

  <div class="panel">
    <h3>Costs of capital</h3>
    <div class="legend">
      <span><i style:background="var(--accent)"></i>r<sub>E</sub></span>
      <span><i style:background="var(--debt-ink)"></i>r<sub>D</sub></span>
      <span><i style:background="var(--ink)"></i>WACC</span>
      {#if taxOn}<span><i style:background="var(--tax)"></i>with tax</span>{/if}
    </div>
    <div class="chart">
      <div class="stopzone" style:left="{DEBT_MAX_PCT}%"></div>
      <div class="grid" style:bottom="22.222%"></div>
      <div class="grid" style:bottom="66.667%"></div>
      <div class="ylab" style:bottom="0%">0%</div>
      <div class="ylab" style:bottom="22.222%">10%</div>
      <div class="ylab" style:bottom="66.667%">30%</div>
      <div class="xlab" style:left="0%">0</div>
      <div class="xlab" style:left="100%">100</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={DEBT_MAX_PCT} y1="77.78" y2="77.78" class="wacc-line" class:faint={taxOn} />
        <line x1="0" x2={DEBT_MAX_PCT} y1="88.89" y2="88.89" class="rd-line" />
        {#if taxOn}
          <line x1="0" x2={DEBT_MAX_PCT} y1={g.yRDTax} y2={g.yRDTax} class="tax-line dashed" />
          <line x1="0" x2={DEBT_MAX_PCT} y1="77.78" y2={g.yWaccTaxEnd} class="tax-line" />
        {/if}
        <path d={g.rEPath} class="re-line" />
        <line x1={m.vd} x2={m.vd} y1="0" y2="100" class="marker" />
      </svg>
      <div class="pt" class:tax={taxOn} style:left="{m.vd}%" style:bottom="{g.rateW}%"></div>
      <div class="pt eq-pt" style:left="{m.vd}%" style:bottom="{g.rateE}%"></div>
      <span class="val eq" style:left="{m.vd}%" style:bottom="calc({g.rateE}% + 10px)" style:transform={labelShift}>{fmtPct(m.rE, 1)}</span>
      <span class="val" class:tax={taxOn} style:left="{m.vd}%" style:bottom="calc({g.rateW}% + 4px)" style:transform={labelShift}>{fmtPct(m.wacc, 1)}</span>
    </div>
  </div>

  <div class="panel">
    <h3>WACC, piece by piece</h3>
    <div class="build">
      <div class="stack">
        <div class="shield" style:height="{g.stShield}%"></div>
        <div class="piece debt-piece" style:height="{g.stDebt}%"></div>
        <div class="piece eq-piece" style:height="{g.stEq}%"></div>
        <div class="ra" aria-hidden="true"></div>
        <span class="ra-label">r<sub>A</sub> 10%</span>
      </div>
      <div class="pieces">
        {#if taxOn}<span class="tax">tax saved<br />{m.wD.toFixed(2)} × 5% × {taxPct}%<br />= {fmtPct(m.shieldPiece, 2)}</span>{/if}
        <span class="debt-text">debt<br />{m.wD.toFixed(2)} × {fmtPct(m.rDCost, 1)}<br />= {fmtPct(m.debtPiece, 2)}</span>
        <span class="eq">equity<br />{m.wE.toFixed(2)} × {fmtPct(m.rE, 2)}<br />= {fmtPct(m.equityPiece, 2)}</span>
        <strong class:tax={taxOn}>WACC {fmtPct(m.wacc, 2)}</strong>
      </div>
    </div>
  </div>
</div>

<style>
  .panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); flex: 1 1 0; min-height: 250px; }
  .panel { display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 0; padding: 12px 20px; }
  .panel + .panel { border-left: 1px solid var(--rule); }
  h3 { margin: 0; font-size: 1rem; font-weight: 700; }
  .eq { color: var(--accent); }
  .tax { color: var(--tax); }
  .ranges { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 16px 8px; align-items: center; font-size: .8rem; }
  .lane { position: relative; height: 20px; }
  .zero { position: absolute; left: 35.714%; top: 0; bottom: 0; border-left: 1px solid var(--ink); }
  .band { position: absolute; top: 7px; height: 6px; transition: left .3s cubic-bezier(.34, 1.56, .64, 1), width .3s cubic-bezier(.34, 1.56, .64, 1); }
  .band.assets { background: var(--muted); }
  .band.equity { background: var(--accent); }
  .dot { position: absolute; top: 4px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; box-sizing: border-box; }
  .dot.ring { background: var(--paper); border: 2.5px solid var(--ink); }
  .dot.eq-ring { border-color: var(--accent); }
  .dot.debt { background: var(--debt-ink); }
  .axis { position: relative; height: 14px; color: var(--muted); }
  .axis span { position: absolute; transform: translateX(-50%); }
  .axis span:first-child { transform: none; }
  .axis span:last-child { transform: translateX(-100%); }
  .foot { margin: 0; font-size: .8rem; line-height: 1.5; color: var(--muted); }
  .legend { display: flex; flex-wrap: wrap; gap: 10px; font-size: .78rem; }
  .legend span { display: inline-flex; align-items: center; gap: 4px; }
  .legend i { display: inline-block; width: 14px; height: 3px; }
  .chart { position: relative; flex: 1 1 0; min-height: 120px; margin: 4px 4px 18px 34px; border-left: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
  .stopzone { position: absolute; right: 0; top: 0; bottom: 0; background: repeating-linear-gradient(135deg, var(--rule) 0 4px, transparent 4px 8px); }
  .grid { position: absolute; left: 0; right: 0; border-top: 1px solid var(--rule); }
  .ylab { position: absolute; right: calc(100% + 4px); transform: translateY(50%); font-size: .75rem; color: var(--muted); }
  .xlab { position: absolute; top: calc(100% + 3px); transform: translateX(-50%); font-size: .75rem; color: var(--muted); }
  .chart svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .chart line, .chart path { fill: none; vector-effect: non-scaling-stroke; }
  .wacc-line { stroke: var(--ink); stroke-width: 2.5; }
  .wacc-line.faint { opacity: .3; }
  .rd-line { stroke: var(--debt-ink); stroke-width: 2.5; }
  .tax-line { stroke: var(--tax); stroke-width: 2.5; }
  .tax-line.dashed { stroke-width: 2; stroke-dasharray: 5 4; }
  .re-line { stroke: var(--accent); stroke-width: 3; }
  .marker { stroke: var(--ink); stroke-width: 1; stroke-dasharray: 2 3; }
  .pt { position: absolute; width: 11px; height: 11px; border-radius: 50%; background: var(--ink); transform: translate(-50%, 50%); }
  .pt.tax { background: var(--tax); }
  .pt.eq-pt { background: var(--accent); }
  .val { position: absolute; font-size: .8rem; font-weight: 600; white-space: nowrap; color: var(--ink); }
  .val.eq { color: var(--accent); }
  .val.tax { color: var(--tax); }
  .build { display: flex; gap: 16px; align-items: flex-end; flex: 1 1 0; min-height: 0; }
  .stack { position: relative; width: 64px; height: 100%; min-height: 160px; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-end; border-bottom: 1px solid var(--ink); }
  .stack > div { transition: height .25s ease; }
  .shield { background: repeating-linear-gradient(135deg, var(--tax) 0 3px, var(--paper) 3px 6px); }
  .debt-piece { background: var(--debt); }
  .eq-piece { background: var(--accent); }
  .ra { position: absolute; left: -8px; right: -8px; bottom: 83.333%; border-top: 2px dashed var(--ink); }
  .ra-label { position: absolute; left: calc(100% + 10px); bottom: 83.333%; transform: translateY(50%); font-size: .78rem; font-weight: 600; white-space: nowrap; }
  .pieces { display: flex; flex-direction: column; gap: 8px; font-size: .8rem; line-height: 1.35; font-variant-numeric: tabular-nums; }
  .debt-text { color: #3a3d45; }
  .pieces strong { font-size: .95rem; }
  @media (max-width: 1000px) {
    .panels { grid-template-columns: 1fr; }
    .panel + .panel { border-left: none; border-top: 1px solid var(--rule); }
    .chart { flex: none; height: 160px; }
    .build { flex: none; height: 200px; }
  }
</style>
