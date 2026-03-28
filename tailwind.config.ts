import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.75rem"
      },
      boxShadow: {
        lens: "0 30px 80px rgba(5, 10, 20, 0.32)",
        glow: "0 0 0 1px rgba(56,189,248,0.18), 0 24px 70px rgba(34,211,238,0.14)",
        "glow-sm": "0 0 0 1px rgba(56,189,248,0.12), 0 8px 32px rgba(34,211,238,0.1)",
        "glow-accent": "0 0 20px rgba(52,211,153,0.3), 0 0 60px rgba(52,211,153,0.12)",
        "inner-glass": "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.15)",
        "cta-glow": "0 0 0 1px rgba(34,211,238,0.35), 0 8px 32px rgba(34,211,238,0.25), 0 0 64px rgba(34,211,238,0.1)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(148,210,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,210,255,0.045) 1px, transparent 1px)",
        "cta-gradient": "linear-gradient(135deg, #22d3ee 0%, #38bdf8 40%, #818cf8 100%)",
        "hero-gradient": "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(56,189,248,0.08) 50%, rgba(139,92,246,0.1) 100%)"
      },
      animation: {
        drift: "drift 16s ease-in-out infinite",
        float: "float 11s ease-in-out infinite",
        floatSlow: "float 18s ease-in-out infinite",
        pulseSoft: "pulseSoft 3s ease-in-out infinite",
        scanReveal: "scanReveal 1.4s cubic-bezier(0.16,1,0.3,1) forwards",
        fadeUp: "fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) forwards",
        rotateSlow: "rotateSlow 24s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        blink: "blink 1.1s step-end infinite"
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "33%": { transform: "translate3d(8px, -28px, 0)" },
          "66%": { transform: "translate3d(-6px, -14px, 0)" }
        },
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(14px, -18px, 0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" }
        },
        scanReveal: {
          from: { width: "0%" },
          to: { width: "100%" }
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        rotateSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        shimmer: {
          from: { backgroundPosition: "-200% center" },
          to: { backgroundPosition: "200% center" }
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" }
        }
      }
    }
  },
  plugins: []
};

export default config;
