/**
 * js/portal.js - Parent Application Portal Handler
 *
 * Demonstrates:
 * 1. Supabase Authentication for parents
 * 2. Row Level Security (RLS) enforcement:
 *    Authenticated parents can ONLY query admission applications
 *    matching their registered auth email address.
 */

import { supabase } from './supabaseClient.js';

const authView = document.getElementById('portal-auth-view');
const dashboardView = document.getElementById('portal-dashboard-view');
const authStatusMsg = document.getElementById('auth-status-msg');
const userDisplayEmail = document.getElementById('user-display-email');
const applicationsContainer = document.getElementById('applications-container');
const loginForm = document.getElementById('parent-login-form');
const loginBtn = document.getElementById('parent-login-btn');
const logoutBtn = document.getElementById('parent-logout-btn');

/**
 * Renders status message banner
 */
function showStatusBanner(container, type, message) {
  if (!container) return;
  container.className = `form-status-msg ${type}`;
  container.innerHTML = `
    <div style="font-size: 1.25rem; line-height: 1; flex-shrink: 0;" aria-hidden="true">
      ${type === 'success' ? '✅' : '⚠️'}
    </div>
    <div>${message}</div>
  `;
}

function clearStatusBanner(container) {
  if (!container) return;
  container.className = 'form-status-msg';
  container.innerHTML = '';
}

/**
 * Returns formatted status badge markup
 */
function getStatusBadge(status) {
  const norm = (status || 'pending').toLowerCase();
  switch (norm) {
    case 'accepted':
      return `<span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700; background-color: #dcfce7; color: #15803d;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #16a34a;"></span>
        Offer of Admission Extended
      </span>`;
    case 'reviewing':
      return `<span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700; background-color: #e0f2fe; color: #0369a1;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #0284c7;"></span>
        Under Academic Review
      </span>`;
    case 'rejected':
      return `<span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700; background-color: #fee2e2; color: #b91c1c;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #dc2626;"></span>
        Application Unsuccessful
      </span>`;
    case 'pending':
    default:
      return `<span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.825rem; font-weight: 700; background-color: #fef3c7; color: #b45309;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: #d97706;"></span>
        Application Received (Pending Queue)
      </span>`;
  }
}

/**
 * Returns instructions based on current status
 */
function getNextStepsHtml(status) {
  const norm = (status || 'pending').toLowerCase();
  switch (norm) {
    case 'accepted':
      return `
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 1rem 1.25rem; border-radius: 6px; margin-top: 1.25rem;">
          <strong style="color: #166534; font-size: 0.95rem;">Congratulations! Next Steps for Enrollment:</strong>
          <p style="margin: 0.35rem 0 0 0; font-size: 0.875rem; color: #14532d; line-height: 1.5;">
            An official letter of acceptance has been dispatched to your email address. Please contact the Admissions Office within 14 calendar days to confirm acceptance and finalize registration documentation.
          </p>
        </div>
      `;
    case 'reviewing':
      return `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 1rem 1.25rem; border-radius: 6px; margin-top: 1.25rem;">
          <strong style="color: #075985; font-size: 0.95rem;">Assessment in Progress:</strong>
          <p style="margin: 0.35rem 0 0 0; font-size: 0.875rem; color: #0c4a6e; line-height: 1.5;">
            Our academic admissions committee is currently evaluating past academic records. If an entrance assessment interview is required for your child's grade level, our admissions coordinator will reach out directly.
          </p>
        </div>
      `;
    case 'rejected':
      return `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 1rem 1.25rem; border-radius: 6px; margin-top: 1.25rem;">
          <strong style="color: #991b1b; font-size: 0.95rem;">Admission Notice:</strong>
          <p style="margin: 0.35rem 0 0 0; font-size: 0.875rem; color: #7f1d1d; line-height: 1.5;">
            Due to strict classroom capacity caps, we are unfortunately unable to offer a placement for this intake cycle. Your child's application remains on our waitlist should an opening arise.
          </p>
        </div>
      `;
    case 'pending':
    default:
      return `
        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 1rem 1.25rem; border-radius: 6px; margin-top: 1.25rem;">
          <strong style="color: #92400e; font-size: 0.95rem;">Application in Queue:</strong>
          <p style="margin: 0.35rem 0 0 0; font-size: 0.875rem; color: #78350f; line-height: 1.5;">
            Your online application has been securely received by our registrar. Review cycles typically take between 2 to 4 business days.
          </p>
        </div>
      `;
  }
}

/**
 * Fetches applications belonging to current user
 */
