<script>
  // Debt makes equity riskier: one V_D slider drives an event tree of cash flows to debt and equity
  // and three panels (returns by state, costs of capital, WACC pieces); a switch adds corporate tax.
  import LeveragePanels from './LeveragePanels.svelte';
  import Tex from './Tex.svelte';
  import { leverage, geometry, scenario, fmtNum, fmtPct, fmtSigned, SCENARIOS } from '../lib/leverage.js';
  import { fitToWindow } from '../lib/fit.js';

  // Opens on the Recap 4 example (debt of 50, no taxes); Recap 5 uses a 20% tax rate.
  const TAX_PCT = 20;
  let key = 'recap';
  let vd = SCENARIOS.recap.vdStart;
  let taxOn = false;

  // Loading an example starts at its own debt level with no taxes (PS4 Question 1 assumes none).
  function load(k) {
    key = k;
    vd = SCENARIOS[k].vdStart;
    taxOn = false;
  }

  // Fit mode and the tree's height (branch ends meet the 44px nodes at their centres).
  let fit = false;
  let treeHeight = 236;

  $: s = scenario(key);
  $: m = leverage(vd, taxOn ? TAX_PCT / 100 : 0, s);
  $: g = geometry(m, TAX_PCT / 100, s);

  // Numbers inside the tree's bars hide below 12% of the date-1 value, where they no longer fit.
  $: minLabel = 0.12 * s.today;
  $: upMid = 10 + (22 / treeHeight) * 100;
  $: downMid = 90 - (22 / treeHeight) * 100;

  // KaTeX is for notation only; numbers stay in the page font. String.raw keeps the backslash.
  const TEX_TAU = String.raw`\tau`;
</script>

