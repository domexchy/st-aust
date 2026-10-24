/**
 * gallery.js - Dynamic Photo Gallery with Album Filter & Lightbox Modal
 * Fetches published gallery items from Supabase.
 * Filters: is_published = true.
 */

import { supabase } from './supabaseClient.js';
import { escapeHtml, renderLoading, renderEmpty, renderError } from './utils.js';

let allGalleryItems = [];
let activeAlbum = 'All';

document.addEventListener('DOMContentLoaded', () => {
  const galleryContainer = document.getElementById('gallery-items-container');
  const filtersContainer = document.getElementById('gallery-filters-container');
  const lightboxModal = document.getElementById('lightbox-modal');

  if (galleryContainer) {
    initGallery(galleryContainer, filtersContainer, lightboxModal);
  }
});

/**
 * Initializes the gallery, loads items from Supabase, sets up filters and lightbox.
 */
export async function initGallery(gridContainer, filtersContainer, lightboxModal) {
  renderLoading(gridContainer, 'Loading campus gallery photos...');

  try {
    // Supabase call: Fetch all published gallery photos
    const { data: items, error } = await supabase
      .from('gallery_items')
      .select('id, image_url, caption, album')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gallery:', error);
      renderError(gridContainer, 'Unable to load photo gallery at this time.', () => initGallery(gridContainer, filtersContainer, lightboxModal));
      return;
    }

    if (!items || items.length === 0) {
      renderEmpty(gridContainer, 'No gallery photos have been published yet.');
      return;
    }

    allGalleryItems = items;

    // Render Album Filter Buttons
    if (filtersContainer) {
      const albums = ['All', ...new Set(items.map(i => i.album || 'Campus Life'))];
      filtersContainer.innerHTML = albums.map(album => `
        <button 
          type="button" 
          class="filter-btn ${album === 'All' ? 'active' : ''}" 
          data-album="${escapeHtml(album)}"
        >
          ${escapeHtml(album)}
        </button>
      `).join('');

      filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeAlbum = btn.getAttribute('data-album');
          renderFilteredGrid(gridContainer);
        });
      });
    }

    // Render Initial Grid
    renderFilteredGrid(gridContainer);

    // Setup Lightbox Modal listeners
    setupLightbox(lightboxModal);

  } catch (err) {
    console.error('Unexpected error loading gallery:', err);
    renderError(gridContainer, 'An unexpected error occurred while loading gallery.', () => initGallery(gridContainer, filtersContainer, lightboxModal));
  }
}

/**
 * Renders the filtered gallery grid based on activeAlbum.
 */
function renderFilteredGrid(container) {
  const filtered = activeAlbum === 'All'
    ? allGalleryItems
    : allGalleryItems.filter(item => (item.album || 'Campus Life') === activeAlbum);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="state-box empty" style="grid-column: 1 / -1;">
        <p class="state-desc">No photos found in the "${escapeHtml(activeAlbum)}" album.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="gallery-grid">
      ${filtered.map(item => `
        <div 
          class="gallery-item" 
          tabindex="0" 
          role="button" 
          aria-label="View photo: ${escapeHtml(item.caption || 'Campus photo')}"
          data-img="${escapeHtml(item.image_url)}" 
          data-caption="${escapeHtml(item.caption || '')}"
          data-album="${escapeHtml(item.album || 'Campus Life')}"
        >
          <img 
            src="${escapeHtml(item.image_url)}" 
            alt="${escapeHtml(item.caption || 'School campus gallery photo')}" 
            class="gallery-thumb" 
            loading="lazy"
          >
          <div class="gallery-overlay">
            <span class="gallery-album-tag">${escapeHtml(item.album || 'Campus Life')}</span>
            <p class="gallery-caption">${escapeHtml(item.caption || '')}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Attach click & enter key event listeners to open lightbox
  container.querySelectorAll('.gallery-item').forEach(el => {
    const openItem = () => {
      const img = el.getAttribute('data-img');
      const caption = el.getAttribute('data-caption');
      openLightbox(img, caption);
    };

    el.addEventListener('click', openItem);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openItem();
      }
    });
  });
}

let activeModal = null;

function setupLightbox(modal) {
  if (!modal) return;
  activeModal = modal;

  const closeBtn = modal.querySelector('.lightbox-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  // Close when clicking backdrop outside content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeLightbox();
    }
  });

  // Close on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeLightbox();
    }
  });
}

function openLightbox(imgSrc, captionText) {
  if (!activeModal) return;

  const imgEl = activeModal.querySelector('.lightbox-img');
  const captionEl = activeModal.querySelector('.lightbox-caption-bar');

  if (imgEl) {
    imgEl.src = imgSrc;
    imgEl.alt = captionText || 'Enlarged photo view';
  }

  if (captionEl) {
    captionEl.textContent = captionText || '';
  }

  activeModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  const closeBtn = activeModal.querySelector('.lightbox-close');
  if (closeBtn) closeBtn.focus();
}

function closeLightbox() {
  if (!activeModal) return;
  activeModal.classList.remove('is-open');
  document.body.style.overflow = '';
}
