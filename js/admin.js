/**
 * js/admin.js - School Website Admin Authentication & Dashboard
 * 
 * Implements:
 * 1. Admin login via Supabase Auth (email + password)
 * 2. Session verification on every admin page load (auto-redirect to login if unauthenticated)
 * 3. Role authorization check (queries public.profiles; rejects non-admins with "Access Denied")
 * 4. Secure global log out handler (supabase.auth.signOut)
 * 5. Dashboard real-time statistics (unread messages, pending applications, news, events, gallery)
 */

import { supabase } from './supabaseClient.js';
import { escapeHtml, formatDate } from './utils.js';

/**
 * Checks if the current visitor has an active authenticated session
 * and possesses the 'admin' role in public.profiles.
 * 
 * If unauthenticated: redirects to login.html.
 * If authenticated but non-admin: signs out and shows Access Denied.
 * If admin: invokes onAuthorized callback with session & profile.
 */
export async function checkAdminAuth() {
  const loadingOverlay = document.getElementById('admin-auth-loading');

  try {
    // 1. Get current session from Supabase Auth
    // SUPABASE CALL: Check user authentication session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Not logged in -> redirect to login
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?redirect=${currentPath}`;
      return null;
    }

    // 2. Fetch user's profile to verify 'admin' role
    // SUPABASE CALL: Verify user profile role in public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.warn('Unauthorized access attempt by non-admin user:', session.user.email);
      // Access Denied: sign out immediately
      await supabase.auth.signOut();

      // If page has a dedicated container, show access denied card
      const mainContainer = document.querySelector('main') || document.body;
      mainContainer.innerHTML = `
        <div class="access-denied-box" role="alert">
          <div class="access-denied-icon" aria-hidden="true">🚫</div>
          <h1 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #dc2626;">Access Denied</h1>
          <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1.5rem;">
            This portal is strictly restricted to St. Augustine International Academy administrators.
            Your account (<strong>${escapeHtml(session.user.email)}</strong>) does not have administrative privileges.
          </p>
          <a href="login.html" class="btn btn-primary btn-block">Return to Staff Login</a>
        </div>
      `;
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      return null;
    }

    // Hide auth loading overlay
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }

    // Display admin user details in the header
    setupAdminHeader(profile);
    setupLogoutButtons();

    return { session, user: session.user, profile };

  } catch (err) {
    console.error('Admin authentication check error:', err);
    window.location.href = 'login.html';
    return null;
  }
}

/**
 * Configures the admin header user information and active nav highlight
 */
export function setupAdminHeader(profile) {
  const userNameElem = document.getElementById('admin-user-name');
  const userRoleElem = document.getElementById('admin-user-role');

  if (userNameElem) {
    userNameElem.textContent = profile.full_name || profile.email;
  }
  if (userRoleElem) {
    userRoleElem.textContent = `${profile.role} Portal`;
  }
}

/**
 * Attaches sign-out functionality to all log out triggers
 */
export function setupLogoutButtons() {
  const logoutButtons = document.querySelectorAll('.admin-logout-btn, #logout-btn');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = 'Logging out...';
      try {
        // SUPABASE CALL: Terminate active authentication session
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        window.location.href = 'login.html';
      }
    });
  });
}

/**
 * Handles the login form on admin/login.html
 */
export function initLoginForm() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  const statusMsg = document.getElementById('login-status-msg');
  const submitBtn = document.getElementById('login-submit-btn');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  // Check URL query parameters for notifications (e.g. ?error=access_denied)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('error') === 'access_denied') {
    showLoginBanner(statusMsg, 'error', 'Access Denied', 'Your account does not have administrator privileges.');
  }

  // If already logged in as admin, redirect to dashboard automatically
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.role === 'admin') {
        window.location.href = 'dashboard.html';
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginBanner(statusMsg);

    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value;

    if (!emailVal || !passwordVal) {
      showLoginBanner(statusMsg, 'error', 'Missing Credentials', 'Please enter both your email address and password.');
      return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Authenticating...';

    try {
      // -----------------------------------------------------------------------
      // SUPABASE CALL: Sign in with email and password
      // -----------------------------------------------------------------------
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passwordVal
      });

      if (error) {
        throw error;
      }

      // Check role in profiles
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profErr || !profile || profile.role !== 'admin') {
        // Sign out non-admins immediately
        await supabase.auth.signOut();
        showLoginBanner(
          statusMsg,
          'error',
          'Access Denied',
          'This account does not have administrative permissions. Please contact the IT department.'
        );
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      // Successful admin login
      showLoginBanner(statusMsg, 'success', 'Login Successful', 'Redirecting to admin dashboard...');
      setTimeout(() => {
        const redirectParam = urlParams.get('redirect');
        window.location.href = redirectParam ? decodeURIComponent(redirectParam) : 'dashboard.html';
      }, 700);

    } catch (err) {
      console.error('Login error:', err);
      let errorText = 'Invalid email or password. Please check your credentials and try again.';
      if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
        errorText = 'Email confirmation pending. Please verify your email or check Supabase auth settings.';
      }
      showLoginBanner(statusMsg, 'error', 'Authentication Failed', errorText);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

function showLoginBanner(container, type, title, message) {
  if (!container) return;
  container.className = `form-status-msg ${type}`;
  container.innerHTML = `
    <div style="font-size: 1.25rem; line-height: 1; flex-shrink: 0;" aria-hidden="true">
      ${type === 'success' ? '✅' : '⚠️'}
    </div>
    <div>
      <strong style="display: block; margin-bottom: 2px;">${title}</strong>
      <span>${message}</span>
    </div>
  `;
}

function clearLoginBanner(container) {
  if (!container) return;
  container.className = 'form-status-msg';
  container.innerHTML = '';
}

/**
 * Loads real-time counts and recent submissions for the Admin Dashboard
 */
export async function loadDashboardStats() {
  // Elements
  const unreadMsgElem = document.getElementById('stat-unread-messages');
  const pendingAppsElem = document.getElementById('stat-pending-apps');
  const newsCountElem = document.getElementById('stat-published-news');
  const eventsCountElem = document.getElementById('stat-events-count');
  const galleryCountElem = document.getElementById('stat-gallery-count');

  try {
    // 1. Unread Contact Messages Count
    // SUPABASE CALL: Count unread messages in contact_messages
    const { count: unreadMessages, error: msgError } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (unreadMsgElem) {
      unreadMsgElem.textContent = msgError ? '--' : (unreadMessages ?? 0);
    }

    // 2. Pending Admission Applications Count
    // SUPABASE CALL: Count pending applications in admission_applications
    const { count: pendingApps, error: appError } = await supabase
      .from('admission_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingAppsElem) {
      pendingAppsElem.textContent = appError ? '--' : (pendingApps ?? 0);
    }

    // 3. Published News Count
    // SUPABASE CALL: Count published posts in news
    const { count: publishedNews, error: newsError } = await supabase
      .from('news')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    if (newsCountElem) {
      newsCountElem.textContent = newsError ? '--' : (publishedNews ?? 0);
    }

    // 4. Upcoming / Total Events Count
    // SUPABASE CALL: Count total events in events
    const { count: totalEvents, error: eventsError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (eventsCountElem) {
      eventsCountElem.textContent = eventsError ? '--' : (totalEvents ?? 0);
    }

    // 5. Total Gallery Items Count
    // SUPABASE CALL: Count gallery items in gallery_items
    const { count: totalGallery, error: galleryError } = await supabase
      .from('gallery_items')
      .select('*', { count: 'exact', head: true });

    if (galleryCountElem) {
      galleryCountElem.textContent = galleryError ? '--' : (totalGallery ?? 0);
    }

    // Load recent unread messages preview
    loadRecentInquiriesPreview();

    // Load recent pending applications preview
    loadRecentApplicationsPreview();

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

/**
 * Loads recent contact messages for dashboard quick preview
 */
async function loadRecentInquiriesPreview() {
  const container = document.getElementById('dashboard-recent-messages');
  if (!container) return;

  try {
    // SUPABASE CALL: Fetch latest 5 contact messages
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('id, name, email, phone, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !messages || messages.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.9rem;">
          No contact messages received yet.
        </div>
      `;
      return;
    }

    container.innerHTML = messages.map(msg => `
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 0.95rem;">${escapeHtml(msg.name)}</strong>
            ${msg.is_read ? '<span style="font-size: 0.7rem; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">Read</span>' : '<span style="font-size: 0.7rem; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-weight: 700;">Unread</span>'}
          </div>
          <p style="font-size: 0.85rem; color: #475569; margin-bottom: 4px; line-height: 1.4;">
            ${escapeHtml(msg.message.length > 90 ? msg.message.slice(0, 90) + '...' : msg.message)}
          </p>
          <span style="font-size: 0.75rem; color: #94a3b8;">${formatDate(msg.created_at)} &bull; ${escapeHtml(msg.email)}</span>
        </div>
        <a href="messages.html" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 4px 10px;">Review</a>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error fetching recent inquiries:', err);
  }
}

/**
 * Loads recent admission applications for dashboard quick preview
 */
async function loadRecentApplicationsPreview() {
  const container = document.getElementById('dashboard-recent-applications');
  if (!container) return;

  try {
    // SUPABASE CALL: Fetch latest 5 admission applications
    const { data: apps, error } = await supabase
      .from('admission_applications')
      .select('id, child_name, class_applying_for, parent_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !apps || apps.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: #64748b; font-size: 0.9rem;">
          No admission applications received yet.
        </div>
      `;
      return;
    }

    container.innerHTML = apps.map(app => `
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 0.95rem;">${escapeHtml(app.child_name)}</strong>
            <span style="font-size: 0.7rem; color: #1e3a8a; background: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${escapeHtml(app.class_applying_for)}</span>
          </div>
          <p style="font-size: 0.85rem; color: #475569; margin-bottom: 4px;">
            Parent: ${escapeHtml(app.parent_name)} &bull; Status: <strong style="text-transform: capitalize;">${escapeHtml(app.status)}</strong>
          </p>
          <span style="font-size: 0.75rem; color: #94a3b8;">Submitted ${formatDate(app.created_at)}</span>
        </div>
        <a href="applications.html" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 4px 10px;">View</a>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error fetching recent applications:', err);
  }
}
