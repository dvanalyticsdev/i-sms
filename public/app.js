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

// Render dynamic elements
document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  initThemeSystem();

  if (!isLoginPage) {
    // Inject active user name and role tags
    const userStr = localStorage.getItem("smsUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      const profileContainer = document.querySelector(".topbar-profile");
      if (profileContainer) {
        // Prepend user badge/name
        const spanName = document.createElement("span");
        spanName.className = "user-name-tag";
        spanName.textContent = user.name;

        const spanRole = document.createElement("span");
        spanRole.className = "role-tag";
        spanRole.textContent = user.role;

        profileContainer.insertBefore(spanRole, profileContainer.firstChild);
        profileContainer.insertBefore(spanName, profileContainer.firstChild);
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
        <span>Alerts & Notifications</span>
        <span>${activeAlerts.length} Active</span>
      </div>
      <div class="bell-dropdown-body">
        ${activeAlerts.length === 0 ? '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">No active warnings</div>' : ''}
        ${activeAlerts.map(a => `
          <div class="bell-notification-item" data-alert-id="${a.id}">
            <div style="font-weight:700;color:var(--primary);margin-bottom:2px;">${a.type}</div>
            <div>${a.text}</div>
            <div style="text-align:right;margin-top:4px;">
              <button class="alert-dismiss" style="font-size:10px;">Dismiss</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("is-open");
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("is-open");
    });

    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Dismiss button click handler
    dropdown.querySelectorAll(".alert-dismiss").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const item = e.target.closest(".bell-notification-item");
        const alertId = item.dataset.alertId;
        await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
        item.remove();
        // Recalculate badge and count
        const currentCount = dropdown.querySelectorAll(".bell-notification-item").length;
        dropdown.querySelector(".bell-dropdown-header span:last-child").textContent = `${currentCount} Active`;
        if (currentCount === 0) {
          dropdown.querySelector(".bell-dropdown-body").innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-muted);">No active warnings</div>';
          bellBtn.querySelector(".bell-badge")?.remove();
        } else {
          bellBtn.querySelector(".bell-badge").textContent = currentCount;
        }
      });
    });

    bellContainer.insertBefore(dropdown, bellContainer.firstChild);
    bellContainer.insertBefore(bellBtn, bellContainer.firstChild);

  } catch (err) {
    console.error("Failed to load alerts:", err);
  }
}
