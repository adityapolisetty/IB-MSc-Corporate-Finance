<script>
  // Debt makes equity riskier: one V_D slider drives an event tree of cash flows to debt and equity
  // and three panels (returns by state, costs of capital, WACC pieces); a switch adds corporate tax.
  import LeveragePanels from './LeveragePanels.svelte';
  import Tex from './Tex.svelte';
  import { leverage, geometry, scenario, fmtNum, fmtPct, fmtSigned, SCENARIOS } from '../lib/leverage.js';
  import { fitToWindow } from '../lib/fit.js';
  import { withBase } from '../lib/base.js';

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
  let nodeW = 225;

  // The QR code opens full screen when clicked, so a projected page can be scanned from the back.
  let qrBig = false;

  $: s = scenario(key);
  $: m = leverage(vd, taxOn ? TAX_PCT / 100 : 0, s);
  $: g = geometry(m, TAX_PCT / 100, s);

  // Numbers inside the tree's bars hide below 12% of the date-1 value, where they no longer fit.
  $: minLabel = 0.12 * s.today;
  // On a phone the bars are narrow, so a number also needs 18px of bar; nodeW is the date-1 bar's width in px.
  $: fits = v => v >= minLabel && (v / s.today) * nodeW >= 18;
  $: upMid = 10 + (22 / treeHeight) * 100;
  $: downMid = 90 - (22 / treeHeight) * 100;

  // KaTeX is for notation only; numbers stay in the page font. String.raw keeps the backslash.
  const TEX_TAU = String.raw`\tau`;
</script>

