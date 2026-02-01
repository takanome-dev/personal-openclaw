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
        clawd: {
          dark: "#0a0a0f",
          panel: "#12121a",
          border: "#1e1e2e",
          accent: "#6366f1",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
