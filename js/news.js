/**
 * news.js - Dynamic News List and Single News Post Handler
 * Fetches published news articles from Supabase.
 * Enforces RLS: only published items (is_published = true) are retrieved.
 */

import { supabase } from './supabaseClient.js';
import { escapeHtml, formatDate, renderLoading, renderEmpty, renderError } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const newsListContainer = document.getElementById('news-list-container');
  if (newsListContainer) {
    loadNewsList(newsListContainer);
  }

  const newsPostContainer = document.getElementById('news-post-container');
  if (newsPostContainer) {
    loadNewsPost(newsPostContainer);
  }
});

/**
 * Loads published news articles into the news list page.
 */
export async function loadNewsList(container) {
  renderLoading(container, 'Loading school news & announcements...');

  try {
    // Supabase call: Query published news ordered by publication date descending
    const { data: newsItems, error } = await supabase
      .from('news')
      .select('id, title, slug, summary, cover_image_url, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching news:', error);
      renderError(container, 'Unable to load news articles at this moment. Please try again.', () => loadNewsList(container));
      return;
    }

    if (!newsItems || newsItems.length === 0) {
      renderEmpty(container, 'No news articles have been published yet. Check back soon for updates!');
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
            >
            <div class="card-body">
              <div class="card-meta">
                <span class="badge badge-gold">News</span>
                <time datetime="${escapeHtml(item.published_at)}">${escapeHtml(formatDate(item.published_at))}</time>
              </div>
              <h3 class="card-title">
                <a href="news-post.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a>
              </h3>
              <p class="card-desc">${escapeHtml(item.summary)}</p>
              <div class="card-footer">
                <a href="news-post.html?slug=${encodeURIComponent(item.slug)}" class="btn btn-outline btn-sm">
                  Read Full Article &rarr;
                </a>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Unexpected error loading news:', err);
    renderError(container, 'An unexpected error occurred while loading news.', () => loadNewsList(container));
  }
}

/**
 * Loads a single published news post based on the ?slug= URL parameter.
 */
export async function loadNewsPost(container) {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    renderEmpty(container, 'No article specified. Please browse our news catalog to choose an article.');
    return;
  }

  renderLoading(container, 'Loading article...');

  try {
    // Supabase call: Query single article by slug ensuring it is published
    const { data: post, error } = await supabase
      .from('news')
      .select('id, title, slug, summary, body, cover_image_url, published_at')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching post:', error);
      renderError(container, 'Unable to load article.', () => loadNewsPost(container));
      return;
    }

    if (!post) {
      renderEmpty(container, 'This article was not found or is currently unpublished.');
      return;
    }

    // Update document title for SEO
    document.title = `${post.title} | St. Augustine International Academy`;

    // Format body paragraphs safely
    const bodyParagraphs = post.body
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => `<p>${escapeHtml(p)}</p>`)
      .join('');

    container.innerHTML = `
      <article class="single-article">
        <header class="article-header">
          <nav class="breadcrumb" aria-label="Breadcrumb">
            <a href="index.html">Home</a>
            <span>/</span>
            <a href="news.html">News</a>
            <span>/</span>
            <span aria-current="page">${escapeHtml(post.title)}</span>
          </nav>
          <div class="card-meta" style="justify-content: center; margin-bottom: 0.75rem;">
            <span class="badge badge-gold">Published Post</span>
            <time datetime="${escapeHtml(post.published_at)}">${escapeHtml(formatDate(post.published_at))}</time>
          </div>
          <h1 style="font-size: clamp(1.85rem, 4.5vw, 2.75rem); margin-bottom: 1rem; color: var(--color-primary);">
            ${escapeHtml(post.title)}
          </h1>
          <p class="section-desc" style="font-size: 1.15rem; color: var(--color-text-body); max-width: 720px; margin: 0 auto;">
            ${escapeHtml(post.summary)}
          </p>
        </header>

        ${post.cover_image_url ? `
          <div style="max-width: 800px; margin: 0 auto var(--space-xl) auto;">
            <img 
              src="${escapeHtml(post.cover_image_url)}" 
              alt="${escapeHtml(post.title)}" 
              class="article-hero-img"
            >
          </div>
        ` : ''}

        <div class="article-body">
          ${bodyParagraphs}
        </div>

        <footer class="article-footer">
          <a href="news.html" class="btn btn-secondary btn-sm">&larr; Back to All News</a>
          <span style="font-size: 0.875rem; color: var(--color-text-muted);">
            St. Augustine International Academy &bull; Official Communications
          </span>
        </footer>
      </article>
    `;
  } catch (err) {
    console.error('Unexpected error loading article:', err);
    renderError(container, 'An unexpected error occurred while loading this article.', () => loadNewsPost(container));
  }
}
