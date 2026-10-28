<script>
  import { onMount } from 'svelte';
  import { scaleBand, scaleLinear } from 'd3';
  // One bar per year, value printed on each bar; bars below zero hang from the zero line.
  export let title = '';
  export let yLabel = '';
  export let bars = [];
  export let color = 'series-1';
  export let format = v => v.toFixed(2);
  let container, width = 420;
  $: height = 300;
  $: margin = { top: 28, right: 10, bottom: 46, left: width < 360 ? 54 : 64 };
  $: values = bars.map(b => b.value);
  $: lo = Math.min(0, ...values);
  $: hi = Math.max(0, ...values);
  $: pad = (hi - lo || 1) * .18;
  $: y = scaleLinear().domain([lo < 0 ? lo - pad : 0, hi > 0 ? hi + pad : 0]).nice(5).range([height - margin.bottom, margin.top]);
  $: x = scaleBand().domain(bars.map(b => b.label)).range([margin.left, width - margin.right]).padding(.28);
  $: showValues = x.bandwidth() > 26;
  onMount(() => {
    const observer = new ResizeObserver(entries => { width = Math.max(240, Math.round(entries[0].contentRect.width)); });
    observer.observe(container);
    return () => observer.disconnect();
  });
</script>

<figure bind:this={container} aria-label={title}>
  <figcaption>{title}</figcaption>
  <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
    {#each y.ticks(5) as tick}<line class="grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} /><text class="tick" x={margin.left - 10} y={y(tick) + 4} text-anchor="end">{format(tick)}</text>{/each}
    {#each bars as b}
      <rect x={x(b.label)} width={x.bandwidth()} y={Math.min(y(0), y(b.value))} height={Math.abs(y(b.value) - y(0))} fill={`var(--${color})`}><title>{b.label}: {format(b.value)}</title></rect>
      {#if showValues}<text class="value" x={x(b.label) + x.bandwidth() / 2} y={b.value >= 0 ? y(b.value) - 6 : y(b.value) + 15} text-anchor="middle">{format(b.value)}</text>{/if}
      <text class="tick" x={x(b.label) + x.bandwidth() / 2} y={height - margin.bottom + 20} text-anchor="middle">{b.label}</text>
    {/each}
    <line class="axis" x1={margin.left} x2={width - margin.right} y1={y(0)} y2={y(0)} />
    <line class="axis" x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} />
    <text class="axis-title" x={(margin.left + width - margin.right) / 2} y={height - 6} text-anchor="middle">Year</text>
    <text class="axis-title" transform={`translate(14 ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`} text-anchor="middle">{yLabel}</text>
  </svg>
</figure>

<style>
  figure { margin: 0; width: 100%; }
  figcaption { font-family: var(--font-heading); font-size: 1.15rem; line-height: 1.4; margin-bottom: 6px; }
  svg { display: block; overflow: visible; }
  rect { opacity: .88; }
  .tick { font: 12px var(--font-body); fill: var(--muted); font-variant-numeric: tabular-nums; }
  .value { font: 600 12px var(--font-body); fill: var(--ink); font-variant-numeric: tabular-nums; }
  .axis-title { font: 13px var(--font-body); fill: var(--ink); }
  .grid { stroke: var(--rule); stroke-width: 1; shape-rendering: crispEdges; }
  .axis { stroke: var(--muted); stroke-width: 1; shape-rendering: crispEdges; }
</style>