<section class="lev" class:fit use:fitToWindow={on => (fit = on)}>
  <aside class="side">
    <span class="eyebrow">Capital structure</span>
    <h1>Modigliani-Miller</h1>
    <p class="lede">Same assets, two possible futures. Debt is a fixed claim paid first; equity takes what is left.</p>
    <div class="examples" role="group" aria-label="Example">
      {#each Object.entries(SCENARIOS) as [k, sc]}
        <button type="button" aria-pressed={key === k} on:click={() => load(k)}>{sc.label}</button>
      {/each}
    </div>
    <!-- Readouts and slider; on a phone this block stays pinned to the top of the screen. -->
    <div class="ctl">
    <dl class="kpis" aria-live="polite">
      <div><dt><Tex tex="r_E" /></dt><dd class="eq">{fmtPct(m.rE, 1)}</dd></div>
      <div><dt>WACC</dt><dd class:tax={taxOn}>{fmtPct(m.wacc, 1)}</dd></div>
    </dl>
    <label class="slider">
      <span class="control-heading"><span>Debt raised at date 1, <Tex tex="V_D" /></span><output>{fmtNum(vd)}</output></span>
      <span class="track">
        <span class="stop" style:left="{s.debtMaxPct}%" aria-hidden="true"></span>
        <!-- Rebuilt per example so the new max and step apply before the new value. -->
        {#key key}<input type="range" min="0" max={s.debtMax} step={s.today / 100} bind:value={vd} style:width="{s.debtMaxPct}%" style:--fill="{(vd / s.debtMax) * 100}%" aria-describedby="lev-stop" />{/key}
      </span>
      <span class="ticks" aria-hidden="true"><span style:left="0%">0</span><span style:left="50%">{fmtNum(s.today / 2)}</span><span style:left="{s.debtMaxPct}%">{s.debtMax.toFixed(1)}</span></span>
      <span class="note" id="lev-stop">Hatched: beyond {s.debtMax.toFixed(1)} the Bad state could not repay the debt.</span>
    </label>
    </div>
    <!-- Phone only: the note moves out of the pinned block so the block stays short. -->
    <p class="note note-ph">Hatched: beyond {s.debtMax.toFixed(1)} the Bad state could not repay the debt.</p>
    {#if key !== 'ps4'}
      <div class="taxes" role="group" aria-label="Corporate tax">
        <button type="button" aria-pressed={!taxOn} on:click={() => (taxOn = false)}>No taxes</button>
        <button type="button" class="on-tax" aria-pressed={taxOn} on:click={() => (taxOn = true)}>Taxes, <Tex tex={TEX_TAU} /> = {TAX_PCT}%</button>
      </div>
    {/if}
    <!-- PC only: students scan this off the projected page; a click shows it full screen. -->
    <div class="qr-slot">
      <button type="button" class="qr" on:click={() => (qrBig = true)} aria-label="Show the QR code full screen">
        <img src={withBase('leverage-qr.svg')} alt="" width="84" height="84" />
        <span>Scan to open this page on your phone. Click to enlarge.</span>
      </button>
    </div>
  </aside>

  <div class="main">
    <div class="tree-block">
      <!-- PC: "Date 2" shares the heading's baseline, starting where the date-2 bars start (52%). -->
      <div class="tree-head">
        <h2>Two potential futures, one fixed claim</h2>
        <!-- "Date 2" spans the up bar plus the 14px gap, so "Return to equity" starts over the returns column. -->
        <span class="date2" style:flex="0 0 calc({s.nodeUp}% + 14px)">Date 2</span>
        <span class="date2 rhead">Return to equity</span>
      </div>
      <!-- Positions are percent of the tree: date-2 bars start at --x0 and widths scale by --f (52% and 1 on PC). -->
      <div class="tree" bind:clientHeight={treeHeight}>
        <svg class="pc" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M25,50 C38,50 39,{upMid} 52,{upMid}" />
          <path d="M25,50 C38,50 39,{downMid} 52,{downMid}" />
        </svg>
        <!-- Narrow screens: branches from the 26% bar end to the date-2 bars at 40% (matches --f and --x0 there). -->
        <svg class="ph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M26,50 C33,50 33,{upMid} 40,{upMid}" />
          <path d="M26,50 C33,50 33,{downMid} 40,{downMid}" />
        </svg>
        <!-- Each arm label ends at x = 37%, where the branches cross about 37% and 63% of the height: Good above, Bad below. -->
        <span class="half hi">Good ½</span>
        <span class="half lo">Bad ½</span>

        <span class="node-label d1" style:left="0" style:top="calc(50% - 30px)">Date 1 <span class="sep">·</span> Assets worth {s.today}</span>
        <div class="node" bind:clientWidth={nodeW} style:left="0" style:top="calc(50% - 22px)" style:width="calc({s.nodeToday}% * var(--f))">
          <div class="debt" style:width="{(m.vd / s.today) * 100}%">{#if fits(m.vd)}{fmtNum(m.vd)}{/if}</div>
          <div class="equity">{#if fits(m.equityToday)}{fmtNum(m.equityToday)}{/if}</div>
        </div>
        <!-- Colour key under the date-1 bar, each word centred on its own part. -->
        <div class="node-key" style:left="0" style:top="calc(50% + 28px)" style:width="calc({s.nodeToday}% * var(--f))">
          <span class="dk" style:width="{(m.vd / s.today) * 100}%">{#if m.vd >= minLabel}Debt{/if}</span>
          <span class="eq">{#if m.equityToday >= minLabel}Equity{/if}</span>
        </div>

        <span class="node-label" style:left="var(--x0)" style:top="calc(10% - 8px)"><span class="d2">Date 2</span>Assets worth {s.up}</span>
        <div class="node" style:left="var(--x0)" style:top="10%" style:width="calc({s.nodeUp}% * var(--f))">
          <div class="debt" style:width="{g.debtUpShare}%">{#if fits(m.debtOwed)}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if fits(m.equityUp)}{fmtNum(m.equityUp)}{/if}</div>
        </div>
        <!-- Narrow screens: the returns column gets its own heading inside the tree. -->
        <span class="node-label rh" style:left="calc(var(--x0) + {s.nodeUp}% * var(--f) + var(--gap))" style:top="calc(10% - 8px)">Return to equity</span>
        <span class="ret up" style:left="calc(var(--x0) + {s.nodeUp}% * var(--f) + var(--gap))" style:top="calc(10% + 6px)">{fmtSigned(m.returnUp)}</span>

        <span class="node-label bad" style:left="var(--x0)">Assets worth {s.down}</span>
        <div class="node" style:left="var(--x0)" style:top="calc(90% - 44px)" style:width="calc({s.nodeDown}% * var(--f))">
          <div class="debt" style:width="{g.debtDownShare}%">{#if fits(m.debtOwed)}{fmtNum(m.debtOwed)}{/if}</div>
          <div class="equity">{#if fits(m.equityDown)}{fmtNum(m.equityDown)}{/if}</div>
        </div>
        <span class="ret down" style:left="calc(var(--x0) + {s.nodeUp}% * var(--f) + var(--gap))" style:top="calc(90% - 38px)">{fmtSigned(m.returnDown)}</span>

        <!-- The debt claim ends at the same place in both futures; equity's ends differ by the swing in assets. -->
        <div class="guide debt-edge" style:left="calc(var(--x0) + {g.debtEdge}% * var(--f))" aria-hidden="true"></div>
        <div class="guide" style:left="calc(var(--x0) + {s.nodeUp}% * var(--f))" style:top="calc(10% + 44px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="guide" style:left="calc(var(--x0) + {s.nodeDown}% * var(--f))" style:top="calc(50% + 5px)" style:height="calc(40% - 49px)" aria-hidden="true"></div>
        <div class="bracket" style:left="calc(var(--x0) + {s.nodeDown}% * var(--f))" style:width="calc({s.nodeUp - s.nodeDown}% * var(--f))" aria-hidden="true"></div>
        <span class="swing" style:left="calc(var(--x0) + {s.nodeDown}% * var(--f))" style:width="calc({s.nodeUp - s.nodeDown}% * var(--f))">{fmtNum(s.up - s.down)} swing</span>
      </div>
      <p class="expect">
        <span>Payoff to equity ($) = ½ × {fmtNum(m.equityUp)} + ½ × {fmtNum(m.equityDown)} = <strong>{fmtNum(m.equityExpected)}</strong></span>
        <strong><Tex tex="r_E" /> = {fmtNum(m.equityExpected)} ÷ {fmtNum(m.equityToday)} - 1 = <span class="eq">{fmtPct(m.rE, 1)}</span></strong>
      </p>
    </div>
    <LeveragePanels {m} {g} {s} {taxOn} taxPct={TAX_PCT} />
  </div>
</section>

{#if qrBig}
  <button type="button" class="qr-big" on:click={() => (qrBig = false)} aria-label="Close the QR code">
    <img src={withBase('leverage-qr.svg')} alt="QR code linking to this page" />
    <span>adityapolisetty.github.io/IB-MSc-Corporate-Finance/leverage</span>
  </button>
{/if}
<svelte:window on:keydown={e => { if (e.key === 'Escape') qrBig = false; }} />

<style>
  .lev { --debt: #c9ccd6; --debt-ink: #8a8e98; --tax: #0b5f73; display: grid; grid-template-columns: 306px minmax(0, 1fr); margin-top: 14px; border: 1px solid var(--rule); }
  .side { display: flex; flex-direction: column; gap: 14px; padding: 20px 22px; border-right: 1px solid var(--rule); }
  .side .eyebrow { font-size: .675rem; }
  .side h1 { margin: 0; font-size: 2.07rem; font-weight: 700; line-height: 1.05; letter-spacing: -.01em; }
  .lede { margin: 0; color: var(--muted); font-size: .855rem; line-height: 1.45; }
  .kpis { display: flex; gap: 29px; margin: 0; font-variant-numeric: tabular-nums; }
  .kpis div { display: flex; flex-direction: column; gap: 2px; }
  .kpis dt { font-size: .72rem; color: var(--muted); }
  .kpis dd { margin: 0; font-size: 2.34rem; font-weight: 700; line-height: 1; color: var(--ink); }
  .kpis dd.eq, .eq { color: var(--accent); }
  .kpis dd.tax { color: var(--tax); }
  .slider { display: grid; gap: 4px; }
  .control-heading { display: flex; justify-content: space-between; align-items: baseline; color: var(--muted); font-size: .81rem; }
  .control-heading output { color: var(--accent); font-size: 1.44rem; font-weight: 700; }
  .track { position: relative; height: 26px; }
  .track input { position: absolute; left: 0; top: 0; height: 26px; margin: 0; accent-color: var(--accent); }
  .stop { position: absolute; right: 0; top: 8px; height: 10px; border-radius: 5px; background: repeating-linear-gradient(135deg, #d5d8e2 0 3px, var(--paper) 3px 7px); }
  .ticks { position: relative; height: 14px; font-size: .675rem; color: var(--muted); }
  .ticks span { position: absolute; transform: translateX(-50%); }
  .ticks span:first-child { transform: none; }
  .note { font-size: .7rem; color: var(--muted); }
  .taxes, .examples { display: flex; gap: 6px; }
  .taxes button, .examples button { flex: 1; min-height: 40px; border: 1px solid var(--debt); border-radius: 8px; background: var(--paper); color: var(--ink); font: 600 .81rem var(--font-body); cursor: pointer; }
  .taxes button[aria-pressed='true'], .examples button[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: var(--paper); }
  .taxes button.on-tax[aria-pressed='true'] { background: var(--tax); border-color: var(--tax); }
  /* QR code: takes the sidebar's spare height (up to 84px) and hides when under 40px; the full-screen copy reads from the back of a room. */
  .qr-slot { flex: 1 1 0; min-height: 0; margin-top: -14px; padding-top: 12px; display: flex; align-items: flex-end; container-type: size; }
  .qr { display: flex; align-items: center; gap: 12px; height: min(84px, 100cqh); padding: 0; border: 0; background: none; text-align: left; font: .72rem/1.35 var(--font-body); color: var(--muted); cursor: zoom-in; }
  .qr img { flex: none; width: auto; height: 100%; aspect-ratio: 1; }
  @container (max-height: 39px) { .qr { display: none; } }
  .qr-big { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border: 0; background: rgba(255, 255, 255, .97); font: 600 1.1rem var(--font-body); color: var(--ink); cursor: zoom-out; }
  .qr-big img { width: min(78vmin, 640px); height: min(78vmin, 640px); }
  .main { display: flex; flex-direction: column; min-width: 0; }
  .tree-block { display: flex; flex-direction: column; gap: 8px; padding: 14px 24px 12px; border-bottom: 1px solid var(--rule); }
  .tree-block h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
  .tree { --x0: 52%; --f: 1; --gap: 14px; position: relative; height: 236px; }
  .tree-head { display: flex; align-items: baseline; margin-bottom: 6px; }
  .tree-head h2 { flex: 0 0 52%; }
  .date2 { font-size: .95rem; font-weight: 700; line-height: 1; color: var(--ink); white-space: nowrap; }
  /* The returns heading may use the block's 24px right padding; it wraps only on narrow laptops. */
  .date2.rhead { white-space: normal; margin-right: -24px; }
  .tree svg.ph, .note-ph { display: none; }
  .ctl { display: contents; }
  .tree svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .tree path { fill: none; stroke: var(--debt-ink); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  .half { position: absolute; right: 63%; transform: translateY(-100%); font-size: 1.05rem; font-weight: 700; color: var(--ink); white-space: nowrap; }
  .half.hi { top: calc(37% - 8px); }
  .half.lo { top: calc(63% + 8px); transform: none; }
  .node-label { position: absolute; transform: translateY(-100%); font-size: .95rem; font-weight: 700; color: var(--ink); white-space: nowrap; }
  .node-label.bad { top: calc(90% - 52px); }
  /* Narrow screens instead put "Date 2" one line above the Good label (the tree's top margin makes room). */
  .node-label .d2, .node-label.rh { display: none; line-height: 1.3; }
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
    .qr-slot { display: none; }
  }
  /* Tablets and phones: a compact tree (date-2 bars from 40%, widths x 1.04); the Bad label goes under its bar. */
  @media (max-width: 899px) {
    .tree { --x0: 40%; --f: 1.04; --gap: 8px; height: 304px; margin-top: 14px; }
    .tree-head h2 { flex: auto; }
    .date2 { display: none; }
    .node-label .d2 { display: block; }
    .node-label.rh { display: block; white-space: normal; right: 0; }
    .tree svg.pc { display: none; }
    .tree svg.ph { display: block; }
    .node-label { font-size: .78rem; }
    .node-label.d1 { white-space: normal; width: calc(var(--f) * 25%); line-height: 1.25; }
    .node-label.d1 .sep { display: block; height: 0; overflow: hidden; }
    .node-label.bad { top: calc(90% + 8px); transform: none; }
    .half { right: 62%; font-size: .9rem; }
    .half.hi { top: calc(10% + 20px); }
    .half.lo { top: calc(90% - 20px); transform: none; }
    .node { font-size: .75rem; }
    .node-key { font-size: .78rem; }
    .ret { font-size: .95rem; }
    .swing { font-size: .7rem; line-height: 1.15; padding: 0 2px; box-sizing: border-box; }
    .expect { flex-direction: column; gap: 2px; font-size: .82rem; line-height: 1.45; }
  }
  /* Tablets: title and examples on the left, readouts, slider and taxes on the right. */
  @media (min-width: 561px) and (max-width: 999px) {
    .side { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; align-items: start; }
    .side > .eyebrow, .side > h1, .side > .lede, .side > .examples { grid-column: 1; }
    .ctl { display: grid; gap: 14px; grid-column: 2; grid-row: 1 / span 4; }
    .taxes { grid-column: 2; grid-row: 5; }
  }
  /* Phones: one full-bleed column; the readouts and slider stay pinned at the top while the page scrolls. */
  @media (max-width: 560px) {
    .lev { display: flex; flex-direction: column; margin: 0 -22px; border-inline: 0; overflow-x: clip; }
    .side { display: contents; }
    .side > * { margin: 0 14px 12px; }
    .side > .eyebrow { margin-top: 16px; margin-bottom: 0; }
    .side h1 { margin: 0 14px 4px; font-size: 1.75rem; }
    .examples button, .taxes button { min-height: 44px; }
    .side > .ctl { display: grid; gap: 6px; position: sticky; top: 0; z-index: 4; margin: 0 0 12px; padding: 8px 14px 6px; background: var(--paper); border-bottom: 1px solid var(--rule); box-shadow: 0 2px 6px rgb(16 20 43 / 8%); }
    .kpis { gap: 20px; }
    .kpis div { flex-direction: row; align-items: baseline; gap: 6px; }
    .kpis dd { font-size: 1.5rem; }
    .slider { gap: 2px; }
    .control-heading { font-size: .75rem; }
    .control-heading output { font-size: 1.25rem; }
    .track, .track input { height: 40px; }
    .stop { top: 15px; }
    .ticks { font-size: .65rem; height: 12px; }
    .slider .note { display: none; }
    .note-ph { display: block; }
    /* A larger thumb for touch; vertical swipes on the track still scroll the page. */
    .track input { -webkit-appearance: none; appearance: none; background: transparent; touch-action: pan-y; }
    .track input::-webkit-slider-runnable-track { height: 10px; border-radius: 5px; background: linear-gradient(to right, var(--accent) var(--fill), var(--rule) var(--fill)); }
    .track input::-webkit-slider-thumb { -webkit-appearance: none; width: 32px; height: 32px; margin-top: -11px; border-radius: 50%; background: var(--accent); border: 3px solid var(--paper); box-shadow: 0 1px 4px rgb(16 20 43 / 40%); }
    .track input::-moz-range-track { height: 10px; border-radius: 5px; background: var(--rule); }
    .track input::-moz-range-progress { height: 10px; border-radius: 5px; background: var(--accent); }
    .track input::-moz-range-thumb { width: 26px; height: 26px; border-radius: 50%; background: var(--accent); border: 3px solid var(--paper); box-shadow: 0 1px 4px rgb(16 20 43 / 40%); }
    .tree-block { padding: 14px 14px 12px; border-top: 1px solid var(--rule); }
    .tree-block h2 { font-size: 1rem; }
  }
</style>
