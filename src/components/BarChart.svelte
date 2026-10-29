<script>
  import { onMount, afterUpdate } from 'svelte';
  import { scaleBand, scaleLinear } from 'd3';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';
  // One bar per year, value printed on each bar; bars below zero hang from the zero line.
  export let title = '';
  export let yLabel = '';
  export let bars = [];
  export let color = 'series-1';
  export let negColor = null;
  export let labelColor = null;
  export let format = v => v.toFixed(2);
  export let tickFormat = format;
  export let fill = false;
  // Optional hover box: explain(i) gives TeX lines for bar i, typeset with KaTeX.
  export let explain = null;
  let hover = null, tipWidth = 0;
  $: tipLines = hover !== null && explain ? explain(hover).map(tex => katex.renderToString(tex, { throwOnError: false })) : [];
  $: tipLeft = hover !== null ? Math.max(tipWidth / 2 + 2, Math.min(width - tipWidth / 2 - 2, x(bars[hover].label) + x.bandwidth() / 2)) : 0;
  let container, width = 420, boxHeight = 0, capHeight = 0;
  $: height = fill && boxHeight ? Math.max(140, boxHeight - capHeight - 14) : 300;
  $: margin = { top: 44, right: 10, bottom: 30, left: yLabelWidth ? yLabelWidth + 48 : 90 };
  // The left margin follows the widest y tick label, so the axis title never touches the numbers.
  let yLabelWidth = 0;
  function measureYLabels() {
    if (!container) return;
    const widths = [...container.querySelectorAll('text.ytick')].map(t => t.getBBox().width);
    const w = Math.ceil(Math.max(0, ...widths));
    if (w !== yLabelWidth) yLabelWidth = w;
  }
  afterUpdate(measureYLabels);

  $: values = bars.map(b => b.value);
  $: lo = Math.min(0, ...values);
  $: hi = Math.max(0, ...values);
  $: pad = (hi - lo || 1) * .26;
  $: y = scaleLinear().domain([lo < 0 ? lo - pad : 0, hi > 0 ? hi + pad : 0]).nice(5).range([height - margin.bottom, margin.top]);
  $: x = scaleBand().domain(bars.map(b => b.label)).range([margin.left, width - margin.right]).padding(.28);
  $: showValues = x.step() > 52;
  // A value tag is an outlined pill sized to its label, above a bar or below a negative one.
  const pillWidth = label => Math.round(label.length * 8.2 + 18);
  const tagColor = v => (v < 0 && negColor ? negColor : labelColor || color);
  onMount(() => {
    const observer = new ResizeObserver(entries => { width = Math.max(240, Math.round(entries[0].contentRect.width)); boxHeight = Math.round(entries[0].contentRect.height); });
    observer.observe(container);
    document.fonts.ready.then(measureYLabels);
    return () => observer.disconnect();
  });
</script>

<figure bind:this={container} class:fill aria-label={title}>
  <figcaption bind:clientHeight={capHeight}>{title}</figcaption>
  <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
    {#each y.ticks(height < 240 ? 3 : 5) as tick}<line class="grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} /><text class="tick ytick" x={margin.left - 10} y={y(tick) + 4} text-anchor="end">{tickFormat(tick)}</text>{/each}
    {#each bars as b}
      <rect x={x(b.label)} width={x.bandwidth()} y={Math.min(y(0), y(b.value))} height={Math.abs(y(b.value) - y(0))} fill={`var(--${b.value < 0 && negColor ? negColor : color})`}><title>{b.label}: {format(b.value)}</title></rect>
      {#if showValues}
        {@const label = format(b.value)}
        {@const w = pillWidth(label)}
        {@const top = b.value >= 0 ? y(b.value) - 34 : y(b.value) + 6}
        <rect class="tag" x={x(b.label) + x.bandwidth() / 2 - w / 2} y={top} width={w} height="27" rx="13.5" style={`stroke: var(--${tagColor(b.value)})`} />
        <text class="value" x={x(b.label) + x.bandwidth() / 2} y={top + 19} text-anchor="middle" style={`fill: var(--${tagColor(b.value)})`}>{label}</text>
      {/if}
      <text class="tick" x={x(b.label) + x.bandwidth() / 2} y={height - margin.bottom + 20} text-anchor="middle">{showValues ? b.label : b.label.replace('Year ', '')}</text>
    {/each}
    <line class="axis" x1={margin.left} x2={width - margin.right} y1={y(0)} y2={y(0)} />
    <line class="axis" x1={margin.left} x2={margin.left} y1={margin.top} y2={height - margin.bottom} />
    <text class="axis-title" transform={`translate(14 ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`} text-anchor="middle">{yLabel}</text>
    {#if explain}{#each bars as b, i}<rect class="hit" class:on={hover === i} x={x(b.label) - x.step() * x.paddingInner() / 2} width={x.step()} y={margin.top} height={height - margin.top - margin.bottom} on:mouseenter={() => (hover = i)} on:mouseleave={() => (hover = null)} role="presentation" />{/each}{/if}
  </svg>
  {#if tipLines.length}
    <div class="tip" bind:offsetWidth={tipWidth} style={`left: ${tipLeft}px; top: ${capHeight + 6}px`}>
      {#each tipLines as html}<div>{@html html}</div>{/each}
    </div>
  {/if}
</figure>

<style>
  figure { position: relative; margin: 0; width: 100%; }
  .hit { fill: var(--accent); opacity: 0; cursor: help; }
  .hit.on { opacity: .06; }
  .tip { position: absolute; transform: translateX(-50%); display: grid; gap: 8px; padding: 10px 14px; border: 2px solid var(--accent); border-radius: 10px; background: var(--paper); color: var(--accent); font-size: .8rem; white-space: nowrap; pointer-events: none; box-shadow: 0 6px 18px rgb(0 0 0 / .12); }
  figure.fill { height: 100%; overflow: hidden; }
  figcaption { font-family: var(--font-heading); font-size: 1.15rem; line-height: 1.4; margin-bottom: 6px; }
  svg { display: block; overflow: visible; }
  rect { rx: 3px; }
  rect.tag { rx: 13.5px; fill: var(--paper); stroke-width: 2; }
  .tick { font: var(--chart-tick-size, 13.2px) var(--font-body); fill: var(--muted); font-variant-numeric: tabular-nums; }
  .value { font: 700 var(--chart-value-size, 13.2px) var(--font-body); fill: var(--ink); font-variant-numeric: tabular-nums; }
  .axis-title { font: var(--chart-title-size, 14.3px) var(--font-body); fill: var(--ink); }
  .grid { stroke: var(--rule); stroke-width: 1; shape-rendering: crispEdges; }
  .axis { stroke: var(--muted); stroke-width: 1; shape-rendering: crispEdges; }
</style>
