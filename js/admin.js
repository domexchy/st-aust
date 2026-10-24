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

  // ---------------------------------------------------------------------------
  // Google OAuth Sign-In Handler
  // ---------------------------------------------------------------------------
  const googleBtn = document.getElementById('google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      clearLoginBanner(statusMsg);
      const originalGoogleText = googleBtn.innerHTML;
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Connecting to Google...';

      try {
        // Redirect destination: dynamically handles local dev and live GitHub Pages
        const redirectParam = urlParams.get('redirect');
        const targetUrl = redirectParam 
          ? new URL(decodeURIComponent(redirectParam), window.location.href).href 
          : new URL('dashboard.html', window.location.href).href;

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: targetUrl
          }
        });

        if (error) throw error;

      } catch (err) {
        console.error('Google OAuth error:', err);
        showLoginBanner(
          statusMsg, 
          'error', 
          'Google Sign-In Failed', 
          err.message || 'Could not connect to Google. Please check your Supabase provider configuration.'
        );
        googleBtn.disabled = false;
        googleBtn.innerHTML = originalGoogleText;
      }
    });
  }
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

/* =============================================================================
   HELPER: Upload file to Supabase Storage bucket 'school-media'
   ============================================================================= */
async function uploadMediaFile(file, folder = 'general') {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${Date.now()}_${cleanName}`;

  // SUPABASE CALL: Upload image into 'school-media' storage bucket
  const { data, error } = await supabase.storage
    .from('school-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.warn('Storage upload error (falling back to external/mock URL if bucket unprovisioned):', error);
    throw error;
  }

  // SUPABASE CALL: Get public URL for uploaded asset
  const { data: { publicUrl } } = supabase.storage
    .from('school-media')
    .getPublicUrl(filePath);

  return publicUrl;
}

/* =============================================================================
   PHASE 6.1: NEWS MANAGER (admin/news.html)
   ============================================================================= */
export async function initNewsManager() {
  const tableBody = document.getElementById('news-table-body');
  const addBtn = document.getElementById('btn-add-news');
  const modal = document.getElementById('news-modal');
  const closeModalBtn = document.getElementById('btn-close-news-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-news-modal');
  const form = document.getElementById('news-form');
  const modalTitle = document.getElementById('news-modal-title');
  const formStatus = document.getElementById('news-form-status');
  const submitBtn = document.getElementById('news-submit-btn');

  const idInput = document.getElementById('news-id');
  const titleInput = document.getElementById('news-title');
  const slugInput = document.getElementById('news-slug');
  const summaryInput = document.getElementById('news-summary');
  const bodyInput = document.getElementById('news-body');
  const coverUrlInput = document.getElementById('news-cover-url');
  const coverFileInput = document.getElementById('news-cover-file');
  const publishedCheckbox = document.getElementById('news-is-published');

  function openModal(item = null) {
    form.reset();
    clearLoginBanner(formStatus);
    if (item) {
      modalTitle.textContent = 'Edit News Article';
      idInput.value = item.id;
      titleInput.value = item.title || '';
      slugInput.value = item.slug || '';
      summaryInput.value = item.summary || '';
      bodyInput.value = item.body || '';
      coverUrlInput.value = item.cover_image_url || '';
      publishedCheckbox.checked = Boolean(item.is_published);
    } else {
      modalTitle.textContent = 'Create News Article';
      idInput.value = '';
      publishedCheckbox.checked = true;
    }
    modal.removeAttribute('hidden');
    titleInput.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
  }

  addBtn?.addEventListener('click', () => openModal());
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  // Auto-generate slug from title if slug not manually typed
  titleInput?.addEventListener('input', () => {
    if (!idInput.value) {
      slugInput.value = titleInput.value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }
  });

  async function loadPosts() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading news articles...</td></tr>';

    try {
      // SUPABASE CALL: Fetch all news articles (admin full access)
      const { data: posts, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!posts || posts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No articles created yet. Click "Add News Article" to publish school stories.</td></tr>';
        return;
      }

      tableBody.innerHTML = posts.map(post => `
        <tr>
          <td style="width: 72px;">
            <img src="${escapeHtml(post.cover_image_url || '../images/placeholder-school.jpg')}" alt="" style="width: 60px; height: 42px; object-fit: cover; border-radius: 4px; background: #e2e8f0;">
          </td>
          <td>
            <strong style="color: #0f172a; display: block;">${escapeHtml(post.title)}</strong>
            <small style="color: #64748b;">/${escapeHtml(post.slug)}</small>
          </td>
          <td>
            <span class="status-badge ${post.is_published ? 'published' : 'draft'}">
              ${post.is_published ? 'Published' : 'Draft'}
            </span>
          </td>
          <td>${formatDate(post.published_at || post.created_at)}</td>
          <td>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn btn-outline btn-sm btn-edit-post" data-id="${post.id}">Edit</button>
              <button type="button" class="btn btn-outline btn-sm btn-toggle-post" data-id="${post.id}" data-published="${post.is_published}">
                ${post.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-delete-post" data-id="${post.id}" style="color: #dc2626; border-color: #fca5a5;">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      // Wire edit buttons
      tableBody.querySelectorAll('.btn-edit-post').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = posts.find(p => p.id === btn.dataset.id);
          if (item) openModal(item);
        });
      });

      // Wire toggle publish
      tableBody.querySelectorAll('.btn-toggle-post').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const current = btn.dataset.published === 'true';
          btn.disabled = true;
          // SUPABASE CALL: Toggle is_published state on news
          await supabase
            .from('news')
            .update({
              is_published: !current,
              published_at: !current ? new Date().toISOString() : null
            })
            .eq('id', id);
          loadPosts();
        });
      });

      // Wire delete
      tableBody.querySelectorAll('.btn-delete-post').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Are you sure you want to delete this news article? This action cannot be undone.')) return;
          btn.disabled = true;
          // SUPABASE CALL: Delete news article by id
          await supabase.from('news').delete().eq('id', btn.dataset.id);
          loadPosts();
        });
      });

    } catch (err) {
      console.error('Error loading news:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">Failed to load news articles. ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Form submit handler (Add / Edit)
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginBanner(formStatus);

    const title = titleInput.value.trim();
    const slug = slugInput.value.trim();
    const summary = summaryInput.value.trim();
    const body = bodyInput.value.trim();
    let coverUrl = coverUrlInput.value.trim();
    const isPublished = publishedCheckbox.checked;
    const postId = idInput.value;

    if (!title || !slug || !summary || !body) {
      showLoginBanner(formStatus, 'error', 'Incomplete Form', 'Please provide title, slug, summary and body.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Saving Post...';

    try {
      // If user uploaded a new cover image file, try uploading to storage
      if (coverFileInput?.files?.[0]) {
        try {
          const uploadedUrl = await uploadMediaFile(coverFileInput.files[0], 'news');
          if (uploadedUrl) coverUrl = uploadedUrl;
        } catch (uploadErr) {
          console.warn('Cover image file upload failed, proceeding with URL if available:', uploadErr);
        }
      }

      const payload = {
        title,
        slug,
        summary,
        body,
        cover_image_url: coverUrl || null,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null
      };

      if (postId) {
        // SUPABASE CALL: Update existing news post
        const { error } = await supabase
          .from('news')
          .update(payload)
          .eq('id', postId);
        if (error) throw error;
      } else {
        // SUPABASE CALL: Insert new news post
        const { error } = await supabase
          .from('news')
          .insert([payload]);
        if (error) throw error;
      }

      closeModal();
      loadPosts();

    } catch (err) {
      console.error('Error saving news post:', err);
      showLoginBanner(formStatus, 'error', 'Save Failed', err.message || 'Could not save post.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Article';
    }
  });

  loadPosts();
}

/* =============================================================================
   PHASE 6.2: EVENTS MANAGER (admin/events.html)
   ============================================================================= */
export async function initEventsManager() {
  const tableBody = document.getElementById('events-table-body');
  const addBtn = document.getElementById('btn-add-event');
  const modal = document.getElementById('event-modal');
  const closeModalBtn = document.getElementById('btn-close-event-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-event-modal');
  const form = document.getElementById('event-form');
  const modalTitle = document.getElementById('event-modal-title');
  const formStatus = document.getElementById('event-form-status');
  const submitBtn = document.getElementById('event-submit-btn');

  const idInput = document.getElementById('event-id');
  const titleInput = document.getElementById('event-title');
  const dateInput = document.getElementById('event-date');
  const startTimeInput = document.getElementById('event-start-time');
  const endTimeInput = document.getElementById('event-end-time');
  const locationInput = document.getElementById('event-location');
  const descInput = document.getElementById('event-description');
  const publishedCheckbox = document.getElementById('event-is-published');

  function openModal(item = null) {
    form.reset();
    clearLoginBanner(formStatus);
    if (item) {
      modalTitle.textContent = 'Edit School Event';
      idInput.value = item.id;
      titleInput.value = item.title || '';
      dateInput.value = item.event_date || '';
      startTimeInput.value = item.start_time || '';
      endTimeInput.value = item.end_time || '';
      locationInput.value = item.location || '';
      descInput.value = item.description || '';
      publishedCheckbox.checked = Boolean(item.is_published);
    } else {
      modalTitle.textContent = 'Schedule New Event';
      idInput.value = '';
      publishedCheckbox.checked = true;
    }
    modal.removeAttribute('hidden');
    titleInput.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
  }

  addBtn?.addEventListener('click', () => openModal());
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  async function loadEvents() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading calendar events...</td></tr>';

    try {
      // SUPABASE CALL: Fetch all events
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;

      if (!events || events.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No events scheduled yet. Click "Schedule New Event" to post calendar dates.</td></tr>';
        return;
      }

      tableBody.innerHTML = events.map(evt => `
        <tr>
          <td>
            <strong style="color: #0f172a; display: block;">${escapeHtml(evt.title)}</strong>
            <small style="color: #64748b;">📍 ${escapeHtml(evt.location)}</small>
          </td>
          <td><strong>${formatDate(evt.event_date)}</strong></td>
          <td>${evt.start_time ? escapeHtml(evt.start_time.slice(0, 5)) + (evt.end_time ? ' - ' + escapeHtml(evt.end_time.slice(0, 5)) : '') : 'Full Day'}</td>
          <td>
            <span class="status-badge ${evt.is_published ? 'published' : 'draft'}">
              ${evt.is_published ? 'Published' : 'Draft'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <button type="button" class="btn btn-outline btn-sm btn-edit-event" data-id="${evt.id}">Edit</button>
              <button type="button" class="btn btn-outline btn-sm btn-toggle-event" data-id="${evt.id}" data-published="${evt.is_published}">
                ${evt.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-delete-event" data-id="${evt.id}" style="color: #dc2626; border-color: #fca5a5;">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');

      tableBody.querySelectorAll('.btn-edit-event').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = events.find(e => e.id === btn.dataset.id);
          if (item) openModal(item);
        });
      });

      tableBody.querySelectorAll('.btn-toggle-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const current = btn.dataset.published === 'true';
          btn.disabled = true;
          // SUPABASE CALL: Toggle is_published state on events
          await supabase
            .from('events')
            .update({ is_published: !current })
            .eq('id', id);
          loadEvents();
        });
      });

      tableBody.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
          btn.disabled = true;
          // SUPABASE CALL: Delete event by id
          await supabase.from('events').delete().eq('id', btn.dataset.id);
          loadEvents();
        });
      });

    } catch (err) {
      console.error('Error loading events:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">Failed to load events. ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginBanner(formStatus);

    const title = titleInput.value.trim();
    const eventDate = dateInput.value;
    const startTime = startTimeInput.value || null;
    const endTime = endTimeInput.value || null;
    const location = locationInput.value.trim();
    const description = descInput.value.trim() || null;
    const isPublished = publishedCheckbox.checked;
    const eventId = idInput.value;

    if (!title || !eventDate || !location) {
      showLoginBanner(formStatus, 'error', 'Incomplete Form', 'Please provide event title, date, and location.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Saving Event...';

    try {
      const payload = {
        title,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        location,
        description,
        is_published: isPublished
      };

      if (eventId) {
        // SUPABASE CALL: Update event
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', eventId);
        if (error) throw error;
      } else {
        // SUPABASE CALL: Insert event
        const { error } = await supabase
          .from('events')
          .insert([payload]);
        if (error) throw error;
      }

      closeModal();
      loadEvents();

    } catch (err) {
      console.error('Error saving event:', err);
      showLoginBanner(formStatus, 'error', 'Save Failed', err.message || 'Could not save event.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Event';
    }
  });

  loadEvents();
}

/* =============================================================================
   PHASE 6.3: GALLERY MANAGER (admin/gallery.html)
   ============================================================================= */
export async function initGalleryManager() {
  const grid = document.getElementById('gallery-grid');
  const addBtn = document.getElementById('btn-add-gallery');
  const modal = document.getElementById('gallery-modal');
  const closeModalBtn = document.getElementById('btn-close-gallery-modal');
  const cancelModalBtn = document.getElementById('btn-cancel-gallery-modal');
  const form = document.getElementById('gallery-form');
  const formStatus = document.getElementById('gallery-form-status');
  const submitBtn = document.getElementById('gallery-submit-btn');

  const captionInput = document.getElementById('gallery-caption');
  const albumInput = document.getElementById('gallery-album');
  const urlInput = document.getElementById('gallery-url');
  const fileInput = document.getElementById('gallery-file');
  const publishedCheckbox = document.getElementById('gallery-is-published');

  function openModal() {
    form.reset();
    clearLoginBanner(formStatus);
    publishedCheckbox.checked = true;
    modal.removeAttribute('hidden');
    captionInput.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
  }

  addBtn?.addEventListener('click', openModal);
  closeModalBtn?.addEventListener('click', closeModal);
  cancelModalBtn?.addEventListener('click', closeModal);

  async function loadGallery() {
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading gallery photos...</div>';

    try {
      // SUPABASE CALL: Fetch all gallery items
      const { data: items, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #64748b;">No photos uploaded yet. Click "Upload Photos" to add media.</div>';
        return;
      }

      grid.innerHTML = items.map(item => `
        <div class="admin-gallery-card">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.caption || '')}" class="admin-gallery-thumb" loading="lazy">
          <div class="admin-gallery-body">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 6px;">
                <span style="font-size: 0.7rem; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                  ${escapeHtml(item.album || 'Campus Life')}
                </span>
                <span class="status-badge ${item.is_published ? 'published' : 'draft'}">
                  ${item.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <p style="font-size: 0.85rem; color: #1e293b; margin-bottom: 4px; line-height: 1.4;">
                ${escapeHtml(item.caption || 'No caption')}
              </p>
            </div>
            <div class="admin-gallery-actions">
              <button type="button" class="btn btn-outline btn-sm btn-toggle-gallery" data-id="${item.id}" data-published="${item.is_published}" style="font-size: 0.75rem; padding: 4px 8px;">
                ${item.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-delete-gallery" data-id="${item.id}" style="font-size: 0.75rem; padding: 4px 8px; color: #dc2626; border-color: #fca5a5;">
                Delete
              </button>
            </div>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.btn-toggle-gallery').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const current = btn.dataset.published === 'true';
          btn.disabled = true;
          // SUPABASE CALL: Toggle is_published on gallery_items
          await supabase
            .from('gallery_items')
            .update({ is_published: !current })
            .eq('id', id);
          loadGallery();
        });
      });

      grid.querySelectorAll('.btn-delete-gallery').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Delete this photo from the gallery?')) return;
          btn.disabled = true;
          // SUPABASE CALL: Delete photo from gallery_items
          await supabase.from('gallery_items').delete().eq('id', btn.dataset.id);
          loadGallery();
        });
      });

    } catch (err) {
      console.error('Error loading gallery:', err);
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #dc2626; padding: 2rem;">Failed to load photos. ${escapeHtml(err.message)}</div>`;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginBanner(formStatus);

    let imageUrl = urlInput.value.trim();
    const caption = captionInput.value.trim() || null;
    const album = albumInput.value.trim() || 'Campus Life';
    const isPublished = publishedCheckbox.checked;

    if (!imageUrl && !fileInput?.files?.[0]) {
      showLoginBanner(formStatus, 'error', 'Missing Image', 'Please provide an image URL or choose a file to upload.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Uploading...';

    try {
      // If file uploaded, try storage upload
      if (fileInput?.files?.[0]) {
        try {
          const uploadedUrl = await uploadMediaFile(fileInput.files[0], 'gallery');
          if (uploadedUrl) imageUrl = uploadedUrl;
        } catch (uploadErr) {
          console.warn('Storage upload error, using URL if available:', uploadErr);
        }
      }

      if (!imageUrl) {
        throw new Error('Image URL is required if direct file upload cannot be stored.');
      }

      // SUPABASE CALL: Insert new photo into gallery_items
      const { error } = await supabase
        .from('gallery_items')
        .insert([
          {
            image_url: imageUrl,
            caption,
            album,
            is_published: isPublished
          }
        ]);

      if (error) throw error;

      closeModal();
      loadGallery();

    } catch (err) {
      console.error('Error uploading photo:', err);
      showLoginBanner(formStatus, 'error', 'Upload Failed', err.message || 'Could not save gallery photo.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Add Photo to Gallery';
    }
  });

  loadGallery();
}

/* =============================================================================
   PHASE 6.4: MESSAGES MANAGER (admin/messages.html)
   ============================================================================= */
export async function initMessagesManager() {
  const tableBody = document.getElementById('messages-table-body');
  const searchInput = document.getElementById('messages-search');
  const filterButtons = document.querySelectorAll('.filter-messages-btn');

  const modal = document.getElementById('message-modal');
  const closeModalBtn = document.getElementById('btn-close-message-modal');
  const doneModalBtn = document.getElementById('btn-done-message-modal');
  const deleteModalBtn = document.getElementById('btn-delete-active-message');

  const detailName = document.getElementById('msg-detail-name');
  const detailEmail = document.getElementById('msg-detail-email');
  const detailPhone = document.getElementById('msg-detail-phone');
  const detailDate = document.getElementById('msg-detail-date');
  const detailBody = document.getElementById('msg-detail-body');
  const detailBadge = document.getElementById('msg-detail-badge');

  let allMessages = [];
  let currentFilter = 'all';
  let activeMessage = null;

  function closeModal() {
    modal.setAttribute('hidden', '');
    activeMessage = null;
  }

  closeModalBtn?.addEventListener('click', closeModal);
  doneModalBtn?.addEventListener('click', closeModal);

  async function openMessageModal(msg) {
    activeMessage = msg;
    detailName.textContent = msg.name;
    detailEmail.textContent = msg.email;
    detailEmail.href = `mailto:${msg.email}`;
    detailPhone.textContent = msg.phone || 'None provided';
    if (msg.phone) detailPhone.href = `tel:${msg.phone}`;
    detailDate.textContent = formatDate(msg.created_at);
    detailBody.textContent = msg.message;

    // Automatically mark as read if currently unread
    if (!msg.is_read) {
      msg.is_read = true;
      // SUPABASE CALL: Mark contact message as read
      await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', msg.id);
      renderList();
    }

    detailBadge.className = `status-badge ${msg.is_read ? 'read' : 'unread'}`;
    detailBadge.textContent = msg.is_read ? 'Read' : 'Unread';

    modal.removeAttribute('hidden');
  }

  deleteModalBtn?.addEventListener('click', async () => {
    if (!activeMessage) return;
    if (!window.confirm('Delete this message permanently?')) return;
    // SUPABASE CALL: Delete contact message
    await supabase.from('contact_messages').delete().eq('id', activeMessage.id);
    closeModal();
    loadMessages();
  });

  function renderList() {
    if (!tableBody) return;
    const query = searchInput?.value.toLowerCase().trim() || '';

    const filtered = allMessages.filter(msg => {
      // Filter status
      if (currentFilter === 'unread' && msg.is_read) return false;
      if (currentFilter === 'read' && !msg.is_read) return false;

      // Search query
      if (query) {
        const fullStr = `${msg.name} ${msg.email} ${msg.phone || ''} ${msg.message}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No messages match the filter criteria.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(msg => `
      <tr style="${!msg.is_read ? 'background-color: #fefce8;' : ''}">
        <td>
          <span class="status-badge ${msg.is_read ? 'read' : 'unread'}">
            ${msg.is_read ? 'Read' : 'New'}
          </span>
        </td>
        <td>
          <strong style="color: #0f172a; display: block;">${escapeHtml(msg.name)}</strong>
          <small style="color: #64748b;">${escapeHtml(msg.email)}</small>
        </td>
        <td>${escapeHtml(msg.phone || '—')}</td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(msg.message)}
        </td>
        <td>${formatDate(msg.created_at)}</td>
        <td>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn btn-outline btn-sm btn-open-msg" data-id="${msg.id}">Read</button>
            <button type="button" class="btn btn-outline btn-sm btn-toggle-read" data-id="${msg.id}" data-read="${msg.is_read}" style="font-size: 0.75rem;">
              ${msg.is_read ? 'Mark Unread' : 'Mark Read'}
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-delete-msg" data-id="${msg.id}" style="color: #dc2626; border-color: #fca5a5;">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('.btn-open-msg').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = allMessages.find(m => m.id === btn.dataset.id);
        if (item) openMessageModal(item);
      });
    });

    tableBody.querySelectorAll('.btn-toggle-read').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const current = btn.dataset.read === 'true';
        btn.disabled = true;
        // SUPABASE CALL: Toggle is_read status
        await supabase
          .from('contact_messages')
          .update({ is_read: !current })
          .eq('id', id);
        loadMessages();
      });
    });

    tableBody.querySelectorAll('.btn-delete-msg').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this message permanently?')) return;
        btn.disabled = true;
        // SUPABASE CALL: Delete contact message
        await supabase.from('contact_messages').delete().eq('id', btn.dataset.id);
        loadMessages();
      });
    });
  }

  async function loadMessages() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading messages...</td></tr>';

    try {
      // SUPABASE CALL: Fetch all contact messages
      const { data: messages, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      allMessages = messages || [];
      renderList();

    } catch (err) {
      console.error('Error loading messages:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">Failed to load messages. ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  searchInput?.addEventListener('input', renderList);

  loadMessages();
}

/* =============================================================================
   PHASE 6.5: APPLICATIONS MANAGER (admin/applications.html)
   ============================================================================= */
export async function initApplicationsManager() {
  const tableBody = document.getElementById('apps-table-body');
  const searchInput = document.getElementById('apps-search');
  const filterButtons = document.querySelectorAll('.filter-apps-btn');

  const modal = document.getElementById('app-modal');
  const closeModalBtn = document.getElementById('btn-close-app-modal');
  const deleteModalBtn = document.getElementById('btn-delete-app');
  const statusSelect = document.getElementById('app-detail-status');
  const updateStatusBtn = document.getElementById('btn-update-app-status');
  const statusUpdateMsg = document.getElementById('app-status-update-feedback');

  const detailChildName = document.getElementById('app-detail-child-name');
  const detailDob = document.getElementById('app-detail-dob');
  const detailClass = document.getElementById('app-detail-class');
  const detailParentName = document.getElementById('app-detail-parent-name');
  const detailParentEmail = document.getElementById('app-detail-parent-email');
  const detailParentPhone = document.getElementById('app-detail-parent-phone');
  const detailAddress = document.getElementById('app-detail-address');
  const detailPrevSchool = document.getElementById('app-detail-prev-school');
  const detailNotes = document.getElementById('app-detail-notes');
  const detailDate = document.getElementById('app-detail-date');

  let allApps = [];
  let currentFilter = 'all';
  let activeApp = null;

  function closeModal() {
    modal.setAttribute('hidden', '');
    activeApp = null;
    clearLoginBanner(statusUpdateMsg);
  }

  closeModalBtn?.addEventListener('click', closeModal);

  function openAppModal(app) {
    activeApp = app;
    clearLoginBanner(statusUpdateMsg);

    detailChildName.textContent = app.child_name;
    detailDob.textContent = formatDate(app.date_of_birth);
    detailClass.textContent = app.class_applying_for;
    detailParentName.textContent = app.parent_name;
    detailParentEmail.textContent = app.parent_email;
    detailParentEmail.href = `mailto:${app.parent_email}`;
    detailParentPhone.textContent = app.parent_phone;
    detailParentPhone.href = `tel:${app.parent_phone}`;
    detailAddress.textContent = app.address;
    detailPrevSchool.textContent = app.previous_school || 'None stated';
    detailNotes.textContent = app.notes || 'None';
    detailDate.textContent = formatDate(app.created_at);

    statusSelect.value = app.status;
    modal.removeAttribute('hidden');
  }

  // Update Status handler
  updateStatusBtn?.addEventListener('click', async () => {
    if (!activeApp) return;
    const newStatus = statusSelect.value;
    updateStatusBtn.disabled = true;
    updateStatusBtn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> Updating...';

    try {
      // SUPABASE CALL: Update admission application status
      const { error } = await supabase
        .from('admission_applications')
        .update({ status: newStatus })
        .eq('id', activeApp.id);

      if (error) throw error;

      activeApp.status = newStatus;
      showLoginBanner(statusUpdateMsg, 'success', 'Status Updated', `Application status changed to ${newStatus.toUpperCase()}.`);
      renderList();

    } catch (err) {
      console.error('Error updating status:', err);
      showLoginBanner(statusUpdateMsg, 'error', 'Update Failed', err.message || 'Could not update status.');
    } finally {
      updateStatusBtn.disabled = false;
      updateStatusBtn.innerHTML = 'Save Status';
    }
  });

  // Delete Application handler
  deleteModalBtn?.addEventListener('click', async () => {
    if (!activeApp) return;
    if (!window.confirm(`Delete application for ${activeApp.child_name}? This action cannot be undone.`)) return;

    try {
      // SUPABASE CALL: Delete admission application
      await supabase.from('admission_applications').delete().eq('id', activeApp.id);
      closeModal();
      loadApplications();
    } catch (err) {
      console.error('Error deleting application:', err);
      alert('Failed to delete application.');
    }
  });

  function renderList() {
    if (!tableBody) return;
    const query = searchInput?.value.toLowerCase().trim() || '';

    const filtered = allApps.filter(app => {
      // Filter status
      if (currentFilter !== 'all' && app.status !== currentFilter) return false;

      // Search query
      if (query) {
        const fullStr = `${app.child_name} ${app.class_applying_for} ${app.parent_name} ${app.parent_email} ${app.parent_phone}`.toLowerCase();
        if (!fullStr.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748b;">No applications match the filter criteria.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(app => `
      <tr>
        <td>
          <strong style="color: #0f172a; display: block;">${escapeHtml(app.child_name)}</strong>
          <small style="color: #64748b;">DOB: ${formatDate(app.date_of_birth)}</small>
        </td>
        <td>
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.8rem; background: #e0f2fe; color: #0369a1;">
            ${escapeHtml(app.class_applying_for)}
          </span>
        </td>
        <td>
          <div style="font-weight: 600; color: #1e293b;">${escapeHtml(app.parent_name)}</div>
          <small style="color: #64748b;">${escapeHtml(app.parent_phone)} &bull; ${escapeHtml(app.parent_email)}</small>
        </td>
        <td>
          <span class="status-badge ${escapeHtml(app.status)}">
            ${escapeHtml(app.status)}
          </span>
        </td>
        <td>${formatDate(app.created_at)}</td>
        <td>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button type="button" class="btn btn-outline btn-sm btn-open-app" data-id="${app.id}">View Dossier</button>
            <button type="button" class="btn btn-outline btn-sm btn-delete-app-row" data-id="${app.id}" style="color: #dc2626; border-color: #fca5a5;">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('.btn-open-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = allApps.find(a => a.id === btn.dataset.id);
        if (item) openAppModal(item);
      });
    });

    tableBody.querySelectorAll('.btn-delete-app-row').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = allApps.find(a => a.id === btn.dataset.id);
        if (!item) return;
        if (!window.confirm(`Delete application for ${item.child_name}?`)) return;
        btn.disabled = true;
        // SUPABASE CALL: Delete admission application
        await supabase.from('admission_applications').delete().eq('id', item.id);
        loadApplications();
      });
    });
  }

  async function loadApplications() {
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading applications...</td></tr>';

    try {
      // SUPABASE CALL: Fetch all admission applications
      const { data: apps, error } = await supabase
        .from('admission_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      allApps = apps || [];
      renderList();

    } catch (err) {
      console.error('Error loading applications:', err);
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 2rem;">Failed to load applications. ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  searchInput?.addEventListener('input', renderList);

  loadApplications();
}

