/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },

    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "#5D7BAF",
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
      },

      fontFamily: {
        "sans-serif": ["'Noto Sans KR'", "sans-serif"],
        serif: ["'Nanum Myeongjo'", "serif"],
        monospace: ["'Nanum Gothic'", "monospace"],
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },

        /*
         myAmen 호흡 애니메이션
         - 빠른 UI 리듬 ❌
         - 기도 / 머묾 / 호흡 ⭕
         */
        "amen-breath": {
          "0%": { transform: "scale(1.0)" },
          "25%": { transform: "scale(1.08)" }, // 들이마심
          "40%": { transform: "scale(1.08)" }, // 멈춤
          "75%": { transform: "scale(1.0)" },  // 내쉼
          "100%": { transform: "scale(1.0)" }, // 멈춤
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",

        // myAmen 전용 (느린 1호흡 = 8초)
        "amen-breath": "amen-breath 8s ease-in-out infinite",
      },
    },
  },

  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};
