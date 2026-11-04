<script>
  // Inline KaTeX for one TeX string; colour comes from the parent. A bad string throws.
  import katex from 'katex';
  import 'katex/dist/katex.min.css';
  export let tex;

  $: html = katex.renderToString(tex, { throwOnError: true });
</script>

{@html html}
