import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: "#080a0d",
        obsidian: "#0d1117",
        panel: "#111821",
        steel: "#9ba7b5",
        silver: "#d6d8d2",
        gold: "#caa35b",
        oldgold: "#8f6a2d",
        terran: "#6f9ebd",
        protoss: "#d9bc74",
        zerg: "#9b7ac4",
      },
      boxShadow: {
        command: "0 18px 60px rgba(0, 0, 0, 0.42)",
        metal: "inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.34)",
      },
    },
  },
  plugins: [],
};

export default config;
