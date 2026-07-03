// Reusable modal with backdrop, focus handling, optional auto-resolve timer
// (idlers are never held hostage by a popup).

let current = null;

export function showModal({ title, body, actions = [], dismissible = true, autoMs = 0, autoIndex = 0, tone = '' }) {
  closeModal();
  const root = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = `modal ${tone}`;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const h = document.createElement('h3');
  h.textContent = title;
  modal.appendChild(h);

  const bodyEl = document.createElement('div');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);
  modal.appendChild(bodyEl);

  const row = document.createElement('div');
  row.className = 'modal-actions';
  let timer = null;
  const finish = (fn) => {
    if (timer) clearInterval(timer);
    closeModal();
    if (fn) fn();
  };
  actions.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = `btn ${a.class || (i === 0 ? 'btn-primary' : '')}`;
    b.textContent = a.label;
    b.addEventListener('click', () => finish(a.onClick));
    row.appendChild(b);
    a._el = b;
  });
  if (actions.length) modal.appendChild(row);

  if (autoMs && actions[autoIndex]) {
    const base = actions[autoIndex].label;
    let remain = Math.ceil(autoMs / 1000);
    actions[autoIndex]._el.textContent = `${base} (${remain})`;
    timer = setInterval(() => {
      remain--;
      if (remain <= 0) finish(actions[autoIndex].onClick);
      else actions[autoIndex]._el.textContent = `${base} (${remain})`;
    }, 1000);
  }

  if (dismissible) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) finish(null);
    });
  }

  backdrop.appendChild(modal);
  root.appendChild(backdrop);
  current = { backdrop, timer };
  const first = modal.querySelector('button');
  if (first) first.focus();
  return () => finish(null);
}

export function closeModal() {
  if (current) {
    if (current.timer) clearInterval(current.timer);
    current.backdrop.remove();
    current = null;
  }
}

export function isModalOpen() { return !!current; }
