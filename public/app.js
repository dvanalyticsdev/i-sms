import { initThemeSystem } from './theme.js';

// Authentication Check
const path = decodeURIComponent(window.location.pathname);
const isLoginPage = path.includes("index.html") || path.endsWith("/");

function checkAuth() {
  if (isLoginPage) return;
  const userStr = localStorage.getItem("smsUser");
  if (!userStr) {
    window.location.href = "index.html";
  }
}

// Reveal App Shell loader
function revealAppShell() {
  if (window.__dvLoadingOverlayTimer) {
    window.clearInterval(window.__dvLoadingOverlayTimer);
    delete window.__dvLoadingOverlayTimer;
  }
  document.documentElement.classList.remove("app-shell-pending");
  document.querySelector(".app-shell-loading")?.remove();
}

// Global API helpers
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
  "dashboard.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
  "students.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  "performance.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
  "relationship.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
  "srm-dashboard.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`,
  "reports.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  "analytics.html": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
  "logout": `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
};

function initSidebar() {
  const layoutRoot = document.querySelector(".layout-root");
  const sidebarBrand = document.querySelector(".sidebar-brand");
  if (!layoutRoot || !sidebarBrand) return;

  // Restore saved collapse state
  if (localStorage.getItem("smsSidebarCollapsed") === "true") {
    layoutRoot.classList.add("sidebar-collapsed");
  }

  // Enhance links with icons and text wrappers if not already present
  document.querySelectorAll(".sidebar-nav .sidebar-link").forEach(link => {
    if (!link.querySelector(".sidebar-link-text")) {
      const href = link.getAttribute("href") || "";
      const text = link.textContent.trim();
      const iconHtml = SIDEBAR_ICONS[href] || SIDEBAR_ICONS["dashboard.html"];
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

  // Set up click on logo/brand to toggle side panel
  sidebarBrand.style.cursor = "pointer";
  sidebarBrand.setAttribute("title", "Click logo to collapse / expand side panel");

  sidebarBrand.addEventListener("click", (e) => {
    e.preventDefault();
    const isCollapsed = layoutRoot.classList.toggle("sidebar-collapsed");
    localStorage.setItem("smsSidebarCollapsed", isCollapsed ? "true" : "false");
  });
}

// Render dynamic elements
document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  initThemeSystem();

  if (!isLoginPage) {
    initSidebar();

    // Inject active user role tag (without showing admin name)
    const userStr = localStorage.getItem("smsUser");
    if (userStr) {
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
    }

    // Set active link in sidebar
    const currentPage = path.split("/").pop() || "dashboard.html";
    document.querySelectorAll(".sidebar-link").forEach(link => {
      const href = link.getAttribute("href");
      if (href === currentPage) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });

    // Wire up logout button
    const logoutBtn = document.querySelector("[data-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("smsUser");
        window.location.href = "index.html";
      });
    }

    // Load active notifications/alerts in the topbar dropdown
    await loadTopbarAlerts();
  }

  // Resolve loading overlay
  window.setTimeout(revealAppShell, 500);
});

async function loadTopbarAlerts() {
  const bellContainer = document.querySelector(".topbar-actions");
  if (!bellContainer) return;

  // Check if bell already exists
  if (document.getElementById("notificationsBell")) return;

  // Fetch alerts from backend
  try {
    const data = await apiFetch('/api/dashboard/sms');
    const activeAlerts = data.alerts || [];

    // Create bell elements
    const bellBtn = document.createElement("button");
    bellBtn.id = "notificationsBell";
    bellBtn.className = "bell-btn";
    bellBtn.type = "button";
    bellBtn.title = "View Alerts & Notifications";
    bellBtn.innerHTML = `
      <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      ${activeAlerts.length > 0 ? `<span class="bell-badge">${activeAlerts.length}</span>` : ''}
    `;

    const dropdown = document.createElement("div");
    dropdown.className = "bell-dropdown";
    dropdown.innerHTML = `
      <div class="bell-dropdown-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span>Alerts & Notifications</span>
          <span class="bell-active-count" style="font-size:11px;font-weight:600;color:var(--text-muted);">${activeAlerts.length} Active</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="bell-clear-all" id="clearAllNotificationsBtn" style="${activeAlerts.length === 0 ? 'display:none;' : ''}">Clear All</button>
          <button type="button" class="bell-close-btn" id="closeNotificationsBtn" title="Close Panel" aria-label="Close">&times;</button>
        </div>
      </div>
      <div class="bell-dropdown-body">
        ${activeAlerts.length === 0 ? '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">No active warnings</div>' : ''}
        ${activeAlerts.map(a => `
          <div class="bell-notification-item" data-alert-id="${a.id}">
            <div style="font-weight:700;color:var(--primary);margin-bottom:2px;">${a.type}</div>
            <div>${a.text}</div>
            <div style="text-align:right;margin-top:4px;">
              <button type="button" class="alert-dismiss" style="font-size:10px;">Dismiss</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Toggle dropdown on bell button click
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("is-open");
    });

    // Close on click outside
    document.addEventListener("click", () => {
      dropdown.classList.remove("is-open");
    });

    // Prevent clicks inside dropdown body from bubbling, unless dismissing/closing
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Close panel button
    const closeBtn = dropdown.querySelector("#closeNotificationsBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.remove("is-open");
      });
    }

    // Clear All button handler
    const clearAllBtn = dropdown.querySelector("#clearAllNotificationsBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await apiFetch('/api/alerts/clear-all', { method: 'POST' });
        } catch (err) {
          console.warn("Clear-all endpoint fallback:", err);
        }
        // Update UI
        dropdown.querySelector(".bell-dropdown-body").innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">No active warnings</div>';
        dropdown.querySelector(".bell-active-count").textContent = '0 Active';
        clearAllBtn.style.display = 'none';
        bellBtn.querySelector(".bell-badge")?.remove();
        // Clear banner alerts on page if present
        document.querySelectorAll(".alerts-banner, .alert-item").forEach(el => el.remove());
      });
    }

    // Individual dismiss buttons
    dropdown.addEventListener("click", async (e) => {
      const dismissBtn = e.target.closest(".alert-dismiss");
      if (dismissBtn) {
        e.stopPropagation();
        const item = dismissBtn.closest(".bell-notification-item");
        const alertId = item?.dataset.alertId;
        if (alertId) {
          try {
            await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
          } catch (err) {
            console.warn("Alert dismiss fallback:", err);
          }
        }
        item?.remove();
        // Recalculate badge and count
        const currentCount = dropdown.querySelectorAll(".bell-notification-item").length;
        dropdown.querySelector(".bell-active-count").textContent = `${currentCount} Active`;
        if (currentCount === 0) {
          dropdown.querySelector(".bell-dropdown-body").innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">No active warnings</div>';
          bellBtn.querySelector(".bell-badge")?.remove();
          if (clearAllBtn) clearAllBtn.style.display = 'none';
        } else {
          const badge = bellBtn.querySelector(".bell-badge");
          if (badge) badge.textContent = currentCount;
        }
      }
    });

    bellContainer.insertBefore(dropdown, bellContainer.firstChild);
    bellContainer.insertBefore(bellBtn, bellContainer.firstChild);

  } catch (err) {
    console.error("Failed to load alerts:", err);
  }
}
