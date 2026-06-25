module.exports = {
  theme: {
    extend: {
      colors: {
        // Utilisés dans le JSX
        'primary': '#F4F1EA', // Background principal
        'secondary': '#FDFBF7', // Surface des cards
        'border': '#E8E2D5', // Bordures subtiles
        'text-main': '#2C2C2C', // Titres noirs
        'text-muted': '#4A4A4A', // Sous-titres
        'accent': '#8B7355', // La couleur beige/blé doré pour les accents
      },
      fontFamily: {
        // Recommandé pour une interface institutionnelle moderne
        sans: ['Inter', 'system-ui', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}