async function loadParentApplications() {
  if (!applicationsContainer) return;

  applicationsContainer.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted);">
      <div class="btn-spinner" style="margin: 0 auto 1rem auto; width: 32px; height: 32px; border-width: 3px;" aria-hidden="true"></div>
      <p>Fetching your application status from the admissions database...</p>
    </div>
  `;

  try {
    // Under Supabase RLS (policy "Parents can view their own application"),
    // this query ONLY returns rows where parent_email = auth.jwt()->>'email'
    const { data, error } = await supabase
      .from('admission_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      applicationsContainer.innerHTML = `
        <div class="card" style="padding: 2.5rem 1.5rem; text-align: center; background-color: rgba(20, 20, 40, 0.75); border: 2px dashed rgba(255, 255, 255, 0.15);">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;" aria-hidden="true">📋</div>
          <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: #ffffff;">No Applications Found</h3>
          <p style="max-width: 480px; margin: 0 auto 1.5rem auto; color: #94a3b8; font-size: 0.9rem;">
            We couldn't locate any admission filings matching your email address. If you submitted an application using a different email, please sign out and sign in with that address.
          </p>
          <a href="admissions.html#apply-form" class="btn btn-primary btn-sm">Submit New Application</a>
        </div>
      `;
      return;
    }

    applicationsContainer.innerHTML = data.map((app) => `
      <div class="card" style="padding: 1.75rem 1.5rem; margin-bottom: 1.75rem; border-top: 4px solid #4f5cff; box-shadow: var(--shadow-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600;">Applicant</span>
            <h3 style="font-size: 1.35rem; margin: 0.2rem 0; color: #ffffff;">${app.child_name || 'Student Applicant'}</h3>
            <span style="font-size: 0.9rem; color: #fbbf24; font-weight: 600;">Grade: ${app.class_applying_for}</span>
          </div>
          <div>
            ${getStatusBadge(app.status)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 1rem; padding: 1rem; background-color: rgba(11, 11, 18, 0.65); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.875rem;">
          <div>
            <span style="color: #94a3b8; display: block; font-size: 0.75rem; text-transform: uppercase;">Date of Birth</span>
            <strong style="color: #f1f5f9;">${app.date_of_birth}</strong>
          </div>
          <div>
            <span style="color: #94a3b8; display: block; font-size: 0.75rem; text-transform: uppercase;">Application Reference</span>
            <code style="background-color: rgba(255, 255, 255, 0.1); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${app.id.slice(0, 8).toUpperCase()}</code>
          </div>
          <div>
            <span style="color: #94a3b8; display: block; font-size: 0.75rem; text-transform: uppercase;">Date Submitted</span>
            <strong style="color: #f1f5f9;">${new Date(app.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
          </div>
          <div>
            <span style="color: #94a3b8; display: block; font-size: 0.75rem; text-transform: uppercase;">Previous School</span>
            <strong style="color: #f1f5f9;">${app.previous_school || 'None stated'}</strong>
          </div>
        </div>

        ${getNextStepsHtml(app.status)}
      </div>
    `).join('');

  } catch (err) {
    console.error('Error fetching parent applications:', err);
    applicationsContainer.innerHTML = `
      <div class="card" style="padding: 2rem; text-align: center; color: var(--color-danger); background-color: #fef2f2; border: 1px solid #fecaca;">
        <strong style="display: block; margin-bottom: 0.5rem;">Unable to load application details</strong>
        <p style="font-size: 0.875rem; margin-bottom: 1rem;">${err.message || 'Please check your internet connection and try again.'}</p>
        <button onclick="window.location.reload()" class="btn btn-primary btn-sm">Retry</button>
      </div>
    `;
  }
}

/**
 * Updates UI based on user session
 */
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    if (authView) authView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
    if (userDisplayEmail) userDisplayEmail.textContent = session.user.email;
    loadParentApplications();
  } else {
    if (authView) authView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
  }
}

// Initialise
document.addEventListener('DOMContentLoaded', () => {
  checkSession();

  // Login handler
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatusBanner(authStatusMsg);

    const email = document.getElementById('parent-email')?.value.trim();
    const password = document.getElementById('parent-password')?.value;

    if (!email || !password) {
      showStatusBanner(authStatusMsg, 'error', 'Please enter your email and password.');
      return;
    }

    loginBtn.disabled = true;
    const origText = loginBtn.textContent;
    loginBtn.textContent = 'Verifying Credentials...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      showStatusBanner(authStatusMsg, 'success', 'Sign-in successful. Loading dashboard...');
      setTimeout(() => {
        checkSession();
      }, 500);

    } catch (err) {
      console.error('Login error:', err);
      showStatusBanner(
        authStatusMsg,
        'error',
        err.message || 'Invalid email or password. Please verify your credentials.'
      );
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = origText;
    }
  });

  // Logout handler
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
  });
});
