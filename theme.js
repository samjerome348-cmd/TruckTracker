// Applies the saved theme (or system preference) and wires up the toggle switch.
// The "apply immediately" part happens in an inline script in each page's <head>
// so there's no flash of the wrong theme — this file just handles the click.
(function () {
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('truck-tracker-theme', theme);
  }
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
})();