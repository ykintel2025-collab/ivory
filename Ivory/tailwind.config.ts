import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#1D4153",
          soft: "#2E5A6F",
        },
        ivory: {
          DEFAULT: "#FAF7F0",
          card: "#FFFFFF",
          line: "#E4DCC8",
        },
        gold: {
          DEFAULT: "#B8944A",
          soft: "#F4EDDA",
        },
        teal: {
          DEFAULT: "#3E6B52",
          soft: "#E4EEE7",
        },
        brick: {
          DEFAULT: "#8B3A3A",
          soft: "#F3E3E1",
        },
        amber: {
          DEFAULT: "#B8863A",
          soft: "#F5EAD6",
        },
        risk: {
          high: "#8B3A3A",
          medium: "#B8863A",
          low: "#3E6B52",
        },
        status: {
          open: "#8B3A3A",
          progress: "#B8863A",
          done: "#3E6B52",
          blocked: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};
export default config;
