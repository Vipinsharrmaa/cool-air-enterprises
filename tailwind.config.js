// Tailwind CSS configuration for the Cool Air Enterprises website.
//
// Pinned to Tailwind v3 (the stable, widely-documented CLI/JIT engine) rather
// than the newer v4 engine, specifically so this config keeps working exactly
// as written without surprise breaking changes.
//
// `content` tells Tailwind which files to scan for class names so the final
// CSS only contains the utilities we actually use (this is what makes
// Tailwind a *performance win* here, not a bloated CDN bundle).
module.exports = {
  content: [
    "./src/pages/**/*.html",
    "./src/partials/**/*.html",
    "./src/js/**/*.js",
  ],
  theme: {
    // Tailwind's default breakpoints are already mobile-first (a bare class
    // applies to phones first, then sm:/md:/lg:/xl: progressively enhance
    // for wider screens). We keep the defaults since they line up with the
    // brief's required test widths: sm=640, md=768, lg=1024, xl=1280, 2xl=1536.
    extend: {
      colors: {
        // Brand blue sampled directly from the supplied logo.png (RGB 0,74,173).
        primary: {
          DEFAULT: "#004AAD",
          dark: "#00327A",
          light: "#3D74C9",
        },
        navy: {
          DEFAULT: "#0B1A33", // deep navy for CTA panels / footer
          light: "#132648",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F4F7FB", // cool grey-blue alternate section background
        },
        ink: {
          DEFAULT: "#14213D", // primary text color (dark navy / charcoal)
          muted: "#5B6B85", // secondary / muted text
        },
        line: "#E2E8F1", // hairline borders / dividers
      },
      fontFamily: {
        // Headings use the condensed display face; body/UI uses Inter.
        display: ["'Barlow Condensed'", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      maxWidth: {
        content: "1280px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 26, 51, 0.06), 0 8px 24px -12px rgba(11, 26, 51, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};
