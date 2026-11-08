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
          DEFAULT: "#F6F0E4",
          50: "#FAF7F1",
          100: "#F6F0E4",
          200: "#EFE7D6",
          300: "#E3D8C3",
          400: "#CDBFA6",
        },
        surface: {
          DEFAULT: "#FFFDF8",
          subtle: "#EFE7D6",
          hover: "#EAE1CD",
        },
        border: {
          subtle: "#E3D8C3",
          strong: "#CDBFA6",
        },
        primary: {
          DEFAULT: "#24493D",
          hover: "#1B3A30",
          subtle: "#E4ECE8",
          foreground: "#FFFDF8",
        },
        accent: {
          DEFAULT: "#B5603D",
          hover: "#9E5132",
          subtle: "#F9EEEA",
        },
        content: {
          primary: "#2A2118",
          secondary: "#6F6150",
          muted: "#9A8B77",
        },
        success: {
          DEFAULT: "#2E7D4F",
          bg: "#E3F1E7",
          border: "#C2E2CB",
        },
        warning: {
          DEFAULT: "#B7791F",
          bg: "#FBEFD5",
          border: "#F5DC9E",
        },
        danger: {
          DEFAULT: "#B3402E",
          bg: "#F8E1DC",
          border: "#F0BDB3",
        },
        info: {
          DEFAULT: "#2F5F8A",
          bg: "#E1ECF5",
          border: "#BCD5EA",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Courier New", "monospace"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(42, 33, 24, 0.06), 0 4px 16px rgba(42, 33, 24, 0.05)",
        elevated: "0 4px 6px rgba(42, 33, 24, 0.05), 0 12px 28px rgba(42, 33, 24, 0.08)",
      },
      maxWidth: {
        content: "1120px",
      },
    },
  },
  plugins: [],
};
