// Theme switcher: stamps data-theme on the root element and keeps the
// browser-chrome color in sync. 'dark' is the brand default; 'light' exists
// for daywalkers.

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = theme === 'light' ? '#eef1f6' : '#0b0e14';
}
