<script>
  import { tick } from 'svelte';
  import LineChart from './LineChart.svelte';
  import BarChart from './BarChart.svelte';
  import { npv, findIrr, detectPattern, applyGrowth, discountFactors } from '../lib/irr.js';

  // ---- Setup form (mirrors the Streamlit "Project Setup" page) ----
  let startYear = 0, minHurdle = 0, maxHurdle = 30, numYears = 4;
  let usePerp = false, perpYear = 1;
  let useGrowth = false, growthYear = 1, growthRate = 0;
  let flows = Array(50).fill(0);
  let error = '';
  let view = 'input', project = null, hurdle = 15;
  let fit = false;

  // On a laptop or projector the analysis fills the window below the header, so nothing scrolls.
  function fitToWindow(node) {
    const mq = window.matchMedia('(min-width: 1000px) and (min-height: 540px)');
    const update = () => {
      fit = mq.matches;
      const top = node.getBoundingClientRect().top + window.scrollY;
      node.style.height = fit ? `${Math.max(500, window.innerHeight - top - 14)}px` : '';
    };
    update();
    window.addEventListener('resize', update);
    mq.addEventListener('change', update);
    return { destroy() { window.removeEventListener('resize', update); mq.removeEventListener('change', update); } };
  }

  $: lastYear = startYear + numYears - 1;
  $: perpYear = Math.min(Math.max(perpYear, startYear + 1), lastYear);
  $: growthYear = Math.min(Math.max(growthYear, startYear + 1), lastYear);
  // With a perpetuity, flows are entered only up to the perpetuity year.
  $: numFields = usePerp ? perpYear - startYear + 1 : numYears;

  function analyze() {
    let cashflows = flows.slice(0, numFields).map(v => Number(v) || 0);
    if (useGrowth && growthRate !== 0) cashflows = applyGrowth(cashflows, growthYear - startYear, growthRate);
    // The perpetuity grows at the growth rate when growth has started by the perpetuity year.
    const perpGrowth = usePerp && useGrowth && growthYear <= perpYear ? growthRate : 0;
    if (maxHurdle <= minHurdle) { error = 'Maximum hurdle rate must be greater than minimum hurdle rate.'; return; }
    if (usePerp && maxHurdle <= perpGrowth + 0.5) { error = 'For a growing perpetuity the maximum hurdle rate must be above the growth rate.'; return; }
    if (cashflows.every(cf => cf === 0)) { error = 'Please enter at least one non-zero cash flow.'; return; }
    error = '';
    const perp = usePerp ? { index: perpYear - startYear, g: perpGrowth / 100 } : null;
    project = { start: startYear, cashflows, perp, perpYear: usePerp ? perpYear : null, perpGrowth, minHurdle, maxHurdle, growth: useGrowth ? growthRate : 0 };
    hurdle = (Math.max(minHurdle, usePerp ? perpGrowth + 0.5 : minHurdle) + maxHurdle) / 2;
    view = 'analysis';
    window.scrollTo(0, 0);
  }

  // ---- This week's problem set: questions that use NPV and IRR (PS3, Problems 2 and 3) ----
  const ps2 = { label: 'Load', flows: [0, 540, 540, 540, -1900], perp: false, g: 0, max: 30, r: 15 };
  const ps3 = [
    { label: 'Book store', flows: [-300, 90], perp: true, g: 3, max: 60, r: 8 },
    { label: 'Coffee shop', flows: [-200, 80], perp: true, g: 3, max: 60, r: 8 },
    { label: 'Music store', flows: [-200, 110], perp: true, g: 0, max: 60, r: 8 },
    { label: 'Gym', flows: [-200, 100], perp: true, g: 3, max: 60, r: 11 }
  ];

  // Fill the form, let the reactive values settle, then analyse at the question's cost of capital.
  async function loadTemplate(t) {
    startYear = 0; numYears = t.flows.length; minHurdle = 0; maxHurdle = t.max;
    usePerp = t.perp; perpYear = t.flows.length - 1;
    useGrowth = t.g !== 0; growthYear = 1; growthRate = t.g;
    flows = [...t.flows, ...Array(50 - t.flows.length).fill(0)];
    await tick();
    analyze();
    if (view === 'analysis') hurdle = t.r;
  }

  // ---- Analysis (mirrors the Streamlit visualisation page) ----
  const money = v => `${v < 0 ? '-' : ''}£${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  $: cfs = project ? project.cashflows : [];
  $: start = project ? project.start : 0;
  $: pattern = project ? detectPattern(cfs) : 'mixed';
  $: perp = project ? project.perp : null;
  // With a growing perpetuity, NPV only exists for hurdle rates above g.
  $: sliderMin = project ? (perp ? Math.max(project.minHurdle, project.perpGrowth + 0.5) : project.minHurdle) : 0;
  $: rawIrr = project ? findIrr(cfs, start, perp) : null;
  $: irr = rawIrr !== null && rawIrr >= 0 ? rawIrr : null;
  $: r = hurdle / 100;
  $: years = cfs.map((_, i) => start + i);
  $: factors = discountFactors(r, cfs.length, start, perp);
  $: discounted = cfs.map((cf, i) => cf * factors[i]);
  $: npvNow = discounted.reduce((a, b) => a + b, 0);
  $: rateMax = project ? Math.max(30, project.maxHurdle, irr !== null ? Math.ceil(irr * 115) : 0) : 30;
  // A perpetuity's curve starts 2 points above g, where its NPV is finite and readable.
  $: rateMin = perp ? project.perpGrowth + 2 : 0;
  $: curve = Array.from({ length: 201 }, (_, i) => { const x = rateMin + (rateMax - rateMin) * i / 200; return { x, y: npv(x / 100, cfs, start, perp) }; });
  $: title = pattern === 'investment' ? 'Investment pattern' : pattern === 'financing' ? 'Financing pattern' : 'Mixed pattern (multiple IRRs possible)';
  $: decision = decide(pattern, irr, r, npvNow);
  $: rising = project ? npv(r + 0.005, cfs, start, perp) > npvNow : false;

  // Investment: accept if hurdle < IRR. Financing: the rule flips, accept if hurdle > IRR. Mixed: use NPV.
  function decide(pattern, irr, r, value) {
    const tail = `NPV = ${money(value)}`;
    const h = `Hurdle rate ${(r * 100).toFixed(1)}%`;
    if (pattern === 'mixed') return { tone: 'neutral', head: '⚠ Mixed pattern', lines: [irr === null ? 'No valid IRR' : `IRR = ${(irr * 100).toFixed(2)}%`, `Use NPV: ${tail}`] };
    if (irr === null) return { tone: 'neutral', head: 'No valid IRR', lines: [tail] };
    const i = `IRR ${(irr * 100).toFixed(2)}%`;
    const accept = pattern === 'investment' ? r < irr : r > irr;
    const sign = r < irr ? '<' : '>';
    return { tone: accept ? 'accept' : 'reject', head: accept ? '✓ Accept' : '✗ Reject', lines: [`${h} ${sign} ${i}`, tail] };
  }
</script>

{#if view === 'input'}
  <div class="setup">
  <section class="experiment">
    <h1 class="page-title">NPV and IRR</h1>
    <p class="lede">Enter a project's cash flows, then move the hurdle rate to see how NPV responds - and when the IRR rule works, flips, or breaks.</p>

    <h2 class="experiment-title">Project details</h2>
    <div class="form-grid">
      <label>Start year<input type="number" min="0" step="1" bind:value={startYear} /></label>
      <label>Number of years<input type="number" min="2" max="50" step="1" bind:value={numYears} /></label>
      <label>Min hurdle rate (%)<input type="number" min="0" max="100" step="0.5" bind:value={minHurdle} /></label>
      <label>Max hurdle rate (%)<input type="number" min="0" max="100" step="0.5" bind:value={maxHurdle} /></label>
    </div>

    <div class="form-grid">
      <label class="check"><input type="checkbox" bind:checked={usePerp} /> Use perpetuity</label>
      {#if usePerp}<label>Perpetuity starts in year<input type="number" min={startYear + 1} max={lastYear} step="1" bind:value={perpYear} /></label>{/if}
    </div>
    {#if numYears > 10 && !usePerp}<p class="note">You've entered {numYears} years. Consider using a perpetuity for long-lived projects.</p>{/if}
    {#if usePerp}<p class="note">Cash flows are entered up to year {perpYear}, which continues perpetually.</p>{/if}

    <div class="form-grid">
      <label class="check"><input type="checkbox" bind:checked={useGrowth} /> Apply a growth rate to cash flows</label>
      {#if useGrowth}
        <label>Starting from year<input type="number" min={startYear + 1} max={lastYear} step="1" bind:value={growthYear} /></label>
        <label>Growth rate (%)<input type="number" min="-100" max="100" step="0.5" bind:value={growthRate} /></label>
      {/if}
    </div>
    {#if useGrowth && growthRate !== 0}<p class="note">A growth rate of {growthRate.toFixed(1)}% is applied to the year {growthYear} cash flow in every later year.</p>{/if}

    <h2 class="experiment-title">Cash flows (£)</h2>
    <div class="flows">
      {#each Array(numFields) as _, i}
        <label>Year {startYear + i}{usePerp && startYear + i === perpYear ? ' (perpetuity)' : ''}<input type="number" step="100" bind:value={flows[i]} /></label>
      {/each}
    </div>

    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="button-row"><button class="button primary" type="button" on:click={analyze}>Analyse project</button></div>
  </section>

  <aside class="templates" aria-label="Problem set 3 templates">
    <h2>Problem Set 3 templates</h2>

    <div class="template">
      <h3>Problem 2 · Forgo maintenance</h3>
      <p>Save £540k a year in years 1-3, then pay £1.9m in year 4 (in £000). <span class="parts">Covers 2 a.-c.</span></p>
      <button type="button" on:click={() => loadTemplate(ps2)}>Load Problem 2</button>
    </div>

    <div class="template">
      <h3>Problem 3 · Property near Imperial</h3>
      <p>Each business lasts forever: invest now, then c<sub>1</sub> in year 1 growing at g. <span class="parts">Covers 3 a.-b.</span></p>
      <div class="choices">
        {#each ps3 as t}<button type="button" on:click={() => loadTemplate(t)}><strong>{t.label}</strong><span>-{-t.flows[0]} · {t.flows[1]} · g {t.g}% · r {t.r}%</span></button>{/each}
      </div>
    </div>
  </aside>
  </div>
{:else}
  <section class="analysis" class:fit use:fitToWindow>
    <aside class="side">
      <div>
        <button class="back" type="button" on:click={() => (view = 'input')}>← New project</button>
        <h1 class="side-title">{title}</h1>
      </div>

      <label class="slider">
        <span class="control-heading"><span>Hurdle rate</span><output>{hurdle.toFixed(1)}%</output></span>
        <input type="range" min={sliderMin} max={project.maxHurdle} step="0.5" bind:value={hurdle} />
      </label>

      <div class={`decision ${decision.tone}`} aria-live="polite">
        <strong>{decision.head}</strong>
        {#each decision.lines as line}<span>{line}</span>{/each}
      </div>

      <div class="cf-table">
        <span class="side-label">Cash flows</span>
        <table>
          <tbody>{#each cfs as cf, i}<tr><td>Year {years[i]}{project.perpYear === years[i] ? ' (∞)' : ''}</td><td class:neg={cf < 0}>{money(cf)}</td></tr>{/each}</tbody>
        </table>
      </div>
      {#if project.perpYear !== null}<p class="note">Perpetuity: the year {project.perpYear} cash flow continues forever{project.perpGrowth !== 0 ? `, growing at ${project.perpGrowth.toFixed(1)}% a year` : ''}. Its bar is the present value of the whole perpetuity, cash flow / (r - g), discounted to today.</p>{/if}

    </aside>

    <div class="charts">
    <div class="panel npv-curve">
      <LineChart
        fill={fit}
        title="NPV against the hurdle rate"
        xLabel="Hurdle rate (%)"
        yLabel="NPV (£)"
        showLegend={false}
        scaleCues={false}
        animate={false}
        xDomain={[rateMin, rateMax]}
        series={[{ id: 'npv', label: 'NPV', color: 'npv-line', points: curve }]}
        references={[{ axis: 'y', value: 0, label: '' }, ...(irr !== null ? [{ axis: 'x', value: irr * 100, label: `IRR = ${(irr * 100).toFixed(2)}%` }] : [])]}
        markers={[{ x: hurdle, y: npvNow, color: npvNow > 0 ? 'accept' : 'reject', label: money(npvNow), anchor: rising ? 'end' : 'start' }]}
      />
    </div>

    <div class="bars">
      <div class="panel"><BarChart fill={fit} title={`Discount factors at ${hurdle.toFixed(1)}%`} yLabel="Discount factor" color="factor-bar" bars={factors.map((v, i) => ({ label: String(years[i]), value: v }))} format={v => v.toFixed(3)} /></div>
      <div class="panel"><BarChart fill={fit} title={`Discounted cash flows · NPV ${money(npvNow)}`} yLabel="Discounted (£)" color="cash-bar" negColor="reject" bars={discounted.map((v, i) => ({ label: String(years[i]), value: v }))} format={v => money(v)} /></div>
    </div>
    </div>
  </section>
{/if}

<style>
  .page-title { font-size: clamp(2rem, 3.6vw, 3rem); margin: 30px 0 14px; }
  /* Setup page: the form on the left, this week's templates on the right. */
  .setup { display: grid; grid-template-columns: minmax(0, 1fr) clamp(380px, 32vw, 520px); gap: 40px; align-items: start; }
  .templates { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; padding: 16px 22px 20px; border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 12px; }
  .templates h2 { margin: 0; font-size: 1.4rem; font-weight: 600; }
  .template { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--rule); }
  .template h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
  .template p { margin: 0; font-size: .85rem; line-height: 1.45; }
  .template .parts { color: var(--muted); }
  .template > button { align-self: flex-start; padding: 5px 16px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--paper); cursor: pointer; }
  .template > button:hover { background: var(--paper); color: var(--accent); }
  .choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .choices button { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 8px 12px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--paper); cursor: pointer; text-align: left; }
  .choices button:hover { background: var(--paper); color: var(--accent); }
  .choices strong { font-size: .95rem; font-weight: 600; }
  .choices span { font: .72rem var(--font-mono); opacity: .9; }
  @media (max-width: 1000px) { .setup { grid-template-columns: 1fr; gap: 0; } }
  .lede { color: var(--muted); font-size: 1.1rem; line-height: 1.6; max-width: 70ch; }
  .experiment-title { margin-top: 28px; }
  .form-grid, .flows { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px 24px; margin-bottom: 16px; align-items: end; }
  .flows { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  label { display: grid; gap: 6px; font-size: .875rem; line-height: 1.4; }
  label.check { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; }
  input[type='number'] { border: 1px solid var(--rule); background: var(--paper); padding: 7px 10px; width: 100%; font-variant-numeric: tabular-nums; }
  input[type='number']:focus { border-color: var(--accent); outline: none; }
  input[type='checkbox'] { accent-color: var(--accent); width: 18px; height: 18px; }
  .note { background: var(--accent-soft); border-left: 2px solid var(--accent); padding: 10px 14px; font-size: .9rem; max-width: 80ch; }
  .error { color: var(--reject); font-weight: 600; }
  /* Analysis: a sticky sidebar with the controls, the charts in white panels beside it. */
  .analysis { display: grid; grid-template-columns: clamp(365px, 24vw, 460px) minmax(0, 1fr); gap: 32px; align-items: start; margin-top: 28px; }
  .side { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 22px; padding: 24px 26px 28px; border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 12px; background: var(--paper); }
  .back { padding: 0; border: none; background: none; color: var(--accent); font: .85rem var(--font-body); cursor: pointer; }
  .back:hover { text-decoration: underline; }
  .side-title { margin: 2px 0 0; font-size: 1.9rem; font-weight: 600; line-height: 1.1; letter-spacing: -.02em; }
  .side-label { font-size: .85rem; color: var(--muted); }
  .control-heading { display: flex; justify-content: space-between; color: var(--muted); }
  .control-heading output { color: var(--accent); font: 600 1.05rem var(--font-mono); }
  input[type='range'] { accent-color: var(--accent); width: 100%; margin: 0; }
  .decision { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; border: 1px solid var(--rule); border-left: 5px solid currentColor; border-radius: 8px; }
  .decision strong { font-size: 1.35rem; font-weight: 700; }
  .decision span { font: .8rem/1.5 var(--font-mono); color: var(--muted); }
  .decision.accept { color: var(--accept); }
  .decision.reject { color: var(--reject); }
  .decision.neutral { color: var(--muted); }
  table { border-collapse: collapse; width: 100%; font: .85rem var(--font-mono); }
  td { padding: 7px 0; border-bottom: 1px solid var(--rule); text-align: right; }
  td:first-child { text-align: left; color: var(--muted); }
  tr:last-child td { border-bottom: none; }
  td.neg { color: var(--reject); }
  .side .note { margin: 0; font-size: .8rem; }
  .charts { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
  .panel { border: 1px solid var(--rule); border-radius: 12px; padding: 18px 22px 12px; background: var(--paper); min-width: 0; }
  .bars { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  /* Fit mode: sidebar and chart grid share the window height; a long cash-flow list scrolls inside the sidebar. */
  .analysis.fit { margin-top: 14px; --chart-tick-size: clamp(15px, 1vw, 19px); --chart-value-size: clamp(15px, 1vw, 19px); --chart-title-size: clamp(15px, 1vw, 19px); --chart-label-size: clamp(15px, 1vw, 19px); }
  .fit .side { position: static; height: 100%; overflow-y: auto; gap: 12px; padding: 14px 20px 16px; }
  .fit .side-title { font-size: 1.5rem; }
  .fit .decision { padding: 10px 14px; }
  .fit .decision strong { font-size: clamp(1.15rem, 1.2vw, 1.45rem); }
  .fit td { padding: 4px 0; }
  .fit table, .fit .decision span { font-size: clamp(.8rem, .85vw, 1rem); }
  .fit .control-heading, .fit .side-label, .fit .back { font-size: clamp(.85rem, .85vw, 1rem); }
  .fit .charts { display: grid; grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr); gap: 14px; height: 100%; }
  .fit .bars { min-height: 0; }
  .fit .panel { height: 100%; min-height: 0; padding: 10px 18px 6px; overflow: hidden; }
  .fit :global(figcaption) { font-size: clamp(1rem, 1.1vw, 1.3rem) !important; margin-bottom: 2px !important; }
  @media (max-width: 1000px) { .analysis { grid-template-columns: 1fr; } .side { position: static; } }
  @media (max-width: 640px) { .bars { grid-template-columns: 1fr; } }
</style>
