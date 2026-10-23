/**
 * public.js - Public Website Shared Scripts
 * Handles mobile hamburger navigation, accessibility, and interactive behaviors.
 * Vanilla JavaScript (ES Module compatible).
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initCurrentYear();
});

/**
 * Initializes the mobile hamburger toggle navigation with ARIA accessibility.
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (!toggleBtn || !navMenu) return;

  // Toggle mobile menu on button click
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleMenu(!isExpanded);
  });

  // Close menu when clicking outside of the navigation
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      if (navMenu.classList.contains('is-active')) {
        toggleMenu(false);
      }
    }
  });

  // Close menu when pressing the Escape key (Accessibility)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('is-active')) {
      toggleMenu(false);
      toggleBtn.focus();
    }
  });

  // Close menu when clicking any nav link (e.g. anchor links)
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 1024) {
        toggleMenu(false);
      }
    });
  });

  function toggleMenu(open) {
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleBtn.classList.toggle('is-active', open);
    navMenu.classList.toggle('is-active', open);

    // Trap focus or provide clear accessibility state
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  // Reset body overflow when resizing above mobile breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && navMenu.classList.contains('is-active')) {
      toggleMenu(false);
    }
  });
}

/**
 * Automatically set the current year in the copyright notice.
 */
function initCurrentYear() {
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}
