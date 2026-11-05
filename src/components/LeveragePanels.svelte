<script>
  // Three live panels under the event tree: returns in each state, costs of capital against V_D,
  // and the WACC decomposed into its weighted pieces. Chart positions are percent of each box.
  import Tex from './Tex.svelte';
  import { fmtPct, fmtSigned, RATE_DEBT } from '../lib/leverage.js';
  export let m;
  export let g;
  export let s;
  export let taxOn;
  export let taxPct;

  // KaTeX is for notation only; numbers stay in the page font. String.raw keeps backslashes.
  const tex = String.raw;
  const TEX_RA = tex`r_A`;
  const TEX_RD = tex`r_D`;
  const TEX_RE = tex`r_E`;
  const TEX_VD = tex`V_D`;
  const TEX_RD_TAX = tex`r_D(1-\tau)`;

  // Return panel: the example's fixed assets row and the shared grid ticks.
  $: A_DOWN = s.retDown;
  $: A_UP = s.retUp;
  $: RET_TICKS = s.retTicks.map(v => ({ v, t: v === 0 ? '0' : `${v > 0 ? '+' : ''}${v}%` }));

  // Costs panel: the two flat lines; value labels flip left once r_E gets steep.
  $: Y_WACC = 100 - s.ratePos(s.rA);
  $: Y_RD = 100 - s.ratePos(RATE_DEBT);
  $: side = g.x <= 55 ? '14px' : 'calc(-100% - 14px)';
  $: otherSide = g.x <= 55 ? 'calc(-100% - 14px)' : '14px';

  // WACC panel: the bar's r_A marker; one line per piece follows in the bar's left-to-right order.
  $: RA_POS = s.stackPos(s.rA);
</script>

