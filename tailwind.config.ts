import type { Config } from "tailwindcss";

const config: Config = {
  // `dark:` utilities apply under BOTH the `.dark` (Midnight) and `.graphite`
  // themes. Graphite is set by next-themes as a single class, so we extend the
  // dark variant to match it too (a space-separated class value crashes
  // next-themes' classList.add/remove).
  darkMode: ["variant", ["&:is(.dark *)", "&:is(.graphite *)"]],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-mesh":
          "radial-gradient(at 0% 0%, hsl(var(--chart-1)/.18) 0px, transparent 50%), radial-gradient(at 100% 0%, hsl(var(--chart-2)/.15) 0px, transparent 50%), radial-gradient(at 100% 100%, hsl(var(--chart-3)/.12) 0px, transparent 50%), radial-gradient(at 0% 100%, hsl(var(--chart-4)/.12) 0px, transparent 50%)",
        "gradient-luxury":
          "linear-gradient(135deg, hsl(var(--chart-1)) 0%, hsl(var(--chart-2)) 50%, hsl(var(--chart-3)) 100%)",
        "gradient-aurora":
          "conic-gradient(from 230.29deg at 51.63% 52.16%, hsl(var(--chart-1)) 0deg, hsl(var(--chart-2)) 67.5deg, hsl(var(--chart-3)) 198.75deg, hsl(var(--chart-4)) 251.25deg, hsl(var(--chart-5)) 301.88deg, hsl(var(--chart-1)) 360deg)",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        aurora: {
          "0%, 100%": { backgroundPosition: "50% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        aurora: "aurora 20s ease infinite",
      },
      boxShadow: {
        glow: "0 0 40px -10px hsl(var(--primary) / 0.5)",
        luxury:
          "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.08), 0 24px 64px -24px rgb(0 0 0 / 0.12)",
        glass:
          "0 8px 32px 0 rgba(31, 38, 135, 0.07), inset 0 1px 0 0 rgba(255,255,255,0.5)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
