import { initThemeSystem } from './theme.js';

export async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'API Request failed');
    }
    return await res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    alert(error.message);
    throw error;
  }
}

const SIDEBAR_ICONS = {
  "performance.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
  "feedback.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  "dashboard.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  "logout": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
};

function initSidebar() {
  const layoutRoot = document.querySelector(".layout-root");
  const sidebarBrand = document.querySelector(".sidebar-brand");
  if (!layoutRoot || !sidebarBrand) return;

  if (localStorage.getItem("smsSidebarCollapsed") === "true") {
    layoutRoot.classList.add("sidebar-collapsed");
  }

  document.querySelectorAll(".sidebar-nav .sidebar-link").forEach(link => {
    if (!link.querySelector(".sidebar-link-text")) {
      const href = link.getAttribute("href") || "";
      const text = link.textContent.trim();
      const iconHtml = SIDEBAR_ICONS[href] || SIDEBAR_ICONS["performance.html"];
      link.setAttribute("title", text);
      link.innerHTML = `${iconHtml}<span class="sidebar-link-text">${text}</span>`;
    }
  });

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn && !logoutBtn.querySelector(".sidebar-link-text")) {
    const text = logoutBtn.textContent.trim();
    logoutBtn.setAttribute("title", text);
    logoutBtn.innerHTML = `${SIDEBAR_ICONS["logout"]}<span class="sidebar-link-text">${text}</span>`;
  }

  sidebarBrand.style.cursor = "pointer";
  sidebarBrand.setAttribute("title", "Toggle side panel");
  sidebarBrand.addEventListener("click", (e) => {
    e.preventDefault();
    const isCollapsed = layoutRoot.classList.toggle("sidebar-collapsed");
    localStorage.setItem("smsSidebarCollapsed", isCollapsed ? "true" : "false");
  });
}

function bootApp() {
  initThemeSystem();
  initSidebar();

  let userStr = localStorage.getItem("smsUser");
  if (!userStr) {
    const defaultUser = { username: "admin", role: "Administrator", name: "Admin Officer" };
    localStorage.setItem("smsUser", JSON.stringify(defaultUser));
    userStr = JSON.stringify(defaultUser);
  }

  const user = JSON.parse(userStr);
  const profileContainer = document.querySelector(".topbar-profile");
  if (profileContainer) {
    profileContainer.innerHTML = `
      <span class="role-tag" title="Role: ${user.role}">
        <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        ${user.role}
      </span>
    `;
  }

  const currentPath = decodeURIComponent(window.location.pathname);
  const currentPage = currentPath.split("/").pop() || "performance.html";
  document.querySelectorAll(".sidebar-link").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage) {
      link.classList.add("is-active");
    } else {
      link.classList.remove("is-active");
    }
  });

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("smsUser");
      window.location.href = "index.html";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
