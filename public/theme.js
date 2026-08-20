const STORAGE_KEY = "dvSmsTheme";
const THEME_EVENT = "dv-theme-change";

function getRoot() {
  return document.documentElement;
}

function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch (_error) {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getCurrentTheme() {
  return getRoot().getAttribute("data-theme") || getStoredTheme() || getSystemTheme();
}

export function readThemePalette() {
  const styles = window.getComputedStyle(getRoot());
  return {
    chartLine: styles.getPropertyValue("--chart-1").trim() || "#e05322",
    chartFill: styles.getPropertyValue("--chart-fill").trim() || "rgba(224, 83, 34, 0.08)",
    chartGrid: styles.getPropertyValue("--chart-grid").trim() || "rgba(232, 232, 232, 0.8)",
    chartSeries: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"].map((token, index) => {
      const value = styles.getPropertyValue(token).trim();
      const fallback = ["#e05322", "#3b82f6", "#4caf50", "#9b9b9b", "#df514c"][index];
      return value || fallback;
    })
  };
}

function emitThemeChange(theme) {
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
}

function updateToggleLabel(button, theme) {
  const label = button.querySelector("[data-theme-label]");
  if (label) {
    label.textContent = theme === "dark" ? "Dark" : "Light";
  }

  const targetTheme = theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${targetTheme} mode`);
  button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  button.dataset.themeState = theme;
}

export function applyTheme(theme, options = {}) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  const root = getRoot();
  const persist = options.persist !== false;
  const emit = options.emit !== false;

  root.setAttribute("data-theme", nextTheme);
  root.style.colorScheme = nextTheme;

  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (_error) {
      // Storage access disabled
    }
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    updateToggleLabel(button, nextTheme);
  });

  if (emit) {
    emitThemeChange(nextTheme);
  }

  return nextTheme;
}

function bindToggleButton(button) {
  if (button.dataset.themeBound === "true") {
    updateToggleLabel(button, getCurrentTheme());
    return;
  }

  button.dataset.themeBound = "true";
  updateToggleLabel(button, getCurrentTheme());

  button.addEventListener("click", () => {
    const nextTheme = getCurrentTheme() === "dark" ? "light" : "dark";
    getRoot().classList.add("theme-transitioning");
    applyTheme(nextTheme, { persist: true, emit: true });
    window.setTimeout(() => {
      getRoot().classList.remove("theme-transitioning");
    }, 260);
  });
}

export function bindThemeControls() {
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    bindToggleButton(button);
  });
}

export function initThemeSystem() {
  applyTheme(getStoredTheme() || getCurrentTheme(), { persist: false, emit: false });
  bindThemeControls();
}

export function onThemeChange(handler) {
  if (typeof handler !== "function") {
    return () => undefined;
  }

  document.addEventListener(THEME_EVENT, handler);
  return () => document.removeEventListener(THEME_EVENT, handler);
}
