// Achievement/unlock toasts: queued, max 3 visible, auto-dismiss.

const queue = [];
let visible = 0;
const MAX_VISIBLE = 3;

export function toast({ icon = '🏆', name, sub = '', tone = '' }) {
  queue.push({ icon, name, sub, tone });
  drain();
}

function drain() {
  if (visible >= MAX_VISIBLE || !queue.length) return;
  const { icon, name, sub, tone } = queue.shift();
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
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      visible--;
      drain();
    }, 260);
  }, 4000);
}
