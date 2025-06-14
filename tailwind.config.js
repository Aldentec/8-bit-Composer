module.exports = {
  content: ["./src/**/*.{html,js}"],  // wherever your templates live
  theme: {
    extend: {
      colors: {
        bg:    "#080808",
        fg:    "#0f0",
        control: "#222",
        accent: "#0f0",
        cell:  "#222",
        border: "#555",
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"],
      },
      spacing: {
        sm: "0.25rem",
        md: "0.5rem",
        lg: "1rem",
      }
    }
  },
  plugins: [],
}
