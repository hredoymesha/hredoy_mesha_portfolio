/* Sets the colour theme before the first paint (kept as a separate file so the Content-Security-Policy needs no inline scripts). */
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", saved || system);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
