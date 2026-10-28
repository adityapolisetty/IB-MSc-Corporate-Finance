<script>
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
  }

  // ---- Analysis (mirrors the Streamlit visualisation page) ----
  const money = v => `£${v < 0 ? '-' : ''}${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
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

  // Investment: accept if hurdle < IRR. Financing: the rule flips, accept if hurdle > IRR. Mixed: use NPV.
  function decide(pattern, irr, r, value) {
    const tail = `NPV = ${money(value)}`;
    const h = `Hurdle rate (${(r * 100).toFixed(1)}%)`;
    if (pattern === 'mixed') return { tone: 'neutral', text: `⚠ Mixed pattern | ${irr === null ? 'No valid IRR' : `IRR = ${(irr * 100).toFixed(2)}%`} | Use NPV for the decision: ${tail}` };
    if (irr === null) return { tone: 'neutral', text: `No valid IRR | ${tail}` };
    const i = `IRR (${(irr * 100).toFixed(2)}%)`;
    const accept = pattern === 'investment' ? r < irr : r > irr;
    const sign = r < irr ? '<' : '>';
    return { tone: accept ? 'accept' : 'reject', text: `${accept ? '✓ ACCEPT' : '✗ REJECT'} | ${h} ${sign} ${i} | ${tail}` };
  }
</script>

{#if view === 'input'}
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
{:else}
  <section class="experiment">
    <div class="analysis-head">
      <button class="button" type="button" on:click={() => (view = 'input')}>← New project</button>
      <h1 class="page-title">{title}</h1>
    </div>
    {#if project.perpYear !== null}<p class="note">Perpetuity: the year {project.perpYear} cash flow continues forever{project.perpGrowth !== 0 ? `, growing at ${project.perpGrowth.toFixed(1)}% a year` : ''}. Its bar below is the present value of the whole perpetuity, cash flow / (r - g), discounted to today.</p>{/if}

    <label class="slider">
      <span class="control-heading"><span>Hurdle rate</span><output>{hurdle.toFixed(1)}%</output></span>
      <input type="range" min={sliderMin} max={project.maxHurdle} step="0.5" bind:value={hurdle} />
    </label>

    <p class={`decision ${decision.tone}`}>{decision.text}</p>

    <div class="panels">
      <div class="cf-table">
        <h2 class="experiment-title">Cash flows</h2>
        <table>
          <thead><tr><th>Year</th><th>Cash flow</th></tr></thead>
          <tbody>{#each cfs as cf, i}<tr><td>{years[i]}{project.perpYear === years[i] ? ' (∞)' : ''}</td><td>{money(cf)}</td></tr>{/each}</tbody>
        </table>
      </div>
      <BarChart title={`Discount factors (at ${hurdle.toFixed(1)}%)`} yLabel="Discount factor" color="factor-bar" bars={factors.map((v, i) => ({ label: String(years[i]), value: v }))} format={v => v.toFixed(3)} />
      <BarChart title={`Discounted cash flows - NPV = ${money(npvNow)}`} yLabel="Discounted cash flow (£)" color="cash-bar" bars={discounted.map((v, i) => ({ label: String(years[i]), value: v }))} format={v => money(v)} />
    </div>

    <div class="npv-curve">
      <LineChart
        title="NPV against the hurdle rate"
        xLabel="Hurdle rate (%)"
        yLabel="NPV (£)"
        showLegend={false}
        scaleCues={false}
        animate={false}
        xDomain={[rateMin, rateMax]}
        series={[{ id: 'npv', label: 'NPV', color: pattern === 'investment' ? 'npv-line' : 'reject', points: curve }]}
        references={[{ axis: 'y', value: 0, label: '' }, ...(irr !== null ? [{ axis: 'x', value: irr * 100, label: `IRR = ${(irr * 100).toFixed(2)}%` }] : [])]}
        markers={[{ x: hurdle, y: npvNow, color: npvNow > 0 ? 'accept' : 'reject', label: `${hurdle.toFixed(1)}%` }]}
      />
    </div>
  </section>
{/if}

<style>
  .page-title { font-size: clamp(2rem, 3.6vw, 3rem); margin: 30px 0 14px; }
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
  .analysis-head { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
  .analysis-head .page-title { margin: 24px 0 16px; }
  .slider { max-width: 640px; margin: 8px 0 4px; }
  .control-heading { display: flex; justify-content: space-between; }
  .control-heading output { color: var(--accent); font-variant-numeric: tabular-nums; font-weight: 600; }
  .decision { font-size: 1.05rem; font-weight: 600; padding: 10px 14px; border-left: 3px solid currentColor; background: var(--accent-soft); margin: 14px 0 26px; }
  .decision.accept { color: var(--accept); }
  .decision.reject { color: var(--reject); }
  .decision.neutral { color: var(--muted); }
  .panels { display: grid; grid-template-columns: minmax(150px, .5fr) 1fr 1fr; gap: 32px; align-items: start; }
  .cf-table .experiment-title { margin-top: 0; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; font-variant-numeric: tabular-nums; }
  th, td { padding: 6px 10px; border-bottom: 1px solid var(--rule); text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  th { background: var(--accent-soft); font-weight: 600; }
  .npv-curve { margin-top: 36px; }
  @media (max-width: 1000px) { .panels { grid-template-columns: 1fr 1fr; } .cf-table { grid-column: 1 / -1; max-width: 360px; } }
  @media (max-width: 640px) { .panels { grid-template-columns: 1fr; } }
</style>
