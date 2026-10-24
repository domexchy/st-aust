/**
 * events.js - Dynamic Events Page Handler
 * Fetches published upcoming events from Supabase.
 * Filters: is_published = true AND event_date >= today, sorted by event_date ASC.
 */

import { supabase } from './supabaseClient.js';
import { escapeHtml, formatCalendarBadge, renderLoading, renderEmpty, renderError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-list-container');
  if (eventsContainer) {
    loadUpcomingEvents(eventsContainer);
  }
});

/**
 * Loads upcoming published events into the events list page.
 */
export async function loadUpcomingEvents(container) {
  renderLoading(container, 'Loading upcoming events...');

  try {
    // Current date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Supabase call: Fetch upcoming published events, sorted chronologically
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, description, event_date, time, location')
      .eq('is_published', true)
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      renderError(container, 'Unable to load events at this moment.', () => loadUpcomingEvents(container));
      return;
    }

    if (!events || events.length === 0) {
      renderEmpty(container, 'No upcoming events scheduled right now. Please check back soon for our next term updates!');
      return;
    }

    container.innerHTML = `
      <div class="card-grid">
        ${events.map(ev => {
          const badge = formatCalendarBadge(ev.event_date);
          return `
            <article class="card">
              <div class="card-body">
                <div class="card-meta">
                  <span class="badge badge-gold" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                    🗓️ ${badge.month} ${badge.day}
                  </span>
                  <span>⏰ ${escapeHtml(ev.time)}</span>
                </div>
                <h3 class="card-title" style="margin-top: 0.5rem;">
                  ${escapeHtml(ev.title)}
                </h3>
                <p class="card-desc">${escapeHtml(ev.description)}</p>
                <div class="card-footer">
                  <span style="font-size: 0.85rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 4px;">
                    📍 ${escapeHtml(ev.location)}
                  </span>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Unexpected error loading events:', err);
    renderError(container, 'An unexpected error occurred while loading events.', () => loadUpcomingEvents(container));
  }
}
