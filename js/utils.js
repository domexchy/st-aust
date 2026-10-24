/**
 * utils.js - Frontend Shared Utility Functions
 * Sanitization, date formatting, and state rendering components.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into human readable format (e.g. October 19, 2026).
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Formats a date into a calendar badge (month short + day).
 */
export function formatCalendarBadge(dateStr) {
  if (!dateStr) return { month: 'TBA', day: '--' };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { month: 'TBA', day: '--' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate()
  };
}

/**
 * Renders a loading state indicator inside a target container.
 */
export function renderLoading(container, message = 'Loading content...') {
  container.innerHTML = `
    <div class="state-box loading" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p class="state-desc">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Renders an empty state indicator when no items match the query.
 */
export function renderEmpty(container, message = 'No items found at this time.') {
  container.innerHTML = `
    <div class="state-box empty" role="status">
      <div class="state-icon" aria-hidden="true">📭</div>
      <h3 class="state-title">Nothing to show yet</h3>
      <p class="state-desc">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Renders a friendly error state when database retrieval fails.
 */
export function renderError(container, message = 'Unable to load content right now.', onRetry = null) {
  container.innerHTML = `
    <div class="state-box error" role="alert">
      <div class="state-icon" aria-hidden="true">⚠️</div>
      <h3 class="state-title">Notice</h3>
      <p class="state-desc">${escapeHtml(message)}</p>
      ${onRetry ? '<button class="btn btn-outline btn-sm btn-retry">Try Again</button>' : ''}
    </div>
  `;

  if (onRetry) {
    const retryBtn = container.querySelector('.btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', onRetry);
  }
}
