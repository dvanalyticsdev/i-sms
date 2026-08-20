(function () {
  const STORAGE_KEY = "dvSmsTheme";
  const path = decodeURIComponent(window.location.pathname);
  const isLoginPage = path.includes("index.html") || path.endsWith("/");

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

  if (!isLoginPage) {
    root.classList.add("app-shell-pending");

    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "app-shell-loading";
    loadingOverlay.setAttribute("aria-live", "polite");
    loadingOverlay.innerHTML = `
      <div class="app-shell-loading__content">
        <div class="app-shell-loading__dot" aria-hidden="true"></div>
        <div class="app-shell-loading__text" style="font-family: 'Plus Jakarta Sans', sans-serif;">i-SMS Platform</div>
        <div class="app-shell-loading__timer">0.0s</div>
      </div>
    `;
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(loadingOverlay);
      const timerElement = loadingOverlay.querySelector(".app-shell-loading__timer");
      const startedAt = Date.now();
      timerElement.textContent = "0.0s";
      window.__dvLoadingOverlayTimer = window.setInterval(() => {
        const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        if (timerElement) {
          timerElement.textContent = `${elapsedSeconds}s`;
        }
      }, 100);
    }, { once: true });
  }
})();
