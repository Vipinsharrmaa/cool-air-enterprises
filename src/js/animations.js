/*
  animations.js - all GSAP-powered motion, loaded on every page after
  gsap.min.js and ScrollTrigger.min.js (see the <script> tags at the bottom
  of each page).

  Everything in this file is a progressive enhancement:
    - If GSAP failed to load for any reason, every function below exits
      early (see the `if (!window.gsap) return;` guard) and the page is
      still fully usable - it just won't have the extra motion.
    - If the visitor has prefers-reduced-motion enabled, we skip straight to
      the "final" state of every animation (elements simply appear, already
      in place) instead of running the motion.

  Sections:
    1. Reduced-motion check
    2. Home page opening reveal (enhances the CSS-only version)
    3. Hero text entrance (every page's page-hero, staggered on load)
    4. Scroll-triggered section reveals (fade + slight rise, staggered)
    5. Masked image reveals (larger feature photos slide out from a clip)
    6. Animated counters (credibility strip)
*/

(function () {
  "use strict";

  if (!window.gsap) return; // GSAP didn't load - CSS already handles the essentials.

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupIntroReveal();
    setupHeroReveal();
    setupScrollReveals();
    setupImageMaskReveals();
    setupCounters();
  });

  /* ------------------------------------------------------------------ */
  /* 2. Home page opening reveal                                          */
  /* ------------------------------------------------------------------ */

  function setupIntroReveal() {
    const overlay = document.querySelector("[data-intro-overlay]");
    if (!overlay) return; // not the home page

    const mark = overlay.querySelector("[data-intro-mark]");
    const line = overlay.querySelector("[data-intro-line]");

    if (prefersReducedMotion) {
      // Skip straight to "gone" - the CSS animation is also disabled by the
      // prefers-reduced-motion rule in input.css, so hide it directly here.
      overlay.style.display = "none";
      return;
    }

    gsap.timeline()
      .fromTo(mark, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" })
      .to(line, { width: 220, duration: 0.5, ease: "power2.inOut" }, "-=0.15");
  }

  /* ------------------------------------------------------------------ */
  /* 3. Hero text entrance                                                 */
  /* ------------------------------------------------------------------ */

  // Every page hero wraps its eyebrow/heading/subtext/CTAs in
  // [data-hero-reveal] children so they stagger in on load, instead of the
  // whole hero just appearing statically once the intro overlay (home page
  // only) or the stylesheet (every other page) is out of the way.
  function setupHeroReveal() {
    const items = document.querySelectorAll("[data-hero-reveal]");
    if (items.length === 0 || prefersReducedMotion) return;

    // Home page: wait for the intro overlay to mostly clear before the
    // hero text starts moving, so the two don't visually compete.
    const hasIntro = !!document.querySelector("[data-intro-overlay]");

    gsap.set(items, { opacity: 0, y: 20 });
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.12,
      delay: hasIntro ? 0.9 : 0.1,
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Scroll-triggered section reveals                                   */
  /* ------------------------------------------------------------------ */

  // Any element marked data-reveal fades up into place the first time it
  // scrolls into view. data-reveal-group wraps a set of children that
  // should stagger in one after another (e.g. a row of service cards).
  function setupScrollReveals() {
    if (prefersReducedMotion) return; // elements are visible by default already

    if (!window.ScrollTrigger) {
      // No ScrollTrigger available - just make sure nothing is stuck at
      // opacity 0 (see the initial CSS state note below).
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.remove("opacity-0"));
      return;
    }

    document.querySelectorAll("[data-reveal-group]").forEach((group) => {
      const items = group.querySelectorAll("[data-reveal]");
      gsap.set(items, { opacity: 0, y: 24 });
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 85%" },
      });
    });

    // Standalone reveals not inside a group (section headings, etc.).
    document.querySelectorAll("[data-reveal]:not([data-reveal-group] [data-reveal])").forEach((el) => {
      gsap.set(el, { opacity: 0, y: 24 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 5. Masked image reveals                                               */
  /* ------------------------------------------------------------------ */

  // Larger feature photos (the equipment sections on hvac-solutions.html,
  // and the feature images on ventilation.html/ducting.html/cold-storage.html/
  // electrical.html) reveal by sliding up out of a horizontal clip, rather
  // than the plain fade used for cards/text - a more editorial, "masked
  // image reveal" treatment for the site's strongest photography.
  function setupImageMaskReveals() {
    if (prefersReducedMotion || !window.ScrollTrigger) {
      document.querySelectorAll("[data-reveal-image]").forEach((el) => {
        el.style.clipPath = "none";
      });
      return;
    }

    document.querySelectorAll("[data-reveal-image]").forEach((el) => {
      gsap.set(el, { clipPath: "inset(0% 0% 100% 0%)" });
      gsap.to(el, {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 6. Animated counters                                                  */
  /* ------------------------------------------------------------------ */

  // Elements like <span data-counter data-counter-to="30">0</span> count up
  // from 0 to data-counter-to once, when they scroll into view.
  function setupCounters() {
    const counters = document.querySelectorAll("[data-counter]");
    if (counters.length === 0) return;

    counters.forEach((counter) => {
      const target = Number(counter.getAttribute("data-counter-to") || "0");
      const suffix = counter.getAttribute("data-counter-suffix") || "";

      if (prefersReducedMotion || !window.ScrollTrigger) {
        counter.textContent = target + suffix;
        return;
      }

      const counterState = { value: 0 };
      gsap.to(counterState, {
        value: target,
        duration: 1.4,
        ease: "power1.out",
        scrollTrigger: { trigger: counter, start: "top 90%", once: true },
        onUpdate: () => {
          counter.textContent = Math.round(counterState.value) + suffix;
        },
      });
    });
  }
})();
