<script>
  // Debt makes equity riskier: one V_D slider drives an event tree of cash flows to debt and equity
  // and three panels (returns by state, costs of capital, WACC pieces); a switch adds corporate tax.
  import LeveragePanels from './LeveragePanels.svelte';
  import { leverage, geometry, fmtNum, fmtPct, fmtSigned, DEBT_MAX, DEBT_MAX_PCT } from '../lib/leverage.js';
  import { fitToWindow } from '../lib/fit.js';

  // Opens on the Recap 4 example (debt of 50, no taxes); Recap 5 uses a 20% tax rate.
  const TAX_PCT = 20;
  let vd = 50;
  let taxOn = false;

  // Fit mode and the tree's height (branch ends meet the 44px nodes at their centres).
  let fit = false;
  let treeHeight = 236;

  $: m = leverage(vd, taxOn ? TAX_PCT / 100 : 0);
  $: g = geometry(m, TAX_PCT / 100);
  $: upMid = 10 + (22 / treeHeight) * 100;
  $: downMid = 90 - (22 / treeHeight) * 100;
</script>

<section class="lev" class:fit use:fitToWindow={on => (fit = on)}>
  <aside class="side">
    <span class="eyebrow">Capital structure</span>
    <h1>Debt makes equity riskier</h1>
    <p class="lede">Same assets, two possible futures. Debt is a fixed claim paid first; equity takes what is left.</p>
    <dl class="kpis" aria-live="polite">
      <div><dt>r<sub>E</sub></dt><dd class="eq">{fmtPct(m.rE, 1)}</dd></div>
      <div><dt>WACC</dt><dd class:tax={taxOn}>{fmtPct(m.wacc, 1)}</dd></div>
    </dl>
    <label class="slider">
      <span class="control-heading"><span>Debt raised at date 1, V<sub>D</sub></span><output>{fmtNum(vd)}</output></span>
      <span class="track">
        <span class="stop" style:left="{DEBT_MAX_PCT}%" aria-hidden="true"></span>
        <input type="range" min="0" max={DEBT_MAX} step="1" bind:value={vd} style:width="{DEBT_MAX_PCT}%" aria-describedby="lev-stop" />
      </span>
      <span class="ticks" aria-hidden="true"><span style:left="0%">0</span><span style:left="50%">50</span><span style:left="{DEBT_MAX_PCT}%">85.7</span></span>
      <span class="note" id="lev-stop">Hatched: beyond 85.7 the down state could not repay the debt.</span>
    </label>
    <div class="taxes" role="group" aria-label="Corporate tax">
      <button type="button" aria-pressed={!taxOn} on:click={() => (taxOn = false)}>No taxes</button>
      <button type="button" class="on-tax" aria-pressed={taxOn} on:click={() => (taxOn = true)}>Taxes, τ = {TAX_PCT}%</button>
    </div>
  </aside>

  <div class="main">
    <div class="tree-block">
      <h2>Two futures, one fixed claim</h2>
      <div class="tree" bind:clientHeight={treeHeight}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M25,50 C38,50 39,{upMid} 52,{upMid}" />
          <path d="M25,50 C38,50 39,{downMid} 52,{downMid}" />
        </svg>
        <span class="half" style:top="25%">½</span>
        <span class="half" style:top="66%">½</span>

        <span class="node-label" style:left="0" style:top="calc(50% - 42px)">Date 1 · worth 100</span>
        <div class="node" style:left="0" style:top="calc(50% - 22px)" style:width="25%">
          <div class="debt" style:width="{m.vd}%">{#if m.vd >= 12}{fmtNum(m.vd)}{/if}</div>
          <div class="equity">{#if m.equityToday >= 12}{fmtNum(m.equityToday)}{/if}</div>
        </div>

        <span class="node-label" style:left="52%" style:top="calc(10% - 20px)">Up ½ · worth 130</span>
        <div class="node" style:left="52%" style:top="10%" style:width="32.5%">
          <div class="debt" style:width="{g.debtUpShare}%">{#if m.debtOwed >= 12}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if m.equityUp >= 12}{fmtNum(m.equityUp)}{/if}</div>
        </div>
        <span class="ret up" style:left="calc(84.5% + 14px)" style:top="calc(10% + 6px)">{fmtSigned(m.returnUp)}</span>

        <span class="node-label" style:left="52%" style:top="calc(90% - 64px)">Down ½ · worth 90</span>
        <div class="node" style:left="52%" style:top="calc(90% - 44px)" style:width="22.5%">
          <div class="debt" style:width="{g.debtDownShare}%">{#if m.debtOwed >= 12}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if m.equityDown >= 12}{fmtNum(m.equityDown)}{/if}</div>
        </div>
        <span class="ret down" style:left="calc(74.5% + 14px)" style:top="calc(90% - 38px)">{fmtSigned(m.returnDown)}</span>

        <!-- The debt claim ends at the same place in both futures; equity's ends differ by the 40 swing. -->
        <div class="guide debt-edge" style:left="calc(52% + {g.debtEdge}%)" aria-hidden="true"></div>
        <div class="guide" style:left="84.5%" style:top="calc(10% + 44px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="guide" style:left="74.5%" style:top="calc(50% + 5px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="bracket" aria-hidden="true"></div>
        <span class="swing">40 swing</span>
      </div>
      <p class="expect">
        <span>expected to equity = ½ × {fmtNum(m.equityUp)} + ½ × {fmtNum(m.equityDown)} = <strong>{fmtNum(m.equityExpected)}</strong></span>
        <strong>r<sub>E</sub> = {fmtNum(m.equityExpected)} ÷ {fmtNum(m.equityToday)} - 1 = <span class="eq">{fmtPct(m.rE, 1)}</span></strong>
      </p>
    </div>
    <LeveragePanels {m} {g} {taxOn} taxPct={TAX_PCT} />
  </div>
</section>

<style>
  .lev { --debt: #c9ccd6; --debt-ink: #8a8e98; --tax: #0b5f73; display: grid; grid-template-columns: 340px minmax(0, 1fr); margin-top: 14px; border: 1px solid var(--rule); }
  .side { display: flex; flex-direction: column; gap: 16px; padding: 22px 24px; border-right: 1px solid var(--rule); }
  .side h1 { margin: 0; font-size: 2.3rem; font-weight: 700; line-height: 1.05; letter-spacing: -.01em; }
  .lede { margin: 0; color: var(--muted); font-size: .95rem; line-height: 1.45; }
  .kpis { display: flex; gap: 32px; margin: 0; font-variant-numeric: tabular-nums; }
  .kpis div { display: flex; flex-direction: column; gap: 2px; }
  .kpis dt { font-size: .8rem; color: var(--muted); }
  .kpis dd { margin: 0; font-size: 2.6rem; font-weight: 700; line-height: 1; color: var(--ink); }
  .kpis dd.eq, .eq { color: var(--accent); }
  .kpis dd.tax { color: var(--tax); }
  .slider { display: grid; gap: 4px; }
  .control-heading { display: flex; justify-content: space-between; align-items: baseline; color: var(--muted); font-size: .9rem; }
  .control-heading output { color: var(--accent); font-size: 1.6rem; font-weight: 700; }
  .track { position: relative; height: 26px; }
  .track input { position: absolute; left: 0; top: 0; height: 26px; margin: 0; accent-color: var(--accent); }
  .stop { position: absolute; right: 0; top: 8px; height: 10px; border-radius: 5px; background: repeating-linear-gradient(135deg, #d5d8e2 0 3px, var(--paper) 3px 7px); }
  .ticks { position: relative; height: 14px; font-size: .75rem; color: var(--muted); }
  .ticks span { position: absolute; transform: translateX(-50%); }
  .ticks span:first-child { transform: none; }
  .note { font-size: .78rem; color: var(--muted); }
  .taxes { display: flex; gap: 6px; }
  .taxes button { flex: 1; min-height: 44px; border: 1px solid var(--debt); border-radius: 8px; background: var(--paper); color: var(--ink); font: 600 .9rem var(--font-body); cursor: pointer; }
  .taxes button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--paper); }
  .taxes button.on-tax[aria-pressed='true'] { background: var(--tax); border-color: var(--tax); }
  .main { display: flex; flex-direction: column; min-width: 0; }
  .tree-block { display: flex; flex-direction: column; gap: 8px; padding: 14px 24px 12px; border-bottom: 1px solid var(--rule); }
  .tree-block h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
  .tree { position: relative; height: 236px; }
  .tree svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .tree path { fill: none; stroke: var(--debt-ink); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .half { position: absolute; left: 37%; font-size: .8rem; color: var(--muted); }
  .node-label { position: absolute; font-size: .75rem; color: var(--muted); white-space: nowrap; }
  .node { position: absolute; height: 44px; display: flex; font-size: .8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .node div { display: flex; align-items: center; justify-content: center; overflow: hidden; transition: width .25s ease; }
  .debt { background: var(--debt); color: var(--ink); }
  .equity { flex-grow: 1; background: var(--accent); color: var(--paper); }
  .ret { position: absolute; font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ret.up { color: var(--accent); }
  .ret.down { color: var(--reject); }
  .guide { position: absolute; border-left: 1px dashed var(--muted); }
  .guide.debt-edge { top: calc(10% - 6px); height: calc(80% + 12px); border-left: 1.5px dashed var(--debt-ink); }
  .bracket { position: absolute; left: 74.5%; width: 10%; top: calc(50% - 5px); height: 10px; box-sizing: border-box; border: 1.5px solid var(--ink); border-top: 0; }
  .swing { position: absolute; left: 74.5%; width: 10%; top: calc(50% + 9px); text-align: center; font-size: .75rem; font-weight: 600; }
  .expect { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 0; font-size: .95rem; font-variant-numeric: tabular-nums; color: var(--muted); }
  .expect strong { color: var(--ink); }
  /* Fit mode: the tree takes the spare height above the three panels. */
  .fit .tree-block { flex: 1.25 1 0; min-height: 0; }
  .fit .tree { flex: 1 1 0; height: auto; min-height: 170px; }
  @media (max-width: 1000px) {
    .lev { grid-template-columns: 1fr; }
    .side { border-right: none; border-bottom: 1px solid var(--rule); }
    .ret { font-size: 1.2rem; }
  }
</style>
