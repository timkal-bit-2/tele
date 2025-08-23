/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'teleprompter': ['Georgia', 'Times New Roman', 'serif'],
      },
      animation: {
        'scroll': 'scroll linear infinite',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateY(100vh)' },
          '100%': { transform: 'translateY(-100%)' },
        }
      }
    },
  },
  plugins: [],
}
