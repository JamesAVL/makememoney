// Mobile feed drawer: re-parents the Next Goal card + live feed between the
// desktop rail and the swipe-up drawer on breakpoint change (panel modules
// keep their element refs). Grab handle drags with spring snap.

const mq = matchMedia('(max-width: 900px)');

export function initDrawer() {
  const drawer = document.getElementById('feed-drawer');
  const body = document.getElementById('drawer-body');
  const grab = document.getElementById('drawer-grab');
  const scrim = document.getElementById('drawer-scrim');
  const rail = document.getElementById('rail');
  if (!drawer || !rail) return;

  const place = () => {
    const nodes = [
      document.getElementById('next-goal'),
      rail.querySelector('.feed-head') || body.querySelector('.feed-head'),
      document.getElementById('feed'),
    ].filter(Boolean);
    (mq.matches ? body : rail).append(...nodes);
    drawer.setAttribute('aria-hidden', mq.matches ? 'false' : 'true');
    if (!mq.matches) setOpen(false);
  };

  let open = false;
  const setOpen = (o) => {
    open = o;
    drawer.classList.toggle('open', o);
    drawer.style.transform = '';
    scrim.hidden = !o;
    requestAnimationFrame(() => scrim.classList.toggle('show', o));
  };

  mq.addEventListener('change', place);
  place();

  const travel = () => drawer.getBoundingClientRect().height - 42;
  let startY = 0;
  let dy = 0;
  let t0 = 0;

  grab.addEventListener('click', () => {
    if (Math.abs(dy) < 6) setOpen(!open);
    dy = 0;
  });
  scrim.addEventListener('click', () => setOpen(false));

  grab.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    dy = 0;
    t0 = performance.now();
    grab.setPointerCapture(e.pointerId);
    drawer.classList.add('dragging');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!grab.hasPointerCapture(e.pointerId)) return;
    dy = e.clientY - startY;
    const base = open ? 0 : travel();
    const y = Math.max(0, Math.min(travel(), base + dy));
    drawer.style.transform = `translateY(${y}px)`;
  });
  grab.addEventListener('pointerup', () => {
    drawer.classList.remove('dragging');
    if (Math.abs(dy) < 6) return; // tap → click handler toggles
    const v = dy / Math.max(1, performance.now() - t0); // px/ms
    setOpen(v < -0.4 || (v <= 0.4 && (open ? dy < 120 : -dy > 90)));
  });
}
