/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Canvas / surface
        canvas: "var(--bg-canvas)",
        surface: {
          DEFAULT: "var(--bg-surface)",
          subtle: "var(--bg-subtle)",
        },
        // Borders
        border: {
          DEFAULT: "var(--border-subtle)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        // Text
        content: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        // Brand
        primary: {
          DEFAULT: "var(--primary-base)",
          hover: "var(--primary-hover)",
          foreground: "var(--text-on-primary)",
          subtle: "#EAEFF6",
        },
        // Accents
        accent: {
          DEFAULT: "var(--accent-blue)",
          hover: "var(--accent-blue-hover)",
          emerald: "var(--accent-emerald)",
          gold: "var(--accent-gold)",
          danger: "var(--accent-danger)",
        },
        // Semantic
        success: {
          DEFAULT: "var(--accent-emerald)",
          bg: "#E7F7F0",
          border: "#BCEDD8",
          "dark-bg": "rgba(52, 211, 153, 0.12)",
          "dark-border": "rgba(52, 211, 153, 0.25)",
        },
        warning: {
          DEFAULT: "var(--accent-gold)",
          bg: "#FDF3DC",
          border: "#FBE6B3",
          "dark-bg": "rgba(244, 194, 91, 0.12)",
          "dark-border": "rgba(244, 194, 91, 0.25)",
        },
        danger: {
          DEFAULT: "var(--accent-danger)",
          bg: "#FCE8E8",
          border: "#F8C6C6",
          "dark-bg": "rgba(255, 122, 122, 0.12)",
          "dark-border": "rgba(255, 122, 122, 0.25)",
        },
        info: {
          DEFAULT: "var(--accent-blue)",
          bg: "#E8F0FE",
          border: "#BFDBFE",
          "dark-bg": "rgba(110, 168, 255, 0.12)",
          "dark-border": "rgba(110, 168, 255, 0.25)",
        },
        // Legacy compat
        cream: {
          DEFAULT: "#FFFFFF",
          50: "#FAFAFA",
          100: "#F7F8FA",
          200: "#F1F3F6",
          300: "#E8EAEE",
          400: "#D1D5DB",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Courier New", "monospace"],
      },
      borderRadius: {
        card: "16px",
        "glass-sm": "20px",
        glass: "24px",
        "glass-lg": "28px",
        btn: "10px",
        input: "10px",
        pill: "100px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.03)",
        elevated: "0 4px 12px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(15, 23, 42, 0.06)",
        float: "0 12px 32px rgba(15, 23, 42, 0.06)",
        glass: "var(--glass-shadow)",
        "glass-strong": "var(--glass-shadow-strong)",
      },
      maxWidth: {
        content: "1200px",
        wide: "1440px",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease forwards",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
