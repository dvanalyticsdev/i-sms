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

const SIDEBAR_CONFIG = {
  "student-performance-dashboard.html": {
    name: "Performance Dashboard",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
  },
  "student-review-dashboard.html": {
    name: "Review Dashboard",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
  },
  "performance.html": {
    name: "Performance Management",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
  },
  "feedback.html": {
    name: "Review Management",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`
  },
  "dashboard.html": {
    name: "Analytics Dashboard",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>`
  },
  "logout": {
    name: "Log out",
    icon: `<svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
  }
};

function initSidebar() {
  const layoutRoot = document.querySelector(".layout-root");
  const sidebarBrand = document.querySelector(".sidebar-brand");
  if (!layoutRoot || !sidebarBrand) return;

  if (localStorage.getItem("smsSidebarCollapsed") === "true") {
    layoutRoot.classList.add("sidebar-collapsed");
  }

  document.querySelectorAll(".sidebar-nav .sidebar-link").forEach(link => {
    const href = link.getAttribute("href") || "";
    const cfg = SIDEBAR_CONFIG[href] || SIDEBAR_CONFIG["performance.html"];
    link.setAttribute("data-tooltip", cfg.name);
    link.setAttribute("aria-label", cfg.name);
    link.innerHTML = `
      <div class="sidebar-icon-wrap">${cfg.icon}</div>
      <span class="sidebar-link-text">${cfg.name}</span>
    `;
  });

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    const cfg = SIDEBAR_CONFIG["logout"];
    logoutBtn.setAttribute("data-tooltip", cfg.name);
    logoutBtn.setAttribute("aria-label", cfg.name);
    logoutBtn.innerHTML = `
      <div class="sidebar-icon-wrap">${cfg.icon}</div>
      <span class="sidebar-link-text">${cfg.name}</span>
    `;
  }

  sidebarBrand.style.cursor = "pointer";
  sidebarBrand.setAttribute("title", "Click to expand / collapse sidebar");
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
