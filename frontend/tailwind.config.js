/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fintech: {
          blue: "#0070BA",       // PayPal primary brand blue
          navy: "#003087",       // PayPal deep navy
          cyan: "#00CFDE",       // Accent cyan
          dark: "#0a0f1d",       // Dark mode deep background
          cardDark: "#131b2e",   // Dark mode card background
          borderDark: "#1f2b48", // Dark mode border
        },
      },
    },
  },
  plugins: [],
};

