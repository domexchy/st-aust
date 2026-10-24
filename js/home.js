/**
 * home.js - Dynamic Home Page News and Events Handler
 * Loads the latest 3 published news and next 3 upcoming events from Supabase.
 */

import { supabase } from './supabaseClient.js';
import { escapeHtml, formatDate, formatCalendarBadge, renderLoading, renderEmpty, renderError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const homeNewsContainer = document.getElementById('home-news-container');
  if (homeNewsContainer) {
    loadHomeNews(homeNewsContainer);
  }

  const homeEventsContainer = document.getElementById('home-events-container');
  if (homeEventsContainer) {
    loadHomeEvents(homeEventsContainer);
  }
});

/**
 * Loads latest 3 published news posts into the home page.
 */
export async function loadHomeNews(container) {
  renderLoading(container, 'Loading latest school news...');

  try {
    // Supabase call: Fetch latest 3 published news
    const { data: newsItems, error } = await supabase
      .from('news')
      .select('id, title, slug, summary, cover_image_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching home news:', error);
      renderError(container, 'Unable to load news right now.', () => loadHomeNews(container));
      return;
    }

    if (!newsItems || newsItems.length === 0) {
      renderEmpty(container, 'No news articles published yet.');
      return;
    }

    container.innerHTML = `
      <div class="card-grid">
        ${newsItems.map(item => `
          <article class="card">
            <img 
              src="${escapeHtml(item.cover_image_url || 'images/hero-campus.jpg')}" 
              alt="${escapeHtml(item.title)}" 
              class="card-img" 
              loading="lazy"
              decoding="async"
            >
            <div class="card-body">
              <div class="card-meta">
                <span class="badge badge-gold">Academics</span>
                <time datetime="${escapeHtml(item.published_at)}">${escapeHtml(formatDate(item.published_at))}</time>
              </div>
              <h3 class="card-title">
                <a href="news-post.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>
              </h3>
              <p class="card-desc">${escapeHtml(item.summary)}</p>
              <div class="card-footer">
                <a href="news-post.html?slug=${encodeURIComponent(item.slug)}" class="btn btn-outline btn-sm">Read Story &rarr;</a>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Unexpected error loading home news:', err);
    renderError(container, 'An unexpected error occurred while loading news.', () => loadHomeNews(container));
  }
}

/**
 * Loads next 3 upcoming published events into the home page.
 */
export async function loadHomeEvents(container) {
  renderLoading(container, 'Loading upcoming events...');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Supabase call: Fetch next 3 upcoming published events
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, description, event_date, time, location')
      .eq('is_published', true)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching home events:', error);
      renderError(container, 'Unable to load events right now.', () => loadHomeEvents(container));
      return;
    }

    if (!events || events.length === 0) {
      renderEmpty(container, 'No upcoming events scheduled right now.');
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
                  <span class="badge badge-gold">🗓️ ${badge.month} ${badge.day}</span>
                  <span>⏰ ${escapeHtml(ev.time)}</span>
                </div>
                <h3 class="card-title" style="margin-top: 0.5rem;">
                  <a href="events.html">${escapeHtml(ev.title)}</a>
                </h3>
                <p class="card-desc">${escapeHtml(ev.description)}</p>
                <div class="card-footer">
                  <span style="font-size: 0.85rem; color: var(--color-text-muted);">📍 ${escapeHtml(ev.location)}</span>
                  <a href="events.html" class="btn btn-outline btn-sm">Event Details</a>
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Unexpected error loading home events:', err);
    renderError(container, 'An unexpected error occurred while loading events.', () => loadHomeEvents(container));
  }
}
