import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        // JSTOR Pharos color palette
        jstor: {
          red: "#990000", // JSTOR Red (primary)
          blue: {
            night: "#000000", // Changed from #14365D to black
            glacier: "#40C4E0", // Glacier Blue (primary)
          },
          coral: "#FF5C5C", // Coral/Salmon color
          // Replace cream with light grey
          grey: {
            lightest: "#F8F9FA",
            lighter: "#F1F3F5",
            light: "#E9ECEF",
            base: "#DEE2E6",
            dark: "#CED4DA",
          },
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#990000", // JSTOR Red as primary
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "#000000", // Changed from Night Blue to black
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "#F1F3F5", // Light grey as muted (was cream)
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#40C4E0", // Glacier Blue as accent
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
