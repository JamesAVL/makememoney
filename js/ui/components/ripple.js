// Material-style press ripples on every actionable control, via one global
// pointerdown listener. Skipped under prefers-reduced-motion.

const SELECTOR = '.btn, .nav-btn, .qty-toggle button, .pack-btn, .icon-btn';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initRipples() {
  if (reduced) return;
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest?.(SELECTOR);
    if (!target || target.disabled) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.15;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = span.style.height = `${size}px`;
    span.style.left = `${e.clientX - rect.left - size / 2}px`;
    span.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
  }, { passive: true });
}
