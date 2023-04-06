import { type Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontFamily: {
      serif: ["Beaufort-Bold", "serif"],
      sans: ["Spiegel", "sans-serif"],
      body: ["Spiegel", "sans-serif"],
      "beaufort-bold": ["Beaufort-Bold", "serif"],
      "beaufort-bold-italic": ["Beaufort-BoldItalic", "serif"],
      "beaufort-medium-italic": ["Beaufort-MediumItalic", "serif"],
      spiegel: ["Spiegel", "sans-serif"],
      "spiegel-bold": ["Spiegel-Bold", "sans-serif"],
    },
    fontSize: {
      base: [
        "14pt",
        { lineHeight: "20pt", letterSpacing: ".025em", fontWeight: "400" },
      ],
      h1: [
        "40pt",
        { lineHeight: "42pt", letterSpacing: ".05em", fontWeight: "700" },
      ],
      h2: [
        "28Pt",
        { lineHeight: "32pt", letterSpacing: ".05em", fontWeight: "700" },
      ],
      h3: [
        "23Pt",
        { lineHeight: "28pt", letterSpacing: ".05em", fontWeight: "700" },
      ],
      h4: [
        "18pt",
        { lineHeight: "22pt", letterSpacing: ".05em", fontWeight: "700" },
      ],
      h5: [
        "14pt",
        { lineHeight: "18pt", letterSpacing: ".075ej", fontWeight: "700" },
      ],
    },
    container: {
      center: true,
      padding: "2rem",
    },
    colors: {
      white: "#F0E6D2",
      blue1: "#CDFAFA",
      blue2: "#0AC8B9",
      blue3: "#0397AB",
      blue4: "#005A82",
      blue5: "#0A323C",
      blue6: "091428",
      blue7: "#0A1428",
      gold1: "#F0E6D2",
      gold2: "#C8AA6E",
      gold3: "#C8AA6E",
      gold4: "#C89B3C",
      gold5: "#785A28",
      gold6: "#463714",
      gold7: "#32281E",
      grey1: "#A09B8C",
      "grey1-5": "#5B5A56",
      grey2: "#3C3C41",
      grey3: "#1E2328",
      "grey-cool": "#1E282D",
      black: "#010A13",
    },
    extend: {},
  },
  plugins: [],
} satisfies Config;
