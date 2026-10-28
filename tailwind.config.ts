import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#ECEAE3",
        surface: "#FFFFFF",
        paper: "#FFFFFF",
        border: "#141414",
        borderSubtle: "#D5D2C8",
        ink: "#141414",
        textPrimary: "#141414",
        muted: "#52504A",
        textSecondary: "#52504A",
        accent: "#E4491B",
        accentHover: "#C93D14",
        highlight: "#F6D9CC",
        accentSoft: "#F6D9CC",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Instrument Serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
        caveat: ["var(--font-caveat)", "Caveat", "cursive"],
      },
    },
  },
  plugins: [],
};
export default config;