<section class="lev" class:fit use:fitToWindow={on => (fit = on)}>
  <aside class="side">
    <span class="eyebrow">Capital structure</span>
    <h1>Modigliani Miller</h1>
    <p class="lede">Same assets, two possible futures. Debt is a fixed claim paid first; equity takes what is left.</p>
    <div class="examples" role="group" aria-label="Example">
      {#each Object.entries(SCENARIOS) as [k, sc]}
        <button type="button" aria-pressed={key === k} on:click={() => load(k)}>{sc.label}</button>
      {/each}
    </div>
    <dl class="kpis" aria-live="polite">
      <div><dt><Tex tex="r_E" /></dt><dd class="eq">{fmtPct(m.rE, 1)}</dd></div>
      <div><dt>WACC</dt><dd class:tax={taxOn}>{fmtPct(m.wacc, 1)}</dd></div>
    </dl>
    <label class="slider">
      <span class="control-heading"><span>Debt raised at date 1, <Tex tex="V_D" /></span><output>{fmtNum(vd)}</output></span>
      <span class="track">
        <span class="stop" style:left="{s.debtMaxPct}%" aria-hidden="true"></span>
        <!-- Rebuilt per example so the new max and step apply before the new value. -->
        {#key key}<input type="range" min="0" max={s.debtMax} step={s.today / 100} bind:value={vd} style:width="{s.debtMaxPct}%" aria-describedby="lev-stop" />{/key}
      </span>
      <span class="ticks" aria-hidden="true"><span style:left="0%">0</span><span style:left="50%">{fmtNum(s.today / 2)}</span><span style:left="{s.debtMaxPct}%">{s.debtMax.toFixed(1)}</span></span>
      <span class="note" id="lev-stop">Hatched: beyond {s.debtMax.toFixed(1)} the Bad state could not repay the debt.</span>
    </label>
    <div class="taxes" role="group" aria-label="Corporate tax">
      <button type="button" aria-pressed={!taxOn} on:click={() => (taxOn = false)}>No taxes</button>
      <button type="button" class="on-tax" aria-pressed={taxOn} on:click={() => (taxOn = true)}>Taxes, <Tex tex={TEX_TAU} /> = {TAX_PCT}%</button>
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

        <span class="node-label" style:left="0" style:top="calc(50% - 30px)">Date 1 · Assets worth {s.today}</span>
        <div class="node" style:left="0" style:top="calc(50% - 22px)" style:width="{s.nodeToday}%">
          <div class="debt" style:width="{(m.vd / s.today) * 100}%">{#if m.vd >= minLabel}{fmtNum(m.vd)}{/if}</div>
          <div class="equity">{#if m.equityToday >= minLabel}{fmtNum(m.equityToday)}{/if}</div>
        </div>
        <!-- Colour key under the date-1 bar, each word centred on its own part. -->
        <div class="node-key" style:left="0" style:top="calc(50% + 28px)" style:width="{s.nodeToday}%">
          <span class="dk" style:width="{(m.vd / s.today) * 100}%">{#if m.vd >= minLabel}Debt{/if}</span>
          <span class="eq">{#if m.equityToday >= minLabel}Equity{/if}</span>
        </div>

        <span class="node-label" style:left="52%" style:top="calc(10% - 8px)">Good ½ · Assets worth {s.up}</span>
        <div class="node" style:left="52%" style:top="10%" style:width="{s.nodeUp}%">
          <div class="debt" style:width="{g.debtUpShare}%">{#if m.debtOwed >= minLabel}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if m.equityUp >= minLabel}{fmtNum(m.equityUp)}{/if}</div>
        </div>
        <span class="ret up" style:left="calc({52 + s.nodeUp}% + 14px)" style:top="calc(10% + 6px)">{fmtSigned(m.returnUp)}</span>

        <span class="node-label" style:left="52%" style:top="calc(90% - 52px)">Bad ½ · Assets worth {s.down}</span>
        <div class="node" style:left="52%" style:top="calc(90% - 44px)" style:width="{s.nodeDown}%">
          <div class="debt" style:width="{g.debtDownShare}%">{#if m.debtOwed >= minLabel}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if m.equityDown >= minLabel}{fmtNum(m.equityDown)}{/if}</div>
        </div>
        <span class="ret down" style:left="calc({52 + s.nodeDown}% + 14px)" style:top="calc(90% - 38px)">{fmtSigned(m.returnDown)}</span>

        <!-- The debt claim ends at the same place in both futures; equity's ends differ by the swing in assets. -->
        <div class="guide debt-edge" style:left="calc(52% + {g.debtEdge}%)" aria-hidden="true"></div>
        <div class="guide" style:left="{52 + s.nodeUp}%" style:top="calc(10% + 44px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="guide" style:left="{52 + s.nodeDown}%" style:top="calc(50% + 5px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="bracket" style:left="{52 + s.nodeDown}%" style:width="{s.nodeUp - s.nodeDown}%" aria-hidden="true"></div>
        <span class="swing" style:left="{52 + s.nodeDown}%" style:width="{s.nodeUp - s.nodeDown}%">{fmtNum(s.up - s.down)} swing</span>
      </div>
      <p class="expect">
        <span>Expected to equity = ½ × {fmtNum(m.equityUp)} + ½ × {fmtNum(m.equityDown)} = <strong>{fmtNum(m.equityExpected)}</strong></span>
        <strong><Tex tex="r_E" /> = {fmtNum(m.equityExpected)} ÷ {fmtNum(m.equityToday)} - 1 = <span class="eq">{fmtPct(m.rE, 1)}</span></strong>
      </p>
    </div>
    <LeveragePanels {m} {g} {s} {taxOn} taxPct={TAX_PCT} />
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
  .taxes, .examples { display: flex; gap: 6px; }
  .taxes button, .examples button { flex: 1; min-height: 44px; border: 1px solid var(--debt); border-radius: 8px; background: var(--paper); color: var(--ink); font: 600 .9rem var(--font-body); cursor: pointer; }
  .taxes button[aria-pressed='true'], .examples button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--paper); }
  .taxes button.on-tax[aria-pressed='true'] { background: var(--tax); border-color: var(--tax); }
  .main { display: flex; flex-direction: column; min-width: 0; }
  .tree-block { display: flex; flex-direction: column; gap: 8px; padding: 14px 24px 12px; border-bottom: 1px solid var(--rule); }
  .tree-block h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
  .tree { position: relative; height: 236px; }
  .tree svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .tree path { fill: none; stroke: var(--debt-ink); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .half { position: absolute; left: 37%; font-size: 1.05rem; font-weight: 700; color: var(--ink); }
  .node-label { position: absolute; transform: translateY(-100%); font-size: .95rem; font-weight: 700; color: var(--ink); white-space: nowrap; }
  .node { position: absolute; height: 44px; display: flex; font-size: .8rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .node div { display: flex; align-items: center; justify-content: center; overflow: hidden; transition: width .25s ease; }
  .node-key { position: absolute; display: flex; font-size: .95rem; font-weight: 700; }
  .node-key span { text-align: center; white-space: nowrap; transition: width .25s ease; }
  .node-key .dk { color: var(--debt-ink); }
  .node-key .eq { flex-grow: 1; }
  .debt { background: var(--debt); color: var(--ink); }
  .equity { flex-grow: 1; background: var(--accent); color: var(--paper); }
  .ret { position: absolute; font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ret.up { color: var(--accent); }
  .ret.down { color: var(--reject); }
  .guide { position: absolute; border-left: 1px dashed var(--muted); }
  .guide.debt-edge { top: calc(10% - 6px); height: calc(80% + 12px); border-left: 1.5px dashed var(--debt-ink); }
  .bracket { position: absolute; top: calc(50% - 5px); height: 10px; box-sizing: border-box; border: 1.5px solid var(--ink); border-top: 0; }
  .swing { position: absolute; top: calc(50% + 9px); text-align: center; font-size: .75rem; font-weight: 600; }
  .expect { display: flex; flex-wrap: wrap; gap: 4px 28px; margin: 0; font-size: .95rem; font-variant-numeric: tabular-nums; color: var(--muted); }
  .expect strong { color: var(--ink); }
  /* Fit mode: the tree takes the spare height above the three panels. */
  .fit .tree-block { flex: 1 1 0; min-height: 0; }
  .fit .tree { flex: 1 1 0; height: auto; min-height: 150px; }
  .fit .main > :global(.panels) { flex-grow: 1.45; min-height: 270px; }
  @media (max-width: 1000px) {
    .lev { grid-template-columns: 1fr; }
    .side { border-right: none; border-bottom: 1px solid var(--rule); }
    .ret { font-size: 1.2rem; }
  }
</style>
