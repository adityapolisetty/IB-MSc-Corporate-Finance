// Svelte action: on a laptop or projector the section fills the window below the header, so nothing scrolls.
// Usage: use:fitToWindow={on => (fit = on)}; the callback says whether fit mode is on.
export function fitToWindow(node, onFit) {
  const mq = window.matchMedia('(min-width: 1000px) and (min-height: 540px)');
  const update = () => {
    const on = mq.matches;
    const top = node.getBoundingClientRect().top + window.scrollY;
    node.style.height = on ? `${Math.max(520, window.innerHeight - top - 14)}px` : '';
    onFit(on);
  };
  update();
  window.addEventListener('resize', update);
  mq.addEventListener('change', update);
  return { destroy() { window.removeEventListener('resize', update); mq.removeEventListener('change', update); } };
}
