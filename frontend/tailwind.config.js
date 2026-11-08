/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FFFFFF",
          50: "#FAFAFA",
          100: "#F7F8FA",
          200: "#F1F3F6",
          300: "#E8EAEE",
          400: "#D1D5DB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F7F8FA",
          hover: "#F1F3F6",
        },
        border: {
          DEFAULT: "#E8EAEE",
          subtle: "#E8EAEE",
          strong: "#CBD5E1",
        },
        primary: {
          DEFAULT: "#0B1F3A",
          hover: "#12305A",
          subtle: "#EAEFF6",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#0E9F6E",
          hover: "#0B855C",
          subtle: "#E7F7F0",
          gold: "#C9A24B",
        },
        content: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#94A3B8",
        },
        success: {
          DEFAULT: "#0E9F6E",
          bg: "#E7F7F0",
          border: "#BCEDD8",
        },
        warning: {
          DEFAULT: "#B7791F",
          bg: "#FDF3DC",
          border: "#FBE6B3",
        },
        danger: {
          DEFAULT: "#D14343",
          bg: "#FCE8E8",
          border: "#F8C6C6",
        },
        info: {
          DEFAULT: "#2563EB",
          bg: "#E8F0FE",
          border: "#BFDBFE",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Courier New", "monospace"],
      },
      borderRadius: {
        card: "16px",
        btn: "10px",
        input: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15, 23, 42, 0.04)",
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.03)",
        elevated: "0 4px 12px rgba(15, 23, 42, 0.05), 0 12px 32px rgba(15, 23, 42, 0.06)",
        float: "0 12px 32px rgba(15, 23, 42, 0.06)",
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
