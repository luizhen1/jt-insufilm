import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111411',
        forest: '#173c2b',
        lime: '#c9f36b',
        paper: '#f5f5f0',
      },
      fontFamily: { sans: ['Arial', 'Helvetica', 'sans-serif'] },
      boxShadow: { soft: '0 14px 48px rgba(17, 20, 17, .08)' },
    },
  },
  plugins: [],
};
export default config;
