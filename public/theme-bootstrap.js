(function () {
  const STORAGE_KEY = "dvSmsTheme";

  function getPreferredTheme() {
    try {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        return storedTheme;
      }
    } catch (_error) {
      // Storage access disabled
    }
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const theme = getPreferredTheme();
  const root = document.documentElement;

  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
})();
