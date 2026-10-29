<script>
  import { tick } from 'svelte';
  import LineChart from './LineChart.svelte';
  import BarChart from './BarChart.svelte';
  import { npv, findIrr, detectPattern, applyGrowth, discountFactors } from '../lib/irr.js';

  // ---- Setup form (mirrors the Streamlit "Project Setup" page) ----
  // Opens on a standard intro example: invest £1,000, receive £400 a year for 4 years (IRR 21.9%).
  let startYear = 0, minHurdle = 0, maxHurdle = 30, numYears = 5;
  let usePerp = false, perpYear = 1;
  let useGrowth = false, growthYear = 1, growthRate = 0;
  let flows = [-1000, 400, 400, 400, 400, ...Array(45).fill(0)];
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
    hurdle = Math.max(10, usePerp ? perpGrowth + 0.5 : 0);
    view = 'analysis';
    window.scrollTo(0, 0);
  }

  // ---- This week's problem set: questions that use NPV and IRR (PS3, Problems 2 and 3) ----
  const ps2 = { label: 'Load', flows: [0, 540, 540, 540, -1900], perp: false, g: 0, r: 15 };
  const ps3 = [
    { label: 'Book store', flows: [-300, 90], perp: true, g: 3, r: 8 },
    { label: 'Coffee shop', flows: [-200, 80], perp: true, g: 3, r: 8 },
    { label: 'Music store', flows: [-200, 110], perp: true, g: 0, r: 8 },
    { label: 'Gym', flows: [-200, 100], perp: true, g: 3, r: 11 }
  ];

  // Templates unlock with the tutor's passcode; only its SHA-256 is in the code. Remembered per browser.
  const PASS_HASH = '43a1c3e6ab6888a06f19ecfa21c59b04ea696c717035461430f9ccb3c867b962';
  let unlocked = false, passInput = '', passError = '';
  try { unlocked = localStorage.getItem('ps3-templates') === PASS_HASH; } catch (e) { unlocked = false; }

  async function unlock() {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passInput));
    const hex = [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (hex !== PASS_HASH) { passError = 'Wrong passcode'; return; }
    unlocked = true; passError = '';
    try { localStorage.setItem('ps3-templates', PASS_HASH); } catch (e) { /* private window: unlock lasts this visit */ }
  }

  // Fill the form, let the reactive values settle, then analyse at the question's cost of capital.
  async function loadTemplate(t) {
    startYear = 0; numYears = t.flows.length;
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
  // Hover text for each discount factor: the general formula, then this year's numbers plugged in.
  const dec = v => String(Number(v.toFixed(4)));
  $: factorTex = i => {
    const t = years[i];
    const value = Number.isFinite(factors[i]) ? `= ${factors[i].toFixed(3)}` : '\\text{ undefined, as } r \\le g';
    if (!perp || i !== perp.index) return [`DF_t = \\dfrac{1}{(1+r)^{t}}`, `DF_{${t}} = \\dfrac{1}{(1+${dec(r)})^{${t}}} ${value}`];
    const general = perp.g ? '\\dfrac{1}{r-g}' : '\\dfrac{1}{r}';
    const gText = perp.g < 0 ? `(${dec(perp.g)})` : dec(perp.g);
    const plugged = perp.g ? `\\dfrac{1}{${dec(r)}-${gText}}` : `\\dfrac{1}{${dec(r)}}`;
    // The plugged-in perpetuity line is long, so its result goes on a line of its own.
    return [`DF_t = ${general} \\times \\dfrac{1}{(1+r)^{t-1}}`, `DF_{${t}} = ${plugged} \\times \\dfrac{1}{(1+${dec(r)})^{${t - 1}}}`, `\\phantom{DF_{${t}}} ${value}`];
  };
  $: npvNow = discounted.reduce((a, b) => a + b, 0);
  // The x axis matches the slider, stretching past it only so an IRR above it stays visible.
  $: rateMax = project ? (irr !== null && irr * 100 > project.maxHurdle ? Math.ceil(irr * 115) : project.maxHurdle) : 30;
  // A perpetuity's curve starts 2 points above g, where its NPV is finite and readable.
  $: rateMin = perp ? project.perpGrowth + 2 : 0;
  $: curve = Array.from({ length: 201 }, (_, i) => { const x = rateMin + (rateMax - rateMin) * i / 200; return { x, y: npv(x / 100, cfs, start, perp) }; });
  $: title = pattern === 'investment' ? 'Investment pattern' : pattern === 'financing' ? 'Financing pattern' : 'Mixed pattern (multiple IRRs possible)';
  $: decision = decide(r, npvNow);
  $: irrDecision = decideIrr(r, irr);
  $: rising = project ? npv(r + 0.005, cfs, start, perp) > npvNow : false;

  // NPV decides: accept when NPV at the hurdle rate is positive (the IRR rule flips or fails for other patterns).
  function decide(r, value) {
    const rule = `NPV rule: ${money(value)} ${value >= 0 ? '>' : '<'} 0`;
    return value >= 0 ? { tone: 'accept', head: '✓ Accept', rule } : { tone: 'reject', head: '✗ Reject', rule };
  }

  // The standard IRR rule (accept when IRR > hurdle), shown as is so students see where it disagrees with NPV.
  function decideIrr(r, rate) {
    if (rate === null) return { tone: 'none', head: '- No IRR', rule: 'IRR rule: not defined' };
    const rule = `IRR rule: ${(rate * 100).toFixed(2)}% ${rate > r ? '>' : '<'} ${(r * 100).toFixed(1)}%`;
    return rate > r ? { tone: 'accept', head: '✓ Accept', rule } : { tone: 'reject', head: '✗ Reject', rule };
  }
</script>

{#if view === 'input'}
  <div class="setup">
  <section class="experiment form-card">
    <h1 class="page-title">Capital budgeting visualisation</h1>
    <p class="lede">Enter the project's horizon and cash flows.</p>

    <h2 class="experiment-title">Project horizon</h2>
    <div class="form-grid">
      <label>Start year<input type="number" min="0" step="1" bind:value={startYear} /></label>
      <label>Number of years<input type="number" min="2" max="50" step="1" bind:value={numYears} /></label>
    </div>

    <h2 class="experiment-title">Cash flows (£)</h2>
    <div class="flows">
      {#each Array(numFields) as _, i}
        <label>Year {startYear + i}{usePerp && startYear + i === perpYear ? ' (perpetuity)' : ''}<input type="number" step="100" bind:value={flows[i]} /></label>
      {/each}
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

    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="analyse-row"><button class="analyse" type="button" on:click={analyze}>Analyse project →</button></div>
  </section>

  <aside class="templates" aria-label="Problem set 3 templates">
    <h2>Problem Set 3</h2>
    {#if !unlocked}
      <form class="lock" on:submit|preventDefault={unlock}>
        <div><input id="ps3-pass" type="password" autocomplete="off" placeholder="Passcode" aria-label="Passcode to load the problems" bind:value={passInput} /><button type="submit">Unlock</button></div>
        {#if passError}<span class="error" role="alert">{passError}</span>{/if}
      </form>
    {/if}

    <div class="template">
      <h3>Question 2 · Forgo maintenance</h3>
      <p>Save £540k a year in years 1-3, then pay £1.9m in year 4 (in £000). <span class="parts">Covers 2 a.-c.</span></p>
      <button type="button" disabled={!unlocked} on:click={() => loadTemplate(ps2)}>Load Question 2</button>
    </div>

    <div class="template">
      <h3>Question 3 · Property near Imperial</h3>
      <p>Each business lasts forever: invest now, then c<sub>1</sub> in year 1 growing at g. <span class="parts">Covers 3 a.-b.</span></p>
      <div class="choices">
        {#each ps3 as t}<button type="button" disabled={!unlocked} on:click={() => loadTemplate(t)}><strong>{t.label}</strong><span>-{-t.flows[0]} · {t.flows[1]}</span><span>g {t.g}% · r {t.r}%</span></button>{/each}
      </div>
    </div>
  </aside>
  </div>
{:else}
  <section class="analysis" class:fit use:fitToWindow>
    <div class="strip">
      <div class="block intro">
        <button class="back" type="button" on:click={() => (view = 'input')}>← New project</button>
        <h1 class="side-title">Capital budgeting</h1>
        <span class="side-label">Cash flows · {title}{project.perpYear !== null ? ` · ∞ year ${project.perpYear} continues forever${project.perpGrowth !== 0 ? `, growing ${project.perpGrowth.toFixed(1)}% a year` : ''}` : ''}</span>
        <div class="cf-row">
          {#each cfs as cf, i}<div class="cf"><span>Year {years[i]}{project.perpYear === years[i] ? ' ∞' : ''}</span><strong class:neg={cf < 0}>{money(cf)}</strong></div>{/each}
        </div>
      </div>

      <div class="block hurdle">
        <label class="slider">
          <span class="control-heading"><span>Hurdle rate</span><output>{hurdle.toFixed(1)}%</output></span>
          <input type="range" min={sliderMin} max={project.maxHurdle} step="0.5" bind:value={hurdle} />
          <span class="slider-note">WACC or cost of equity</span>
        </label>
      </div>

      <div class="block verdict">
        <!-- Each measure sits next to the decision its own rule gives. -->
        <dl class="kpis decisions" aria-live="polite">
          <div><dt>IRR</dt><dd>{irr !== null ? `${(irr * 100).toFixed(2)}%` : 'n/a'}</dd><div class={`decision ${irrDecision.tone}`}><strong>{irrDecision.head}</strong><span>{irrDecision.rule}</span></div></div>
          <div><dt>NPV</dt><dd class="npv" class:neg={npvNow < 0}>{money(npvNow)}</dd><div class={`decision ${decision.tone}`}><strong>{decision.head}</strong><span>{decision.rule}</span></div></div>
        </dl>
      </div>
    </div>

    <div class="charts">
      <div class="panel">
        <LineChart
          fill={fit}
          title="NPV against the hurdle rate"
          xLabel="Hurdle rate (%)"
          yLabel="NPV (£)"
          showLegend={false}
          scaleCues={false}
          animate={false}
          xDomain={[rateMin, rateMax]}
          series={[{ id: 'npv', label: 'NPV', color: 'npv-line', width: 3.5, points: curve }]}
          references={[{ axis: 'y', value: 0, label: '' }, ...(irr !== null && irr * 100 >= rateMin && irr * 100 <= rateMax ? [{ axis: 'x', value: irr * 100, label: `IRR ${(irr * 100).toFixed(2)}%`, pill: true, anchor: rising ? 'start' : 'end' }] : [])]}
          markers={[{ x: hurdle, y: npvNow, color: npvNow >= 0 ? 'accept' : 'reject', label: `NPV ${money(npvNow)}`, pill: true, anchor: rising ? 'start' : 'end' }]}
        />
      </div>
      <div class="panel"><BarChart fill={fit} title={`Discount factors at ${hurdle.toFixed(1)}%`} yLabel="Discount factor" color="factor-bar" labelColor="accent" explain={factorTex} bars={factors.map((v, i) => ({ label: `Year ${years[i]}`, value: v }))} format={v => v.toFixed(3)} tickFormat={v => String(Number(v.toFixed(2)))} /></div>
      <div class="panel"><BarChart fill={fit} title={`Discounted cash flows · NPV ${money(npvNow)}`} yLabel="Discounted (£)" color="cash-bar" negColor="reject" bars={discounted.map((v, i) => ({ label: `Year ${years[i]}`, value: v }))} format={v => money(v)} /></div>
    </div>
  </section>
{/if}

<style>
  .page-title { font-size: 1.5rem; font-weight: 600; line-height: 1.1; letter-spacing: -.02em; margin: 0 0 8px; }
  /* Setup page: the form on the left, this week's templates on the right. */
  .setup { display: grid; grid-template-columns: minmax(0, 1fr) clamp(380px, 32vw, 520px); gap: 32px; align-items: start; margin-top: 24px; }
  /* Landing form: same card, rule and button style as the results sidebar. */
  .form-card { margin: 0; padding: 22px 28px 26px; border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 12px; background: var(--paper); }
  .analyse-row { margin-top: 20px; }
  .analyse { padding: 9px 22px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--paper); font-weight: 600; cursor: pointer; }
  .analyse:hover { background: var(--paper); color: var(--accent); }
  .templates { display: flex; flex-direction: column; gap: 12px; padding: 16px 22px 20px; border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 12px; }
  .templates h2 { margin: 0; font-size: 1.4rem; font-weight: 600; }
  .lock { display: grid; gap: 4px; font-size: .85rem; }
  .lock div { display: flex; gap: 8px; }
  .lock input { flex-grow: 1; min-width: 0; border: 1px solid var(--rule); padding: 5px 10px; }
  .lock input:focus { border-color: var(--accent); outline: none; }
  .lock button { padding: 5px 14px; border: 1px solid var(--accent); border-radius: 8px; background: var(--accent); color: var(--paper); cursor: pointer; }
  .templates button:disabled { opacity: .35; cursor: not-allowed; }
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
  .choices span { font: .8rem var(--font-mono); opacity: .9; }
  @media (max-width: 1000px) { .setup { grid-template-columns: 1fr; gap: 0; } }
  .lede { margin: 0; color: var(--muted); font-size: .95rem; line-height: 1.55; max-width: 70ch; }
  .experiment-title { margin: 22px 0 10px; padding-top: 14px; border-top: 1px solid var(--rule); font: 600 1.1rem var(--font-body); letter-spacing: 0; text-transform: none; color: var(--ink); }
  .form-grid, .flows { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px 24px; margin-bottom: 16px; align-items: end; }
  .flows { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  label { display: grid; gap: 6px; font-size: .875rem; line-height: 1.4; }
  label.check { display: flex; align-items: center; gap: 10px; padding-bottom: 8px; grid-column: 1 / -1; }
  input[type='number'] { border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); padding: 7px 10px; font-family: var(--font-mono); width: 100%; font-variant-numeric: tabular-nums; }
  input[type='number']:focus { border-color: var(--accent); outline: none; }
  input[type='checkbox'] { accent-color: var(--accent); width: 18px; height: 18px; flex-shrink: 0; margin: 0; }
  .note { background: var(--accent-soft); border-left: 2px solid var(--accent); padding: 10px 14px; font-size: .9rem; max-width: 80ch; }
  .error { color: var(--reject); font-weight: 600; }
  /* Analysis: a strip with the project, the hurdle slider and the verdict; three charts in a row below. */
  .analysis { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
  .strip { display: flex; align-items: stretch; padding: 12px 0; border: 1px solid var(--rule); border-top: 6px solid var(--accent); border-radius: 12px; background: var(--paper); }
  .block { display: flex; flex-direction: column; justify-content: center; gap: 6px; padding: 0 24px; min-width: 0; }
  .block + .block { border-left: 1px solid var(--rule); }
  .intro { flex: 0 1 auto; max-width: 48%; }
  .hurdle { flex: 1 0 260px; align-items: center; }
  .slider { display: grid; gap: 6px; width: min(300px, 100%); }
  .slider-note { font-size: .85rem; color: var(--muted); text-align: center; }
  .verdict { flex: 0 0 auto; flex-direction: row; align-items: center; gap: 26px; }
  .back { align-self: flex-start; padding: 0; border: none; background: none; color: var(--accent); font: .9rem var(--font-body); cursor: pointer; }
  .back:hover { text-decoration: underline; }
  .side-title { margin: 0; font-size: 1.9rem; font-weight: 700; line-height: 1.1; letter-spacing: -.01em; white-space: nowrap; }
  .side-label { margin-top: 2px; font-size: .9rem; color: var(--muted); }
  .cf-row { display: flex; max-width: 100%; overflow-x: auto; }
  .cf { display: flex; flex-direction: column; gap: 1px; padding: 0 12px; border-left: 1px solid var(--rule); white-space: nowrap; }
  .cf span { font-size: .8rem; color: var(--muted); }
  .cf strong { font-size: 1.2rem; font-weight: 700; }
  .neg { color: var(--reject); }
  .control-heading { display: flex; justify-content: space-between; align-items: baseline; color: var(--muted); }
  .control-heading output { color: var(--accent); font-size: 1.75rem; font-weight: 700; }
  input[type='range'] { accent-color: var(--accent); width: 100%; margin: 0; }
  .decision { display: flex; flex-direction: column; gap: 4px; padding: 7px 14px; border: 1px solid var(--rule); border-left: 5px solid currentColor; border-radius: 10px; }
  .decision strong { font-size: 1.3rem; font-weight: 700; line-height: 1; }
  .decision span { font-size: .85rem; color: var(--muted); white-space: nowrap; }
  .decision.accept { color: var(--accept); }
  .decision.reject { color: var(--reject); }
  .decision.none { color: var(--muted); }
  .kpis { display: grid; grid-template-columns: auto auto auto; align-items: center; column-gap: 14px; row-gap: 8px; margin: 0; }
  .kpis > div { display: contents; }
  .kpis dt { width: 2.4em; color: var(--muted); }
  .kpis dd { margin: 0; font-size: 2rem; font-weight: 700; line-height: 1; color: var(--ink); }
  .kpis dd.npv { color: var(--accent); }
  .kpis dd.npv.neg { color: var(--reject); }
  .charts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; min-width: 0; }
  .panel { min-width: 0; padding: 10px 16px 6px; border: 1px solid var(--rule); border-radius: 12px; background: var(--paper); --chart-tick-size: 14px; --chart-value-size: 16px; --chart-label-size: 16px; }
  .panel :global(figcaption) { font-size: 1.15rem !important; font-weight: 700; margin-bottom: 4px !important; }
  /* Fit mode: the strip takes its natural height and the charts share the rest of the window. */
  .analysis.fit { margin-top: 14px; }
  .fit .charts { flex: 1 1 0; min-height: 0; }
  .fit .panel { height: 100%; min-height: 0; overflow: hidden; }
  @media (max-width: 1000px) {
    .strip { flex-direction: column; gap: 14px; }
    .block + .block { padding-top: 14px; border-left: none; border-top: 1px solid var(--rule); }
    .hurdle { align-items: stretch; }
    .charts { grid-template-columns: 1fr; }
  }
</style>