<div class="panels">
  <div class="panel">
    <h3>Return in each state</h3>
    <div class="plot">
      <div class="row">
        <div class="head"><span><Tex tex={TEX_RA} /> Assets</span><span class="vals"><span><b>{fmtSigned(A_UP)}</b> <small>in Good state</small></span><span><b class="dn">{fmtSigned(A_DOWN)}</b> <small>in Bad state</small></span></span></div>
        <div class="lane">
          {#each RET_TICKS as k}<i class="gl" class:zero={k.v === 0} style:left="{s.returnPos(k.v / 100)}%"></i>{/each}
          <div class="band assets" style:left="{s.returnPos(A_DOWN)}%" style:width="{s.returnPos(A_UP) - s.returnPos(A_DOWN)}%"></div>
          <div class="dot ring" style:left="{s.returnPos(s.rA)}%"></div>
          <span class="mean" style:left="{s.returnPos(s.rA)}%">Mean {fmtPct(s.rA, 1)}</span>
        </div>
      </div>
      <div class="row">
        <div class="head"><span><Tex tex={TEX_RD} /> Debt</span><span class="vals"><span><b>{fmtSigned(RATE_DEBT)}</b> <small>in Good state</small></span><span><b>{fmtSigned(RATE_DEBT)}</b> <small>in Bad state</small></span></span></div>
        <div class="lane">
          {#each RET_TICKS as k}<i class="gl" class:zero={k.v === 0} style:left="{s.returnPos(k.v / 100)}%"></i>{/each}
          <div class="dot ring" style:left="{s.returnPos(RATE_DEBT)}%"></div>
          <span class="mean" style:left="{s.returnPos(RATE_DEBT)}%">Mean {fmtPct(RATE_DEBT, 1)}</span>
        </div>
      </div>
      <div class="row">
        <div class="head eq"><span><Tex tex={TEX_RE} /> Equity</span><span class="vals"><span><b>{fmtSigned(m.returnUp)}</b> <small>in Good state</small></span><span><b class="dn">{fmtSigned(m.returnDown)}</b> <small>in Bad state</small></span></span></div>
        <div class="lane">
          {#each RET_TICKS as k}<i class="gl" class:zero={k.v === 0} style:left="{s.returnPos(k.v / 100)}%"></i>{/each}
          <div class="band equity" style:left="{g.retDown}%" style:width="{g.retUp - g.retDown}%"></div>
          <div class="dot ring eq-ring" style:left="{g.retExp}%"></div>
          <span class="mean eq" style:left="{g.retExp}%">Mean {fmtPct(m.rE, 1)}</span>
        </div>
      </div>
      <div class="axis" aria-hidden="true">
        {#each RET_TICKS as k, i}<span class:first={i === 0} class:last={i === RET_TICKS.length - 1} style:left="{s.returnPos(k.v / 100)}%">{k.t}</span>{/each}
      </div>
    </div>
  </div>

  <div class="panel">
    <h3>Costs of capital</h3>
    <div class="legend">
      <span class="eq"><i style:background="var(--accent)"></i><Tex tex={TEX_RE} /></span>
      <span class="dbt"><i style:background="var(--debt-ink)"></i><Tex tex={TEX_RD} /></span>
      <span class:tax={taxOn}><i style:background={taxOn ? 'var(--tax)' : 'var(--ink)'}></i>WACC</span>
      {#if taxOn}<span class="dbt"><i class="dash"></i><Tex tex={TEX_RD_TAX} /></span>{/if}
    </div>
    <div class="chart">
      <div class="stopzone" style:left="{s.debtMaxPct}%"></div>
      {#each s.rateTicks as t}
        {#if t > 0}<div class="grid" style:bottom="{s.ratePos(t / 100)}%"></div>{/if}
        <div class="ylab" style:bottom="{s.ratePos(t / 100)}%">{t}%</div>
      {/each}
      {#each s.xTicks as t}<div class="xlab" style:left="{(t / s.today) * 100}%">{t}</div>{/each}
      <div class="xlab xtitle" style:left="100%"><Tex tex={TEX_VD} /></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={s.debtMaxPct} y1={Y_WACC} y2={Y_WACC} class="wacc-line" class:faint={taxOn} />
        <line x1="0" x2={s.debtMaxPct} y1={Y_RD} y2={Y_RD} class="rd-line" />
        {#if taxOn}
          <line x1="0" x2={s.debtMaxPct} y1={g.yRDTax} y2={g.yRDTax} class="rd-line dashed" />
          <line x1="0" x2={s.debtMaxPct} y1={Y_WACC} y2={g.yWaccTaxEnd} class="tax-line" />
        {/if}
        <path d={g.rEPath} class="re-line" />
        <line x1={g.x} x2={g.x} y1="0" y2="100" class="marker" />
      </svg>
      <div class="pt" class:tax={taxOn} style:left="{g.x}%" style:bottom="{g.rateW}%"></div>
      <div class="pt eq-pt" style:left="{g.x}%" style:bottom="{g.rateE}%"></div>
      <div class="pt rd-pt" style:left="{g.x}%" style:bottom="{s.ratePos(RATE_DEBT)}%"></div>
      <!-- r_E is never below WACC: its label sits above its dot and WACC's sits just under its own line. -->
      <span class="val eq" style:left="{g.x}%" style:bottom="calc({g.rateE}% + 12px)" style:transform="translateX({side})">{fmtPct(m.rE, 1)}</span>
      <span class="val" class:tax={taxOn} style:left="{g.x}%" style:bottom="calc({g.rateW}% - 5px)" style:transform="translate({side}, 100%)">{fmtPct(m.wacc, 1)}</span>
      <!-- r_D's label sits above its line on the other side of the marker, clear of the dashed after-tax line. -->
      <span class="val rd" style:left="{g.x}%" style:bottom="calc({s.ratePos(RATE_DEBT)}% + 5px)" style:transform="translateX({otherSide})">{fmtPct(RATE_DEBT, 1)}</span>
    </div>
  </div>

  <div class="panel">
    <h3>WACC decomposed</h3>
    <div class="barwrap">
      <span class="ra-label" style:left="{RA_POS}%"><Tex tex={TEX_RA} /> = {fmtPct(s.rA, 0)}</span>
      <div class="bar">
        <div class="seg eq-bg" style:width="{g.stEq}%">{#if g.stEq >= 10}<Tex tex={TEX_RE} />{/if}</div>
        <div class="seg debt-bg" style:width="{g.stDebt}%">{#if g.stDebt >= 10}<Tex tex={TEX_RD} />{/if}</div>
        <div class="seg shield-bg" style:width="{g.stShield}%"></div>
        <div class="ra" style:left="{RA_POS}%" aria-hidden="true"></div>
      </div>
    </div>
    <div class="lines">
      <i class="sw eq-bg"></i><span class="lbl eq">Cost of equity</span><span class="eq">{m.wE.toFixed(2)} × {fmtPct(m.rE, 2)} = {fmtPct(m.equityPiece, 2)}</span>
      <i class="sw debt-bg"></i><span class="lbl dbt">Cost of debt</span><span class="dbt">{m.wD.toFixed(2)} × {fmtPct(m.rDCost, 1)} = {fmtPct(m.debtPiece, 2)}</span>
      {#if taxOn}<i class="sw shield-bg"></i><span class="lbl tax">Tax saved</span><span class="tax">{m.wD.toFixed(2)} × {fmtPct(RATE_DEBT, 0)} × {taxPct}% = {fmtPct(m.shieldPiece, 2)}</span>{/if}
      <span class="rule" aria-hidden="true"></span>
      <span></span><span class="lbl total" class:tax={taxOn}>WACC</span><span class="total" class:tax={taxOn}>{fmtPct(m.equityPiece, 2)} + {fmtPct(m.debtPiece, 2)} = {fmtPct(m.wacc, 2)}</span>
    </div>
  </div>
</div>

<style>
  .panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); flex: 1 1 0; min-height: 250px; }
  .panel { --fs: clamp(12px, 4.3cqi, 19px); --fs-s: clamp(11px, 3.4cqi, 15px); container-type: inline-size; display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 0; padding: 10px 16px; font-variant-numeric: tabular-nums; }
  .panel + .panel { border-left: 1px solid var(--rule); }
  .panel :global(.katex) { font-size: 1.05em; }
  h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
  .eq { color: var(--accent); }
  .tax { color: var(--tax); }
  .dbt { color: #3a3d45; }

  /* Return in each state */
  .plot { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; gap: 8px; --lane: 22px; }
  .row { flex: 1 1 0; display: flex; flex-direction: column; }
  .row + .row { padding-top: 6px; border-top: 1px solid var(--rule); }
  .head { display: flex; justify-content: space-between; align-items: baseline; white-space: nowrap; font-size: var(--fs); font-weight: 700; line-height: 1.25; }
  .vals { display: flex; flex-direction: column; align-items: flex-end; font-weight: 400; color: var(--muted); }
  .vals b { font-weight: 700; color: var(--ink); }
  .vals small { font-size: var(--fs-s); }
  .head.eq .vals b:not(.dn) { color: var(--accent); }
  .vals b.dn { color: var(--reject); }
  .lane { position: relative; flex: 1 1 auto; min-height: var(--lane); }
  .gl { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--rule); }
  .gl.zero { border-left-color: var(--ink); }
  .band { position: absolute; top: calc(50% - 1px); height: 2px; background: var(--ink); transition: left .3s cubic-bezier(.34, 1.56, .64, 1), width .3s cubic-bezier(.34, 1.56, .64, 1); }
  /* End stems ride on the bar so they move with it: Bad end in red, Good end in the bar's colour. */
  .band::before, .band::after { content: ''; position: absolute; top: -11px; width: 3px; height: 24px; }
  .band::before { left: -1.5px; background: var(--reject); }
  .band::after { right: -1.5px; }
  .band.assets::after { background: var(--muted); }
  .band.equity::after { background: var(--accent); }
  .mean { position: absolute; bottom: calc(50% + 15px); transform: translateX(-50%); padding: 0 3px; background: var(--paper); font-size: var(--fs-s); font-weight: 700; color: var(--ink); white-space: nowrap; }
  .mean.eq { color: var(--accent); }
  .dot { position: absolute; top: calc(50% - 8px); width: 16px; height: 16px; margin-left: -8px; border-radius: 50%; box-sizing: border-box; }
  .dot.ring { background: var(--paper); border: 2.5px solid var(--ink); }
  .dot.eq-ring { border-color: var(--accent); }
  .axis { position: relative; height: 1.3em; font-size: var(--fs-s); color: var(--muted); }
  .axis span { position: absolute; transform: translateX(-50%); }
  .axis .first { transform: none; }
  .axis .last { transform: translateX(-100%); }

  /* Costs of capital */
  .legend { display: flex; gap: 4px 16px; font-size: var(--fs); font-weight: 600; white-space: nowrap; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend i { display: inline-block; width: 22px; height: 4px; }
  .legend i.dash { background: repeating-linear-gradient(90deg, var(--debt-ink) 0 5px, transparent 5px 8px); }
  .chart { position: relative; flex: 1 1 0; min-height: 110px; margin: 22px 8px 26px 38px; border-left: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
  .stopzone { position: absolute; right: 0; top: 0; bottom: 0; background: repeating-linear-gradient(135deg, var(--rule) 0 4px, transparent 4px 8px); }
  .grid { position: absolute; left: 0; right: 0; border-top: 1px solid var(--rule); }
  .ylab { position: absolute; right: calc(100% + 5px); transform: translateY(50%); font-size: var(--fs-s); color: var(--muted); }
  .xlab { position: absolute; top: calc(100% + 4px); transform: translateX(-50%); font-size: var(--fs-s); color: var(--muted); }
  .xtitle { transform: translateX(-100%); color: var(--ink); }
  .chart svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .chart line, .chart path { fill: none; vector-effect: non-scaling-stroke; }
  .wacc-line { stroke: var(--ink); stroke-width: 2; }
  .wacc-line.faint { opacity: .3; }
  .rd-line { stroke: var(--debt-ink); stroke-width: 2; }
  .tax-line { stroke: var(--tax); stroke-width: 2; }
  .rd-line.dashed { stroke-width: 1.5; stroke-dasharray: 5 4; }
  .re-line { stroke: var(--accent); stroke-width: 2; }
  .marker { stroke: var(--ink); stroke-width: 1; stroke-dasharray: 2 3; }
  .pt { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: var(--ink); transform: translate(-50%, 50%); }
  .pt.tax { background: var(--tax); }
  .pt.eq-pt { background: var(--accent); }
  .pt.rd-pt { background: var(--debt-ink); }
  .val { position: absolute; font-size: calc(var(--fs) * 1.05); line-height: 18px; font-weight: 700; white-space: nowrap; color: var(--ink); text-shadow: 0 0 3px var(--paper), 0 0 3px var(--paper), 0 0 3px var(--paper); }
  .val.eq { color: var(--accent); }
  .val.tax { color: var(--tax); }
  .val.rd { color: var(--debt-ink); }

  /* WACC decomposed */
  .barwrap { position: relative; padding-top: 1.6em; }
  .ra-label { position: absolute; top: 0; transform: translateX(-50%); font-size: var(--fs-s); font-weight: 700; white-space: nowrap; }
  .bar { position: relative; display: flex; height: 36px; border-bottom: 1px solid var(--ink); }
  .seg { height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: var(--fs); color: var(--ink); transition: width .25s ease; }
  .seg.eq-bg { color: var(--paper); }
  .eq-bg { background: var(--accent); }
  .debt-bg { background: var(--debt); }
  .shield-bg { background: repeating-linear-gradient(135deg, var(--tax) 0 3px, var(--paper) 3px 6px); }
  .ra { position: absolute; top: -6px; bottom: -6px; border-left: 2px dashed var(--ink); }
  .lines { flex: 1 1 0; display: grid; grid-template-columns: auto auto auto; justify-content: start; align-content: center; align-items: baseline; row-gap: .8em; font-size: var(--fs); font-weight: 700; white-space: nowrap; }
  .lbl { padding-right: .6em; }
  .sw { width: 1em; height: 1em; margin-right: .5em; border: 1px solid var(--ink); box-sizing: border-box; }
  .rule { grid-column: 1 / -1; height: 0; margin: -.3em 0 -.3em; border-top: 1px solid var(--rule); }
  .total { color: var(--ink); }
  .total.tax { color: var(--tax); }

  @media (min-height: 800px) { .plot { --lane: 30px; } }
  @media (max-width: 1000px) {
    .panels { grid-template-columns: 1fr; }
    .panel + .panel { border-left: none; border-top: 1px solid var(--rule); }
    .plot { gap: 10px; }
    .chart { flex: none; height: 180px; }
    .lines { gap: 8px 0; }
  }
  /* Below PC width the panels take their natural height (the flex sizing above is for fit mode). */
  @media (max-width: 999px) {
    .panels { flex: none; min-height: 0; }
    .plot, .row, .lines { flex: none; }
    .lane { flex: none; height: 60px; }
    .legend { flex-wrap: wrap; }
  }
  /* Tablets: returns and costs side by side, the WACC panel full width underneath. */
  @media (min-width: 561px) and (max-width: 999px) {
    .panels { grid-template-columns: 1fr 1fr; }
    .panel + .panel { border-left: 1px solid var(--rule); border-top: none; }
    .panel:nth-child(3) { grid-column: 1 / -1; border-left: none; border-top: 1px solid var(--rule); }
  }
  @media (max-width: 560px) {
    .panel { padding: 14px; }
    .bar { height: 40px; }
    .lines { font-size: min(var(--fs), 14px); }
  }
</style>
