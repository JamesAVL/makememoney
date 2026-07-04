// Chase Margin's DM thread + inbox, built on the existing modal (bottom sheet
// with drag-dismiss on mobile for free). Dismissing without acking is allowed
// — the unlock only applies on the ACK button, and the unread badge plus the
// goal breadcrumb keep pointing back here. Never blocks the sim.

import { showModal, closeModal, isModalOpen } from './modal.js';
import { CHARACTERS, BEATS_BY_ID } from '../../data/story.js';
import { ackStoryBeat, unreadStory } from '../../core/story.js';
import { markAllDirty } from '../render.js';
import { sToast } from '../../audio/synth.js';
import { guruArt, brandArt } from '../art.js';

// Chase's portrait mood follows the beat's celebration weight; Blandrock is
// always the beige roundel.
function avatarArt(beat, size) {
  if (beat.from === 'blandrock') return brandArt('blandrock', size);
  const mood = beat.celebrate === 'big' ? 'hyped'
    : (beat.id === 'chase_mask_off' || beat.id === 'chase_epilogue' || beat.id === 'exit_intro') ? 'zen'
      : 'grind';
  return guruArt(mood, size);
}

let state_ = null;
export function initDM(state) { state_ = state; }

// Sender name decays to an automated account after Blandrock buys him.
export function senderName(charId, state = state_) {
  const c = CHARACTERS[charId];
  if (charId === 'chase' && state?.story.acked.blandrock_acquires) {
    return 'Chase Margin™ (automated)';
  }
  return c.name;
}

export function openDM(beatId, { readonly = false } = {}) {
  const beat = BEATS_BY_ID[beatId];
  if (!beat || !state_.story.seen[beatId]) return;
  const acked = !!state_.story.acked[beatId];
  const from = CHARACTERS[beat.from];

  const body = document.createElement('div');
  body.className = 'dm-thread';

  const head = document.createElement('div');
  head.className = 'dm-from';
  head.innerHTML = `
    <span class="dm-avatar" data-char="${from.id}">${avatarArt(beat, 40)}</span>
    <span class="dm-who"><b></b><span class="dm-handle"></span></span>`;
  head.querySelector('b').textContent = senderName(beat.from);
  head.querySelector('.dm-handle').textContent = from.handle;
  body.appendChild(head);

  const bubbles = document.createElement('div');
  bubbles.className = 'dm-bubbles';
  beat.bubbles.forEach((b, i) => {
    const el = document.createElement('div');
    const kind = typeof b === 'string' ? '' : b.kind;
    el.className = `dm-bubble${kind ? ` ${kind}` : ''}`;
    el.textContent = typeof b === 'string' ? b : b.text;
    el.style.animationDelay = readonly || acked ? '0s' : `${0.15 + i * 0.4}s`;
    bubbles.appendChild(el);
  });
  body.appendChild(bubbles);
  // Tap anywhere in the thread to skip the stagger.
  body.addEventListener('pointerdown', () => body.classList.add('dm-skip'), { once: true });

  if (beat.replies && !acked && !readonly) {
    const row = document.createElement('div');
    row.className = 'dm-replies';
    for (const r of beat.replies) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.textContent = r.label;
      btn.addEventListener('click', () => {
        row.remove();
        if (r.response) {
          const el = document.createElement('div');
          el.className = 'dm-bubble';
          el.textContent = r.response;
          bubbles.appendChild(el);
        }
      });
      row.appendChild(btn);
    }
    body.appendChild(row);
  }

  const actions = [];
  if (!acked && !readonly) {
    actions.push({
      label: beat.ackLabel || 'got it',
      class: 'btn-primary',
      onClick: () => {
        ackStoryBeat(state_, beatId);
        markAllDirty();
      },
    });
  }

  showModal({ title: beat.title, body, actions, dismissible: true, tone: 'dm' });
  sToast();
}

export function openInbox() {
  const seen = Object.entries(state_.story.seen)
    .sort((a, b) => b[1] - a[1]); // newest first
  const body = document.createElement('div');
  body.className = 'inbox-list';
  if (!seen.length) {
    body.innerHTML = '<div class="muted" style="padding:12px 4px">No messages. Suspicious, honestly.</div>';
  }
  for (const [id] of seen) {
    const beat = BEATS_BY_ID[id];
    if (!beat) continue;
    const unread = !state_.story.acked[id];
    const row = document.createElement('button');
    row.className = `inbox-row${unread ? ' unread' : ''}`;
    row.innerHTML = `
      <span class="dm-avatar" data-char="${beat.from}">${avatarArt(beat, 30)}</span>
      <span class="inbox-meta"><b></b><span class="muted"></span></span>
      ${unread ? '<span class="badge-dot" style="position:static"></span>' : ''}`;
    row.querySelector('b').textContent = beat.title;
    row.querySelector('.muted').textContent = senderName(beat.from);
    row.addEventListener('click', () => {
      closeModal();
      openDM(id, { readonly: !unread });
    });
    body.appendChild(row);
  }
  showModal({ title: '📩 Mentorship', body, actions: [], dismissible: true, tone: 'dm' });
}

// Deliver a beat: auto-open the sheet when allowed, else fall back to a toast
// + the persistent unread badge. Called by onboard.js on story:beat.
export function deliverDM(beatId, toastFn) {
  const beat = BEATS_BY_ID[beatId];
  if (!beat) return;
  if (beat.autoOpen && !isModalOpen()) {
    openDM(beatId);
    return;
  }
  toastFn({
    icon: avatarArt(beat, 24),
    name: `DM from ${senderName(beat.from)}`,
    sub: beat.title,
    tone: 'dm',
    ms: 8000,
    onClick: () => { if (!isModalOpen()) openDM(beatId); },
  });
}

export { unreadStory };
