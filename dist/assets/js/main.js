/*
  main.js - core site behaviour, loaded on every page.

  This file is organized into small, independent functions, each guarded to
  do nothing if the page it's running on doesn't have the relevant markup
  (e.g. setupContactForm() simply returns if there's no #contact-form on the
  page). That's what lets one shared file safely run on every page instead
  of needing a different script per page.

  Sections in this file:
    1. Footer "current year"
    2. Sticky header shadow-on-scroll
    3. Field-work strip: auto-scroll (home page only)
    4. Contact form: validation + submission

  Note: this file used to also handle a mobile nav drawer, active-nav-link
  highlighting, and a projects-page filter/lightbox. All three were removed
  along with the markup they targeted when the site moved to a single
  "Enquire Now" header (no page menu) and dropped the separate projects
  gallery page - see the project plan for why.
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    setupFooterYear();
    setupHeaderScrollShadow();
    setupFieldWorkAutoScroll();
    setupContactForm();
  });

  /* ------------------------------------------------------------------ */
  /* 1. Footer "current year"                                             */
  /* ------------------------------------------------------------------ */

  function setupFooterYear() {
    document.querySelectorAll("[data-current-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Sticky header shadow-on-scroll                                    */
  /* ------------------------------------------------------------------ */

  // Adds a soft shadow under the sticky header once the page has scrolled
  // past the hero, purely for depth - plain CSS (see header[data-scrolled])
  // reacting to one data attribute, no animation library needed for this.
  function setupHeaderScrollShadow() {
    const header = document.querySelector("header");
    if (!header) return;

    function updateShadow() {
      header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    }

    updateShadow();
    window.addEventListener("scroll", updateShadow, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Field-work strip: auto-scroll (home page only)                    */
  /* ------------------------------------------------------------------ */

  // The "Glimpse of Our Field Work" strip on the home page is a plain
  // horizontally-scrollable <div> (see index.html) - this just nudges its
  // scrollLeft a little on every animation frame so it drifts on its own,
  // and bounces back and forth between the two ends rather than jumping
  // back to the start (avoids needing to duplicate all 42 images just to
  // fake a seamless loop).
  //
  // Because it's still a real overflow-x-auto element underneath, a visitor
  // can drag/swipe/trackpad-scroll it at any time - any of those gestures
  // pauses the autoplay immediately (see the PAUSE_EVENTS listeners below),
  // and it quietly resumes a couple of seconds after they stop touching it.
  function setupFieldWorkAutoScroll() {
    const strip = document.querySelector("[data-auto-scroll]");
    if (!strip) return; // not the home page

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const PIXELS_PER_FRAME = 0.6; // slow, steady drift
    const RESUME_DELAY_MS = 2500; // how long to wait after user interaction before auto-scroll resumes
    const PAUSE_EVENTS = ["pointerdown", "wheel", "touchstart"];

    let direction = 1; // 1 = scrolling right, -1 = scrolling left
    let isPaused = false;
    let resumeTimer = null;

    function pauseThenResumeLater() {
      isPaused = true;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        isPaused = false;
      }, RESUME_DELAY_MS);
    }

    PAUSE_EVENTS.forEach((eventName) => {
      strip.addEventListener(eventName, pauseThenResumeLater, { passive: true });
    });

    function tick() {
      if (!isPaused) {
        const maxScroll = strip.scrollWidth - strip.clientWidth;
        if (maxScroll > 0) {
          strip.scrollLeft += PIXELS_PER_FRAME * direction;
          if (strip.scrollLeft >= maxScroll) direction = -1;
          else if (strip.scrollLeft <= 0) direction = 1;
        }
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* 4. Contact form: validation + submission                            */
  /* ------------------------------------------------------------------ */

  function setupContactForm() {
    // STEP 1 — grab the form + config -----------------------------------
    const form = document.querySelector("#contact-form");
    if (!form) return; // this page has no contact form; nothing to do

    const config = window.CAE_CONFIG || {};
    // The status box sits just above the <form> (a sibling, not a
    // descendant) so it stays visible even if the form itself is replaced -
    // that's why it's found from the document, not from `form`.
    const statusBox = document.querySelector("[data-form-status]");
    const submitBtn = form.querySelector("[data-form-submit]");

    // STEP 2 — validation rules -------------------------------------------
    // Add/remove a required field here; the loop below reads this list, so
    // no other code needs to change when a field is added or removed.
    const fieldRules = [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone", required: true, pattern: /^[0-9+\-\s()]{7,15}$/ },
      { name: "email", label: "Email", required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { name: "message", label: "Message / Requirement", required: true },
    ];

    function validate() {
      let firstInvalidField = null;

      for (const rule of fieldRules) {
        const field = form.elements.namedItem(rule.name);
        const errorEl = form.querySelector(`[data-error-for="${rule.name}"]`);
        if (!field || !errorEl) continue;

        const value = field.value.trim();
        let message = "";

        if (rule.required && value === "") {
          message = `${rule.label} is required.`;
        } else if (value !== "" && rule.pattern && !rule.pattern.test(value)) {
          message = `Please enter a valid ${rule.label.toLowerCase()}.`;
        }

        errorEl.textContent = message;
        field.setAttribute("aria-invalid", message ? "true" : "false");

        if (message && !firstInvalidField) firstInvalidField = field;
      }

      return firstInvalidField;
    }

    // Clear a field's error message as soon as the visitor starts fixing it.
    fieldRules.forEach((rule) => {
      const field = form.elements.namedItem(rule.name);
      field?.addEventListener("input", () => {
        const errorEl = form.querySelector(`[data-error-for="${rule.name}"]`);
        if (errorEl) errorEl.textContent = "";
      });
    });

    // STEP 3 — on submit: run validation, stop if invalid -----------------
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const firstInvalidField = validate();
      if (firstInvalidField) {
        firstInvalidField.focus();
        showStatus("error", "Please check the highlighted field(s) and try again.");
        return;
      }

      // STEP 4 — build the payload sent to the backend --------------------
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      // STEP 5 — send it -----------------------------------------------------
      // If the Google Form hasn't been connected yet (see GOOGLE_FORM in
      // src/js/config.js), be honest about it instead of pretending the
      // enquiry was sent.
      const googleForm = config.GOOGLE_FORM || {};
      if (!googleForm.action) {
        showStatus(
          "info",
          "This enquiry form isn't connected to a backend yet. " +
            `Please call ${config.phoneDisplay || "us"} or WhatsApp ${config.whatsappDisplay || "us"} directly, ` +
            "and we'll get back to you right away."
        );
        return;
      }

      // Google Forms expects "entry.XXXXXXXXX=value" fields (its own
      // internal question IDs, one per question) rather than this form's
      // own field names - GOOGLE_FORM.entryIds in config.js is the mapping
      // from our field names to those IDs, filled in once the real Google
      // Form exists.
      const googleFormBody = new URLSearchParams();
      for (const [fieldName, value] of Object.entries(payload)) {
        const entryId = googleForm.entryIds && googleForm.entryIds[fieldName];
        if (entryId) googleFormBody.append(entryId, value);
      }

      setSubmitting(true);
      try {
        // Google's form-submission endpoint doesn't send back the CORS
        // headers a browser needs to let this script read the response, so
        // this request is sent with mode: "no-cors" - the trade-off is that
        // we can't actually inspect the result (a successful send and a
        // rejected one look identical from here), only whether the request
        // went out at all. See the note above GOOGLE_FORM in config.js.
        await fetch(googleForm.action, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: googleFormBody.toString(),
        });

        // STEP 6 — show success state to the user ----------------------------
        // Reaching here just means the browser managed to send the request
        // (see the no-cors note above) - a thrown error below is the only
        // signal this code can actually act on.
        form.reset();
        showStatus("success", "Thank you - your enquiry has been received. Our team will contact you shortly.");
      } catch (err) {
        showStatus("error", "Something went wrong sending your enquiry. Please try again or call us directly.");
      } finally {
        setSubmitting(false);
      }
    });

    function setSubmitting(isSubmitting) {
      if (!submitBtn) return;
      submitBtn.disabled = isSubmitting;
      submitBtn.textContent = isSubmitting ? "Sending..." : "Send Enquiry";
    }

    function showStatus(type, message) {
      if (!statusBox) return;
      const styles = {
        success: "border-emerald-300 bg-emerald-50 text-emerald-800",
        error: "border-red-300 bg-red-50 text-red-800",
        info: "border-primary/30 bg-primary/5 text-ink",
      };
      statusBox.className = `rounded-md border px-4 py-3 text-sm ${styles[type]}`;
      statusBox.textContent = message;
      statusBox.hidden = false;
    }
  }
})();
