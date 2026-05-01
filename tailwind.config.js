/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: '#7546ED',
        secondary: '#DC89FF',
        navy: '#12173B',
        lavender: '#B1A9E5',
        'deep-blue': '#032C7D',
        bg: '#F4F3FB',
        success: '#10B981',
        error: '#FF6B6B',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        inp: '8px',
      },
    },
  },
  plugins: [],
};
