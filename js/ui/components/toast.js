// Achievement/unlock toasts: queued, max 3 visible, auto-dismiss.
// Options: ms (visible duration), onClick (tap action; also dismisses).

const queue = [];
let visible = 0;
const MAX_VISIBLE = 3;

export function toast({ icon = '🏆', name, sub = '', tone = '', ms = 4000, onClick = null }) {
  queue.push({ icon, name, sub, tone, ms, onClick });
  drain();
}

function drain() {
  if (visible >= MAX_VISIBLE || !queue.length) return;
  const { icon, name, sub, tone, ms, onClick } = queue.shift();
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `
    <div class="t-icon">${icon}</div>
    <div><div class="t-name"></div><div class="t-sub"></div></div>`;
  el.querySelector('.t-name').textContent = name;
  el.querySelector('.t-sub').textContent = sub;
  root.appendChild(el);
  visible++;

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      visible--;
      drain();
    }, 260);
  };

  if (onClick) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      remove();
      onClick();
    });
  }
  setTimeout(remove, ms);
}
